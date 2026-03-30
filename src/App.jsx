// 🔥 FINAL STABLE VERSION (ALL FEATURES + NO REGRESSIONS + FIXED TEAM SELECTION)

import { useState, useEffect, useRef } from "react";
import playersData from "./data/players";

export default function App() {
  const [players] = useState(playersData);
  const [index, setIndex] = useState(0);
  const [bid, setBid] = useState(playersData[0].price);
  const [timer, setTimer] = useState(10);
  const [started, setStarted] = useState(false);
  const [team, setTeam] = useState(null);
  const [highest, setHighest] = useState(null);
  const [sold, setSold] = useState("");
  const [withdrawn, setWithdrawn] = useState([]);
  const [newTeam, setNewTeam] = useState("");

  const [teams, setTeams] = useState([
    { name: "RCB", budget: 100, squad: [] },
    { name: "MI", budget: 100, squad: [] },
    { name: "CSK", budget: 100, squad: [] },
    { name: "KKR", budget: 100, squad: [] },
    { name: "SRH", budget: 100, squad: [] },
    { name: "DC", budget: 100, squad: [] },
    { name: "RR", budget: 100, squad: [] },
    { name: "PBKS", budget: 100, squad: [] },
    { name: "GT", budget: 100, squad: [] },
    { name: "LSG", budget: 100, squad: [] }
  ]);

  const current = players[index];

  const bidSound = useRef(new Audio("https://www.soundjay.com/buttons/sounds/button-16.mp3"));
  const soldSound = useRef(new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3"));

  const playBid = () => bidSound.current.play().catch(()=>{});
  const playSold = () => soldSound.current.play().catch(()=>{});

  // TIMER
  useEffect(() => {
    if (!started) return;
    if (timer <= 0) return finalize();
    const t = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(t);
  }, [timer, started]);

  // AI LOGIC (SAFE + STRATEGIC)
  useEffect(() => {
    if (!started) return;

    const ai = setInterval(() => {
      const nextBid = +(bid + 0.25).toFixed(2);

      const available = teams.filter(t =>
        t.name !== team &&
        !withdrawn.includes(t.name) &&
        t.budget >= nextBid
      );

      if (!available.length) return;

      const chosen = available[Math.floor(Math.random() * available.length)];

      const playerValue = current.price + current.rating / 10;

      if (nextBid > playerValue + 5) return;

      setBid(nextBid);
      setHighest(chosen.name);
      setTimer(10);
      playBid();
    }, 1500);

    return () => clearInterval(ai);
  }, [started, bid, teams, withdrawn]);

  const userTeamData = teams.find(t => t.name === team);
  const nextBid = +(bid + 0.25).toFixed(2);
  const canBid = userTeamData && userTeamData.budget >= nextBid;

  const userBid = () => {
    if (!canBid) return;
    setBid(nextBid);
    setHighest(team);
    setTimer(10);
    playBid();
  };

  const withdraw = () => {
    if (highest === team) return;
    setWithdrawn(prev => [...prev, team]);
  };

  const finalize = () => {
    if (!highest) return next();

    setSold(`🏆 SOLD TO ${highest}`);
    playSold();

    const updated = teams.map(t =>
      t.name === highest
        ? {
            ...t,
            budget: +(t.budget - bid).toFixed(2),
            squad: [...t.squad, current]
          }
        : t
    );

    setTeams(updated);

    setTimeout(() => {
      setSold("");
      next();
    }, 2000);
  };

  const next = () => {
    const n = index + 1;
    if (n >= players.length) return alert("Auction Finished");

    setIndex(n);
    setBid(players[n].price);
    setTimer(10);
    setHighest(null);
    setWithdrawn([]);
  };

  const addTeam = () => {
    if (!newTeam.trim()) return;
    const newT = { name: newTeam, budget: 100, squad: [] };
    setTeams([...teams, newT]);
    setTeam(newTeam);
    setNewTeam("");
  };

  const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${current.name}`;

  // ✅ FIXED TEAM SELECTION SCREEN
  if (!started) {
    return (
      <div style={styles.container}>
        <h1 style={styles.header}>🏏 SELECT YOUR TEAM</h1>

        <div style={styles.teamGrid}>
          {teams.map(t => (
            <div
              key={t.name}
              onClick={() => setTeam(t.name)}
              style={{
                ...styles.teamCard,
                border: team === t.name ? "2px solid gold" : "1px solid #333"
              }}
            >
              {t.name}
            </div>
          ))}
        </div>

        <div style={{marginTop:20}}>
          <input
            value={newTeam}
            onChange={e=>setNewTeam(e.target.value)}
            placeholder="Create Team"
            style={styles.input}
          />
          <button onClick={addTeam} style={styles.green}>Add</button>
        </div>

        <button
          disabled={!team}
          onClick={()=>setStarted(true)}
          style={{...styles.start, opacity: team?1:0.5}}
        >
          ENTER AUCTION
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>

      <div style={styles.topbar}>
        <span>🏏 IPL AUCTION</span>
        <span>{team}</span>
      </div>

      {sold && <div style={styles.sold}>{sold}</div>}

      <div style={styles.layout}>

        {/* LEFT */}
        <div style={styles.side}>
          <h3>Teams</h3>
          {teams.map(t => (
            <div key={t.name} style={styles.teamBox}>
              {t.name}
              <div style={styles.barWrap}>
                <div style={{...styles.bar, width:`${t.budget}%`}} />
              </div>
              ₹{t.budget.toFixed(1)}
            </div>
          ))}
        </div>

        {/* CENTER */}
        <div style={styles.center}>
          <h2 style={{color:"gold"}}>🔥 {highest || "No Bidder"}</h2>

          <div style={styles.playerCard}>
            <img src={avatar} style={styles.img}/>
            <h2>{current.name}</h2>
            <p>{current.role}</p>
            <p>⭐ {current.rating}</p>
          </div>

          <h1 style={styles.bid}>₹{bid.toFixed(2)} Cr</h1>
          <h2>⏳ {timer}s</h2>

          <div>
            <button disabled={!canBid} onClick={userBid} style={{...styles.bidBtn, opacity: canBid?1:0.5}}>BID</button>
            <button onClick={next} style={styles.skip}>SKIP</button>
            <button onClick={withdraw} style={styles.withdraw}>WITHDRAW</button>
          </div>
        </div>

        {/* RIGHT */}
        <div style={styles.side}>
          <h3>Squads</h3>
          {teams.map(t => (
            <div key={t.name} style={styles.teamBox}>
              <strong>{t.name}</strong>
              {t.squad.map((p,i)=>(<div key={i}>{p.name}</div>))}
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}

const styles = {
  container:{minHeight:"100vh",background:"#020617",color:"white",padding:"10px"},
  header:{textAlign:"center",color:"gold"},
  teamGrid:{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"10px"},
  teamCard:{padding:"15px",background:"#111",cursor:"pointer"},
  input:{padding:"10px"},
  green:{background:"green",padding:"10px"},
  start:{marginTop:"20px",background:"gold",padding:"10px"},
  topbar:{display:"flex",justifyContent:"space-between",background:"#111",padding:"10px"},
  layout:{display:"flex"},
  side:{width:"25%",padding:"10px"},
  center:{width:"50%",textAlign:"center"},
  playerCard:{background:"#111",padding:"20px"},
  img:{width:"80px",borderRadius:"50%"},
  bid:{fontSize:"40px",color:"gold"},
  bidBtn:{padding:"10px",background:"green"},
  skip:{padding:"10px",background:"gray"},
  withdraw:{padding:"10px",background:"red"},
  sold:{textAlign:"center",color:"gold"},
  teamBox:{marginBottom:"10px",background:"#111",padding:"10px"},
  barWrap:{width:"100%",height:"6px",background:"#333"},
  bar:{height:"100%",background:"gold"}
};