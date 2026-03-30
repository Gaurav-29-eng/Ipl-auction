function PlayerCard({ player }) {
  return (
    <div style={{
      border: "1px solid #ccc",
      borderRadius: "10px",
      padding: "10px",
      margin: "10px",
      width: "200px",
      backgroundColor: "#1e1e1e",
      color: "white"
    }}>
      <h3>{player.name}</h3>
      <p>Role: {player.role}</p>
      <p>Base Price: ₹{player.price} Cr</p>
    </div>
  );
}

export default PlayerCard;