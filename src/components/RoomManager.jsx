import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';

export default function RoomManager({ onEnterAuction }) {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [mode, setMode] = useState('select'); // 'select', 'create', 'join'
  const [isLoading, setIsLoading] = useState(false);

  const { isConnected, createRoom, joinRoom, roomId: currentRoomId, users, isHost } = useSocket();

  const teams = [
    'RCB', 'MI', 'CSK', 'KKR', 'SRH', 'DC', 'RR', 'PBKS', 'GT', 'LSG'
  ];

  const handleCreateRoom = () => {
    if (!userName || !selectedTeam) {
      alert('Please enter your name and select a team');
      return;
    }
    
    setIsLoading(true);
    createRoom({ name: userName, team: selectedTeam });
    setMode('lobby');
    setIsLoading(false);
  };

  const handleJoinRoom = () => {
    if (!roomId || !userName || !selectedTeam) {
      alert('Please enter room ID, your name, and select a team');
      return;
    }
    
    setIsLoading(true);
    joinRoom(roomId.toUpperCase(), { name: userName, team: selectedTeam });
    setMode('lobby');
    setIsLoading(false);
  };

  const handleStartAuction = () => {
    onEnterAuction({
      roomId: currentRoomId,
      userName,
      team: selectedTeam,
      isHost,
      users,
      isMultiplayer: true
    });
  };

  if (!isConnected) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Connecting to server...</div>
      </div>
    );
  }

  if (mode === 'select') {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>🏏 IPL Auction Multiplayer</h1>
        <div style={styles.buttonGroup}>
          <button 
            style={styles.mainButton} 
            onClick={() => setMode('create')}
          >
            Create Room
          </button>
          <button 
            style={styles.mainButton} 
            onClick={() => setMode('join')}
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Create Room</h1>
        
        <input
          style={styles.input}
          placeholder="Your Name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />

        <div style={styles.teamGrid}>
          {teams.map(t => (
            <div
              key={t}
              style={{
                ...styles.teamCard,
                border: selectedTeam === t ? '3px solid #FFD700' : '2px solid transparent'
              }}
              onClick={() => setSelectedTeam(t)}
            >
              {t}
            </div>
          ))}
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.secondaryButton} onClick={() => setMode('select')}>
            Back
          </button>
          <button style={styles.mainButton} onClick={handleCreateRoom} disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Join Room</h1>
        
        <input
          style={styles.input}
          placeholder="Room ID (e.g., ABC123)"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          maxLength={6}
        />

        <input
          style={styles.input}
          placeholder="Your Name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />

        <div style={styles.teamGrid}>
          {teams.map(t => (
            <div
              key={t}
              style={{
                ...styles.teamCard,
                border: selectedTeam === t ? '3px solid #FFD700' : '2px solid transparent'
              }}
              onClick={() => setSelectedTeam(t)}
            >
              {t}
            </div>
          ))}
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.secondaryButton} onClick={() => setMode('select')}>
            Back
          </button>
          <button style={styles.mainButton} onClick={handleJoinRoom} disabled={isLoading}>
            {isLoading ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'lobby' && currentRoomId) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Room: {currentRoomId}</h1>
        
        <div style={styles.usersList}>
          <h3>Players ({users.length})</h3>
          {users.map((user, idx) => (
            <div key={idx} style={styles.userRow}>
              <span>{user.name}</span>
              <span style={styles.teamBadge}>{user.team}</span>
              {user.isHost && <span style={styles.hostBadge}>HOST</span>}
            </div>
          ))}
        </div>

        {isHost ? (
          <button style={styles.startButton} onClick={handleStartAuction}>
            Start Auction
          </button>
        ) : (
          <div style={styles.waiting}>Waiting for host to start...</div>
        )}
      </div>
    );
  }

  return null;
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    color: 'white',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  title: {
    fontSize: '36px',
    marginBottom: '40px',
    background: 'linear-gradient(90deg, #FFD700, #FFA500)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  buttonGroup: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  mainButton: {
    padding: '20px 40px',
    fontSize: '20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
    color: '#1a1a2e',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '20px 40px',
    fontSize: '20px',
    borderRadius: '12px',
    border: '2px solid rgba(255,255,255,0.3)',
    background: 'transparent',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  input: {
    padding: '15px 20px',
    fontSize: '18px',
    borderRadius: '12px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    marginBottom: '20px',
    width: '300px',
    textAlign: 'center',
  },
  teamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
    margin: '20px 0',
  },
  teamCard: {
    padding: '20px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  usersList: {
    background: 'rgba(255,255,255,0.1)',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px',
    minWidth: '300px',
  },
  userRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  teamBadge: {
    background: '#FFD700',
    color: '#1a1a2e',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  hostBadge: {
    background: '#00C853',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    marginLeft: '10px',
  },
  startButton: {
    padding: '20px 60px',
    fontSize: '24px',
    borderRadius: '50px',
    border: 'none',
    background: 'linear-gradient(135deg, #00C853, #00E676)',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  waiting: {
    fontSize: '18px',
    color: 'rgba(255,255,255,0.6)',
  },
  loading: {
    fontSize: '24px',
    color: '#FFD700',
  },
};
