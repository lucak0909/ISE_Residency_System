import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../helper/supabaseClient';

// Define the Job interface
interface Job {
    title: string;
    salary: string;
    location: string;
    daysInPerson: string;
    description: string;
    round: string;
    email: string;
    company: string;
    address: string;
    residency: string;
}

function JobsBoard() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [userName, setUserName] = useState<string>('');

    useEffect(() => {
        async function fetchUserName() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
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

    useEffect(() => {
        async function fetchJobs() {
            const { data, error } = await supabase
                .from('Position')
                .select(`
                    *,  
                    Company:CompanyID (
                        CompanyName,
                        Email,
                        Address
                    )
                `);

            if (error) {
                console.error('Error fetching jobs:', error);
            } else if (data) {
                const formattedJobs: Job[] = data.map((entry) => ({
                    title: entry.Title,
                    salary: entry.Salary,
                    location: entry.Location,
                    daysInPerson: entry.DaysInPerson ?? 'N/A',
                    description: entry.Description ?? 'No description provided.',
                    round: entry.ResidencyTerm ?? 'Unknown',
                    email: entry.Company?.Email ?? 'Unknown',
                    company: entry.Company?.CompanyName ?? 'Unknown',
                    address: entry.Company?.Address ?? 'Unknown',
                    residency: entry.Company?.CompanyName ?? 'Unknown',
                }));
                setJobs(formattedJobs);
            }
        }
        fetchJobs();
    }, []);

    const ResidencyTerm = ['R1', 'R1+R2', 'R2', 'R3', 'R4', 'R5'];
    const groupedJobs = ResidencyTerm.map(round => ({
        round,
        jobs: jobs.filter(job => job.round === round)
    })).filter(group => group.jobs.length > 0);

    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            {/* Sidebar */}
            <aside className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold tracking-tight">Menu</h2>
                <nav className="flex flex-1 flex-col gap-4 text-lg">
                    <NavLink
                        to="/JobsBoard"
                        className="rounded-md bg-indigo-600/20 px-3 py-2 font-semibold ring-2 ring-indigo-600/30"
                    >
                        Jobs Board
                    </NavLink>
                    <NavLink to="/StudentDashboard" className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Student Dashboard
                    </NavLink>
                    <NavLink to="/StudentRanking1" className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Initial Ranking
                    </NavLink>
                    <NavLink to="/StudentRanking2" className="rounded-md px-3 py-2 hover:bg-slate-700/50">
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

            {/* Job Grid and Modal */}
            <main className="flex-1 p-10">
                <h1 className="text-3xl font-bold mb-8">Available Residencies</h1>
                {groupedJobs.map(group => (
                    <div key={group.round} className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4">{group.round}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {group.jobs.map((job, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedJob(job)}
                                    className="text-left rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-lg hover:shadow-xl transition-shadow"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">
                                            {job.round}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-400">{job.company}</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{job.title}</h3>
                                    <ul className="text-sm text-slate-300 space-y-1">
                                        <li><strong className="text-white">Email:</strong> {job.email}</li>
                                        <li><strong className="text-white">Residency Title:</strong> {job.residency}</li>
                                        <li><strong className="text-white">Salary:</strong> {job.salary}</li>
                                        <li><strong className="text-white">Location:</strong> {job.location}</li>
                                    </ul>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Job Description Modal */}
                {selectedJob && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-slate-800 p-6 rounded-xl shadow-2xl max-w-lg w-full relative">
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="absolute top-2 right-4 text-white text-xl font-bold"
                            >
                                &times;
                            </button>
                            <h2 className="text-2xl font-bold mb-2">{selectedJob.title}</h2>
                            <p className="text-slate-400 mb-4">{selectedJob.company} — {selectedJob.round}</p>
                            <p className="text-white mb-4">
                                <strong>Job Description:</strong><br />
                                {selectedJob.description}
                            </p>
                            <p className="text-sm text-slate-300">
                                <strong>Email:</strong> {selectedJob.email}<br />
                                <strong>Residency:</strong> {selectedJob.residency}<br />
                                <strong>Salary:</strong> {selectedJob.salary}<br />
                                <strong>Location:</strong> {selectedJob.location}<br />
                                <strong>Days In Person:</strong> {selectedJob.daysInPerson}<br />
                                <strong>Company Address:</strong> {selectedJob.address}<br />
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default JobsBoard;