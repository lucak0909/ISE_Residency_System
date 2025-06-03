import {useState} from "react";
import {NavLink} from 'react-router-dom';

const ALL_COMPANIES = Array.from({length: 3}, (_, i) => `Company ${i + 1}`);

export default function StudentRanking1() {
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
        if (!name || ranking.includes(name)) return;

        setAvailable((a) => a.filter((n) => n !== name));
        setRanking((r) => [...r, name]);
        setDragged(null);
    };

    const dropToAvailable = (e: React.DragEvent) => {
        e.preventDefault();
        const name = e.dataTransfer.getData("text/plain");
        if (!name) return;

        setRanking((r) => r.filter((n) => n !== name));
        if (!available.includes(name)) setAvailable((a) => [...a, name].sort());
        setDragged(null);
    };

    const handleReorder = (targetName: string) => {
        if (!dragged || dragged === targetName) return;
        setRanking((r) => {
            const next = r.filter((n) => n !== dragged);
            const idx = next.indexOf(targetName);
            next.splice(idx, 0, dragged);
            return next;
        });
        setDragged(null);
    };

    const submit = () => console.log("Submitted:", ranking);

    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            <aside
                className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold tracking-tight">Menu</h2>

                <nav className="flex flex-1 flex-col gap-4 text-lg">
                    <NavLink to="/JobsBoard"
                             className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Jobs Board
                    </NavLink>

                    <NavLink to="/StudentDashboard"
                             className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Student Dashboard
                    </NavLink>

                    <NavLink to="/StudentRanking1"
                             className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Initial Ranking
                    </NavLink>

                    <NavLink to="/StudentRanking2"
                             className="rounded-md bg-indigo-600/20 px-3 py-2 font-semibold ring-2 ring-indigo-600/30">
                        Post-Interview Ranking
                    </NavLink>

                    <div className="mt-auto pt-6">
                        <NavLink to="/login"
                                 className="block w-full rounded-md bg-red-600/80 px-3 py-2 text-center font-medium hover:bg-red-600">
                            Log Out
                        </NavLink>
                    </div>
                </nav>
            </aside>

            <main className="flex-1 px-8 py-16 lg:px-14 lg:py-20">
                <h1 className="mb-3 text-center text-4xl font-extrabold tracking-tight md:text-6xl">
                    Student Rankings
                </h1>
                <p className="mb-16 mt-2 text-center text-gray-400 font-bold tracking-tight md:text-2xl">(Post-Interview)</p>

                <div className="mx-auto w-full lg:w-[60%]">
                    <div className="grid grid-cols-1 gap-20 lg:grid-cols-2">
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
                            className="flex w-full flex-col rounded-xl border border-slate-500/60 bg-slate-800/25 p-10"
                        >
                            <h2 className="mb-8 text-3xl font-semibold tracking-wide">Your Ranking</h2>

                            {ranking.length === 0 ? (
                                <p className="text-lg italic text-slate-400">Drag companies here</p>
                            ) : (
                                <ol className="space-y-3 text-lg">
                                    {ranking.map((c, i) => (
                                        <li
                                            key={c}
                                            draggable
                                            onDragStart={(e) => dragData(e, c)}
                                            onDragOver={allowDrop}
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
                                className="mt-4 mt-auto w-full rounded-md bg-indigo-600 px-5 py-3 text-lg font-semibold hover:bg-indigo-500 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                Submit Ranking
                            </button>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
