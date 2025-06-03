import { useState, useEffect } from "react";
import { NavLink } from 'react-router-dom';
import { supabase } from '../helper/supabaseClient';

// Define types for our data
interface Company {
  CompanyID: number;
  CompanyName: string;
}

export default function StudentRanking2() {
    const [available, setAvailable] = useState<Company[]>([]);
    const [ranking, setRanking] = useState<Company[]>([]);
    const [dragged, setDragged] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [studentID, setStudentID] = useState<number | null>(null);

    // Fetch the current user's allocated companies on component mount
    useEffect(() => {
        async function fetchAllocatedCompanies() {
            try {
                setLoading(true);
                
                // 1. Get current user's email
                const { data: { user } } = await supabase.auth.getUser();
                if (!user?.email) {
                    console.error("No authenticated user found");
                    return;
                }
                
                // 2. Get student ID from User table
                const { data: userData, error: userError } = await supabase
                    .from('User')
                    .select('ID')
                    .eq('Email', user.email.toLowerCase())
                    .maybeSingle();
                
                if (userError || !userData) {
                    console.error("Error fetching user data:", userError);
                    return;
                }
                
                setStudentID(userData.ID);
                
                // 3. Get allocated companies from InterviewAllocated table
                const { data: allocations, error: allocError } = await supabase
                    .from('InterviewAllocated')
                    .select('CompanyID')
                    .eq('StudentID', userData.ID);
                
                if (allocError || !allocations) {
                    console.error("Error fetching allocations:", allocError);
                    return;
                }
                
                if (allocations.length === 0) {
                    console.log("No allocated companies found for this student");
                    setLoading(false);
                    return;
                }
                
                // 4. Get company details for each allocation
                const companyIDs = allocations.map(a => a.CompanyID);
                const { data: companies, error: compError } = await supabase
                    .from('Company')
                    .select('CompanyID, CompanyName')
                    .in('CompanyID', companyIDs);
                
                if (compError || !companies) {
                    console.error("Error fetching company details:", compError);
                    return;
                }
                
                setAvailable(companies);
            } catch (error) {
                console.error("Unexpected error:", error);
            } finally {
                setLoading(false);
            }
        }
        
        fetchAllocatedCompanies();
    }, []);

    const dragData = (e: React.DragEvent, company: Company) => {
        e.dataTransfer.setData("text/plain", JSON.stringify(company));
        setDragged(company);
    };

    const allowDrop = (e: React.DragEvent) => e.preventDefault();

    const dropToRanking = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            const companyData = e.dataTransfer.getData("text/plain");
            if (!companyData) return;
            
            const company = JSON.parse(companyData) as Company;
            if (!company || ranking.some(c => c.CompanyID === company.CompanyID)) return;

            setAvailable((a) => a.filter((c) => c.CompanyID !== company.CompanyID));
            setRanking((r) => [...r, company]);
            setDragged(null);
        } catch (error) {
            console.error("Error processing drop:", error);
        }
    };

    const dropToAvailable = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            const companyData = e.dataTransfer.getData("text/plain");
            if (!companyData) return;
            
            const company = JSON.parse(companyData) as Company;
            if (!company) return;

            setRanking((r) => r.filter((c) => c.CompanyID !== company.CompanyID));
            if (!available.some(c => c.CompanyID === company.CompanyID)) {
                setAvailable((a) => [...a, company].sort((a, b) => 
                    a.CompanyName.localeCompare(b.CompanyName)
                ));
            }
            setDragged(null);
        } catch (error) {
            console.error("Error processing drop:", error);
        }
    };

    const handleReorder = (targetCompany: Company) => {
        if (!dragged || dragged.CompanyID === targetCompany.CompanyID) return;
        setRanking((r) => {
            const next = r.filter((c) => c.CompanyID !== dragged.CompanyID);
            const idx = next.findIndex(c => c.CompanyID === targetCompany.CompanyID);
            next.splice(idx, 0, dragged);
            return next;
        });
        setDragged(null);
    };

    const submit = async () => {
        if (!studentID || ranking.length === 0) return;
        
        try {
            // First, delete any existing rankings for this student
            await supabase
                .from('StudentRank2')
                .delete()
                .eq('StudentID', studentID);
            
            // Then insert the new rankings
            const rankingData = ranking.map((company, index) => ({
                StudentID: studentID,
                CompanyID: company.CompanyID,
                Rank: index + 1
            }));
            
            const { error } = await supabase
                .from('StudentRank2')
                .insert(rankingData);
                
            if (error) {
                console.error("Error submitting rankings:", error);
                alert("Failed to submit rankings. Please try again.");
            } else {
                alert("Rankings submitted successfully!");
            }
        } catch (error) {
            console.error("Unexpected error during submission:", error);
            alert("An unexpected error occurred. Please try again.");
        }
    };

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

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <p className="text-xl">Loading your allocated companies...</p>
                    </div>
                ) : (
                    <div className="mx-auto w-full lg:w-[60%]">
                        {available.length === 0 && ranking.length === 0 ? (
                            <div className="text-center p-8 bg-slate-800/25 rounded-xl border border-slate-500/60">
                                <h2 className="text-2xl font-semibold mb-4">No Companies Allocated</h2>
                                <p>You don't have any companies allocated for interviews yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-20 lg:grid-cols-2">
                                <section
                                    onDragOver={allowDrop}
                                    onDrop={dropToAvailable}
                                    className="w-full rounded-xl border border-slate-500/60 bg-slate-800/25 p-10"
                                >
                                    <h2 className="mb-8 text-3xl font-semibold tracking-wide">Companies</h2>
                                    <ul className="space-y-3 text-lg">
                                        {available.map((company) => (
                                            <li
                                                key={company.CompanyID}
                                                draggable
                                                onDragStart={(e) => dragData(e, company)}
                                                className="cursor-grab rounded-md border border-white/40 px-5 py-2 hover:border-white/60 active:opacity-70"
                                            >
                                                {company.CompanyName}
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
                                            {ranking.map((company, i) => (
                                                <li
                                                    key={company.CompanyID}
                                                    draggable
                                                    onDragStart={(e) => dragData(e, company)}
                                                    onDragOver={allowDrop}
                                                    onDrop={() => handleReorder(company)}
                                                    className="cursor-grab rounded-md border border-white/40 px-5 py-2 hover:border-white/60 active:opacity-70"
                                                >
                                                    {i + 1}. {company.CompanyName}
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
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}