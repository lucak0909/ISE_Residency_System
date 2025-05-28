// src/App.tsx – Student Ranking (desktop full‑width layout)
// React + TailwindCSS 3.x
// ---------------------------------------------------------------------------
//  • Stretches across the full viewport width (no max‑w wrapper)
//  • Two equal columns on desktop; stacks to one column on tablets/mobiles
//  • Wider cards (24 rem+) with ample padding for readability
//  • Drag‑and‑drop logic unchanged
// ---------------------------------------------------------------------------
import { useState } from "react";

const ALL_COMPANIES = Array.from({ length: 25 }, (_, i) => `Company ${i + 1}`);

export default function App() {
  const [available, setAvailable] = useState<string[]>(ALL_COMPANIES);
  const [ranking, setRanking] = useState<string[]>([]);

  /* ---------- drag helpers ---------- */
  const dragData = (e: React.DragEvent, name: string) =>
    e.dataTransfer.setData("text/plain", name);

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  const dropToRanking = (e: React.DragEvent) => {
    const name = e.dataTransfer.getData("text/plain");
    if (!name || ranking.includes(name)) return;
    setAvailable((a) => a.filter((n) => n !== name));
    setRanking((r) => [...r, name]);
  };

  const dropToAvailable = (e: React.DragEvent) => {
    const name = e.dataTransfer.getData("text/plain");
    setRanking((r) => r.filter((n) => n !== name));
    if (name && !available.includes(name))
      setAvailable((a) => [...a, name].sort());
  };

  const submit = () => console.log("Submitted:", ranking);

  /* ---------- UI ---------- */
  return (
    <main className="min-h-screen w-full px-10 py-16 bg-slate-900 text-white">
      <h1 className="mb-16 text-center text-6xl font-extrabold tracking-tight">
        Student Rankings
      </h1>

      {/* Full‑width two‑column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        {/* Companies column */}
        <section
          onDragOver={allowDrop}
          onDrop={dropToAvailable}
          className="w-full rounded-xl border border-slate-500/60 bg-slate-800/25 p-10"
        >
          <h2 className="mb-8 text-3xl font-semibold tracking-wide">Companies</h2>
          <ul className="space-y-3">
            {available.map((c) => (
              <li
                key={c}
                draggable
                onDragStart={(e) => dragData(e, c)}
                className="cursor-grab rounded-md border border-white/40 px-5 py-2 text-lg hover:border-white/60 active:opacity-70"
              >
                {c}
              </li>
            ))}
          </ul>
        </section>

        {/* Ranking column */}
        <section
          onDragOver={allowDrop}
          onDrop={dropToRanking}
          className="w-full rounded-xl border border-slate-500/60 bg-slate-800/25 p-10 flex flex-col"
        >
          <h2 className="mb-8 text-3xl font-semibold tracking-wide">Your Ranking</h2>

          {ranking.length === 0 ? (
            <p className="italic text-slate-400 text-lg">Drag companies here</p>
          ) : (
            <ol className="space-y-3">
              {ranking.map((c, i) => (
                <li
                  key={c}
                  draggable
                  onDragStart={(e) => dragData(e, c)}
                  className="cursor-grab rounded-md border border-white/40 px-5 py-2 text-lg hover:border-white/60 active:opacity-70"
                >
                  {i + 1}. {c}
                </li>
              ))}
            </ol>
          )}

          <button
            onClick={submit}
            disabled={ranking.length === 0}
            className="mt-auto w-full rounded-md bg-indigo-600 px-5 py-3 text-lg font-semibold hover:bg-indigo-500 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            Submit Ranking
          </button>
        </section>
      </div>
    </main>
  );
}
