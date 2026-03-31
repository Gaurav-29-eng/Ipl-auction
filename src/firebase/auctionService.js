import { rtdb } from './config';
import {
  ref,
  set,
  update,
  onValue,
  push,
  get,
  remove,
  serverTimestamp
} from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

// Room Management
export const createAuctionRoom = async (hostName, hostTeam) => {
  const roomId = uuidv4().slice(0, 8).toUpperCase();
  const roomRef = ref(rtdb, `rooms/${roomId}`);
  
  const initialState = {
    roomId,
    createdAt: serverTimestamp(),
    status: 'waiting', // waiting, active, ended
    host: {
      id: uuidv4(),
      name: hostName,
      team: hostTeam,
      isHost: true
    },
    players: {
      [hostTeam]: {
        name: hostName,
        team: hostTeam,
        budget: 100,
        squad: [],
        isHost: true,
        joinedAt: serverTimestamp()
      }
    },
    auction: {
      currentPlayer: null,
      currentBid: 0,
      highestBidder: null,
      bidHistory: [],
      isActive: false,
      timer: 15
    },
    settings: {
      timerDuration: 15,
      startingBudget: 100
    }
  };
  
  await set(roomRef, initialState);
  return { roomId, ...initialState };
};

export const joinAuctionRoom = async (roomId, playerName, playerTeam) => {
  const roomRef = ref(rtdb, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  
  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }
  
  const roomData = snapshot.val();
  
  // Check if team name already exists
  const existingTeams = Object.keys(roomData.players || {});
  if (existingTeams.includes(playerTeam)) {
    throw new Error('Team name already taken');
  }
  
  const playerData = {
    name: playerName,
    team: playerTeam,
    budget: roomData.settings?.startingBudget || 100,
    squad: [],
    isHost: false,
    joinedAt: serverTimestamp()
  };
  
  await update(ref(rtdb, `rooms/${roomId}/players`), {
    [playerTeam]: playerData
  });
  
  return { roomId, ...roomData, playerData };
};

// Auction State Management
export const startAuction = async (roomId, player) => {
  const auctionRef = ref(rtdb, `rooms/${roomId}/auction`);
  await update(auctionRef, {
    currentPlayer: player,
    currentBid: player.basePrice,
    highestBidder: null,
    isActive: true,
    timer: 15,
    startedAt: serverTimestamp()
  });
};

export const placeBid = async (roomId, team, bidAmount, increment) => {
  const roomRef = ref(rtdb, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const roomData = snapshot.val();
  
  const player = roomData.players[team];
  if (!player || player.budget < bidAmount) {
    throw new Error('Insufficient budget');
  }
  
  const bidRef = push(ref(rtdb, `rooms/${roomId}/auction/bidHistory`));
  const bidData = {
    id: bidRef.key,
    team,
    amount: bidAmount,
    increment,
    timestamp: serverTimestamp(),
    player: roomData.auction?.currentPlayer?.name || 'Unknown'
  };
  
  await Promise.all([
    update(ref(rtdb, `rooms/${roomId}/auction`), {
      currentBid: bidAmount,
      highestBidder: team,
      timer: 15,
      lastBidAt: serverTimestamp()
    }),
    set(bidRef, bidData)
  ]);
  
  return bidData;
};

export const sellPlayer = async (roomId, team, player, finalBid) => {
  const roomRef = ref(rtdb, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  const roomData = snapshot.val();
  
  // Update team's budget and squad
  const playerData = roomData.players[team];
  const updatedSquad = [...(playerData.squad || []), { ...player, boughtAt: finalBid }];
  const updatedBudget = playerData.budget - finalBid;
  
  await Promise.all([
    update(ref(rtdb, `rooms/${roomId}/players/${team}`), {
      budget: updatedBudget,
      squad: updatedSquad
    }),
    update(ref(rtdb, `rooms/${roomId}/auction`), {
      currentPlayer: null,
      currentBid: 0,
      highestBidder: null,
      isActive: false,
      soldTo: team,
      soldAt: finalBid,
      soldAtTimestamp: serverTimestamp()
    })
  ]);
};

export const skipPlayer = async (roomId) => {
  await update(ref(rtdb, `rooms/${roomId}/auction`), {
    currentPlayer: null,
    currentBid: 0,
    highestBidder: null,
    isActive: false,
    skipped: true,
    skippedAt: serverTimestamp()
  });
};

export const updateTimer = async (roomId, timerValue) => {
  await update(ref(rtdb, `rooms/${roomId}/auction`), {
    timer: timerValue
  });
};

// Real-time Listeners
export const subscribeToRoom = (roomId, callback) => {
  const roomRef = ref(rtdb, `rooms/${roomId}`);
  return onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
};

export const subscribeToAuction = (roomId, callback) => {
  const auctionRef = ref(rtdb, `rooms/${roomId}/auction`);
  return onValue(auctionRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
};

export const subscribeToPlayers = (roomId, callback) => {
  const playersRef = ref(rtdb, `rooms/${roomId}/players`);
  return onValue(playersRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });
};

// Leave Room
export const leaveRoom = async (roomId, team) => {
  await remove(ref(rtdb, `rooms/${roomId}/players/${team}`));
};

// Get Room Data
export const getRoomData = async (roomId) => {
  const roomRef = ref(rtdb, `rooms/${roomId}`);
  const snapshot = await get(roomRef);
  return snapshot.exists() ? snapshot.val() : null;
};

// Delete Room (host only)
export const deleteRoom = async (roomId) => {
  await remove(ref(rtdb, `rooms/${roomId}`));
};
