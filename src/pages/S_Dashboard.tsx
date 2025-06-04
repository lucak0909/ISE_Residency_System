import {useState, useEffect} from "react";
import {NavLink} from 'react-router-dom';
import {supabase} from "../helper/supabaseClient";

/**
 * Utility function to verify access to the Supabase storage bucket
 * This ensures the application has proper permissions before attempting uploads
 * @returns {Promise<boolean>} True if bucket access is verified, false otherwise
 */
async function verifyBucketAccess() {
    try {
        // List all buckets to verify access
        const {data: buckets, error: bucketsError} = await supabase.storage.listBuckets();

        if (bucketsError) {
            console.error("Error listing buckets:", bucketsError);
            return false;
        }

        console.log("Available buckets:", buckets.map(b => b.name));

        // Check if our bucket exists
        const cvsBucket = buckets.find(b => b.name === 'cvs');
        if (!cvsBucket) {
            console.error("Bucket 'cvs' not found in available buckets");
            return false;
        }

        // Try to list files in the bucket root to verify permissions
        const {data: files, error: listError} = await supabase.storage
            .from('cvs')
            .list();

        if (listError) {
            console.error("Error listing files in 'cvs' bucket:", listError);
            return false;
        }

        console.log("Access to 'cvs' bucket verified, files at root:", files);
        return true;
    } catch (error) {
        console.error("Error verifying bucket access:", error);
        return false;
    }
}

/**
 * Component to display the student's final company match
 * Shows the company name and position title if a match exists
 */
function FinalMatchDisplay() {
    // State to store matched company information
    const [matchedCompany, setMatchedCompany] = useState<{
        companyName: string;
        position: string | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch match data when component mounts
    useEffect(() => {
        async function fetchMatchData() {
            try {
                setLoading(true);

                // Get current user
                const {data: {user}} = await supabase.auth.getUser();
                if (!user?.email) return;

                // Get student ID from User table
                const {data: userData} = await supabase
                    .from('User')
                    .select('ID')
                    .eq('Email', user.email.toLowerCase())
                    .single();

                if (!userData) return;

                // Check for match in FinalMatches table
                // Join with Company table to get company name
                const {data: matchData} = await supabase
                    .from('FinalMatches')
                    .select(`
                        CompanyID,
                        Company:CompanyID (
                            CompanyName
                        )
                    `)
                    .eq('StudentID', userData.ID)
                    .maybeSingle();

                if (matchData) {
                    // Get position details from Position table
                    const {data: positionData} = await supabase
                        .from('Position')
                        .select('Title')
                        .eq('CompanyID', matchData.CompanyID)
                        .maybeSingle();

                    setMatchedCompany({
                        companyName: matchData.Company.CompanyName || 'Unknown Company',
                        position: positionData?.Title || null
                    });
                }
            } catch (error) {
                console.error('Error fetching match data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchMatchData();
    }, []); // Run once on component mount

    // Conditional rendering based on loading state and match data
    if (loading) {
        return <p className="text-lg text-slate-300">Loading match data...</p>;
    }

    return (
        <div>
            {matchedCompany ? (
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-indigo-400">{matchedCompany.companyName}</h3>
                    {matchedCompany.position && (
                        <p className="mt-2 text-lg text-slate-300">Position: {matchedCompany.position}</p>
                    )}
                </div>
            ) : (
                <p className="text-lg text-slate-300">No match has been made yet.</p>
            )}
        </div>
    );
}

/**
 * Main StudentDashboard component
 * Displays student profile information and allows updating profile details
 */
export default function StudentDashboard() {
    /*  State variables for student profile data and UI state  */
    const [cvFile, setCvFile] = useState<File | null>(null);        // Selected CV file for upload
    const [linkedin, setLinkedin] = useState("");                   // LinkedIn profile URL
    const [github, setGithub] = useState("");                       // GitHub profile URL
    const [qca, setQca] = useState<number | null>(null);            // Student's QCA (academic score)
    const [yearOfStudy, setYearOfStudy] = useState("");             // Current year of study
    const [loading, setLoading] = useState(true);                   // Loading state for data fetching
    const [userId, setUserId] = useState<number | null>(null);      // User's ID from database
    const [uploadingCV, setUploadingCV] = useState(false);          // CV upload in progress indicator
    const [userName, setUserName] = useState('');                   // User's full name for display

    // Available year of study options for dropdown
    const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

    /**
     * Fetch user's name for display in the sidebar
     */
    useEffect(() => {
        async function fetchUserName() {
            // Get current authenticated user
            const {data: {user}} = await supabase.auth.getUser();
            if (user) {
                // Query User table for first and last name
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
    }, []); // Run once on component mount

    /**
     * Fetch student profile data when component mounts
     * Retrieves QCA, GitHub, LinkedIn, and year of study from database
     */
    useEffect(() => {
        async function fetchStudentData() {
            try {
                setLoading(true);

                // Verify storage bucket access for CV uploads
                const bucketAccessible = await verifyBucketAccess();
                if (!bucketAccessible) {
                    console.error("Cannot access the 'cvs' bucket - check permissions");
                }

                // Get the current authenticated user
                const {data: {user}} = await supabase.auth.getUser();

                if (user) {
                    // First get the user's ID from the User table using email
                    const {data: userData, error: userError} = await supabase
                        .from('User')
                        .select('ID')
                        .eq('Email', user.email)
                        .single();

                    if (userError) {
                        console.error('Error fetching user data:', userError);
                        return;
                    }

                    if (userData) {
                        setUserId(userData.ID);

                        // Now fetch the student record using the ID from User table
                        const {data: studentData, error: studentError} = await supabase
                            .from('Student')
                            .select('QCA, GitHub, LinkedIn, YearOfStudy')
                            .eq('StudentID', userData.ID)
                            .single();

                        if (studentError) {
                            console.error('Error fetching student data:', studentError);
                        } else if (studentData) {
                            // Populate state with student data
                            setQca(studentData.QCA);
                            setGithub(studentData.GitHub || "");
                            setLinkedin(studentData.LinkedIn || "");
                            setYearOfStudy(studentData.YearOfStudy || "");
                        }
                    }
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchStudentData();
    }, []); // Run once on component mount

    /**
     * Handle form submission to update student profile
     * Updates GitHub, LinkedIn, and year of study in database
     * @param {React.FormEvent} e - Form submission event
     */
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!userId) {
            alert("User ID not found. Please log in again.");
            return;
        }

        try {
            setUploadingCV(true);

            // Update student profile in the database
            const {error: updateError} = await supabase
                .from('Student')
                .update({
                    GitHub: github,
                    LinkedIn: linkedin,
                    YearOfStudy: yearOfStudy
                })
                .eq('StudentID', userId);

            if (updateError) throw updateError;

            // Handle CV file upload if a new file is selected
            if (cvFile) {
                // Placeholder for CV upload - functionality removed
                console.log("CV upload functionality removed");
                // Reset the file input
                setCvFile(null);
            }

            alert("Profile updated successfully!");
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert(`Failed to update profile: ${error.message}`);
        } finally {
            setUploadingCV(false);
        }
    }

    /*  Render the component UI  */
    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            {/*  Navigation sidebar with links to different student pages  */}
            <aside
                className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold tracking-tight">Menu</h2>

                <nav className="flex flex-1 flex-col gap-4 text-lg">
                    {/* Navigation links to different sections of the student portal */}
                    <NavLink to="/JobsBoard"
                             className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Jobs Board
                    </NavLink>

                    <NavLink to="/StudentDashboard"
                             className="rounded-md bg-indigo-600/20 px-3 py-2 font-semibold ring-2 ring-indigo-600/30">
                        Student Dashboard
                    </NavLink>

                    <NavLink to="/StudentRanking1"
                             className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Initial Ranking
                    </NavLink>

                    <NavLink to="/StudentRanking2"
                             className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Post-Interview Ranking
                    </NavLink>

                    {/* User info and logout section */}
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

            {/*  Main content  */}
            <main className="flex-1 px-8 py-16 lg:px-14 lg:py-20">
                <h1 className="mb-12 text-center text-4xl font-extrabold tracking-tight md:text-6xl">
                    Student Dashboard
                </h1>

                {/* QCA display */}
                <section
                    className="mx-auto mb-12 w-full max-w-xl rounded-xl border border-slate-500/60 bg-slate-800/25 p-8 text-center">
                    <h2 className="mb-3 text-2xl font-semibold">Your QCA</h2>
                    {loading ? (
                        <p className="text-5xl font-bold text-slate-400">Loading...</p>
                    ) : (
                        <p className="text-5xl font-bold text-indigo-400">
                            {qca !== null ? qca.toFixed(2) : "N/A"}
                        </p>
                    )}
                </section>

                {/* Final Match Display */}
                <section
                    className="mx-auto mb-12 w-full max-w-xl rounded-xl border border-slate-500/60 bg-slate-800/25 p-8 text-center">
                    <h2 className="mb-3 text-2xl font-semibold">Your Residency Match</h2>
                    <FinalMatchDisplay/>
                </section>

                {/* Profile form */}
                <section className="mx-auto w-full max-w-xl rounded-xl border border-slate-500/60 bg-slate-800/25 p-8">
                    <h2 className="mb-6 text-2xl font-semibold">Profile Details</h2>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Year of Study dropdown */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="yearOfStudy">
                                Year of Study
                            </label>
                            <select
                                id="yearOfStudy"
                                value={yearOfStudy}
                                onChange={(e) => setYearOfStudy(e.target.value)}
                                className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select Year</option>
                                {yearOptions.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* CV upload and view button */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="cv">
                                Upload CV (PDF)
                            </label>
                            <input
                                id="cv"
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                                className="cursor-pointer rounded-md border border-white/30 bg-slate-700/40 p-2 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white"
                            />
                            {uploadingCV && (
                                <div className="mt-2 text-sm text-indigo-400">
                                    Uploading CV...
                                </div>
                            )}

                            {/* CV View Button - Proof of Concept */}
                            <div className="mt-4">
                                <h3 className="mb-2 font-medium">Your Current CV</h3>
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm text-slate-300">
                                        CV_filename.pdf
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => alert("CV viewing functionality is a proof of concept")}
                                        className="flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5"
                                             viewBox="0 0 20 20" fill="currentColor">
                                            <path
                                                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                                            <path
                                                d="M8 11a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0-3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                                        </svg>
                                        View CV
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* LinkedIn */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="linkedin">
                                LinkedIn URL
                            </label>
                            <input
                                id="linkedin"
                                type="url"
                                placeholder="https://www.linkedin.com/in/your-profile"
                                value={linkedin}
                                onChange={(e) => setLinkedin(e.target.value)}
                                className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* GitHub */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="github">
                                GitHub URL
                            </label>
                            <input
                                id="github"
                                type="url"
                                placeholder="https://github.com/your-username"
                                value={github}
                                onChange={(e) => setGithub(e.target.value)}
                                className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-md bg-indigo-600 py-3 text-lg font-semibold hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            Save Changes
                        </button>
                    </form>
                </section>
            </main>
        </div>
    );
}