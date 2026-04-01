// 🏏 PROFESSIONAL IPL AUCTION SIMULATION
// Features: Modern UI, animations, real-time updates, error handling, MULTIPLAYER

import { useState, useEffect, useRef, useCallback } from "react";
import playersData from "./data/players";
import { useFirestoreAuction } from "./hooks/useFirestoreAuction";

// Team color schemes for professional look
const TEAM_COLORS = {
  RCB: { primary: "#EC1C24", secondary: "#000000", accent: "#FFD700" },
  MI: { primary: "#004BA0", secondary: "#D1AB3E", accent: "#FFD700" },
  CSK: { primary: "#FFFF00", secondary: "#0080AA", accent: "#FFD700" },
  KKR: { primary: "#3A225D", secondary: "#D4AF37", accent: "#FFD700" },
  SRH: { primary: "#FF6600", secondary: "#000000", accent: "#FFD700" },
  DC: { primary: "#004C93", secondary: "#EF1B23", accent: "#FFD700" },
  RR: { primary: "#254AA5", secondary: "#D5A741", accent: "#FFD700" },
  PBKS: { primary: "#ED1C24", secondary: "#A7A9AC", accent: "#FFD700" },
  GT: { primary: "#1B2133", secondary: "#B5E61D", accent: "#FFD700" },
  LSG: { primary: "#0047AB", secondary: "#FF7F00", accent: "#FFD700" },
};



// Animation keyframes as CSS-in-JS
const animations = `
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes soldPulse {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes bidIncrease {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); color: #FFD700; }
  100% { transform: scale(1); }
}
@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes timerPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3); }
  50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.6); }
}
`;

export default function App() {
  const [players] = useState(playersData);
  const [index, setIndex] = useState(0);
  const [bid, setBid] = useState(playersData[0].price);
  const [timer, setTimer] = useState(15);
  const [started, setStarted] = useState(false);
  const [team, setTeam] = useState(null);
  const [highest, setHighest] = useState(null);
  const [sold, setSold] = useState("");
  const [withdrawn, setWithdrawn] = useState([]);
  const [newTeam, setNewTeam] = useState("");
  const [bidAnimation, setBidAnimation] = useState(false);
  const [error, setError] = useState("");
  const [activeTeam, setActiveTeam] = useState(null);
  const [bidHistory, setBidHistory] = useState([]);
  const [soldPlayers, setSoldPlayers] = useState([]);

  // Firestore Multiplayer hook
  const {
    userId: fsUserId,
    userName: fsUserName,
    myTeam: fsMyTeam,
    myTeamData: fsMyTeamData,
    auction: fsAuction,
    teams: fsTeams,
    teamsArray: fsTeamsArray,
    bids: fsBids,
    isConnected: fsIsConnected,
    error: fsError,
    roomId: fsRoomId,
    isHost: fsIsHost,
    createRoom: fsCreateRoom,
    joinRoom: fsJoinRoom,
    joinAuction,
    startAuction,
    placeBid,
    sell: fsSell,
    skip: fsSkip
  } = useFirestoreAuction(playersData);

  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [userName, setUserName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [isHost, setIsHost] = useState(true);

  const [teams, setTeams] = useState([
    { name: "RCB", budget: 100, squad: [], color: TEAM_COLORS.RCB, isAI: true },
    { name: "MI", budget: 100, squad: [], color: TEAM_COLORS.MI, isAI: true },
    { name: "CSK", budget: 100, squad: [], color: TEAM_COLORS.CSK, isAI: true },
    { name: "KKR", budget: 100, squad: [], color: TEAM_COLORS.KKR, isAI: true },
    { name: "SRH", budget: 100, squad: [], color: TEAM_COLORS.SRH, isAI: true },
    { name: "DC", budget: 100, squad: [], color: TEAM_COLORS.DC, isAI: true },
    { name: "RR", budget: 100, squad: [], color: TEAM_COLORS.RR, isAI: true },
    { name: "PBKS", budget: 100, squad: [], color: TEAM_COLORS.PBKS, isAI: true },
    { name: "GT", budget: 100, squad: [], color: TEAM_COLORS.GT, isAI: true },
    { name: "LSG", budget: 100, squad: [], color: TEAM_COLORS.LSG, isAI: true },
  ]);

  // Refs to track latest state values for AI bidding (avoid stale closures)
  const bidRef = useRef(bid);
  const highestRef = useRef(highest);
  const teamRef = useRef(team);
  const withdrawnRef = useRef(withdrawn);
  const soldRef = useRef(sold);
  const currentRef = useRef(null);
  const teamsRef = useRef(teams);

  const current = players[index];

  // Update refs whenever state changes
  useEffect(() => { bidRef.current = bid; }, [bid]);
  useEffect(() => { highestRef.current = highest; }, [highest]);
  useEffect(() => { teamRef.current = team; }, [team]);
  useEffect(() => { withdrawnRef.current = withdrawn; }, [withdrawn]);
  useEffect(() => { soldRef.current = sold; }, [sold]);
  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { teamsRef.current = teams; }, [teams]);

  const bidSound = useRef(new Audio("https://www.soundjay.com/misc/sounds/tink-2.mp3"));
  const soldSound = useRef(new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-01.mp3"));
  const timerWarningSound = useRef(new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3"));

  // Sync Firestore auction data to local state
  useEffect(() => {
    if (isMultiplayer && fsAuction) {
      console.log("[DEBUG] Firestore auction updated:", {
        highestBidderId: fsAuction.highestBidderId,
        highestBidderName: fsAuction.highestBidderName,
        currentBid: fsAuction.currentBid,
        currentPlayer: fsAuction.currentPlayer?.name
      });
      setBid(fsAuction.currentBid || 0);
      // Show highestBidderName if exists, otherwise null
      setHighest(fsAuction.highestBidderName || null);
      setTimer(fsAuction.timer || 15);
    }
  }, [isMultiplayer, fsAuction]);

  const playBid = () => {
    bidSound.current.volume = 0.3;
    bidSound.current.play().catch(() => {});
  };
  const playSold = () => {
    soldSound.current.volume = 0.5;
    soldSound.current.play().catch(() => {});
  };
  const playTimerWarning = () => {
    timerWarningSound.current.volume = 0.2;
    timerWarningSound.current.play().catch(() => {});
  };

  // Show error with auto-clear
  const showError = useCallback((msg) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  }, []);

  // AI Bidding System - Initialize when auction starts
  useEffect(() => {
    console.log("[AUCTION] Auction started:", started);
    console.log("[AUCTION] User team:", team);
    console.log("[AUCTION] All teams:", teams.map(t => ({ name: t.name, isAI: t.isAI })));
    console.log("[AUCTION] Is Multiplayer:", isMultiplayer);
    
    if (!started) {
      console.log("[AUCTION] Not started yet, skipping AI init");
      return;
    }
    
    // Skip AI in multiplayer mode - only human players
    if (isMultiplayer) {
      console.log("[AI] Multiplayer mode detected - AI bidding DISABLED");
      return;
    }
    
    console.log("[AI] Initializing AI bidding system...");
    console.log("[AI] User team:", team);
    console.log("[AI] AI teams:", teams.filter(t => t.isAI && t.name !== team).map(t => t.name));
    
    // AI Bidding with realistic IPL auction behavior
    const scheduleNextBid = () => {
      // Random delay between 1s and 3s (realistic auction timing)
      const delay = 1000 + Math.random() * 2000;
      
      return setTimeout(() => {
        // Use refs to get latest state values (avoid stale closures)
        const currentBid = bidRef.current;
        const currentHighest = highestRef.current;
        const currentTeam = teamRef.current;
        const currentWithdrawn = withdrawnRef.current;
        const currentSold = soldRef.current;
        const currentPlayer = currentRef.current;
        const currentTeams = teamsRef.current;
        
        if (currentSold || !started) {
          return;
        }
        
        // Skip if no player data available
        if (!currentPlayer) {
          scheduleNextBid();
          return;
        }
        
        // Calculate next bid based on latest current bid
        const nextBid = +(currentBid + 0.25).toFixed(2);
        
        // Get eligible AI teams with realistic IPL auction logic
        const eligibleTeams = currentTeams.filter(t => {
          const isAI = t.isAI === true;
          const notUser = t.name !== currentTeam;
          const notWithdrawn = !currentWithdrawn.includes(t.name);
          const notHighestBidder = t.name !== currentHighest;
          
          // Budget checks for realistic bidding
          const canAfford = t.budget >= nextBid;
          
          // Keep reserve budget (don't spend everything on one player)
          // Reserve at least 20Cr or 25% of original budget, whichever is higher
          const minReserve = Math.max(20, t.budget * 0.25);
          const hasReserveBudget = (t.budget - nextBid) >= minReserve;
          
          // Calculate max bid based on player rating (realistic valuation)
          // Base price + (rating - 75) * 2Cr as rough guide, max 25Cr over base
          const playerValue = currentPlayer.price + Math.min(25, Math.max(0, (currentPlayer.rating - 75) * 2));
          const maxBidLimit = playerValue * 1.3; // 30% margin over estimated value
          const withinBudgetLimit = nextBid <= maxBidLimit;
          
          // Stop bidding if bid exceeds reasonable limit
          const notOverpriced = nextBid <= maxBidLimit;
          
          // AI is more likely to bid on star players (rating > 85)
          const isStarPlayer = currentPlayer.rating > 85;
          
          // For star players, be more aggressive; for average players, be conservative
          let shouldBid = isAI && notUser && notWithdrawn && canAfford && notHighestBidder && hasReserveBudget && notOverpriced;
          
          // Log AI decision making
          if (isAI && notUser) {
            console.log(`[AI] ${t.name}: canAfford=${canAfford}, hasReserve=${hasReserveBudget}, withinLimit=${notOverpriced}, isStar=${isStarPlayer}`);
          }
          
          return shouldBid;
        });
        
        if (eligibleTeams.length === 0) {
          // Schedule next attempt even if no eligible teams now
          scheduleNextBid();
          return;
        }
        
        // Select random AI team from eligible
        const bidder = eligibleTeams[Math.floor(Math.random() * eligibleTeams.length)];
        
        // Dynamic bidding probability based on situation
        // Star players: 80% chance, Regular: 60% chance, Bid wars: reduce chance
        const isStarPlayer = currentPlayer.rating > 85;
        const bidWar = currentBid > currentPlayer.price * 3;
        let bidChance = isStarPlayer ? 0.80 : 0.60;
        if (bidWar) bidChance *= 0.5; // Reduce chance in bid wars
        
        // Sometimes skip bidding (realistic auction behavior)
        if (Math.random() < bidChance) {
          // Randomly choose increment: 70% +25L, 20% +50L, 10% +1Cr
          const incrementRoll = Math.random();
          let increment = 0.25;
          if (incrementRoll > 0.90) increment = 1.00;
          else if (incrementRoll > 0.70) increment = 0.50;
          
          // Calculate new bid based on LATEST current bid
          const newBid = +(currentBid + increment).toFixed(2);
          
          // Prevent duplicate bids - ensure new bid is strictly greater
          if (newBid <= currentBid) {
            console.log("[AI] Duplicate bid prevented:", newBid, "<=", currentBid);
            scheduleNextBid();
            return;
          }
          
          console.log(`[AI] ${bidder.name} bids ${newBid}Cr (+${increment}Cr) on ${currentPlayer.name}`);
          
          // Update global state
          setBid(newBid);
          setHighest(bidder.name);
          setTimer(15);
          setActiveTeam(bidder.name);
          setBidAnimation(true);
          
          // Add to history
          setBidHistory(prev => [{
            id: Date.now(),
            team: bidder.name,
            player: currentPlayer?.name || 'Unknown',
            amount: newBid,
            increment: increment,
            time: new Date().toLocaleTimeString()
          }, ...prev].slice(0, 10));
          
          playBid();
          
          setTimeout(() => setBidAnimation(false), 300);
          setTimeout(() => setActiveTeam(null), 1500);
        } else {
          console.log(`[AI] ${bidder.name} chose not to bid (random skip)`);
        }
        
        // Schedule next bid attempt
        scheduleNextBid();
      }, delay);
    };
    
    // Start the AI bidding loop
    const timeoutId = scheduleNextBid();
    
    return () => {
      console.log("[AI] Stopping AI bidding");
      clearTimeout(timeoutId);
    };
  }, [started, isMultiplayer]); // Re-run when started or multiplayer mode changes

  // Timer Logic
  useEffect(() => {
    if (!started || sold) return;
    if (timer <= 0) {
      setTimeout(() => finalize(), 0);
      return;
    }

    // Play warning sound when timer reaches 5 seconds //
    if (timer === 5) {
      playTimerWarning();
    }

    const t = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [timer, started, sold]);

  const userTeamData = teams.find((t) => t.name === team);
  // Calculate next bid based on selected increment
  const getNextBid = (currentBid, increment) => +(currentBid + increment).toFixed(2);
  
  const nextBid25L = getNextBid(bid, 0.25);
  const nextBid50L = getNextBid(bid, 0.50);
  const nextBid1Cr = getNextBid(bid, 1.00);
  
  // Check if user can bid (purse, withdrawn, and NOT already highest bidder)
  const canBid = (amount) => {
    const hasBudget = userTeamData && userTeamData.budget >= amount;
    const notWithdrawn = !withdrawn.includes(team);
    const notHighestBidder = highest !== team; // Cannot bid if already highest
    
    return hasBudget && notWithdrawn && notHighestBidder;
  };

  const userBid = (increment) => {
    const currentBid = bid;
    const newBid = +(currentBid + increment).toFixed(2);
    
    // Prevent duplicate bids - must be strictly greater than current
    if (newBid <= currentBid) {
      showError("Bid must be higher than current bid!");
      return;
    }
    
    // Check if user is already highest bidder
    if (highest === team) {
      showError("You are already the highest bidder!");
      return;
    }
    
    // Check if user has enough budget
    const userTeam = teams.find((t) => t.name === team);
    if (!userTeam || userTeam.budget < newBid) {
      showError("Insufficient budget for this bid!");
      return;
    }
    
    console.log("[USER BID]", team, "bids", newBid, "(+" + increment + "Cr)");
    
    // Update global state (single source of truth)
    setBid(newBid);
    setHighest(team);
    setTimer(15);
    setBidAnimation(true);
    setTimeout(() => setBidAnimation(false), 300);
    
    // Firestore multiplayer bid
    if (isMultiplayer) {
      placeBid(newBid).catch(err => {
        console.error("[USER BID] Firestore error:", err);
      });
    }
    
    // Add to bid history
    setBidHistory(prev => [{
      id: Date.now(),
      team: team,
      player: current.name,
      amount: newBid,
      increment: increment,
      time: new Date().toLocaleTimeString()
    }, ...prev].slice(0, 10));
    
    playBid();
  };

  const skip = () => {
    if (highest) {
      showError("Cannot skip - bidding in progress!");
      return;
    }
    next();
  };

  const withdraw = () => {
    if (highest === team) {
      showError("Cannot withdraw - you have the highest bid!");
      return;
    }
    if (withdrawn.includes(team)) {
      showError("Already withdrawn!");
      return;
    }
    setWithdrawn((prev) => [...prev, team]);
  };

  const finalize = () => {
    if (!highest) {
      next();
      return;
    }

    const winningTeam = teams.find((t) => t.name === highest);
    setSold(`🏆 SOLD TO ${highest}`);
    playSold();

    const updated = teams.map((t) =>
      t.name === highest
        ? {
            ...t,
            budget: +(t.budget - bid).toFixed(2),
            squad: [...t.squad, current],
          }
        : t
    );

    setTeams(updated);
    
    // Firestore multiplayer - sell player
    if (isMultiplayer && fsAuction?.highestBidder) {
      fsSell().catch(err => {
        console.error("[FINALIZE] Firestore sell error:", err);
      });
    }
    
    // Add to sold players history
    setSoldPlayers(prev => [{
      id: Date.now(),
      player: current,
      team: highest,
      price: bid,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }, ...prev]);

    setTimeout(() => {
      setSold("");
      next();
    }, 2500);
  };

  const next = () => {
    const n = index + 1;
    if (n >= players.length) {
      alert("🎉 Auction Complete! Check final squads.");
      return;
    }

    setIndex(n);
    setBid(players[n].price);
    setTimer(15);
    setHighest(null);
    setWithdrawn([]);
    setActiveTeam(null);
  };

  const addTeam = () => {
    if (!newTeam.trim()) return;
    if (teams.find((t) => t.name.toLowerCase() === newTeam.toLowerCase())) {
      showError("Team already exists!");
      return;
    }
    const newT = {
      name: newTeam.toUpperCase(),
      budget: 100,
      squad: [],
      color: { primary: "#666", secondary: "#999", accent: "#FFD700" },
      isAI: true, // Custom teams are AI-controlled
    };
    setTeams([...teams, newT]);
    setTeam(newT.name);
    setNewTeam("");
  };

  // Multiplayer room management
  const createRoom = async () => {
    console.log("[CREATE ROOM] ========== BUTTON CLICKED ==========");
    console.log("[CREATE ROOM] userName:", userName);
    console.log("[CREATE ROOM] teamName:", teamName);
    
    // STRICT NULL CHECK - Ensure inputs are never null
    const safeUserName = (userName || '').toString();
    const safeTeamName = (teamName || '').toString();
    
    console.log("[CREATE ROOM] safeUserName:", safeUserName);
    console.log("[CREATE ROOM] safeTeamName:", safeTeamName);
    
    // GUARD CLAUSE - Stop if null
    if (!safeUserName || typeof safeUserName !== 'string' || safeUserName.trim() === '') {
      console.log("[CREATE ROOM] ❌ Validation failed - no username");
      alert("Enter valid name");
      return;
    }
    
    if (!safeTeamName || typeof safeTeamName !== 'string' || safeTeamName.trim() === '') {
      console.log("[CREATE ROOM] ❌ Validation failed - no team name");
      alert("Enter valid team name");
      return;
    }
    
    try {
      console.log("[CREATE ROOM] ✅ All validations passed");
      const newRoomId = await fsCreateRoom();
      console.log("[CREATE ROOM] Created room:", newRoomId);
      
      if (!newRoomId || typeof newRoomId !== 'string') {
        throw new Error('Failed to generate valid room ID');
      }
      
      // Ensure trimmed values are strings before passing
      const trimmedUserName = safeUserName.trim();
      const trimmedTeamName = safeTeamName.trim();
      
      console.log("[CREATE ROOM] Joining with:", trimmedUserName, trimmedTeamName, newRoomId);
      await joinAuction(trimmedUserName, trimmedTeamName, newRoomId);
      setIsMultiplayer(true);
      setHasJoined(true);
      console.log("[CREATE ROOM] Successfully joined auction in room:", newRoomId);
    } catch (err) {
      // Simplest possible error handling - no complex operations
      console.error("[CREATE ROOM] ❌ Error raw:", err);
      let msg = 'Failed to create room';
      if (err) {
        if (err.message) msg = err.message;
        else msg = String(err);
      }
      alert(msg);
    }
  };

  const joinRoom = async () => {
    console.log("[JOIN ROOM] ========== BUTTON CLICKED ==========");
    console.log("[JOIN ROOM] userName:", userName);
    console.log("[JOIN ROOM] teamName:", teamName);
    console.log("[JOIN ROOM] joinRoomId:", joinRoomId);
    
    if (!userName.trim()) {
      console.log("[JOIN ROOM] ❌ Validation failed - no username");
      showError("Please enter your name");
      return;
    }
    
    if (!teamName.trim()) {
      console.log("[JOIN ROOM] ❌ Validation failed - no team name");
      showError("Please enter your team name");
      return;
    }
    
    if (!joinRoomId.trim()) {
      console.log("[JOIN ROOM] ❌ Validation failed - no room ID");
      showError("Please enter a room ID to join");
      return;
    }
    
    try {
      console.log("[JOIN ROOM] ✅ All validations passed");
      // Join the room first
      await fsJoinRoom(joinRoomId);
      console.log("[JOIN ROOM] Joined room:", joinRoomId);
      // Then join the auction in this room - pass roomId directly
      await joinAuction(userName, teamName, joinRoomId);
      setIsMultiplayer(true);
      setHasJoined(true);
      console.log("[JOIN ROOM] Successfully joined auction in room:", joinRoomId);
    } catch (err) {
      console.error("[JOIN ROOM] ❌ Error raw:", err);
      let msg = 'Failed to join room';
      if (err) {
        if (err.message) msg = err.message;
        else msg = String(err);
      }
      alert(msg);
    }
  };

  const startMultiplayerAuction = async () => {
    if (current) {
      await startAuction({
        ...current,
        basePrice: current.price
      });
      setStarted(true);
    }
  };

  const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${current.name}&backgroundColor=gold`;

  // TEAM SELECTION SCREEN
  if (!started) {
    return (
      <div style={styles.teamSelectionContainer}>
        <style>{animations}</style>
        <div style={styles.teamSelectionHeader}>
          <h1 style={styles.teamSelectionTitle}>🏏 SELECT YOUR TEAM</h1>
          <p style={styles.teamSelectionSubtitle}>Choose your franchise to enter the auction</p>
        </div>

        <div style={styles.teamGrid}>
          {teams.map((t) => (
            <div
              key={t.name}
              onClick={() => setTeam(t.name)}
              style={{
                ...styles.teamCard,
                background: team === t.name 
                  ? `linear-gradient(135deg, ${t.color.primary}40, ${t.color.secondary}30)`
                  : "linear-gradient(135deg, #1a1a2e, #16213e)",
                border: team === t.name 
                  ? `3px solid ${t.color.primary}` 
                  : "2px solid rgba(255,255,255,0.1)",
                boxShadow: team === t.name 
                  ? `0 0 30px ${t.color.primary}60, 0 0 60px ${t.color.primary}30`
                  : "0 4px 15px rgba(0,0,0,0.3)",
                transform: team === t.name ? "scale(1.05)" : "scale(1)",
              }}
            >
              <div style={styles.teamLogo}>{t.name}</div>
              <div style={styles.teamBudget}>₹{t.budget}Cr Purse</div>
              {team === t.name && <div style={styles.selectedBadge}>✓ SELECTED</div>}
            </div>
          ))}
        </div>

        <div style={styles.customTeamSection}>
          <input
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            placeholder="Enter custom team name"
            style={styles.customTeamInput}
            maxLength={5}
          />
          <button onClick={addTeam} style={styles.addTeamBtn}>+ Add Team</button>
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}

        {/* Multiplayer Section - Premium UI */}
        <div style={styles.multiplayerCard}>
          <div style={styles.multiplayerHeader}>
            <h3 style={styles.multiplayerTitle}>🌐 Multiplayer</h3>
            <p style={styles.multiplayerSubtitle}>Play with friends in real-time</p>
            <div style={styles.connectionStatus}>
              {fsIsConnected ? (
                <span style={styles.statusConnected}>🟢 Connected</span>
              ) : (
                <span style={styles.statusDisconnected}>🔴 Disconnected - Check Firestore</span>
              )}
            </div>
          </div>
          
          <input
            style={styles.mpNameInput}
            placeholder="Enter your name..."
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />

          <input
            style={styles.mpNameInput}
            placeholder="Enter your team name..."
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />

          {!isMultiplayer ? (
            <div style={styles.mpOptionsContainer}>
              {/* Create Room Section */}
              <div style={styles.mpOptionCard}>
                <div style={styles.mpOptionIcon}>🏠</div>
                <div style={styles.mpOptionTitle}>Create Room</div>
                <div style={styles.mpOptionDesc}>Start a new auction room</div>
                <button 
                  style={{
                    ...styles.mpPrimaryButton,
                    opacity: !userName ? 0.5 : 1,
                    cursor: !userName ? "not-allowed" : "pointer",
                    pointerEvents: "auto",
                  }}
                  onClick={createRoom}
                  disabled={!userName}
                >
                  <span style={styles.mpButtonIcon}>+</span>
                  Create Room
                </button>
              </div>

              {/* OR Divider */}
              <div style={styles.mpOrDivider}>
                <span style={styles.mpOrLine}></span>
                <span style={styles.mpOrText}>OR</span>
                <span style={styles.mpOrLine}></span>
              </div>

              {/* Join Room Section */}
              <div style={styles.mpOptionCard}>
                <div style={styles.mpOptionIcon}>🔗</div>
                <div style={styles.mpOptionTitle}>Join Room</div>
                <div style={styles.mpOptionDesc}>Enter a room ID to join</div>
                <div style={styles.mpJoinRow}>
                  <input
                    style={styles.mpRoomInput}
                    placeholder="Room ID"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                  <button
                    style={{
                      ...styles.mpSecondaryButton,
                      opacity: !userName || !joinRoomId ? 0.5 : 1,
                      cursor: !userName || !joinRoomId ? "not-allowed" : "pointer",
                    }}
                    onClick={() => joinRoom(joinRoomId)}
                    disabled={!userName || !joinRoomId}
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.lobbyCard}>
              {/* Lobby Header */}
              <div style={styles.lobbyHeader}>
                <div style={styles.lobbyIcon}>🎮</div>
                <h3 style={styles.lobbyTitle}>Game Lobby</h3>
                <div style={styles.connectionStatus}>
                  {fsIsConnected ? (
                    <span style={styles.statusConnected}>🟢 Connected</span>
                  ) : (
                    <span style={styles.statusDisconnected}>🔴 Disconnected</span>
                  )}
                </div>
              </div>

              {/* Room Info Display - Show Room ID for Host */}
              {fsIsHost && fsRoomId && (
                <div style={styles.roomIdContainer}>
                  <div style={styles.roomIdLabel}>ROOM ID (Share this)</div>
                  <div style={styles.roomIdValue}>{fsRoomId}</div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(fsRoomId);
                      alert('Room ID copied to clipboard!');
                    }}
                    style={styles.copyBtn}
                  >
                    📋 Copy Room ID
                  </button>
                  <div style={styles.roomIdHint}>Share this ID with others to join</div>
                </div>
              )}

              {/* Teams Count Display */}
              <div style={styles.roomIdContainer}>
                <div style={styles.roomIdLabel}>TEAMS IN AUCTION</div>
                <div style={styles.roomIdValue}>{fsTeamsArray.length}</div>
                <div style={styles.roomIdHint}>Teams participating in this auction</div>
              </div>

              {/* Players List */}
              <div style={styles.playersSection}>
                <div style={styles.playersHeader}>
                  <span style={styles.playersIcon}>👥</span>
                  <span style={styles.playersTitle}>Teams ({fsTeamsArray.length})</span>
                </div>
                <div style={styles.playersList}>
                  {fsTeamsArray.map((t, index) => (
                    <div key={t.name} style={styles.playerCard}>
                      <div style={styles.playerAvatar}>{t.name.charAt(0).toUpperCase()}</div>
                      <div style={styles.playerInfo}>
                        <div style={styles.playerName}>{t.name}</div>
                        <div style={styles.playerTeam}>Purse: ₹{t.budget} Cr</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Waiting Message */}
              <div style={styles.waitingSection}>
                <div style={styles.hostMessage}>
                  <div style={styles.waitingText}>Waiting for all teams to join...</div>
                  <div style={styles.playerCount}>{fsTeamsArray.length} team{fsTeamsArray.length !== 1 ? 's' : ''} joined</div>
                </div>
              </div>

              {/* Action Button */}
              {isHost ? (
                <button 
                  style={styles.startAuctionBtn}
                  onClick={startMultiplayerAuction}
                  disabled={fsTeamsArray.length < 1}
                >
                  <span style={styles.startAuctionIcon}>▶</span>
                  Start Auction
                </button>
              ) : (
                <div style={styles.guestWaitingBtn}>
                  <span style={styles.pulseDot}></span>
                  Waiting for host...
                </div>
              )}
            </div>
          )}
        </div>

        <button
          disabled={!team}
          onClick={() => setStarted(true)}
          style={{
            ...styles.singlePlayerBtn,
            opacity: team ? 1 : 0.5,
            cursor: team ? "pointer" : "not-allowed",
          }}
        >
          <span style={styles.singlePlayerText}>Single Player</span>
          <span style={styles.singlePlayerArrow}>→</span>
        </button>
      </div>
    );
  }

  // AUCTION SCREEN
  return (
    <div style={styles.auctionContainer}>
      <style>{animations}</style>
      
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <span style={styles.iplLogo}>🏏</span>
          <span style={styles.iplText}>IPL Auction</span>
        </div>
        <div style={styles.topBarCenter}>
          <span style={styles.roundText}>Player {index + 1} of {players.length}</span>
        </div>
        <div style={styles.topBarRight}>
          <div
            style={{
              ...styles.yourTeamBadge,
              background: `linear-gradient(135deg, ${userTeamData?.color.primary}, ${userTeamData?.color.secondary})`,
            }}
          >
            {team}
          </div>
        </div>
      </div>

      {/* Status Bar - Shows current bidding status */}
      {highest && (
        <div style={{
          ...styles.statusBar,
          background: highest === team 
            ? 'linear-gradient(90deg, rgba(0,200,83,0.3), rgba(0,200,83,0.1))' 
            : 'linear-gradient(90deg, rgba(255,215,0,0.3), rgba(255,215,0,0.1))',
          borderColor: highest === team ? '#00C853' : '#FFD700',
        }}>
          <span style={styles.statusText}>
            {highest === team 
              ? `✓ You (${team}) are leading with ₹${bid.toFixed(2)} Cr`
              : `${highest} is leading with ₹${bid.toFixed(2)} Cr`
            }
          </span>
        </div>
      )}

      {/* Sold Banner */}
      {sold && (
        <div 
          style={{
            ...styles.soldBanner,
            boxShadow: `0 0 100px ${teams.find((t) => t.name === highest)?.color.primary}80, 0 0 200px ${teams.find((t) => t.name === highest)?.color.primary}40`,
            border: `4px solid ${teams.find((t) => t.name === highest)?.color.primary}`,
          }}
        >
          <div 
            style={{
              ...styles.soldTeamBadge,
              background: `linear-gradient(135deg, ${teams.find((t) => t.name === highest)?.color.primary}, ${teams.find((t) => t.name === highest)?.color.secondary})`,
            }}
          >
            {highest}
          </div>
          <div style={styles.soldText}>🏆 SOLD</div>
          <div style={styles.soldPrice}>₹{bid.toFixed(2)} Cr</div>
          <div style={styles.soldTo}>to {highest}</div>
        </div>
      )}

      {/* Error Toast */}
      {error && <div style={styles.errorToast}>{error}</div>}

      {/* Main 3-Column Layout */}
      <div style={styles.newMainLayout}>
        {/* LEFT: Player Info */}
        <div style={styles.leftColumn}>
          <h3 style={styles.columnTitle}>� Player</h3>
          <div style={styles.playerInfoCard}>
            <div style={styles.playerImageContainer}>
              <img src={avatar} alt={current.name} style={styles.playerImageLarge} />
              <div style={styles.playerRatingBadgeLarge}>⭐ {current.rating}</div>
            </div>
            <h2 style={styles.playerNameLarge}>{current.name}</h2>
            <div style={styles.playerRoleBadge}>{current.role}</div>
            <div style={styles.basePriceBox}>
              <span style={styles.basePriceLabel}>Base Price</span>
              <span style={styles.basePriceValue}>₹{current.price} Cr</span>
            </div>
          </div>

          {/* Bid History */}
          <div style={styles.bidHistoryBox}>
            <h4 style={styles.bidHistoryTitle}>📜 Recent Bids</h4>
            <div style={styles.bidHistoryList}>
              {bidHistory.length === 0 ? (
                <div style={styles.noBidsText}>No bids yet</div>
              ) : (
                bidHistory.slice(0, 5).map((bid, i) => (
                  <div 
                    key={bid.id} 
                    style={{
                      ...styles.bidHistoryItem,
                      borderLeft: `3px solid ${teams.find(t => t.name === bid.team)?.color.primary || '#666'}`,
                      background: i === 0 ? 'rgba(255,215,0,0.1)' : 'transparent',
                    }}
                  >
                    <span style={styles.bidHistoryTeam}>{bid.team}</span>
                    <span style={styles.bidHistoryAmount}>₹{bid.amount.toFixed(2)}Cr</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Current Bid & Controls */}
        <div style={styles.centerColumn}>
          {/* Current Bid Display */}
          <div style={{
            ...styles.currentBidBox,
            boxShadow: highest 
              ? `0 0 60px ${(isMultiplayer ? fsTeamsArray : teams).find((t) => t.name === highest)?.color.primary}40`
              : '0 0 60px rgba(255,215,0,0.2)',
            borderColor: highest 
              ? (isMultiplayer ? fsTeamsArray : teams).find((t) => t.name === highest)?.color.primary 
              : '#FFD700',
          }}>
            <div style={styles.currentBidLabel}>Current Bid</div>
            <div style={styles.currentBidAmount}>₹{bid.toFixed(2)} Cr</div>
            {highest && (
              <div style={{
                ...styles.currentBidderTag,
                color: (isMultiplayer ? fsTeamsArray : teams).find((t) => t.name === highest)?.color.primary,
              }}>
                {highest === team ? 'You are leading!' : `${highest} is leading`}
              </div>
            )}
          </div>

          {/* Timer */}
          <div
            style={{
              ...styles.timerBox,
              animation: timer <= 5 ? "timerPulse 1s infinite" : "none",
              color: timer <= 5 ? "#ff4444" : timer <= 10 ? "#ffaa00" : "#00ff88",
            }}
          >
            ⏱️ {timer}s
          </div>

          {/* Bid Buttons */}
          <div style={styles.bidButtonsContainer}>
            <div style={styles.bidButtonsRow}>
              <button
                onClick={() => userBid(0.25)}
                disabled={!canBid(nextBid25L)}
                style={{
                  ...styles.bidButton,
                  opacity: canBid(nextBid25L) ? 1 : 0.4,
                  cursor: canBid(nextBid25L) ? "pointer" : "not-allowed",
                  transform: canBid(nextBid25L) ? 'scale(1)' : 'scale(0.95)',
                }}
              >
                <span style={styles.bidBtnValue}>+25L</span>
                <span style={styles.bidBtnPrice}>₹{nextBid25L.toFixed(2)}Cr</span>
              </button>

              <button
                onClick={() => userBid(0.50)}
                disabled={!canBid(nextBid50L)}
                style={{
                  ...styles.bidButton,
                  ...styles.bidButtonBlue,
                  opacity: canBid(nextBid50L) ? 1 : 0.4,
                  cursor: canBid(nextBid50L) ? "pointer" : "not-allowed",
                  transform: canBid(nextBid50L) ? 'scale(1)' : 'scale(0.95)',
                }}
              >
                <span style={styles.bidBtnValue}>+50L</span>
                <span style={styles.bidBtnPrice}>₹{nextBid50L.toFixed(2)}Cr</span>
              </button>

              <button
                onClick={() => userBid(1.00)}
                disabled={!canBid(nextBid1Cr)}
                style={{
                  ...styles.bidButton,
                  ...styles.bidButtonPurple,
                  opacity: canBid(nextBid1Cr) ? 1 : 0.4,
                  cursor: canBid(nextBid1Cr) ? "pointer" : "not-allowed",
                  transform: canBid(nextBid1Cr) ? 'scale(1)' : 'scale(0.95)',
                }}
              >
                <span style={styles.bidBtnValue}>+1Cr</span>
                <span style={styles.bidBtnPrice}>₹{nextBid1Cr.toFixed(2)}Cr</span>
              </button>
            </div>

            {/* Disabled message if user is highest bidder */}
            {highest === team && (
              <div style={styles.disabledMessage}>
                ✓ You are the highest bidder - waiting for others
              </div>
            )}

            {/* Other Actions */}
            <div style={styles.actionButtonsRow}>
              <button onClick={skip} style={styles.actionButton}>
                <span>⏭️</span>
                <span>Skip</span>
              </button>
              <button
                onClick={withdraw}
                disabled={withdrawn.includes(team) || highest === team}
                style={{
                  ...styles.actionButton,
                  ...styles.withdrawButton,
                  opacity: withdrawn.includes(team) || highest === team ? 0.4 : 1,
                  cursor: withdrawn.includes(team) || highest === team ? "not-allowed" : "pointer",
                }}
              >
                <span>🚫</span>
                <span>{withdrawn.includes(team) ? "Withdrawn" : "Withdraw"}</span>
              </button>
            </div>
          </div>

          {/* Withdrawn Teams */}
          {withdrawn.length > 0 && (
            <div style={styles.withdrawnBox}>
              <span style={styles.withdrawnLabel}>Withdrawn:</span>
              {withdrawn.map((t) => (
                <span key={t} style={styles.withdrawnBadge}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: All Teams */}
        <div style={styles.rightColumn}>
          <h3 style={styles.columnTitle}>🏏 Teams</h3>
          <div style={styles.teamsGrid}>
            {(isMultiplayer ? fsTeamsArray : teams).map((t) => (
              <div
                key={t.name}
                style={{
                  ...styles.teamCardNew,
                  background: highest === t.name 
                    ? `linear-gradient(135deg, ${t.color.primary}60, ${t.color.secondary}40)`
                    : `linear-gradient(135deg, ${t.color.primary}20, ${t.color.secondary}10)`,
                  border: highest === t.name 
                    ? `2px solid ${t.color.primary}`
                    : '2px solid transparent',
                  boxShadow: highest === t.name 
                    ? `0 0 30px ${t.color.primary}60, 0 0 60px ${t.color.primary}30`
                    : '0 4px 15px rgba(0,0,0,0.2)',
                  transform: highest === t.name ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <div style={styles.teamCardHeader}>
                  <span style={{ ...styles.teamCardName, color: t.color.primary }}>
                    {t.name}
                  </span>
                  {(!isMultiplayer && t.name !== team) && (
                    <span style={styles.teamCardAiBadge}>AI</span>
                  )}
                  {highest === t.name && (
                    <span style={styles.leadingBadge}>👑</span>
                  )}
                </div>
                <div style={styles.teamCardBudget}>₹{t.budget.toFixed(1)}Cr</div>
                <div style={styles.teamCardPlayers}>{t.squad.length} players</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles object
const styles = {
  // Team Selection Styles
  teamSelectionContainer: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    color: "white",
    padding: "40px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  teamSelectionHeader: {
    textAlign: "center",
    marginBottom: "40px",
    width: "100%",
    padding: "0 20px",
    boxSizing: "border-box",
  },
  teamSelectionTitle: {
    fontSize: "48px",
    margin: "0 0 10px 0",
    background: "linear-gradient(90deg, #FFD700, #FFA500, #FFD700)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "0 0 30px rgba(255, 215, 0, 0.3)",
    lineHeight: "1.2",
    display: "block",
    width: "100%",
    whiteSpace: "nowrap",
  },
  teamSelectionSubtitle: {
    fontSize: "18px",
    color: "rgba(255,255,255,0.6)",
    margin: 0,
  },
  teamGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "20px",
    width: "100%",
    maxWidth: "1000px",
    marginBottom: "30px",
  },
  teamCard: {
    padding: "30px 20px",
    borderRadius: "16px",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  },
  teamLogo: {
    fontSize: "32px",
    fontWeight: "bold",
    marginBottom: "10px",
    textShadow: "0 2px 10px rgba(0,0,0,0.5)",
  },
  teamBudget: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.7)",
  },
  selectedBadge: {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "#00C853",
    color: "white",
    padding: "4px 8px",
    borderRadius: "8px",
    fontSize: "10px",
    fontWeight: "bold",
  },
  customTeamSection: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  customTeamInput: {
    padding: "12px 20px",
    borderRadius: "12px",
    border: "2px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    fontSize: "16px",
    outline: "none",
    width: "200px",
  },
  addTeamBtn: {
    padding: "12px 20px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  errorMessage: {
    background: "rgba(255,0,0,0.2)",
    color: "#ff6b6b",
    padding: "10px 20px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  enterAuctionBtn: {
    padding: "18px 50px",
    borderRadius: "50px",
    border: "none",
    background: "linear-gradient(135deg, #FFD700, #FFA500)",
    color: "#1a1a2e",
    fontSize: "20px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    transition: "transform 0.3s, box-shadow 0.3s",
    boxShadow: "0 10px 30px rgba(255, 215, 0, 0.3)",
  },
  enterAuctionText: {},
  enterAuctionArrow: {
    fontSize: "24px",
  },

  // Auction Screen Styles
  auctionContainer: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0c29, #1a1a2e, #24243e)",
    color: "white",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 30px",
    background: "rgba(0,0,0,0.3)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  iplLogo: {
    fontSize: "28px",
  },
  iplText: {
    fontSize: "20px",
    fontWeight: "bold",
    background: "linear-gradient(90deg, #FFD700, #FFA500)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  topBarCenter: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.6)",
  },
  roundText: {},
  topBarRight: {},
  yourTeamBadge: {
    padding: "10px 20px",
    borderRadius: "25px",
    fontWeight: "bold",
    fontSize: "16px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
  },
  soldBanner: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 1000,
    background: "linear-gradient(135deg, rgba(255,215,0,0.95), rgba(255,165,0,0.95))",
    padding: "50px 70px",
    borderRadius: "24px",
    textAlign: "center",
    animation: "soldPulse 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    boxShadow: "0 0 60px rgba(255, 215, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  soldTeamBadge: {
    padding: "12px 30px",
    borderRadius: "30px",
    color: "white",
    fontWeight: "bold",
    fontSize: "20px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    marginBottom: "10px",
    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
  },
  soldText: {
    fontSize: "48px",
    fontWeight: "bold",
    color: "#1a1a2e",
    textShadow: "0 2px 10px rgba(255,255,255,0.3)",
    letterSpacing: "2px",
  },
  soldPrice: {
    fontSize: "36px",
    color: "#1a1a2e",
    fontWeight: "600",
  },
  soldTo: {
    fontSize: "16px",
    color: "rgba(26,26,46,0.7)",
    marginTop: "5px",
  },
  errorToast: {
    position: "fixed",
    top: "80px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(255,0,0,0.9)",
    color: "white",
    padding: "12px 24px",
    borderRadius: "8px",
    zIndex: 1001,
    animation: "slideIn 0.3s ease",
  },
  mainLayout: {
    display: "grid",
    gridTemplateColumns: "300px 1fr 300px",
    gap: "20px",
    padding: "20px",
    maxWidth: "1600px",
    margin: "0 auto",
  },
  leftPanel: {
    background: "rgba(255,255,255,0.05)",
    borderRadius: "16px",
    padding: "20px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  panelTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    margin: "0 0 20px 0",
    color: "#FFD700",
  },
  teamsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  teamItem: {
    padding: "12px",
    borderRadius: "8px",
    transition: "all 0.3s ease",
  },
  teamItemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  teamName: {
    fontWeight: "bold",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  aiBadge: {
    fontSize: "10px",
    background: "rgba(0,200,83,0.3)",
    color: "#00E676",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: "normal",
  },
  teamPurse: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.8)",
  },
  purseBarBg: {
    width: "100%",
    height: "6px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "3px",
    overflow: "hidden",
    marginBottom: "4px",
  },
  purseBar: {
    height: "100%",
    transition: "width 0.5s ease",
  },
  squadCount: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.5)",
  },
  centerPanel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
  },
  currentBidder: {
    padding: "15px 30px",
    borderRadius: "12px",
    textAlign: "center",
    transition: "all 0.3s ease",
    minWidth: "300px",
  },
  currentBidderLabel: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.6)",
    display: "block",
    marginBottom: "5px",
  },
  currentBidderName: {
    fontSize: "24px",
    fontWeight: "bold",
    transition: "all 0.3s ease",
  },
  playerCard: {
    background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
    borderRadius: "20px",
    padding: "30px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.2)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    minWidth: "350px",
  },
  playerImageContainer: {
    position: "relative",
    display: "inline-block",
    marginBottom: "20px",
  },
  playerImage: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    border: "4px solid #FFD700",
    boxShadow: "0 0 30px rgba(255, 215, 0, 0.3)",
  },
  playerRatingBadge: {
    position: "absolute",
    bottom: "0",
    right: "0",
    background: "#FFD700",
    color: "#1a1a2e",
    padding: "5px 10px",
    borderRadius: "15px",
    fontSize: "14px",
    fontWeight: "bold",
  },
  playerName: {
    fontSize: "28px",
    margin: "0 0 10px 0",
    color: "white",
  },
  playerRole: {
    fontSize: "16px",
    color: "rgba(255,255,255,0.7)",
    background: "rgba(255,255,255,0.1)",
    padding: "5px 15px",
    borderRadius: "20px",
    display: "inline-block",
    marginBottom: "15px",
  },
  basePrice: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.5)",
  },
  bidDisplay: {
    textAlign: "center",
    padding: "25px 50px",
    background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.1))",
    borderRadius: "16px",
    border: "2px solid rgba(255,215,0,0.3)",
    boxShadow: "0 0 40px rgba(255, 215, 0, 0.2)",
  },
  bidLabel: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.6)",
    marginBottom: "5px",
  },
  bidAmount: {
    fontSize: "48px",
    fontWeight: "bold",
    color: "#FFD700",
    textShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
  },
  bidIncrement: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.5)",
    marginTop: "5px",
  },
  actionButtons: {
    display: "flex",
    gap: "15px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  highestBidderMessage: {
    padding: "10px 20px",
    background: "rgba(0, 200, 83, 0.2)",
    border: "2px solid #00C853",
    borderRadius: "8px",
    color: "#00E676",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: "10px",
  },
  bidBtn: {
    padding: "15px 30px",
    borderRadius: "12px",
    border: "none",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 4px 15px rgba(0,200,83,0.4)",
  },
  skipBtn: {
    padding: "15px 30px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #666, #888)",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  withdrawBtn: {
    padding: "15px 30px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #d32f2f, #f44336)",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "transform 0.2s",
  },
  btnIcon: {
    fontSize: "18px",
  },
  withdrawnSection: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  withdrawnLabel: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.5)",
  },
  withdrawnTeam: {
    padding: "4px 10px",
    background: "rgba(211,47,47,0.3)",
    color: "#ff6b6b",
    borderRadius: "6px",
    fontSize: "12px",
  },
  rightPanel: {
    background: "rgba(255,255,255,0.05)",
    borderRadius: "16px",
    padding: "20px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
    maxHeight: "calc(100vh - 140px)",
    overflow: "auto",
  },
  activityPanel: {
    background: "rgba(255,255,255,0.05)",
    borderRadius: "16px",
    padding: "20px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
    maxHeight: "calc(100vh - 140px)",
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  activitySection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "200px",
    overflow: "auto",
  },
  emptyActivity: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.4)",
    fontStyle: "italic",
    textAlign: "center",
    padding: "20px 0",
  },
  bidItem: {
    padding: "10px 12px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.03)",
    transition: "all 0.3s ease",
  },
  bidHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  bidTeam: {
    fontWeight: "bold",
    fontSize: "13px",
    color: "rgba(255,255,255,0.9)",
  },
  bidAmount: {
    fontSize: "13px",
    color: "#FFD700",
    fontWeight: "600",
  },
  bidPlayer: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.6)",
    marginBottom: "2px",
  },
  bidTime: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.4)",
  },
  soldItem: {
    padding: "10px 12px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.03)",
    borderLeft: "3px solid #00C853",
  },
  soldHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  soldPlayerName: {
    fontWeight: "bold",
    fontSize: "13px",
    color: "rgba(255,255,255,0.9)",
  },
  soldPlayerPrice: {
    fontSize: "13px",
    color: "#00E676",
    fontWeight: "600",
  },
  soldToTeam: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.6)",
    marginBottom: "2px",
  },
  soldTime: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.4)",
  },
  squadsList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  squadItem: {
    background: "rgba(255,255,255,0.03)",
    borderRadius: "10px",
    overflow: "hidden",
  },
  squadHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 15px",
  },
  squadTeamName: {
    fontWeight: "bold",
    fontSize: "16px",
  },
  squadCountBadge: {
    background: "rgba(255,255,255,0.2)",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "12px",
  },
  squadPlayers: {
    padding: "10px 15px",
  },
  emptySquad: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.3)",
    fontStyle: "italic",
  },
  squadPlayer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    fontSize: "13px",
  },
  playerNumber: {
    color: "rgba(255,255,255,0.4)",
    width: "20px",
  },
  playerNameSmall: {
    flex: 1,
    color: "rgba(255,255,255,0.9)",
  },
  playerPrice: {
    color: "#FFD700",
    fontSize: "11px",
  },
  // Premium Multiplayer Styles
  multiplayerCard: {
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(20px)",
    borderRadius: "24px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)",
    padding: "40px",
    margin: "30px auto",
    maxWidth: "600px",
    width: "90%",
    textAlign: "center",
  },
  multiplayerHeader: {
    marginBottom: "30px",
  },
  multiplayerTitle: {
    fontSize: "28px",
    fontWeight: "bold",
    background: "linear-gradient(135deg, #00d4ff, #7b2cbf)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: "0 0 8px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  multiplayerSubtitle: {
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.5)",
    margin: 0,
  },
  mpNameInput: {
    width: "100%",
    maxWidth: "320px",
    padding: "16px 20px",
    fontSize: "16px",
    borderRadius: "12px",
    border: "2px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(0, 0, 0, 0.2)",
    color: "#fff",
    textAlign: "center",
    marginBottom: "30px",
    outline: "none",
  },
  mpOptionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    alignItems: "center",
  },
  mpOptionCard: {
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "16px",
    padding: "30px",
    width: "100%",
    maxWidth: "400px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  mpOptionIcon: {
    fontSize: "40px",
    marginBottom: "15px",
  },
  mpOptionTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#fff",
    marginBottom: "8px",
  },
  mpOptionDesc: {
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: "20px",
  },
  mpPrimaryButton: {
    width: "100%",
    padding: "16px 32px",
    fontSize: "16px",
    fontWeight: "bold",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #00d4ff, #7b2cbf)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxShadow: "0 4px 15px rgba(0, 212, 255, 0.3)",
  },
  mpSecondaryButton: {
    padding: "14px 28px",
    fontSize: "15px",
    fontWeight: "bold",
    borderRadius: "10px",
    border: "2px solid rgba(0, 212, 255, 0.5)",
    background: "transparent",
    color: "#00d4ff",
    cursor: "pointer",
  },
  mpButtonIcon: {
    fontSize: "20px",
  },
  mpOrDivider: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    width: "100%",
    maxWidth: "400px",
    margin: "10px 0",
  },
  mpOrLine: {
    flex: 1,
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
  },
  mpOrText: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "2px",
  },
  mpJoinRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  mpRoomInput: {
    flex: 1,
    padding: "14px 16px",
    fontSize: "15px",
    borderRadius: "10px",
    border: "2px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(0, 0, 0, 0.2)",
    color: "#fff",
    textAlign: "center",
    outline: "none",
    textTransform: "uppercase",
  },
  singlePlayerBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "14px 32px",
    fontSize: "14px",
    borderRadius: "50px",
    border: "2px solid rgba(255, 255, 255, 0.2)",
    background: "transparent",
    color: "rgba(255, 255, 255, 0.7)",
    cursor: "pointer",
    margin: "20px auto",
  },
  singlePlayerText: {
    fontWeight: "500",
  },
  singlePlayerArrow: {
    fontSize: "16px",
  },
  // Modern Lobby Styles
  lobbyCard: {
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(20px)",
    borderRadius: "24px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)",
    padding: "40px",
    width: "100%",
    maxWidth: "500px",
    margin: "0 auto",
    textAlign: "center",
  },
  lobbyHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    marginBottom: "30px",
  },
  lobbyIcon: {
    fontSize: "48px",
    marginBottom: "5px",
  },
  lobbyTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#fff",
    margin: 0,
  },
  connectionStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    marginTop: "5px",
  },
  statusConnected: {
    color: "#4ade80",
  },
  statusDisconnected: {
    color: "#f87171",
  },
  roomIdContainer: {
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "25px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  roomIdLabel: {
    fontSize: "11px",
    fontWeight: "bold",
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: "2px",
    marginBottom: "8px",
  },
  roomIdValue: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#00d4ff",
    fontFamily: "monospace",
    letterSpacing: "4px",
    marginBottom: "8px",
  },
  roomIdHint: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.4)",
  },
  playersSection: {
    marginBottom: "25px",
  },
  playersHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: "15px",
    paddingLeft: "5px",
  },
  playersIcon: {
    fontSize: "16px",
  },
  playersTitle: {
    fontWeight: "500",
  },
  playersList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  playerCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    padding: "12px 16px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  playerAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #00d4ff, #7b2cbf)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: "bold",
    color: "#fff",
  },
  playerInfo: {
    flex: 1,
    textAlign: "left",
  },
  playerName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#fff",
  },
  playerTeam: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.5)",
  },
  hostBadge: {
    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    color: "#000",
    fontSize: "10px",
    fontWeight: "bold",
    padding: "4px 10px",
    borderRadius: "20px",
    letterSpacing: "1px",
  },
  waitingSection: {
    marginBottom: "25px",
  },
  hostMessage: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  guestMessage: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  waitingText: {
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.6)",
  },
  playerCount: {
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.4)",
  },
  successBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(74, 222, 128, 0.2)",
    color: "#4ade80",
    fontSize: "13px",
    fontWeight: "500",
    padding: "8px 16px",
    borderRadius: "20px",
    marginTop: "5px",
  },
  startAuctionBtn: {
    width: "100%",
    padding: "16px 32px",
    fontSize: "16px",
    fontWeight: "bold",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #00d4ff, #7b2cbf)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    boxShadow: "0 4px 15px rgba(0, 212, 255, 0.3)",
    transition: "all 0.3s ease",
    opacity: 1,
  },
  startAuctionIcon: {
    fontSize: "18px",
  },
  guestWaitingBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "16px",
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.5)",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  pulseDot: {
    width: "8px",
    height: "8px",
    background: "#00d4ff",
    borderRadius: "50%",
    animation: "pulse 1.5s infinite",
  },

  // NEW AUCTION SCREEN STYLES
  // Status Bar
  statusBar: {
    padding: "12px 30px",
    borderRadius: "8px",
    margin: "10px 30px",
    border: "2px solid",
    textAlign: "center",
    backdropFilter: "blur(10px)",
  },
  statusText: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "white",
  },

  // New 3-Column Layout
  newMainLayout: {
    display: "grid",
    gridTemplateColumns: "300px 1fr 300px",
    gap: "25px",
    padding: "20px 30px",
    maxWidth: "1600px",
    margin: "0 auto",
    minHeight: "calc(100vh - 120px)",
  },

  // Column Titles
  columnTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    margin: "0 0 20px 0",
    color: "#FFD700",
    textTransform: "uppercase",
    letterSpacing: "2px",
  },

  // LEFT COLUMN - Player Info
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  playerInfoCard: {
    background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
    borderRadius: "20px",
    padding: "30px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.2)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  playerImageLarge: {
    width: "140px",
    height: "140px",
    borderRadius: "50%",
    border: "4px solid #FFD700",
    boxShadow: "0 0 40px rgba(255, 215, 0, 0.4)",
    marginBottom: "15px",
  },
  playerRatingBadgeLarge: {
    position: "absolute",
    bottom: "0",
    right: "0",
    background: "#FFD700",
    color: "#1a1a2e",
    padding: "8px 15px",
    borderRadius: "20px",
    fontSize: "16px",
    fontWeight: "bold",
  },
  playerNameLarge: {
    fontSize: "28px",
    margin: "15px 0 10px 0",
    color: "white",
    fontWeight: "bold",
  },
  playerRoleBadge: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.8)",
    background: "rgba(255,255,255,0.15)",
    padding: "8px 20px",
    borderRadius: "25px",
    display: "inline-block",
    marginBottom: "15px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  basePriceBox: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    padding: "15px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
  },
  basePriceLabel: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
  },
  basePriceValue: {
    fontSize: "24px",
    color: "#FFD700",
    fontWeight: "bold",
  },

  // Bid History Box
  bidHistoryBox: {
    background: "rgba(255,255,255,0.05)",
    borderRadius: "16px",
    padding: "20px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  bidHistoryTitle: {
    fontSize: "14px",
    color: "#FFD700",
    margin: "0 0 15px 0",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  bidHistoryList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  bidHistoryItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 15px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.03)",
    borderLeft: "3px solid #666",
  },
  bidHistoryTeam: {
    fontWeight: "bold",
    fontSize: "14px",
    color: "rgba(255,255,255,0.9)",
  },
  bidHistoryAmount: {
    fontSize: "14px",
    color: "#FFD700",
    fontWeight: "600",
  },
  noBidsText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.4)",
    fontStyle: "italic",
    padding: "20px",
  },

  // CENTER COLUMN - Bid Display & Controls
  centerColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "25px",
    paddingTop: "20px",
  },
  currentBidBox: {
    width: "100%",
    maxWidth: "450px",
    padding: "40px",
    background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.05))",
    borderRadius: "24px",
    border: "3px solid #FFD700",
    textAlign: "center",
    boxShadow: "0 0 60px rgba(255, 215, 0, 0.2)",
    transition: "all 0.3s ease",
  },
  currentBidLabel: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: "3px",
    marginBottom: "10px",
  },
  currentBidAmount: {
    fontSize: "64px",
    fontWeight: "bold",
    color: "#FFD700",
    textShadow: "0 0 30px rgba(255, 215, 0, 0.5)",
    marginBottom: "10px",
  },
  currentBidderTag: {
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "5px",
  },
  timerBox: {
    fontSize: "48px",
    fontWeight: "bold",
    padding: "15px 40px",
    background: "rgba(0,0,0,0.3)",
    borderRadius: "16px",
    border: "2px solid rgba(255,255,255,0.1)",
  },

  // Bid Buttons
  bidButtonsContainer: {
    width: "100%",
    maxWidth: "500px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    alignItems: "center",
  },
  bidButtonsRow: {
    display: "flex",
    gap: "15px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  bidButton: {
    padding: "20px 25px",
    borderRadius: "16px",
    border: "none",
    background: "linear-gradient(135deg, #00C853, #00E676)",
    color: "white",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(0,200,83,0.4)",
    minWidth: "100px",
  },
  bidButtonBlue: {
    background: "linear-gradient(135deg, #2196F3, #03A9F4)",
    boxShadow: "0 4px 20px rgba(33,150,243,0.4)",
  },
  bidButtonPurple: {
    background: "linear-gradient(135deg, #9C27B0, #E91E63)",
    boxShadow: "0 4px 20px rgba(156,39,176,0.4)",
  },
  bidBtnValue: {
    fontSize: "20px",
    fontWeight: "bold",
  },
  bidBtnPrice: {
    fontSize: "12px",
    opacity: 0.9,
  },
  disabledMessage: {
    padding: "12px 24px",
    background: "rgba(0,200,83,0.2)",
    border: "2px solid #00C853",
    borderRadius: "12px",
    color: "#00E676",
    fontWeight: "bold",
    textAlign: "center",
  },
  actionButtonsRow: {
    display: "flex",
    gap: "15px",
    justifyContent: "center",
  },
  actionButton: {
    padding: "12px 25px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #666, #888)",
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "all 0.2s ease",
  },
  withdrawButton: {
    background: "linear-gradient(135deg, #d32f2f, #f44336)",
  },
  withdrawnBox: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
    padding: "15px",
    background: "rgba(211,47,47,0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(211,47,47,0.3)",
  },
  withdrawnBadge: {
    padding: "6px 12px",
    background: "rgba(211,47,47,0.3)",
    color: "#ff6b6b",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  // RIGHT COLUMN - Teams
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  teamsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  teamCardNew: {
    padding: "18px",
    borderRadius: "16px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
  },
  teamCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
  },
  teamCardName: {
    fontWeight: "bold",
    fontSize: "20px",
  },
  teamCardAiBadge: {
    fontSize: "10px",
    background: "rgba(0,200,83,0.3)",
    color: "#00E676",
    padding: "3px 8px",
    borderRadius: "6px",
    fontWeight: "bold",
  },
  leadingBadge: {
    fontSize: "16px",
    marginLeft: "auto",
  },
  teamCardBudget: {
    fontSize: "16px",
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  teamCardPlayers: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.5)",
    marginTop: "5px",
  },
};
