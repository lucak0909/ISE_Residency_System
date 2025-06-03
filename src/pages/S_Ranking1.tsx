import { useState, useEffect } from "react";
import { NavLink } from 'react-router-dom';
import { supabase } from '../helper/supabaseClient';

// This interface should match your actual database structure
interface CompanyData {
    CompanyID?: number;
    CompanyName?: string;
    // Add other fields that might be in your company table
}

// Interface for company with ID mapping
interface CompanyWithID {
    id: number;
    name: string;
    residencyPeriod: string; // Add residency period
}

// Define residency period options
const RESIDENCY_PERIODS = ["All", "R1", "R1+R2", "R2", "R3", "R4", "R5"];

export default function StudentRanking1() {
    const [available, setAvailable] = useState<CompanyWithID[]>([]);
    const [allCompanies, setAllCompanies] = useState<CompanyWithID[]>([]); // Store all companies with their data
    const [ranking, setRanking] = useState<CompanyWithID[]>([]);
    const [dragged, setDragged] = useState<CompanyWithID | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [studentID, setStudentID] = useState<number | null>(null);
    const [companyMap, setCompanyMap] = useState<Map<string, number>>(new Map());
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [selectedResidency, setSelectedResidency] = useState<string>("All"); // Default to "All"

    // Fetch student ID on component mount
    useEffect(() => {
        async function fetchStudentID() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user?.email) throw new Error("User not authenticated");

                const { data: userData, error: userError } = await supabase
                    .from('User')
                    .select('ID')
                    .eq('Email', user.email.toLowerCase())
                    .maybeSingle();

                if (userError) throw userError;
                if (!userData) throw new Error("User not found");

                setStudentID(userData.ID);
            } catch (err: any) {
                console.error('Error fetching student ID:', err);
                setError(err.message || "Failed to load student information");
            }
        }

        fetchStudentID();
    }, []);

    // Fetch companies from the database on component mount
    useEffect(() => {
        async function fetchCompanies() {
            try {
                // First attempt: Try to get companies that have positions
                let { data, error } = await supabase
                    .from('Position')
                    .select('CompanyID, Company(CompanyID, CompanyName), ResidencyTerm') // Changed from ResidencyPeriod to ResidencyTerm
                    .order('CompanyID');

                if (error) throw error;

                // If we got data with the join query
                if (data && data.length > 0) {
                    // Create a map of company names to IDs
                    const newCompanyMap = new Map<string, number>();

                    // Extract unique company names and their IDs with residency periods
                    const companies = data
                        .filter(item => item.Company?.CompanyName && item.Company?.CompanyID)
                        .map(item => ({
                            id: item.Company.CompanyID as number,
                            name: item.Company.CompanyName as string,
                            residencyPeriod: item.ResidencyTerm || "Unknown" // Changed from ResidencyPeriod to ResidencyTerm
                        }));

                    // Remove duplicates (a company might have multiple positions)
                    const uniqueCompanies = Array.from(
                        new Map(companies.map(item => [item.name, item])).values()
                    );

                    setAllCompanies(uniqueCompanies);

                    // Create company map for ID lookup
                    uniqueCompanies.forEach(company => {
                        newCompanyMap.set(company.name, company.id);
                    });

                    setCompanyMap(newCompanyMap);

                    // Set available companies based on the default filter (All)
                    setAvailable(uniqueCompanies);
                } else {
                    // Fallback: Try to get all companies directly
                    const { data: companyData, error: companyError } = await supabase
                        .from('Company')
                        .select('CompanyID, CompanyName');

                    if (companyError) throw companyError;

                    if (companyData && companyData.length > 0) {
                        // Create a map of company names to IDs
                        const newCompanyMap = new Map<string, number>();

                        const companies = companyData
                            .filter(company => company.CompanyName && company.CompanyID)
                            .map(company => ({
                                id: company.CompanyID as number,
                                name: company.CompanyName as string,
                                residencyPeriod: "Unknown" // Default when we don't have residency data
                            }));

                        setAllCompanies(companies);

                        companies.forEach(company => {
                            newCompanyMap.set(company.name, company.id);
                        });

                        setCompanyMap(newCompanyMap);
                        setAvailable(companies);
                    } else {
                        // If still no data, use mock data
                        const mockCompanies = Array.from({ length: 5 }, (_, i) => ({
                            id: i + 1,
                            name: `Company ${i + 1}`,
                            residencyPeriod: RESIDENCY_PERIODS[Math.floor(Math.random() * (RESIDENCY_PERIODS.length - 1)) + 1]
                        }));

                        setAllCompanies(mockCompanies);
                        setAvailable(mockCompanies);
                        setError("No companies found. Using sample data.");
                    }
                }
            } catch (err: any) {
                console.error('Error fetching companies:', err);
                setError(err.message || "Failed to load companies");
                // Fallback to mock data
                const mockCompanies = Array.from({ length: 5 }, (_, i) => ({
                    id: i + 1,
                    name: `Company ${i + 1}`,
                    residencyPeriod: RESIDENCY_PERIODS[Math.floor(Math.random() * (RESIDENCY_PERIODS.length - 1)) + 1]
                }));

                setAllCompanies(mockCompanies);
                setAvailable(mockCompanies);
            } finally {
                setLoading(false);
            }
        }

        fetchCompanies();
    }, []);

    // Filter companies when residency period changes
    useEffect(() => {
        if (selectedResidency === "All") {
            // Show all companies
            setAvailable(allCompanies
                .filter(company => !ranking.some(rankedCompany => rankedCompany.id === company.id))
            );
        } else {
            // Filter companies by selected residency period
            setAvailable(allCompanies
                .filter(company => company.residencyPeriod === selectedResidency)
                .filter(company => !ranking.some(rankedCompany => rankedCompany.id === company.id))
            );
        }
    }, [selectedResidency, allCompanies, ranking]);

    const dragData = (e: React.DragEvent, company: CompanyWithID) => {
        e.dataTransfer.setData("text/plain", JSON.stringify(company));
        setDragged(company);
    };

    const allowDrop = (e: React.DragEvent) => e.preventDefault();

    const dropToRanking = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            const companyData = e.dataTransfer.getData("text/plain");
            if (!companyData) return;

            const company = JSON.parse(companyData) as CompanyWithID;

            // Check if company already exists in ranking list
            if (!company || ranking.some(c => c.id === company.id)) return;

            // Remove from available list
            setAvailable((a) => a.filter((c) => c.id !== company.id));

            // Add to ranking list
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

            const company = JSON.parse(companyData) as CompanyWithID;
            if (!company) return;

            // Check if the company is in the ranking list before removing
            if (!ranking.some(c => c.id === company.id)) return;

            // Remove from ranking list
            setRanking((r) => r.filter((c) => c.id !== company.id));

            // Add to available list if not already there
            if (!available.some(c => c.id === company.id)) {
                setAvailable((a) => [...a, company].sort((a, b) => a.name.localeCompare(b.name)));
            }
            setDragged(null);
        } catch (error) {
            console.error("Error processing drop:", error);
        }
    };

    const handleReorder = (targetCompany: CompanyWithID) => {
        if (!dragged || dragged.id === targetCompany.id) return;

        setRanking((r) => {
            // First check if dragged company is already in the list
            if (!r.some(c => c.id === dragged.id)) return r;

            // Create a new array without the dragged company
            const next = r.filter((c) => c.id !== dragged.id);

            // Find the index of the target company
            const idx = next.findIndex(c => c.id === targetCompany.id);

            // Insert the dragged company at that index
            next.splice(idx, 0, dragged);
            return next;
        });
        setDragged(null);
    };

    const submit = async () => {
        if (!studentID) {
            setError("Student ID not available. Please log in again.");
            return;
        }

        if (ranking.length === 0) {
            setError("Please rank at least one company before submitting.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // First, delete any existing rankings for this student
            const { error: deleteError } = await supabase
                .from('StudentRank1')
                .delete()
                .eq('StudentID', studentID);

            if (deleteError) throw deleteError;

            // Prepare the rankings data
            const rankingsData = ranking.map((company, index) => ({
                StudentID: studentID,
                CompanyID: company.id,
                Rank: index + 1 // Ranks start at 1
            }));

            // Insert the new rankings
            if (rankingsData.length > 0) {
                const { error: insertError } = await supabase
                    .from('StudentRank1')
                    .insert(rankingsData);

                if (insertError) throw insertError;
            }

            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000); // Hide success message after 3 seconds

        } catch (err: any) {
            console.error('Error submitting rankings:', err);
            setError(err.message || "Failed to save rankings");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            <aside className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-xl">
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
                             className="rounded-md bg-indigo-600/20 px-3 py-2 font-semibold ring-2 ring-indigo-600/30">
                        Initial Ranking
                    </NavLink>

                    <NavLink to="/StudentRanking2"
                             className="rounded-md px-3 py-2 hover:bg-slate-700/50">
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
                <p className="mb-8 mt-2 text-center text-gray-400 font-bold tracking-tight md:text-2xl">(Pre-Interview)</p>

                {/* Residency Period Dropdown */}
                <div className="mx-auto mb-8 max-w-md">
                    <label htmlFor="residency-select" className="block mb-2 text-lg font-medium text-white">
                        Filter by Residency Period:
                    </label>
                    <select
                      id="residency-select"
                      value={selectedResidency}
                      onChange={(e) => setSelectedResidency(e.target.value)}
                      className="w-full max-w-md rounded-md border border-indigo-500/30 bg-slate-800 px-4 py-2 text-white shadow-md focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {RESIDENCY_PERIODS.map((period) => (
                        <option 
                          key={period} 
                          value={period} 
                          className="bg-slate-800 text-white hover:bg-slate-700"
                        >
                          {period}
                        </option>
                      ))}
                    </select>
                </div>

                {error && (
                    <div className="mx-auto mb-8 max-w-2xl rounded-md bg-red-500/20 p-4 text-center text-red-200">
                        {error}
                    </div>
                )}

                {submitSuccess && (
                    <div className="mx-auto mb-8 max-w-2xl rounded-md bg-green-500/20 p-4 text-center text-green-200">
                        Rankings submitted successfully!
                    </div>
                )}

                <div className="mx-auto w-full lg:w-[60%]">
                    <div className="grid grid-cols-1 gap-20 lg:grid-cols-2">
                        <section
                            onDragOver={allowDrop}
                            onDrop={dropToAvailable}
                            className="w-full rounded-xl border border-slate-500/60 bg-slate-800/25 p-10"
                        >
                            <h2 className="mb-8 text-3xl font-semibold tracking-wide">Companies</h2>
                            {loading ? (
                                <p className="text-lg italic text-slate-400">Loading companies...</p>
                            ) : available.length > 0 ? (
                                <ul className="space-y-3 text-lg">
                                    {available.map((company) => (
                                        <li
                                            key={company.id}
                                            draggable
                                            onDragStart={(e) => dragData(e, company)}
                                            className="cursor-grab rounded-md border border-white/40 px-5 py-2 hover:border-white/60 active:opacity-70 flex justify-between items-center"
                                        >
                                            <span>{company.name}</span>
                                            <span className="text-sm font-semibold text-indigo-300 ml-2">{company.residencyPeriod}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-lg italic text-slate-400">No companies available</p>
                            )}
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
                                            key={company.id}
                                            draggable
                                            onDragStart={(e) => dragData(e, company)}
                                            onDragOver={allowDrop}
                                            onDrop={() => handleReorder(company)}
                                            className="cursor-grab rounded-md border border-white/40 px-5 py-2 hover:border-white/60 active:opacity-70 flex justify-between items-center"
                                        >
                                            <span>{i + 1}. {company.name}</span>
                                            <span className="text-sm font-semibold text-indigo-300 ml-2">{company.residencyPeriod}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}

                            <button
                                onClick={submit}
                                disabled={ranking.length === 0 || submitting}
                                className="mt-4 mt-auto w-full rounded-md bg-indigo-600 px-5 py-3 text-lg font-semibold hover:bg-indigo-500 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                {submitting ? "Submitting..." : "Submit Ranking"}
                            </button>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}