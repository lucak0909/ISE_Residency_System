import {useState, useEffect} from "react";
import {supabase} from "../helper/supabaseClient";
import {NavLink} from 'react-router-dom';

/**
 * P_Interviewees component
 * Displays a list of students who have been allocated interviews with the company
 * Allows partners to view student details before conducting interviews
 */
export default function P_Interviewees() {
    // State to store student data and UI state
    const [interviewees, setInterviewees] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState<string>('');

    /**
     * Fetches students allocated for interviews with this company
     * Combines data from InterviewAllocated, Student, and User tables
     */
    useEffect(() => {
        async function fetchInterviewees() {
            try {
                setLoading(true);

                // Get current authenticated user
                const {data: {user}} = await supabase.auth.getUser();
                if (!user?.email) return;

                // Get company ID from User table using email
                const {data: userData} = await supabase
                    .from('User')
                    .select('ID')
                    .eq('Email', user.email.toLowerCase())
                    .maybeSingle();

                if (!userData) return;

                // Fetch students who have been allocated interviews with this company
                // from the InterviewAllocated table
                const {data: interviewData} = await supabase
                    .from('InterviewAllocated')
                    .select('StudentID')
                    .eq('CompanyID', userData.ID);

                if (interviewData && interviewData.length > 0) {
                    // Extract student IDs from interview allocations
                    const studentIDs = interviewData.map(item => item.StudentID);

                    // First, get student-specific data from Student table
                    const {data: students} = await supabase
                        .from('Student')
                        .select('StudentID, QCA, GitHub, LinkedIn, YearOfStudy')
                        .in('StudentID', studentIDs);

                    if (students && students.length > 0) {
                        // Then, get user data for these students (including name and email)
                        const {data: usersData} = await supabase
                            .from('User')
                            .select('ID, FirstName, Surname, Email')
                            .in('ID', studentIDs);

                        // Combine the data from both tables to create complete student profiles
                        const formattedStudents = students.map(student => {
                            const userData = usersData?.find(user => user.ID === student.StudentID);
                            return {
                                ...student,
                                FirstName: userData?.FirstName || 'Unknown',
                                Surname: userData?.Surname || 'Student',
                                Email: userData?.Email || 'No email available',
                                displayName: userData ? `${userData.FirstName} ${userData.Surname}` : `Student ${student.StudentID}`
                            };
                        });

                        setInterviewees(formattedStudents);
                    }
                }
            } catch (error) {
                console.error("Error fetching interviewees:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchInterviewees();
    }, []); // Run once on component mount

    /**
     * Fetches the current user's name to display in the sidebar
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

    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            {/* Navigation sidebar */}
            <aside
                className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold tracking-tight">Menu</h2>
                <nav className="flex flex-1 flex-col gap-4 text-lg">
                    {/* Navigation links */}
                    <NavLink to="/PartnerDashboard" className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Partner Dashboard
                    </NavLink>
                    <NavLink to="/PartnerInterviewees"
                             className="rounded-md bg-indigo-600/20 px-3 py-2 font-semibold ring-2 ring-indigo-600/30">
                        Your Interviewees
                    </NavLink>
                    <NavLink to="/PartnerRanking" className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Interviewee Ranking
                    </NavLink>
                    {/* User info and logout */}
                    <div className="mt-auto pt-6 flex flex-col items-center">
                        <span className="mb-1.5 text-xs text-green-400">Signed in as {userName}</span>
                        <NavLink to="/login"
                                 className="block w-full rounded-md bg-red-600/80 px-3 py-2 text-center font-medium hover:bg-red-600">
                            Log Out
                        </NavLink>
                    </div>
                </nav>
            </aside>

            {/* Main content area */}
            <main className="flex-1 px-8 py-16 lg:px-14 lg:py-20">
                <h1 className="mb-12 text-center text-4xl font-extrabold tracking-tight md:text-6xl">
                    Your Interviewees
                </h1>

                {/* Conditional rendering based on loading state */}
                {loading ? (
                    <p className="text-center text-xl text-slate-300">Loading interviewees...</p>
                ) : (
                    <div className="mx-auto w-full max-w-3xl">
                        {/* Show message if no interviewees found */}
                        {interviewees.length === 0 ? (
                            <p className="text-center text-lg text-slate-400">No interviewees found.</p>
                        ) : (
                            /* List of interviewees */
                            <ul className="space-y-4">
                                {interviewees.map((student) => (
                                    <li key={student.StudentID} className="rounded-lg border border-white/30 p-6">
                                        {/* Student name */}
                                        <h3 className="text-xl font-bold text-indigo-400">{student.displayName}</h3>
                                        <div className="mt-2 space-y-1">
                                            {/* Student email with mailto link */}
                                            <p className="text-sm text-slate-300">
                                                <span className="font-medium">Email:</span>{" "}
                                                <a href={`mailto:${student.Email}`} className="text-indigo-400 hover:underline">
                                                    {student.Email}
                                                </a>
                                            </p>
                                            {/* Student QCA */}
                                            <p className="text-sm text-slate-300">
                                                <span className="font-medium">QCA:</span> {student.QCA}
                                            </p>
                                            {/* Year of study */}
                                            <p className="text-sm text-slate-300">
                                                <span className="font-medium">Year of Study:</span> {student.YearOfStudy}
                                            </p>
                                            {/* GitHub link if available */}
                                            {student.GitHub && (
                                                <p className="text-sm text-slate-300">
                                                    <span className="font-medium">GitHub:</span>{" "}
                                                    <a href={student.GitHub} target="_blank" rel="noopener noreferrer" 
                                                       className="text-indigo-400 hover:underline">
                                                        {/* Display GitHub username without the URL prefix */}
                                                        {student.GitHub.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                                                    </a>
                                                </p>
                                            )}
                                            {/* LinkedIn link if available */}
                                            {student.LinkedIn && (
                                                <p className="text-sm text-slate-300">
                                                    <span className="font-medium">LinkedIn:</span>{" "}
                                                    <a href={student.LinkedIn} target="_blank" rel="noopener noreferrer"
                                                       className="text-indigo-400 hover:underline">
                                                        {/* Display LinkedIn profile name without the URL prefix */}
                                                        {student.LinkedIn.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
                                                    </a>
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

/**
 * Interface for Student data
 * Combines information from both Student and User tables
 */
interface Student {
    StudentID: number;       // Primary key, matches ID in User table
    QCA: number;             // Student's academic performance metric
    GitHub: string | null;   // GitHub profile URL
    LinkedIn: string | null; // LinkedIn profile URL
    YearOfStudy: string | null; // Current year of study (e.g., "3rd Year")
    FirstName?: string;      // From User table
    Surname?: string;        // From User table
    Email?: string;          // From User table
    displayName?: string;    // Formatted full name for display
}