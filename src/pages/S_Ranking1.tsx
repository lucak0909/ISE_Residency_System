import { useState } from "react";

const ALL_COMPANIES = Array.from({ length: 25 }, (_, i) => `Company ${i + 1}`);

export default function App() {
    const [available, setAvailable] = useState<string[]>(ALL_COMPANIES);
    const [ranking, setRanking] = useState<string[]>([]);
    const [dragged, setDragged] = useState<string | null>(null);

    const dragData = (e: React.DragEvent, name: string) => {
        e.dataTransfer.setData("text/plain", name);
        setDragged(name);
    };

    const allowDrop = (e: React.DragEvent) => e.preventDefault();

    const dropToRanking = (e: React.DragEvent) => {
        e.preventDefault();
        const name = e.dataTransfer.getData("text/plain");
        if (!name) return;

        if (ranking.includes(name)) return;

        setAvailable((a) => a.filter((n) => n !== name));
        setRanking((r) => [...r, name]);
        setDragged(null);
    };

    const dropToAvailable = (e: React.DragEvent) => {
        e.preventDefault();
        const name = e.dataTransfer.getData("text/plain");
        if (!name) return;

        setRanking((r) => r.filter((n) => n !== name));
        if (!available.includes(name)) {
            setAvailable((a) => [...a, name].sort());
        }
        setDragged(null);
    };

    const handleReorder = (targetName: string) => {
        if (!dragged || dragged === targetName) return;
        setRanking((r) => {
            const next = [...r.filter((n) => n !== dragged)];
            const idx = next.indexOf(targetName);
            next.splice(idx, 0, dragged);
            return next;
        });
        setDragged(null);
    };

    const submit = () => console.log("Submitted:", ranking);

    return (
        <main className="min-h-screen w-full px-10 py-16 bg-slate-900 text-white">
            <h1 className="mb-16 text-center text-6xl font-extrabold tracking-tight">
                Student Rankings
            </h1>

            <div className="mx-auto w-full lg:w-[60%]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    {/* Companies column */}
                    <section
                        onDragOver={allowDrop}
                        onDrop={dropToAvailable}
                        className="w-full rounded-xl border border-slate-500/60 bg-slate-800/25 p-10"
                    >
                        <h2 className="mb-8 text-3xl font-semibold tracking-wide">Companies</h2>
                        <ul className="space-y-3 text-lg">
                            {available.map((c) => (
                                <li
                                    key={c}
                                    draggable
                                    onDragStart={(e) => dragData(e, c)}
                                    className="cursor-grab rounded-md border border-white/40 px-5 py-2 hover:border-white/60 active:opacity-70"
                                >
                                    {c}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section
                        onDragOver={allowDrop}
                        onDrop={dropToRanking}
                        className="w-full rounded-xl border border-slate-500/60 bg-slate-800/25 p-10 flex flex-col"
                    >
                        <h2 className="mb-8 text-3xl font-semibold tracking-wide">Your Ranking</h2>

                        {ranking.length === 0 ? (
                            <p className="italic text-slate-400 text-lg">Drag companies here</p>
                        ) : (
                            <ol className="space-y-3 text-lg">
                                {ranking.map((c, i) => (
                                    <li
                                        key={c}
                                        draggable
                                        onDragStart={(e) => dragData(e, c)}
                                        onDragOver={(e) => allowDrop(e)}
                                        onDrop={() => handleReorder(c)}
                                        className="cursor-grab rounded-md border border-white/40 px-5 py-2 hover:border-white/60 active:opacity-70"
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
            </div>
        </main>
    );
}
