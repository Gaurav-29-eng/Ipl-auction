import { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToRoom,
  subscribeToAuction,
  subscribeToPlayers,
  createAuctionRoom,
  joinAuctionRoom,
  placeBid,
  sellPlayer,
  skipPlayer,
  updateTimer,
  startAuction,
  leaveRoom,
  deleteRoom
} from '../firebase/auctionService';

export const useFirebaseAuction = () => {
  const [roomId, setRoomId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState({});
  const [auction, setAuction] = useState({
    currentPlayer: null,
    currentBid: 0,
    highestBidder: null,
    bidHistory: [],
    isActive: false,
    timer: 15
  });
  const [status, setStatus] = useState('idle'); // idle, waiting, active, ended
  const [myTeam, setMyTeam] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const unsubscribers = useRef([]);

  // Clean up all subscriptions
  const cleanup = useCallback(() => {
    unsubscribers.current.forEach(unsub => unsub && unsub());
    unsubscribers.current = [];
  }, []);

  // Create a new room
  const createRoom = useCallback(async (hostName, hostTeam) => {
    try {
      setError(null);
      const result = await createAuctionRoom(hostName, hostTeam);
      setRoomId(result.roomId);
      setIsHost(true);
      setMyTeam(hostTeam);
      setStatus('waiting');
      setIsConnected(true);
      
      // Subscribe to room updates
      const unsubRoom = subscribeToRoom(result.roomId, (data) => {
        if (data) {
          setStatus(data.status);
        }
      });
      
      const unsubPlayers = subscribeToPlayers(result.roomId, (playersData) => {
        setPlayers(playersData || {});
      });
      
      const unsubAuction = subscribeToAuction(result.roomId, (auctionData) => {
        if (auctionData) {
          setAuction(auctionData);
        }
      });
      
      unsubscribers.current.push(unsubRoom, unsubPlayers, unsubAuction);
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Join an existing room
  const joinRoom = useCallback(async (roomCode, playerName, playerTeam) => {
    try {
      setError(null);
      const result = await joinAuctionRoom(roomCode, playerName, playerTeam);
      setRoomId(roomCode);
      setIsHost(false);
      setMyTeam(playerTeam);
      setStatus('waiting');
      setIsConnected(true);
      setPlayers(result.players || {});
      
      // Subscribe to room updates
      const unsubRoom = subscribeToRoom(roomCode, (data) => {
        if (data) {
          setStatus(data.status);
        }
      });
      
      const unsubPlayers = subscribeToPlayers(roomCode, (playersData) => {
        setPlayers(playersData || {});
      });
      
      const unsubAuction = subscribeToAuction(roomCode, (auctionData) => {
        if (auctionData) {
          setAuction(auctionData);
        }
      });
      
      unsubscribers.current.push(unsubRoom, unsubPlayers, unsubAuction);
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Start the auction (host only)
  const beginAuction = useCallback(async (player) => {
    if (!isHost || !roomId) return;
    try {
      await startAuction(roomId, player);
      setStatus('active');
    } catch (err) {
      setError(err.message);
    }
  }, [isHost, roomId]);

  // Place a bid
  const bid = useCallback(async (amount, increment) => {
    if (!roomId || !myTeam) return;
    try {
      await placeBid(roomId, myTeam, amount, increment);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [roomId, myTeam]);

  // Sell player to highest bidder
  const sell = useCallback(async () => {
    if (!isHost || !roomId || !auction.highestBidder) return;
    try {
      await sellPlayer(roomId, auction.highestBidder, auction.currentPlayer, auction.currentBid);
    } catch (err) {
      setError(err.message);
    }
  }, [isHost, roomId, auction.highestBidder, auction.currentPlayer, auction.currentBid]);

  // Skip current player
  const skip = useCallback(async () => {
    if (!isHost || !roomId) return;
    try {
      await skipPlayer(roomId);
    } catch (err) {
      setError(err.message);
    }
  }, [isHost, roomId]);

  // Update timer (host only)
  const setTimer = useCallback(async (value) => {
    if (!isHost || !roomId) return;
    try {
      await updateTimer(roomId, value);
    } catch (err) {
      setError(err.message);
    }
  }, [isHost, roomId]);

  // Leave room
  const exitRoom = useCallback(async () => {
    if (roomId && myTeam) {
      if (isHost) {
        await deleteRoom(roomId);
      } else {
        await leaveRoom(roomId, myTeam);
      }
    }
    cleanup();
    setRoomId(null);
    setIsHost(false);
    setMyTeam(null);
    setStatus('idle');
    setIsConnected(false);
    setPlayers({});
    setAuction({
      currentPlayer: null,
      currentBid: 0,
      highestBidder: null,
      bidHistory: [],
      isActive: false,
      timer: 15
    });
  }, [roomId, myTeam, isHost, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Get array of teams for UI
  const teamsArray = Object.entries(players).map(([teamName, data]) => ({
    name: teamName,
    budget: data.budget,
    squad: data.squad || [],
    color: data.color || { primary: '#00d4ff', secondary: '#7b2cbf', accent: '#FFD700' },
    isAI: false,
    owner: data.name
  }));

  // Get connected users
  const connectedUsers = Object.entries(players).map(([teamName, data]) => ({
    id: teamName,
    name: data.name,
    team: teamName,
    isHost: data.isHost
  }));

  return {
    roomId,
    isHost,
    myTeam,
    players,
    teamsArray,
    connectedUsers,
    auction,
    status,
    error,
    isConnected,
    createRoom,
    joinRoom,
    beginAuction,
    bid,
    sell,
    skip,
    setTimer,
    exitRoom,
    cleanup
  };
};

export default useFirebaseAuction;
