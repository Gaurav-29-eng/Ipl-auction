import PlayerCard from "../components/PlayerCard";
import TeamPanel from "../components/TeamPanel";

export default function Auction() {
  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 flex flex-col items-center">

      {/* TITLE */}
      <h1 className="text-4xl text-green-400 mb-10 font-bold">
        IPL Auction Dashboard
      </h1>

      {/* PLAYER */}
      <div className="mb-12">
        <PlayerCard />
      </div>

      {/* TEAMS */}
      <div className="grid grid-cols-2 gap-10 mb-12 w-full max-w-3xl">
        <TeamPanel />
        <TeamPanel />
      </div>

      {/* BID BUTTON */}
      <button className="bg-green-500 text-black px-8 py-3 rounded-xl text-lg font-semibold hover:scale-105 transition shadow-[0_0_20px_rgba(34,197,94,0.5)]">
        Place Bid (+0.5 Cr)
      </button>

    </div>
  );
}