import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  subscribeToAuction,
  subscribeToTeams,
  subscribeToTeam,
  subscribeToBids,
  createRoom,
  joinRoom,
  createUser,
  getUser,
  createTeam,
  getTeam,
  startPlayerAuction,
  placeBid,
  sellPlayer,
  skipPlayer,
  updateTimer,
  initializeFirestoreData
} from '../services/firestoreService';

export const useFirestoreAuction = (playersData) => {
  // Room state
  const [roomId, setRoomId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  // User state
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [myTeam, setMyTeam] = useState(null);
  
  // Auction state
  const [auction, setAuction] = useState({
    currentPlayer: null,
    currentBid: 0,
    highestBidder: null,
    isActive: false,
    timer: 15
  });
  
  // Teams state
  const [teams, setTeams] = useState({});
  const [myTeamData, setMyTeamData] = useState(null);
  
  // Bids history
  const [bids, setBids] = useState([]);
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // Unsubscribers ref
  const unsubscribers = useRef([]);

  // Initialize Firestore data
  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirestoreData(playersData);
        setIsConnected(true);
      } catch (err) {
        console.error('Failed to initialize Firestore:', err);
        setError(err.message);
      }
    };
    init();
  }, [playersData]);

  // Cleanup function
  const cleanup = useCallback(() => {
    unsubscribers.current.forEach(unsub => unsub && unsub());
    unsubscribers.current = [];
  }, []);

  // Create room
  const createRoomFn = useCallback(async () => {
    try {
      setError(null);
      const newRoomId = await createRoom();
      setRoomId(newRoomId);
      setIsHost(true);
      localStorage.setItem('auctionRoomId', newRoomId);
      await joinAuction(userName, myTeam, newRoomId);
      return newRoomId;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userName, myTeam]);

  // Join room
  const joinRoomFn = useCallback(async (targetRoomId) => {
    try {
      setError(null);
      await joinRoom(targetRoomId);
      setRoomId(targetRoomId);
      localStorage.setItem('auctionRoomId', targetRoomId);
      await joinAuction(userName, myTeam, targetRoomId);
      return targetRoomId;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userName, myTeam]);

  // Join auction as user (inside room)
  const joinAuction = useCallback(async (name, teamName, targetRoomId) => {
    if (!targetRoomId) {
      setError('No room joined');
      throw new Error('No room joined');
    }
    try {
      setError(null);
      
      // Get or create persistent userId from localStorage
      let newUserId = localStorage.getItem('auctionUserId');
      if (!newUserId) {
        newUserId = uuidv4();
        localStorage.setItem('auctionUserId', newUserId);
        console.log('[JOIN] Generated new userId:', newUserId);
      } else {
        console.log('[JOIN] Using existing userId from localStorage:', newUserId);
      }
      
      // Check if user already exists in Firestore (room-specific)
      let user = await getUser(targetRoomId, newUserId);
      if (!user) {
        // Create new user with userId as document ID
        user = await createUser(targetRoomId, newUserId, name, teamName);
        console.log('[JOIN] Created new user in Firestore:', newUserId);
      } else {
        console.log('[JOIN] User already exists:', newUserId);
      }
      
      setUserId(newUserId);
      setUserName(name);
      
      // Check if team already exists (room-specific)
      let team = await getTeam(targetRoomId, teamName);
      if (!team) {
        // Create team for user
        team = await createTeam(targetRoomId, teamName, newUserId, 100);
        console.log('[JOIN] Created new team:', teamName);
      } else {
        console.log('[JOIN] Team already exists:', teamName);
      }
      
      setMyTeam(teamName);
      
      // Subscribe to team updates (room-specific)
      const unsubTeam = subscribeToTeam(targetRoomId, teamName, (data) => {
        setMyTeamData(data);
      });
      if (unsubTeam && unsubscribers.current) {
        unsubscribers.current.push(unsubTeam);
      }
      
      return { user, team };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [roomId]);

  // Start auction for a player
  const startAuction = useCallback(async (player, basePrice) => {
    if (!roomId) {
      setError('No room joined');
      return;
    }
    try {
      setError(null);
      await startPlayerAuction(roomId, player, basePrice);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [roomId]);

  // Place a bid
  const bid = useCallback(async (bidAmount) => {
    if (!myTeam || !userId || !roomId) {
      setError('No team, user, or room assigned');
      return;
    }
    try {
      setError(null);
      await placeBid(roomId, userId, userName, myTeam, bidAmount);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [myTeam, userId, userName, roomId]);

  // Sell player to highest bidder
  const sell = useCallback(async () => {
    if (!roomId) {
      setError('No room joined');
      return;
    }
    try {
      setError(null);
      const result = await sellPlayer(roomId, auction.highestBidderTeam, auction.currentBid);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [auction.highestBidderTeam, auction.currentBid, roomId]);

  // Skip current player
  const skip = useCallback(async () => {
    if (!roomId) {
      setError('No room joined');
      return;
    }
    try {
      setError(null);
      await skipPlayer(roomId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [roomId]);

  // Update timer (for host)
  const setAuctionTimer = useCallback(async (value) => {
    if (!roomId) {
      setError('No room joined');
      return;
    }
    try {
      setError(null);
      await updateTimer(roomId, value);
    } catch (err) {
      setError(err.message);
    }
  }, [roomId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isConnected || !roomId) return;

    // Subscribe to auction updates
    const unsubAuction = subscribeToAuction(roomId, (data) => {
      if (data) {
        setAuction({
          currentPlayer: data.currentPlayer,
          currentBid: data.currentBid || 0,
          highestBidderId: data.highestBidderId || null,
          highestBidderName: data.highestBidderName || null,
          highestBidderTeam: data.highestBidderTeam || null,
          isActive: data.isActive || false,
          timer: data.timer || 15,
          bidCount: data.bidCount || 0
        });
      }
    });
    unsubscribers.current.push(unsubAuction);

    // Subscribe to teams updates
    const unsubTeams = subscribeToTeams(roomId, (teamsData) => {
      setTeams(teamsData);
    });

    // Subscribe to bids
    const unsubBids = subscribeToBids(roomId, (bidsData) => {
      setBids(bidsData);
    });

    unsubscribers.current.push(unsubAuction, unsubTeams, unsubBids);

    return () => cleanup();
  }, [isConnected, roomId, cleanup]);

  // Get array format of teams for UI
  const teamsArray = Object.values(teams).map(team => ({
    name: team.teamName,
    budget: team.purse,
    squad: team.players || [],
    userId: team.userId,
    color: team.color || { primary: '#00d4ff', secondary: '#7b2cbf' }
  }));

  // Check if current user can bid
  const canBid = useCallback((amount) => {
    if (!myTeamData || !auction.isActive) return false;
    if (myTeamData.purse < amount) return false;
    if (myTeam === auction.highestBidder) return false;
    return true;
  }, [myTeamData, auction.isActive, auction.highestBidder, myTeam]);

  return {
    // Room data
    roomId,
    isHost,
    createRoom: createRoomFn,
    joinRoom: joinRoomFn,
    // User data
    userId,
    userName,
    myTeam,
    myTeamData,
    
    // Auction data
    auction,
    teams,
    teamsArray,
    bids,
    
    // State
    isConnected,
    error,
    canBid,
    
    // Actions
    joinAuction,
    startAuction,
    bid,
    sell,
    skip,
    setAuctionTimer,
    cleanup
  };
};

export default useFirestoreAuction;
