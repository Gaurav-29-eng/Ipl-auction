// 🏏 PROFESSIONAL IPL AUCTION SIMULATION
// Features: Modern UI, animations, real-time updates, error handling

import { useState, useEffect, useRef, useCallback } from "react";
import playersData from "./data/players";

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

  const current = players[index];
  const bidSound = useRef(new Audio("https://www.soundjay.com/misc/sounds/tink-2.mp3"));
  const soldSound = useRef(new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-01.mp3"));
  const timerWarningSound = useRef(new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3"));

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
    
    if (!started) {
      console.log("[AUCTION] Not started yet, skipping AI init");
      return;
    }
    
    console.log("[AI] Initializing AI bidding system...");
    console.log("[AI] User team:", team);
    console.log("[AI] AI teams:", teams.filter(t => t.isAI && t.name !== team).map(t => t.name));
    
    // AI Bidding Loop
    const aiInterval = setInterval(() => {
      console.log("[AI] === BIDDING ATTEMPT ===");
      console.log("[AI] Current bid:", bid);
      console.log("[AI] Timer:", timer);
      console.log("[AI] Sold status:", sold);
      
      if (sold) {
        console.log("[AI] Player sold, skipping bid");
        return;
      }
      
      const nextBid = +(bid + 0.25).toFixed(2);
      console.log("[AI] Next bid would be:", nextBid);
      
      // Get eligible AI teams (exclude if already highest bidder)
      const eligibleTeams = teams.filter(t => {
        const isAI = t.isAI === true;
        const notUser = t.name !== team;
        const notWithdrawn = !withdrawn.includes(t.name);
        const canAfford = t.budget >= nextBid;
        const notHighestBidder = t.name !== highest; // Skip if already highest
        
        console.log(`[AI] Team ${t.name}: isAI=${isAI}, notUser=${notUser}, notWithdrawn=${notWithdrawn}, canAfford=${canAfford}, notHighest=${notHighestBidder}`);
        
        return isAI && notUser && notWithdrawn && canAfford && notHighestBidder;
      });
      
      console.log("[AI] Eligible teams count:", eligibleTeams.length);
      
      if (eligibleTeams.length === 0) {
        console.log("[AI] No eligible teams to bid");
        return;
      }
      
      // Select random AI team
      const bidder = eligibleTeams[Math.floor(Math.random() * eligibleTeams.length)];
      console.log("[AI] Selected bidder:", bidder.name);
      
      // 75% chance to bid
      const roll = Math.random();
      console.log("[AI] Roll:", roll.toFixed(3), "Threshold: 0.75");
      
      if (roll < 0.75) {
        console.log("[AI] >>> BID PLACED <<<", bidder.name, "bids");
        
        // Randomly choose increment: 70% +25L, 20% +50L, 10% +1Cr
        const incrementRoll = Math.random();
        let increment = 0.25;
        if (incrementRoll > 0.90) increment = 1.00;
        else if (incrementRoll > 0.70) increment = 0.50;
        
        // Use functional update to get latest bid value
        setBid(prevBid => {
          const newBid = +(prevBid + increment).toFixed(2);
          console.log("[AI] Bid updated from", prevBid, "to", newBid, "(+" + increment + ")");
          return newBid;
        });
        setHighest(bidder.name);
        setTimer(15);
        setActiveTeam(bidder.name);
        setBidAnimation(true);
        
        // Add to history with the new bid value
        setBidHistory(prev => [{
          id: Date.now(),
          team: bidder.name,
          player: current.name,
          amount: bid + increment, // Calculate based on current bid
          increment: increment,
          time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 10));
        
        // Sound effect
        playBid();
        
        // Reset animation
        setTimeout(() => setBidAnimation(false), 300);
        setTimeout(() => setActiveTeam(null), 1500);
        
      } else {
        console.log("[AI] Bid skipped (random chance)");
      }
    }, 2500);
    
    console.log("[AI] AI bidding loop started (2.5s interval)");
    
    return () => {
      console.log("[AI] Stopping AI bidding loop");
      clearInterval(aiInterval);
    };
  }, [started]); // Only re-run when started changes

  // Timer Logic
  useEffect(() => {
    if (!started || sold) return;
    if (timer <= 0) {
      setTimeout(() => finalize(), 0);
      return;
    }

    // Play warning sound when timer reaches 5 seconds
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
    const nextBid = getNextBid(bid, increment);
    
    // Check if user is already highest bidder
    if (highest === team) {
      showError("You are currently the highest bidder!");
      return;
    }
    
    if (!canBid(nextBid)) {
      if (userTeamData?.budget < nextBid) {
        showError("Insufficient purse balance!");
      } else if (withdrawn.includes(team)) {
        showError("Your team has withdrawn from this bid!");
      }
      return;
    }
    
    setBid(nextBid);
    setHighest(team);
    setTimer(15);
    setBidAnimation(true);
    setTimeout(() => setBidAnimation(false), 300);
    
    // Add to bid history
    setBidHistory(prev => [{
      id: Date.now(),
      team: team,
      player: current.name,
      amount: nextBid,
      increment: increment,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
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

        <button
          disabled={!team}
          onClick={() => setStarted(true)}
          style={{
            ...styles.enterAuctionBtn,
            opacity: team ? 1 : 0.5,
            cursor: team ? "pointer" : "not-allowed",
          }}
        >
          <span style={styles.enterAuctionText}>ENTER AUCTION</span>
          <span style={styles.enterAuctionArrow}>→</span>
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

      {/* Main Layout */}
      <div style={styles.mainLayout}>
        {/* Left Panel - Teams */}
        <div style={styles.leftPanel}>
          <h3 style={styles.panelTitle}>💰 Team Purses</h3>
          <div style={styles.teamsList}>
            {teams.map((t) => (
              <div
                key={t.name}
                style={{
                  ...styles.teamItem,
                  background: activeTeam === t.name 
                    ? `linear-gradient(90deg, ${t.color.primary}40, transparent)`
                    : highest === t.name
                    ? `linear-gradient(90deg, ${t.color.primary}60, ${t.color.primary}20)`
                    : "rgba(255,255,255,0.05)",
                  borderLeft: `4px solid ${t.color.primary}`,
                  boxShadow: highest === t.name ? `0 0 20px ${t.color.primary}40` : "none",
                }}
              >
                <div style={styles.teamItemHeader}>
                  <span style={{ ...styles.teamName, color: t.color.primary }}>
                    {t.name}
                    {t.name !== team && (
                      <span style={styles.aiBadge}>🤖 AI</span>
                    )}
                  </span>
                  <span style={styles.teamPurse}>₹{t.budget.toFixed(1)}Cr</span>
                </div>
                <div style={styles.purseBarBg}>
                  <div
                    style={{
                      ...styles.purseBar,
                      width: `${t.budget}%`,
                      background: `linear-gradient(90deg, ${t.color.primary}, ${t.color.secondary})`,
                    }}
                  />
                </div>
                <div style={styles.squadCount}>{t.squad.length} players</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel - Player Card */}
        <div style={styles.centerPanel}>
          {/* Current Bidder Display */}
          <div
            style={{
              ...styles.currentBidder,
              background: highest
                ? `linear-gradient(135deg, ${teams.find((t) => t.name === highest)?.color.primary}40, transparent)`
                : "rgba(255,255,255,0.05)",
              border: highest ? `2px solid ${teams.find((t) => t.name === highest)?.color.primary}` : "2px solid transparent",
            }}
          >
            <span style={styles.currentBidderLabel}>Current Highest Bidder</span>
            <span
              style={{
                ...styles.currentBidderName,
                color: highest ? teams.find((t) => t.name === highest)?.color.primary : "#888",
              }}
            >
              {highest || "Waiting for bids..."}
            </span>
          </div>

          {/* Player Card */}
          <div style={styles.playerCard}>
            <div style={styles.playerImageContainer}>
              <img src={avatar} alt={current.name} style={styles.playerImage} />
              <div style={styles.playerRatingBadge}>⭐ {current.rating}</div>
            </div>
            
            <h2 style={styles.playerName}>{current.name}</h2>
            <div style={styles.playerRole}>{current.role}</div>
            
            <div style={styles.basePrice}>Base Price: ₹{current.price} Cr</div>
          </div>

          {/* Bid Display */}
          <div
            style={{
              ...styles.bidDisplay,
              animation: bidAnimation ? "bidIncrease 0.3s ease" : "none",
            }}
          >
            <div style={styles.bidLabel}>Current Bid</div>
            <div style={styles.bidAmount}>₹{bid.toFixed(2)} Cr</div>
            <div style={styles.bidIncrement}>Next: +25L / +50L / +1Cr</div>
          </div>

          {/* Timer */}
          <div
            style={{
              ...styles.timer,
              animation: timer <= 5 ? "timerPulse 1s infinite" : "none",
              color: timer <= 5 ? "#ff4444" : timer <= 10 ? "#ffaa00" : "#00ff88",
            }}
          >
            ⏱️ {timer}s
          </div>

          {/* Highest Bidder Message */}
          {highest === team && (
            <div style={styles.highestBidderMessage}>
              ✓ You are currently the highest bidder
            </div>
          )}

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button
              onClick={() => userBid(0.25)}
              disabled={!canBid(nextBid25L)}
              style={{
                ...styles.bidBtn,
                opacity: canBid(nextBid25L) ? 1 : 0.5,
                cursor: canBid(nextBid25L) ? "pointer" : "not-allowed",
              }}
            >
              <span style={styles.btnIcon}>💰</span>
              <span>+25L</span>
            </button>

            <button
              onClick={() => userBid(0.50)}
              disabled={!canBid(nextBid50L)}
              style={{
                ...styles.bidBtn,
                opacity: canBid(nextBid50L) ? 1 : 0.5,
                cursor: canBid(nextBid50L) ? "pointer" : "not-allowed",
                background: "linear-gradient(135deg, #2196F3, #03A9F4)",
              }}
            >
              <span style={styles.btnIcon}>💰</span>
              <span>+50L</span>
            </button>

            <button
              onClick={() => userBid(1.00)}
              disabled={!canBid(nextBid1Cr)}
              style={{
                ...styles.bidBtn,
                opacity: canBid(nextBid1Cr) ? 1 : 0.5,
                cursor: canBid(nextBid1Cr) ? "pointer" : "not-allowed",
                background: "linear-gradient(135deg, #9C27B0, #E91E63)",
              }}
            >
              <span style={styles.btnIcon}>💰</span>
              <span>+1Cr</span>
            </button>

            <button onClick={skip} style={styles.skipBtn}>
              <span style={styles.btnIcon}>⏭️</span>
              <span>SKIP</span>
            </button>

            <button
              onClick={withdraw}
              disabled={withdrawn.includes(team) || highest === team}
              style={{
                ...styles.withdrawBtn,
                opacity: withdrawn.includes(team) || highest === team ? 0.5 : 1,
                cursor: withdrawn.includes(team) || highest === team ? "not-allowed" : "pointer",
              }}
            >
              <span style={styles.btnIcon}>🚫</span>
              <span>{withdrawn.includes(team) ? "WITHDRAWN" : "WITHDRAW"}</span>
            </button>
          </div>

          {/* Withdrawn Teams */}
          {withdrawn.length > 0 && (
            <div style={styles.withdrawnSection}>
              <span style={styles.withdrawnLabel}>Withdrawn:</span>
              {withdrawn.map((t) => (
                <span key={t} style={styles.withdrawnTeam}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Activity Sidebar - Recent Bids & Sold Players */}
        <div style={styles.activityPanel}>
          {/* Recent Bids */}
          <div style={styles.activitySection}>
            <h3 style={styles.panelTitle}>🔥 Recent Bids</h3>
            <div style={styles.activityList}>
              {bidHistory.length === 0 ? (
                <div style={styles.emptyActivity}>No bids yet</div>
              ) : (
                bidHistory.map((bid, i) => (
                  <div 
                    key={bid.id} 
                    style={{
                      ...styles.bidItem,
                      borderLeft: `3px solid ${teams.find(t => t.name === bid.team)?.color.primary || '#666'}`,
                      background: i === 0 ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div style={styles.bidHeader}>
                      <span style={styles.bidTeam}>{bid.team}</span>
                      <span style={styles.bidAmount}>₹{bid.amount.toFixed(2)}Cr</span>
                    </div>
                    <div style={styles.bidPlayer}>{bid.player}</div>
                    <div style={styles.bidTime}>{bid.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sold Players */}
          <div style={styles.activitySection}>
            <h3 style={styles.panelTitle}>✅ Sold Players</h3>
            <div style={styles.activityList}>
              {soldPlayers.length === 0 ? (
                <div style={styles.emptyActivity}>No players sold yet</div>
              ) : (
                soldPlayers.map((sold) => (
                  <div 
                    key={sold.id} 
                    style={{
                      ...styles.soldItem,
                      borderLeft: `3px solid ${teams.find(t => t.name === sold.team)?.color.primary || '#666'}`,
                    }}
                  >
                    <div style={styles.soldHeader}>
                      <span style={styles.soldPlayerName}>{sold.player.name}</span>
                      <span style={styles.soldPlayerPrice}>₹{sold.price.toFixed(2)}Cr</span>
                    </div>
                    <div style={styles.soldToTeam}>→ {sold.team}</div>
                    <div style={styles.soldTime}>{sold.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Squads */}
        <div style={styles.rightPanel}>
          <h3 style={styles.panelTitle}>👥 Squads</h3>
          <div style={styles.squadsList}>
            {teams.map((t) => (
              <div key={t.name} style={styles.squadItem}>
                <div
                  style={{
                    ...styles.squadHeader,
                    background: `linear-gradient(90deg, ${t.color.primary}30, transparent)`,
                    borderLeft: `3px solid ${t.color.primary}`,
                  }}
                >
                  <span style={{ ...styles.squadTeamName, color: t.color.primary }}>{t.name}</span>
                  <span style={styles.squadCountBadge}>{t.squad.length}</span>
                </div>
                <div style={styles.squadPlayers}>
                  {t.squad.length === 0 ? (
                    <div style={styles.emptySquad}>No players yet</div>
                  ) : (
                    t.squad.map((p, i) => (
                      <div key={i} style={styles.squadPlayer}>
                        <span style={styles.playerNumber}>{i + 1}.</span>
                        <span style={styles.playerNameSmall}>{p.name}</span>
                        <span style={styles.playerPrice}>₹{(p.price || 0).toFixed(1)}Cr</span>
                      </div>
                    ))
                  )}
                </div>
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
  timer: {
    fontSize: "32px",
    fontWeight: "bold",
    padding: "10px 30px",
    background: "rgba(0,0,0,0.3)",
    borderRadius: "12px",
    transition: "all 0.3s ease",
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
};