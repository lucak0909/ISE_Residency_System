import {useState, useEffect} from "react";
import {NavLink} from 'react-router-dom';
import {supabase} from '../helper/supabaseClient';

/**
 * Interface defining the structure of a company object with ID mapping
 * Used for both available companies and ranked companies
 */
interface CompanyWithID {
    id: number;           // Company's unique identifier
    name: string;         // Company name
    residencyPeriod: string; // Which residency period the company offers (R1, R2, etc.)
}

/**
 * Available residency period options for filtering
 * "All" is a special option that shows companies from all periods
 */
const RESIDENCY_PERIODS = ["All", "R1", "R1+R2", "R2", "R3", "R4", "R5"];

/**
 * StudentRanking1 Component
 * 
 * This component allows students to rank companies for their initial preferences
 * before interviews. Students can drag companies from the available list to their
 * ranking list, reorder their rankings, and submit their preferences to the database.
 */
export default function StudentRanking1() {
    // State management for companies and UI
    const [available, setAvailable] = useState<CompanyWithID[]>([]); // Companies available to rank
    const [allCompanies, setAllCompanies] = useState<CompanyWithID[]>([]); // All companies (for filtering)
    const [ranking, setRanking] = useState<CompanyWithID[]>([]); // Student's current ranking
    const [dragged, setDragged] = useState<CompanyWithID | null>(null); // Currently dragged company
    const [loading, setLoading] = useState(true); // Loading state for initial data fetch
    const [error, setError] = useState<string | null>(null); // Error messages
    const [submitting, setSubmitting] = useState(false); // Submission in progress flag
    const [studentID, setStudentID] = useState<number | null>(null); // Current student's ID
    const [submitSuccess, setSubmitSuccess] = useState(false); // Success message flag
    const [selectedResidency, setSelectedResidency] = useState<string>("All"); // Selected filter
    const [userName, setUserName] = useState<string>(''); // Student's name for display

    /**
     * Effect: Fetch the current student's ID on component mount
     * This ID is needed to submit rankings to the correct student record
     */
    useEffect(() => {
        async function fetchStudentID() {
            try {
                // Get current authenticated user
                const {data: {user}} = await supabase.auth.getUser();
                if (!user?.email) throw new Error("User not authenticated");

                // Query User table to get the student's ID based on email
                const {data: userData, error: userError} = await supabase
                    .from('User')
                    .select('ID')
                    .eq('Email', user.email.toLowerCase())
                    .maybeSingle();

                if (userError) throw userError;
                if (!userData) throw new Error("User not found");

                // Store student ID in state
                setStudentID(userData.ID);
            } catch (err: any) {
                console.error('Error fetching student ID:', err);
                setError(err.message || "Failed to load student information");
            }
        }

        fetchStudentID();
    }, []); // Empty dependency array means this runs once on mount

    /**
     * Effect: Fetch available companies from the database
     * This populates the list of companies that students can rank
     */
    useEffect(() => {
        async function fetchCompanies() {
            try {
                // First attempt: Try to get companies that have positions
                // Join Position table with Company table to get company details
                let {data, error} = await supabase
                    .from('Position')
                    .select('CompanyID, Company(CompanyID, CompanyName), ResidencyTerm')
                    .order('CompanyID');

                if (error) throw error;

                // If we got data with the join query
                if (data && data.length > 0) {
                    // Extract unique company names and their IDs with residency periods
                    const companies = data
                        .filter(item => item.Company?.CompanyName && item.Company?.CompanyID)
                        .map(item => ({
                            id: item.Company.CompanyID as number,
                            name: item.Company.CompanyName as string,
                            residencyPeriod: item.ResidencyTerm || "Unknown"
                        }));

                    // Remove duplicates (a company might have multiple positions)
                    // Using Map to ensure uniqueness by company name
                    const uniqueCompanies = Array.from(
                        new Map(companies.map(item => [item.name, item])).values()
                    );

                    setAllCompanies(uniqueCompanies);
                    setAvailable(uniqueCompanies);
                } else {
                    // Fallback: Try to get all companies directly if no positions found
                    const {data: companyData, error: companyError} = await supabase
                        .from('Company')
                        .select('CompanyID, CompanyName');

                    if (companyError) throw companyError;

                    if (companyData && companyData.length > 0) {
                        const companies = companyData
                            .filter(company => company.CompanyName && company.CompanyID)
                            .map(company => ({
                                id: company.CompanyID as number,
                                name: company.CompanyName as string,
                                residencyPeriod: "Unknown" // No position data, so residency period is unknown
                            }));

                        setAllCompanies(companies);
                        setAvailable(companies);
                    } else {
                        // If still no data, use mock data for development/testing
                        const mockCompanies = Array.from({length: 5}, (_, i) => ({
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
                
                // Fallback to mock data on error
                const mockCompanies = Array.from({length: 5}, (_, i) => ({
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
    }, []); // Empty dependency array means this runs once on mount

    /**
     * Effect: Fetch the user's name for display in the UI
     */
    useEffect(() => {
        async function fetchUserName() {
            // Get current authenticated user
            const {data: {user}} = await supabase.auth.getUser();
            if (user) {
                // Query User table to get first and last name
                const {data, error} = await supabase
                    .from('User')
                    .select('FirstName, Surname')
                    .eq('Email', user.email)
                    .single();

                if (error) {
                    console.error('Error fetching user name:', error);
                } else if (data) {
                    // Combine first and last name for display
                    setUserName(`${data.FirstName} ${data.Surname}`);
                }
            }
        }

        fetchUserName();
    }, []); // Empty dependency array means this runs once on mount

    /**
     * Effect: Filter companies when residency period selection changes
     * This updates the available companies list based on the selected filter
     */
    useEffect(() => {
        if (selectedResidency === "All") {
            // Show all companies that aren't already in the ranking
            setAvailable(allCompanies
                .filter(company => !ranking.some(rankedCompany => rankedCompany.id === company.id))
            );
        } else {
            // Filter companies by selected residency period and exclude ranked ones
            setAvailable(allCompanies
                .filter(company => company.residencyPeriod === selectedResidency)
                .filter(company => !ranking.some(rankedCompany => rankedCompany.id === company.id))
            );
        }
    }, [selectedResidency, allCompanies, ranking]); // Re-run when these dependencies change

    /**
     * Set up drag data when a company is dragged
     * Stores the company data in the drag event and updates the dragged state
     */
    const dragData = (e: React.DragEvent, company: CompanyWithID) => {
        e.dataTransfer.setData("text/plain", JSON.stringify(company));
        setDragged(company);
    };

    /**
     * Allow drop by preventing the default behavior
     * This is necessary for the drop event to fire
     */
    const allowDrop = (e: React.DragEvent) => e.preventDefault();

    /**
     * Handle dropping a company into the ranking list
     * Moves the company from available to ranking
     */
    const dropToRanking = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            // Get company data from the drag event
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

    /**
     * Handle dropping a company back into the available list
     * Moves the company from ranking to available
     */
    const dropToAvailable = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            // Get company data from the drag event
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

    /**
     * Handle reordering companies within the ranking list
     * Moves the dragged company to the position of the target company
     */
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
            const {error: deleteError} = await supabase
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
                const {error: insertError} = await supabase
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
            <aside
                className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6">
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

                    <div className="mt-auto pt-6 flex flex-col items-center">
                        <span className="mb-1.5 text-xs text-green-800">Signed in as {userName}</span>
                        <NavLink
                            to="/login"
                            className="block w-full rounded-md bg-red-600/80 px-3 py-2 text-center font-medium hover:bg-red-600"
                        >
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
                                            <span
                                                className="text-sm font-semibold text-indigo-300 ml-2">{company.residencyPeriod}</span>
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
                            className="flex h-full min-h-[400px] flex-col rounded-xl border border-slate-500/60 bg-slate-800/25 p-6"
                        >
                            <h2 className="mb-6 text-2xl font-semibold">Your Ranking</h2>
                            <div className="flex-1 space-y-3 mb-8">
                                {ranking.length === 0 ? (
                                    <p className="text-slate-400">Drag companies here to rank them.</p>
                                ) : (
                                    ranking.map((company, index) => (
                                        <div
                                            key={company.id}
                                            draggable
                                            onDragStart={(e) => dragData(e, company)}
                                            onDragOver={allowDrop}
                                            onDrop={() => handleReorder(company)}
                                            className="flex cursor-grab items-center justify-between rounded-md border border-slate-600 bg-slate-800 p-4 hover:border-slate-400"
                                        >
                                            <span>{index + 1}. {company.name}</span>
                                            <span
                                                className="rounded-full bg-indigo-500/20 px-3 py-1 text-sm text-indigo-300">
                                                {company.residencyPeriod}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={submit}
                                disabled={ranking.length === 0 || submitting}
                                className="mt-auto w-full rounded-md bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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