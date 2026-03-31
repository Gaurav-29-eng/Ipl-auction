import { db } from './config';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
  arrayUnion,
  increment,
  writeBatch
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Collection references
const USERS_COL = 'users';
const TEAMS_COL = 'teams';
const AUCTION_COL = 'auction';
const PLAYERS_COL = 'players';
const BIDS_COL = 'bids';

// ========== USER MANAGEMENT ==========

export const createUser = async (userName) => {
  const userId = uuidv4();
  const userRef = doc(db, USERS_COL, userId);
  
  const userData = {
    userId,
    userName,
    createdAt: serverTimestamp(),
    isActive: true
  };
  
  await setDoc(userRef, userData);
  return { userId, ...userData };
};

export const getUser = async (userId) => {
  const userRef = doc(db, USERS_COL, userId);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? { userId: snapshot.id, ...snapshot.data() } : null;
};

// ========== TEAM MANAGEMENT ==========

export const createTeam = async (userId, teamName, initialPurse = 100) => {
  const teamRef = doc(db, TEAMS_COL, teamName);
  
  const teamData = {
    teamName,
    userId,
    purse: initialPurse,
    players: [],
    createdAt: serverTimestamp(),
    isActive: true
  };
  
  await setDoc(teamRef, teamData);
  return teamData;
};

export const updateTeamPurse = async (teamName, newPurse) => {
  const teamRef = doc(db, TEAMS_COL, teamName);
  await updateDoc(teamRef, {
    purse: newPurse,
    updatedAt: serverTimestamp()
  });
};

export const addPlayerToTeam = async (teamName, player) => {
  const teamRef = doc(db, TEAMS_COL, teamName);
  await updateDoc(teamRef, {
    players: arrayUnion(player),
    updatedAt: serverTimestamp()
  });
};

// ========== AUCTION MANAGEMENT ==========

export const initializeAuction = async () => {
  const auctionRef = doc(db, AUCTION_COL, 'current');
  
  const auctionData = {
    currentPlayer: null,
    currentBid: 0,
    highestBidder: null,
    bidCount: 0,
    isActive: false,
    timer: 15,
    startedAt: null,
    updatedAt: serverTimestamp()
  };
  
  await setDoc(auctionRef, auctionData);
  return auctionData;
};

export const startPlayerAuction = async (player) => {
  const auctionRef = doc(db, AUCTION_COL, 'current');
  
  const auctionData = {
    currentPlayer: player,
    currentBid: player.basePrice || player.price || 2,
    highestBidder: null,
    bidCount: 0,
    isActive: true,
    timer: 15,
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(auctionRef, auctionData);
  return auctionData;
};

export const placeBid = async (teamName, bidAmount) => {
  const auctionRef = doc(db, AUCTION_COL, 'current');
  
  // Get current auction state
  const auctionSnap = await getDoc(auctionRef);
  if (!auctionSnap.exists()) {
    throw new Error('No active auction');
  }
  
  const auctionData = auctionSnap.data();
  
  // Validate bid
  if (bidAmount <= auctionData.currentBid) {
    throw new Error('Bid must be higher than current bid');
  }
  
  // Update auction
  await updateDoc(auctionRef, {
    currentBid: bidAmount,
    highestBidder: teamName,
    bidCount: increment(1),
    updatedAt: serverTimestamp()
  });
  
  // Record bid history
  const bidRef = doc(collection(db, BIDS_COL));
  await setDoc(bidRef, {
    teamName,
    amount: bidAmount,
    player: auctionData.currentPlayer?.name || 'Unknown',
    timestamp: serverTimestamp()
  });
  
  return { teamName, amount: bidAmount };
};

export const sellPlayer = async (teamName, finalBid) => {
  const batch = writeBatch(db);
  
  // Get team data
  const teamRef = doc(db, TEAMS_COL, teamName);
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
  const auctionRef = doc(db, AUCTION_COL, 'current');
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
    highestBidder: null,
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

export const skipPlayer = async () => {
  const auctionRef = doc(db, AUCTION_COL, 'current');
  await updateDoc(auctionRef, {
    currentPlayer: null,
    currentBid: 0,
    highestBidder: null,
    isActive: false,
    timer: 15,
    skipped: true,
    skippedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateTimer = async (timerValue) => {
  const auctionRef = doc(db, AUCTION_COL, 'current');
  await updateDoc(auctionRef, {
    timer: timerValue,
    updatedAt: serverTimestamp()
  });
};

// ========== REAL-TIME LISTENERS ==========

export const subscribeToAuction = (callback) => {
  const auctionRef = doc(db, AUCTION_COL, 'current');
  return onSnapshot(auctionRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  });
};

export const subscribeToTeams = (callback) => {
  const teamsQuery = query(collection(db, TEAMS_COL), where('isActive', '==', true));
  return onSnapshot(teamsQuery, (snapshot) => {
    const teams = {};
    snapshot.forEach((doc) => {
      teams[doc.id] = { teamName: doc.id, ...doc.data() };
    });
    callback(teams);
  });
};

export const subscribeToTeam = (teamName, callback) => {
  const teamRef = doc(db, TEAMS_COL, teamName);
  return onSnapshot(teamRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ teamName: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  });
};

export const subscribeToBids = (callback) => {
  const bidsQuery = query(collection(db, BIDS_COL));
  return onSnapshot(bidsQuery, (snapshot) => {
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
  // Initialize auction if not exists
  const auctionRef = doc(db, AUCTION_COL, 'current');
  const auctionSnap = await getDoc(auctionRef);
  
  if (!auctionSnap.exists()) {
    await initializeAuction();
  }
  
  // Initialize players if not exists
  const playersQuery = query(collection(db, PLAYERS_COL));
  const playersSnap = await getDocs(playersQuery);
  
  if (playersSnap.empty && playersData) {
    const batch = writeBatch(db);
    playersData.forEach((player, index) => {
      const playerRef = doc(db, PLAYERS_COL, player.id || `player_${index}`);
      batch.set(playerRef, {
        ...player,
        isSold: false,
        soldTo: null,
        createdAt: serverTimestamp()
      });
    });
    await batch.commit();
  }
  
  return true;
};

// Export collection names for reference
export { USERS_COL, TEAMS_COL, AUCTION_COL, PLAYERS_COL, BIDS_COL };
