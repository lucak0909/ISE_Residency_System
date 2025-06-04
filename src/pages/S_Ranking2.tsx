import {useState, useEffect} from "react";
import {NavLink} from 'react-router-dom';
import {supabase} from '../helper/supabaseClient';

// Define types for our data structure
// Company interface represents the structure of company data we'll be working with
interface Company {
    CompanyID: number;
    CompanyName: string;
}

export default function StudentRanking2() {
    // -------------- State Management --------------
    // Companies that are available to be ranked
    const [available, setAvailable] = useState<Company[]>([]);
    // Companies that have been ranked by the student
    const [ranking, setRanking] = useState<Company[]>([]);
    // Currently dragged company (for drag and drop functionality)
    const [dragged, setDragged] = useState<Company | null>(null);
    // Loading state for initial data fetching
    const [loading, setLoading] = useState(true);
    // State to track if ranking submission is in progress
    const [submitting, setSubmitting] = useState(false);
    // Current student's ID from the database
    const [studentID, setStudentID] = useState<number | null>(null);
    // Flag to indicate if rankings have already been submitted
    const [submitted, setSubmitted] = useState(false);
    // Student's full name for display purposes
    const [userName, setUserName] = useState<string>('');

    // -------------- Data Fetching --------------
    // Fetch the companies allocated to the student for interviews
    useEffect(() => {
        async function fetchAllocatedCompanies() {
            try {
                setLoading(true);

                // Step 1: Get current user's email from Supabase auth
                const {data: {user}} = await supabase.auth.getUser();
                if (!user?.email) {
                    console.error("No authenticated user found");
                    return;
                }

                // Step 2: Get student ID from User table using the email
                const {data: userData, error: userError} = await supabase
                    .from('User')
                    .select('ID')
                    .eq('Email', user.email.toLowerCase())
                    .maybeSingle();

                if (userError || !userData) {
                    console.error("Error fetching user data:", userError);
                    return;
                }

                setStudentID(userData.ID);

                // Step 3: Get companies allocated for interviews from InterviewAllocated table
                const {data: allocations, error: allocError} = await supabase
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

                // Step 4: Get detailed company information for each allocated company
                const companyIDs = allocations.map(a => a.CompanyID);
                const {data: companies, error: compError} = await supabase
                    .from('Company')
                    .select('CompanyID, CompanyName')
                    .in('CompanyID', companyIDs);

                if (compError || !companies) {
                    console.error("Error fetching company details:", compError);
                    return;
                }

                // Step 5: Check if student has already submitted rankings
                const {data: existingRankings, error: rankError} = await supabase
                    .from('StudentInterviewRank')
                    .select('CompanyID, Rank')
                    .eq('StudentID', userData.ID)
                    .order('Rank');

                if (rankError) {
                    console.error("Error checking existing rankings:", rankError);
                } else if (existingRankings && existingRankings.length > 0) {
                    // If rankings exist, load them into the UI
                    setSubmitted(true);

                    // Map company IDs from rankings to full company objects
                    const rankedCompanies = existingRankings
                        .map(rank => companies.find(c => c.CompanyID === rank.CompanyID))
                        .filter(Boolean) as Company[];

                    setRanking(rankedCompanies);

                    // Set available companies (those not in the ranking)
                    const rankedIDs = rankedCompanies.map(c => c.CompanyID);
                    setAvailable(companies.filter(c => !rankedIDs.includes(c.CompanyID)));
                } else {
                    // No existing rankings, set all companies as available to rank
                    setAvailable(companies);
                }
            } catch (error) {
                console.error("Unexpected error:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchAllocatedCompanies();
    }, []); // Empty dependency array means this runs once on component mount

    // Fetch the user's name for display in the UI
    useEffect(() => {
        async function fetchUserName() {
            const {data: {user}} = await supabase.auth.getUser();
            if (user) {
                const {data, error} = await supabase
                    .from('User')
                    .select('FirstName, Surname')
                    .eq('Email', user.email)
                    .single();

                if (error) {
                    console.error('Error fetching user name:', error);
                } else if (data) {
                    setUserName(`${data.FirstName} ${data.Surname}`);
                }
            }
        }

        fetchUserName();
    }, []); // Empty dependency array means this runs once on component mount

    // -------------- Drag and Drop Functionality --------------

    // Set data when starting to drag a company
    const dragData = (e: React.DragEvent, company: Company) => {
        // Store company data in the drag event
        e.dataTransfer.setData("text/plain", JSON.stringify(company));
        // Update state to track which company is being dragged
        setDragged(company);
    };

    // Allow drop by preventing default behavior
    const allowDrop = (e: React.DragEvent) => e.preventDefault();

    // Handle dropping a company into the ranking list
    const dropToRanking = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            // Get the company data from the drag event
            const companyData = e.dataTransfer.getData("text/plain");
            if (!companyData) return;

            const company = JSON.parse(companyData) as Company;

            // Check if company already exists in ranking list to prevent duplicates
            if (!company || ranking.some(c => c.CompanyID === company.CompanyID)) {
                return;
            }

            // Remove from available list
            setAvailable((a) => a.filter((c) => c.CompanyID !== company.CompanyID));

            // Add to ranking list at the end
            setRanking((r) => [...r, company]);
            setDragged(null);
        } catch (error) {
            console.error("Error processing drop:", error);
        }
    };

    // Handle dropping a company back to the available list
    const dropToAvailable = (e: React.DragEvent) => {
        e.preventDefault();
        try {
            // Get the company data from the drag event
            const companyData = e.dataTransfer.getData("text/plain");
            if (!companyData) return;

            const company = JSON.parse(companyData) as Company;
            if (!company) return;

            // Remove from ranking list
            setRanking((r) => r.filter((c) => c.CompanyID !== company.CompanyID));

            // Add to available list if not already there, and sort alphabetically
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

    // Handle reordering companies within the ranking list
    const handleReorder = (targetCompany: Company) => {
        // If no company is being dragged or it's the same as the target, do nothing
        if (!dragged || dragged.CompanyID === targetCompany.CompanyID) return;

        setRanking((r) => {
            // First check if dragged company is already in the list
            if (!r.some(c => c.CompanyID === dragged.CompanyID)) return r;

            // Create a new array without the dragged company
            const next = r.filter((c) => c.CompanyID !== dragged.CompanyID);

            // Find the index of the target company
            const idx = next.findIndex(c => c.CompanyID === targetCompany.CompanyID);

            // Insert the dragged company at that index
            next.splice(idx, 0, dragged);
            return next;
        });

        setDragged(null);
    };

    // -------------- Submission Handling --------------

    // Submit the final ranking to the database
    const submit = async () => {
        if (!studentID || ranking.length === 0) return;

        try {
            setSubmitting(true);
            // First, delete any existing rankings for this student to avoid duplicates
            await supabase
                .from('StudentInterviewRank')
                .delete()
                .eq('StudentID', studentID);

            // Then insert the new rankings with proper rank numbers
            const rankingData = ranking.map((company, index) => ({
                StudentID: studentID,
                CompanyID: company.CompanyID,
                Rank: index + 1  // Rank starts at 1
            }));

            const {error} = await supabase
                .from('StudentInterviewRank')
                .insert(rankingData);

            if (error) {
                console.error("Error submitting rankings:", error);
                alert("Failed to submit rankings. Please try again.");
            } else {
                alert("Rankings submitted successfully!");
                setSubmitted(true);
            }
        } catch (error) {
            console.error("Unexpected error during submission:", error);
            alert("An unexpected error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // -------------- Component Rendering --------------
    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            {/* Sidebar Navigation */}
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

                    <div className="mt-auto pt-6 flex flex-col items-center">
                        <span className="mb-1.5 text-xs text-green-400">Signed in as {userName}</span>
                        <NavLink
                            to="/login"
                            className="block w-full rounded-md bg-red-600/80 px-3 py-2 text-center font-medium hover:bg-red-600"
                        >
                            Log Out
                        </NavLink>
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 px-8 py-16 lg:px-14 lg:py-20">
                <h1 className="mb-3 text-center text-4xl font-extrabold tracking-tight md:text-6xl">
                    Student Rankings
                </h1>
                <p className="mb-16 mt-2 text-center text-gray-400 font-bold tracking-tight md:text-2xl">(Post-Interview)</p>

                {/* Show loading state or content based on data availability */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <p className="text-xl">Loading your allocated companies...</p>
                    </div>
                ) : (
                    <div className="mx-auto w-full lg:w-[60%]">
                        {/* Show message if no companies are allocated */}
                        {available.length === 0 && ranking.length === 0 ? (
                            <div className="text-center p-8 bg-slate-800/25 rounded-xl border border-slate-500/60">
                                <h2 className="text-2xl font-semibold mb-4">No Companies Allocated</h2>
                                <p>You don't have any companies allocated for interviews yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-20 lg:grid-cols-2">
                                {/* Available Companies Section */}
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

                                {/* Ranking Section */}
                                <section
                                    onDragOver={allowDrop}
                                    onDrop={dropToRanking}
                                    className="flex w-full flex-col rounded-xl border border-slate-500/60 bg-slate-800/25 p-10"
                                >
                                    <h2 className="mb-8 text-3xl font-semibold tracking-wide">Your Ranking</h2>

                                    {ranking.length === 0 ? (
                                        <p className="text-lg italic text-slate-400">Drag companies here</p>
                                    ) : (
                                        <ol className="space-y-6 text-lg">
                                            {ranking.map((company, i) => (
                                                <li
                                                    key={company.CompanyID}
                                                    draggable
                                                    onDragStart={(e) => dragData(e, company)}
                                                    onDragOver={allowDrop}
                                                    onDrop={() => handleReorder(company)}
                                                    className="cursor-grab rounded-md border border-white/40 px-5 py-4 hover:border-white/60 active:opacity-70 bg-slate-800 shadow-lg"
                                                >
                                                    <div className="flex items-center">
                                                        <span
                                                            className="text-xl font-semibold">{i + 1}. {company.CompanyName}</span>
                                                        <span
                                                            className="ml-auto text-sm font-medium bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">
                                                            R1+R2
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                    )}

                                    <button
                                        onClick={submit}
                                        disabled={ranking.length === 0 || submitting || submitted}
                                        className="mt-8 w-full rounded-md bg-indigo-600 px-5 py-3 text-lg font-semibold hover:bg-indigo-500 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    >
                                        {submitting ? "Submitting..." : submitted ? "Submitted" : "Submit Ranking"}
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