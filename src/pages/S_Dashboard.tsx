import {useState, useEffect} from "react";
import {NavLink} from 'react-router-dom';
import {supabase} from "../helper/supabaseClient";

function FinalMatchDisplay() {
    const [matchedCompany, setMatchedCompany] = useState<{ companyName: string, position: string | null } | null>(null);
    const [loadingMatch, setLoadingMatch] = useState(true);

    useEffect(() => {
        async function fetchMatchData() {
            try {
                // Get current user's email
                const { data: { user } } = await supabase.auth.getUser();
                if (!user?.email) return;
                
                // Get student ID from User table
                const { data: userData } = await supabase
                    .from('User')
                    .select('ID')
                    .eq('Email', user.email.toLowerCase())
                    .maybeSingle();
                
                if (!userData) return;
                
                // Get matched company from FinalMatches table
                const { data: matchData } = await supabase
                    .from('FinalMatches')
                    .select(`
                        Company:CompanyID (
                            CompanyName
                        )
                    `)
                    .eq('StudentID', userData.ID)
                    .maybeSingle();
                
                // Get position title if available
                const { data: positionData } = await supabase
                    .from('Position')
                    .select('Title')
                    .eq('CompanyID', matchData?.CompanyID)
                    .maybeSingle();
                
                if (matchData?.Company) {
                    setMatchedCompany({
                        companyName: matchData.Company.CompanyName || 'Unknown Company',
                        position: positionData?.Title || null
                    });
                }
            } catch (error) {
                console.error('Error fetching match data:', error);
            } finally {
                setLoadingMatch(false);
            }
        }
        
        fetchMatchData();
    }, []);

    if (loadingMatch) {
        return <p className="text-lg text-slate-300">Loading your match information...</p>;
    }

    return matchedCompany ? (
        <div className="space-y-2">
            <p className="text-3xl font-bold text-indigo-400">{matchedCompany.companyName}</p>
            {matchedCompany.position && (
                <p className="text-xl text-slate-300">{matchedCompany.position}</p>
            )}
            <p className="mt-4 text-sm text-slate-400">Congratulations on your residency placement!</p>
        </div>
    ) : (
        <p className="text-lg text-slate-300">No residency match has been assigned yet.</p>
    );
}

export default function StudentDashboard() {
    /*  local component state  */
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [linkedin, setLinkedin] = useState("");
    const [github, setGithub] = useState("");
    const [qca, setQca] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch student QCA on component mount
    useEffect(() => {
        async function fetchStudentData() {
            try {
                setLoading(true);

                // Get the current user
                const {data: {user}} = await supabase.auth.getUser();

                if (user) {
                    // First get the user's ID from the User table
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
                        // Now fetch the student record using the ID from User table
                        const {data: studentData, error: studentError} = await supabase
                            .from('Student')
                            .select('QCA')
                            .eq('StudentID', userData.ID)
                            .single();

                        if (studentError) {
                            console.error('Error fetching student data:', studentError);
                        } else if (studentData) {
                            setQca(studentData.QCA);
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
    }, []);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        // TODO: send FormData / JSON to backend
        console.log({cvFile, linkedin, github});
        alert("Profile saved (mock)");
    }

    /*  render section  */
    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            {/*  Navigation bar  */}
            <aside
                className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold tracking-tight">Menu</h2>

                <nav className="flex flex-1 flex-col gap-4 text-lg">
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

                    <div className="mt-auto pt-6">
                        <NavLink to="/login"
                                 className="block w-full rounded-md bg-red-600/80 px-3 py-2 text-center font-medium hover:bg-red-600">
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
                <section className="mx-auto mb-12 w-full max-w-xl rounded-xl border border-slate-500/60 bg-slate-800/25 p-8 text-center">
                    <h2 className="mb-3 text-2xl font-semibold">Your Residency Match</h2>
                    <FinalMatchDisplay />
                </section>

                {/* Profile form */}
                <section className="mx-auto w-full max-w-xl rounded-xl border border-slate-500/60 bg-slate-800/25 p-8">
                    <h2 className="mb-6 text-2xl font-semibold">Profile Details</h2>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* CV upload */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="cv">
                                Upload CV (PDF)
                            </label>
                            <input
                                id="cv"
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                                className="cursor-pointer rounded-md border border-white/30 bg-slate-700/40 p-2 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white hover:file:bg-indigo-500"
                            />
                            {cvFile && (
                                <span className="text-sm text-slate-300">Selected: {cvFile.name}</span>
                            )}
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