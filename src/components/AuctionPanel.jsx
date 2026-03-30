import { useState, useEffect } from "react";

function AuctionPanel({ player }) {
  const [currentBid, setCurrentBid] = useState(player.price);

  // Reset bid when player changes
  useEffect(() => {
    setCurrentBid(player.price);
  }, [player]);

  const increaseBid = () => {
    setCurrentBid((prev) => prev + 0.25);
  };

  return (
    <div
      style={{
        border: "2px solid gold",
        borderRadius: "12px",
        padding: "20px",
        backgroundColor: "#121212",
        color: "white",
        width: "300px",
      }}
    >
      <h2>🏏 Auction Panel</h2>

      <h3>{player.name}</h3>
      <p>Role: {player.role}</p>

      <h2>💰 ₹{currentBid.toFixed(2)} Cr</h2>

      <button
        onClick={increaseBid}
        style={{
          padding: "10px",
          backgroundColor: "gold",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Increase Bid (+25L)
      </button>
    </div>
  );
}

export default AuctionPanel;