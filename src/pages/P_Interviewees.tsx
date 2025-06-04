import {useState, useEffect} from "react";
import {supabase} from "../helper/supabaseClient";
import {NavLink} from 'react-router-dom';

export default function P_Interviewees() {
    const [interviewees, setInterviewees] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState<string>('');

    useEffect(() => {
        async function fetchInterviewees() {
            try {
                setLoading(true);

                // Get current user
                const {data: {user}} = await supabase.auth.getUser();
                if (!user?.email) return;

                // Get company ID from User table
                const {data: userData} = await supabase
                    .from('User')
                    .select('ID')
                    .eq('Email', user.email.toLowerCase())
                    .maybeSingle();

                if (!userData) return;

                // Fetch students who have been allocated interviews with this company
                const {data: interviewData} = await supabase
                    .from('InterviewAllocated')
                    .select('StudentID')
                    .eq('CompanyID', userData.ID);

                if (interviewData && interviewData.length > 0) {
                    // Get student details
                    const studentIDs = interviewData.map(item => item.StudentID);

                    // First, get student data
                    const {data: students} = await supabase
                        .from('Student')
                        .select('StudentID, QCA, GitHub, LinkedIn, YearOfStudy')
                        .in('StudentID', studentIDs);

                    if (students && students.length > 0) {
                        // Then, get user data for these students
                        const {data: usersData} = await supabase
                            .from('User')
                            .select('ID, FirstName, Surname')
                            .in('ID', studentIDs);

                        // Combine the data
                        const formattedStudents = students.map(student => {
                            const userData = usersData?.find(user => user.ID === student.StudentID);
                            return {
                                ...student,
                                FirstName: userData?.FirstName || 'Unknown',
                                Surname: userData?.Surname || 'Student',
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
    }, []);

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
    }, []);

    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            <aside
                className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold tracking-tight">Menu</h2>
                <nav className="flex flex-1 flex-col gap-4 text-lg">
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
                    <div className="mt-auto pt-6 flex flex-col items-center">
                        <span className="mb-1.5 text-xs text-green-400">Signed in as {userName}</span>
                        <NavLink to="/login"
                                 className="block w-full rounded-md bg-red-600/80 px-3 py-2 text-center font-medium hover:bg-red-600">
                            Log Out
                        </NavLink>
                    </div>
                </nav>
            </aside>

            <main className="flex-1 px-8 py-16 lg:px-14 lg:py-20">
                <h1 className="mb-12 text-center text-4xl font-extrabold tracking-tight md:text-6xl">
                    Your Interviewees
                </h1>

                {loading ? (
                    <p className="text-center text-xl text-slate-300">Loading interviewees...</p>
                ) : (
                    <div className="mx-auto w-full max-w-3xl">
                        {interviewees.length === 0 ? (
                            <p className="text-center text-lg text-slate-400">No interviewees found.</p>
                        ) : (
                            <ul className="space-y-4">
                                {interviewees.map((student) => (
                                    <li key={student.StudentID} className="rounded-lg border border-white/30 p-6">
                                        <h3 className="text-xl font-bold text-indigo-400">{student.displayName}</h3>
                                        <p className="text-sm text-slate-300">QCA: {student.QCA}</p>
                                        <p className="text-sm text-slate-300">Year of Study: {student.YearOfStudy}</p>
                                        <p className="text-sm text-slate-300">GitHub: <a href={student.GitHub}
                                                                                         target="_blank"
                                                                                         rel="noopener noreferrer"
                                                                                         className="text-indigo-400 hover:underline">{student.GitHub}</a>
                                        </p>
                                        <p className="text-sm text-slate-300">LinkedIn: <a href={student.LinkedIn}
                                                                                           target="_blank"
                                                                                           rel="noopener noreferrer"
                                                                                           className="text-indigo-400 hover:underline">{student.LinkedIn}</a>
                                        </p>
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

interface Student {
    StudentID: number;
    QCA: number;
    GitHub: string | null;
    LinkedIn: string | null;
    YearOfStudy: string | null;
    FirstName?: string;
    Surname?: string;
    displayName?: string;
}