const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store rooms and their state
const rooms = {};

// Generate unique room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create room
  socket.on('createRoom', (userData) => {
    const roomId = generateRoomId();
    
    rooms[roomId] = {
      id: roomId,
      host: socket.id,
      users: [{
        id: socket.id,
        name: userData.name,
        team: userData.team,
        isHost: true
      }],
      teams: [{
        name: userData.team,
        budget: 100,
        squad: [],
        color: '#00d4ff',
        isAI: false,
        owner: socket.id
      }],
      auction: {
        currentPlayer: null,
        currentBid: 0,
        lastBidder: null,
        isActive: false,
        currentPlayerIndex: 0,
        bidHistory: []
      }
    };

    socket.join(roomId);
    socket.roomId = roomId;
    
    socket.emit('roomCreated', { 
      roomId, 
      user: rooms[roomId].users[0],
      teams: rooms[roomId].teams 
    });
    io.to(roomId).emit('roomCreated', { 
      roomId, 
      user: rooms[roomId].users[0],
      teams: rooms[roomId].teams 
    });
    console.log('Room created:', roomId, 'by', userData.name);
  });

  // Join room
  socket.on('joinRoom', (data) => {
    const { roomId, userData } = data;
    const room = rooms[roomId];

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Add user to room
    const user = {
      id: socket.id,
      name: userData.name,
      team: userData.team,
      isHost: false
    };

    // Add team for this player
    const newTeam = {
      name: userData.team,
      budget: 100,
      squad: [],
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      isAI: false,
      owner: socket.id
    };

    room.users.push(user);
    room.teams.push(newTeam);
    socket.join(roomId);
    socket.roomId = roomId;

    // Notify all clients in room about updated users and teams
    io.to(roomId).emit('roomJoined', { 
      roomId, 
      users: room.users,
      teams: room.teams,
      isHost: false
    });
    io.to(roomId).emit('userJoined', { 
      user, 
      users: room.users,
      teams: room.teams
    });
    console.log('User joined room:', roomId, userData.name);
  });

  // Start auction
  socket.on('startAuction', (data) => {
    const roomId = socket.roomId;
    const room = rooms[roomId];
    
    if (!room || room.host !== socket.id) {
      socket.emit('error', { message: 'Only host can start auction' });
      return;
    }

    room.auction.isActive = true;
    room.auction.currentPlayer = data.player;
    room.auction.currentBid = data.basePrice;
    room.auction.lastBidder = null;

    io.to(roomId).emit('auctionStarted', room.auction);
    console.log('Auction started in room:', roomId);
  });

  // Place bid
  socket.on('placeBid', (data) => {
    const roomId = socket.roomId;
    const room = rooms[roomId];

    if (!room || !room.auction.isActive) {
      socket.emit('error', { message: 'Auction not active' });
      return;
    }

    // Validate bid
    if (data.bid <= room.auction.currentBid) {
      socket.emit('error', { message: 'Bid must be higher than current bid' });
      return;
    }

    // Update auction state
    room.auction.currentBid = data.bid;
    room.auction.lastBidder = data.team;

    // Add to bid history
    if (!room.auction.bidHistory) {
      room.auction.bidHistory = [];
    }
    room.auction.bidHistory.unshift({
      id: Date.now(),
      team: data.team,
      player: room.auction.currentPlayer,
      amount: data.bid,
      increment: data.increment,
      user: data.userName,
      timestamp: new Date().toISOString()
    });
    // Keep only last 10 bids
    room.auction.bidHistory = room.auction.bidHistory.slice(0, 10);

    // Broadcast to all clients
    io.to(roomId).emit('newBid', {
      bid: data.bid,
      team: data.team,
      user: data.userName,
      increment: data.increment,
      bidHistory: room.auction.bidHistory,
      timestamp: new Date().toISOString()
    });

    console.log('New bid in room', roomId, ':', data.bid, 'by', data.team);
  });

  // Next player
  socket.on('nextPlayer', (data) => {
    const roomId = socket.roomId;
    const room = rooms[roomId];

    if (!room || room.host !== socket.id) {
      socket.emit('error', { message: 'Only host can proceed' });
      return;
    }

    room.auction.currentPlayer = data.player;
    room.auction.currentBid = data.basePrice;
    room.auction.lastBidder = null;
    room.auction.currentPlayerIndex = data.index;

    io.to(roomId).emit('playerChanged', {
      player: data.player,
      basePrice: data.basePrice,
      index: data.index
    });
  });

  // Player sold
  socket.on('playerSold', (data) => {
    const roomId = socket.roomId;
    const room = rooms[roomId];

    if (!room) return;

    // Update team budget and squad
    const winningTeam = room.users.find(u => u.team === data.team);
    if (winningTeam) {
      io.to(roomId).emit('playerSold', {
        player: data.player,
        team: data.team,
        price: data.price,
        timestamp: new Date().toISOString()
      });
    }

    // Reset for next player
    room.auction.lastBidder = null;
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      
      // Remove user from room
      room.users = room.users.filter(u => u.id !== socket.id);
      
      // Notify others
      socket.to(roomId).emit('userLeft', { 
        userId: socket.id, 
        users: room.users 
      });

      // Delete room if empty
      if (room.users.length === 0) {
        delete rooms[roomId];
        console.log('Room deleted:', roomId);
      }
    }
  });
});

// REST API endpoints
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms[req.params.roomId];
  if (room) {
    res.json({
      id: room.id,
      users: room.users.map(u => ({ name: u.name, team: u.team })),
      auction: room.auction
    });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

app.get('/api/rooms', (req, res) => {
  const roomList = Object.values(rooms).map(r => ({
    id: r.id,
    userCount: r.users.length,
    isActive: r.auction.isActive
  }));
  res.json(roomList);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
