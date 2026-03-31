import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [users, setUsers] = useState([]);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // Room events
    socketRef.current.on('roomCreated', (data) => {
      console.log('Room created:', data.roomId);
      setRoomId(data.roomId);
      setIsHost(true);
      setUsers([data.user]);
    });

    socketRef.current.on('roomJoined', (data) => {
      console.log('Joined room:', data.roomId);
      setRoomId(data.roomId);
      setUsers(data.users);
    });

    socketRef.current.on('userJoined', (data) => {
      console.log('User joined:', data.user.name);
      setUsers(data.users);
    });

    socketRef.current.on('userLeft', (data) => {
      console.log('User left');
      setUsers(data.users);
    });

    // Error handling
    socketRef.current.on('error', (data) => {
      console.error('Socket error:', data.message);
      alert(data.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Room management
  const createRoom = (userData) => {
    if (socketRef.current) {
      socketRef.current.emit('createRoom', userData);
    }
  };

  const joinRoom = (roomId, userData) => {
    if (socketRef.current) {
      socketRef.current.emit('joinRoom', { roomId, userData });
    }
  };

  // Auction events
  const startAuction = (playerData) => {
    if (socketRef.current) {
      socketRef.current.emit('startAuction', playerData);
    }
  };

  const placeBid = (bidData) => {
    if (socketRef.current) {
      socketRef.current.emit('placeBid', bidData);
    }
  };

  const nextPlayer = (playerData) => {
    if (socketRef.current) {
      socketRef.current.emit('nextPlayer', playerData);
    }
  };

  const playerSold = (saleData) => {
    if (socketRef.current) {
      socketRef.current.emit('playerSold', saleData);
    }
  };

  // Listen for auction events
  const onAuctionStarted = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('auctionStarted', callback);
    }
  };

  const onNewBid = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('newBid', callback);
    }
  };

  const onPlayerChanged = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('playerChanged', callback);
    }
  };

  const onPlayerSold = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('playerSold', callback);
    }
  };

  // Remove listeners
  const removeAuctionListeners = () => {
    if (socketRef.current) {
      socketRef.current.off('auctionStarted');
      socketRef.current.off('newBid');
      socketRef.current.off('playerChanged');
      socketRef.current.off('playerSold');
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    roomId,
    users,
    isHost,
    createRoom,
    joinRoom,
    startAuction,
    placeBid,
    nextPlayer,
    playerSold,
    onAuctionStarted,
    onNewBid,
    onPlayerChanged,
    onPlayerSold,
    removeAuctionListeners
  };
}
