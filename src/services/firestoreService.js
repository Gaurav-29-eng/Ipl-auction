import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment,
  writeBatch
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// ========== ROOM MANAGEMENT ==========

export const createRoom = async () => {
  const roomId = uuidv4().slice(0, 8); // Short 8-char room ID
  const roomRef = doc(db, 'rooms', roomId);
  
  await setDoc(roomRef, {
    roomId,
    createdAt: serverTimestamp(),
    isActive: true
  });
  
  // Initialize auction subcollection
  const auctionRef = doc(db, 'rooms', roomId, 'auction', 'current');
  await setDoc(auctionRef, {
    currentPlayer: null,
    currentBid: 0,
    highestBidderId: null,
    highestBidderName: null,
    highestBidderTeam: null,
    bidCount: 0,
    isActive: false,
    timer: 15,
    createdAt: serverTimestamp()
  });
  
  return roomId;
};

export const joinRoom = async (roomId) => {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) {
    throw new Error('Room not found');
  }
  
  return { roomId, ...roomSnap.data() };
};

// ========== USER MANAGEMENT (Room-based) ==========

export const createUser = async (roomId, userId, userName, team) => {
  const userRef = doc(db, 'rooms', roomId, 'users', userId);
  
  const userData = {
    userId,
    userName,
    team,
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp()
  };
  
  await setDoc(userRef, userData);
  return { userId, ...userData };
};

export const getUser = async (roomId, userId) => {
  const userRef = doc(db, 'rooms', roomId, 'users', userId);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? { userId: snapshot.id, ...snapshot.data() } : null;
};

// ========== TEAM MANAGEMENT (Room-based) ==========

export const createTeam = async (roomId, teamName, userId, initialPurse = 100) => {
  const teamRef = doc(db, 'rooms', roomId, 'teams', teamName);
  const snapshot = await getDoc(teamRef);
  
  if (snapshot.exists()) {
    throw new Error('Team already exists');
  }
  
  const teamData = {
    teamName,
    userId,
    purse: initialPurse,
    players: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(teamRef, teamData);
  return teamData;
};

export const getTeam = async (roomId, teamName) => {
  const teamRef = doc(db, 'rooms', roomId, 'teams', teamName);
  const snapshot = await getDoc(teamRef);
  return snapshot.exists() ? { teamName: snapshot.id, ...snapshot.data() } : null;
};

export const updateTeamPurse = async (roomId, teamName, newPurse) => {
  const teamRef = doc(db, 'rooms', roomId, 'teams', teamName);
  await updateDoc(teamRef, {
    purse: newPurse,
    updatedAt: serverTimestamp()
  });
};

export const addPlayerToTeam = async (roomId, teamName, player) => {
  const teamRef = doc(db, 'rooms', roomId, 'teams', teamName);
  await updateDoc(teamRef, {
    players: arrayUnion(player),
    updatedAt: serverTimestamp()
  });
};

export const subscribeToTeams = (roomId, callback) => {
  const teamsCol = collection(db, 'rooms', roomId, 'teams');
  return onSnapshot(teamsCol, (snapshot) => {
    const teams = {};
    snapshot.forEach((doc) => {
      teams[doc.id] = { teamName: doc.id, ...doc.data() };
    });
    callback(teams);
  });
};

export const subscribeToTeam = (roomId, teamName, callback) => {
  const teamRef = doc(db, 'rooms', roomId, 'teams', teamName);
  return onSnapshot(teamRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ teamName: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  });
};

// ========== AUCTION MANAGEMENT (Room-based) ==========

export const startPlayerAuction = async (roomId, player, basePrice) => {
  const auctionRef = doc(db, 'rooms', roomId, 'auction', 'current');
  
  const auctionData = {
    currentPlayer: player,
    currentBid: basePrice,
    highestBidderId: null,
    highestBidderName: null,
    highestBidderTeam: null,
    bidCount: 0,
    isActive: true,
    timer: 15,
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(auctionRef, auctionData);
  return auctionData;
};

export const placeBid = async (roomId, userId, userName, teamName, bidAmount) => {
  const auctionRef = doc(db, 'rooms', roomId, 'auction', 'current');
  
  const auctionSnap = await getDoc(auctionRef);
  if (!auctionSnap.exists()) {
    throw new Error('No active auction');
  }
  
  const auctionData = auctionSnap.data();
  
  // Allow first bid if highestBidderId is null
  const isFirstBid = !auctionData.highestBidderId;
  
  if (!isFirstBid && bidAmount <= auctionData.currentBid) {
    throw new Error('Bid must be higher than current bid');
  }
  
  if (isFirstBid && bidAmount < auctionData.currentBid) {
    throw new Error('Bid must be at least base price');
  }
  
  await updateDoc(auctionRef, {
    currentBid: bidAmount,
    highestBidderId: userId,
    highestBidderName: userName,
    highestBidderTeam: teamName,
    bidCount: increment(1),
    updatedAt: serverTimestamp()
  });
  
  // Record bid history
  const bidRef = doc(collection(db, 'rooms', roomId, 'bids'));
  await setDoc(bidRef, {
    userId,
    userName,
    teamName,
    amount: bidAmount,
    player: auctionData.currentPlayer?.name || 'Unknown',
    timestamp: serverTimestamp()
  });
  
  return { userId, userName, teamName, amount: bidAmount };
};

export const sellPlayer = async (roomId, teamName, finalBid) => {
  const batch = writeBatch(db);
  
  // Get team data
  const teamRef = doc(db, 'rooms', roomId, 'teams', teamName);
  const teamSnap = await getDoc(teamRef);
  
  if (!teamSnap.exists()) {
    throw new Error('Team not found');
  }
  
  const teamData = teamSnap.data();
  const newPurse = teamData.purse - finalBid;
  
  if (newPurse < 0) {
    throw new Error('Insufficient purse balance');
  }
  
  // Get auction data
  const auctionRef = doc(db, 'rooms', roomId, 'auction', 'current');
  const auctionSnap = await getDoc(auctionRef);
  const auctionData = auctionSnap.data();
  
  // Update team purse and add player
  batch.update(teamRef, {
    purse: newPurse,
    players: arrayUnion({
      ...auctionData.currentPlayer,
      boughtAt: finalBid,
      boughtAtTimestamp: serverTimestamp()
    }),
    updatedAt: serverTimestamp()
  });
  
  // Update auction state
  batch.update(auctionRef, {
    currentPlayer: null,
    currentBid: 0,
    highestBidderId: null,
    highestBidderName: null,
    highestBidderTeam: null,
    isActive: false,
    timer: 15,
    soldTo: teamName,
    soldAt: finalBid,
    soldAtTimestamp: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  await batch.commit();
  
  return { teamName, purse: newPurse, player: auctionData.currentPlayer };
};

export const skipPlayer = async (roomId) => {
  const auctionRef = doc(db, 'rooms', roomId, 'auction', 'current');
  await updateDoc(auctionRef, {
    currentPlayer: null,
    currentBid: 0,
    highestBidderId: null,
    highestBidderName: null,
    highestBidderTeam: null,
    isActive: false,
    timer: 15,
    skipped: true,
    skippedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateTimer = async (roomId, timerValue) => {
  const auctionRef = doc(db, 'rooms', roomId, 'auction', 'current');
  await updateDoc(auctionRef, {
    timer: timerValue,
    updatedAt: serverTimestamp()
  });
};

export const getAuction = async (roomId) => {
  const auctionRef = doc(db, 'rooms', roomId, 'auction', 'current');
  const snapshot = await getDoc(auctionRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const subscribeToAuction = (roomId, callback) => {
  const auctionRef = doc(db, 'rooms', roomId, 'auction', 'current');
  return onSnapshot(auctionRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  });
};

// ========== PLAYERS ==========

export const initializePlayers = async (playersData) => {
  const batch = writeBatch(db);
  
  playersData.forEach((player, index) => {
    const playerRef = doc(playersCol, player.id || `player_${index}`);
    batch.set(playerRef, {
      ...player,
      isSold: false,
      soldTo: null,
      createdAt: serverTimestamp()
    });
  });
  
  await batch.commit();
};

export const subscribeToPlayers = (callback) => {
  return onSnapshot(playersCol, (snapshot) => {
    const players = [];
    snapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });
    callback(players);
  });
};

// ========== BIDS ==========

export const subscribeToBids = (roomId, callback) => {
  const bidsCol = collection(db, 'rooms', roomId, 'bids');
  return onSnapshot(bidsCol, (snapshot) => {
    const bids = [];
    snapshot.forEach((doc) => {
      bids.push({ id: doc.id, ...doc.data() });
    });
    // Sort by timestamp descending
    bids.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    callback(bids);
  });
};

// ========== INITIALIZATION ==========

export const initializeFirestoreData = async (playersData) => {
  const auctionRef = doc(db, 'auction', 'current');
  const auctionSnap = await getDoc(auctionRef);
  
  if (!auctionSnap.exists()) {
    await setDoc(auctionRef, {
      currentPlayer: null,
      currentBid: 0,
      highestBidder: null,
      bidCount: 0,
      isActive: false,
      timer: 15,
      updatedAt: serverTimestamp()
    });
  }
  
  return true;
};
