import {useEffect, useState} from 'react';
import {NavLink} from 'react-router-dom';
import {supabase} from '../helper/supabaseClient';

/**
 * Job interface defines the structure of job listings displayed on the board
 * Contains all the necessary information about a residency position
 */
interface Job {
    title: string;        // Job title
    salary: string;       // Salary information
    location: string;     // Job location
    daysInPerson: string; // Number of days required in person
    description: string;  // Detailed job description
    round: string;        // Residency term (R1, R2, etc.)
    email: string;        // Contact email
    company: string;      // Company name
    address: string;      // Company address
    residency: string;    // Residency program name
}

/**
 * JobsBoard component displays available residency positions to students
 * Allows students to view job details and filter by residency term
 */
function JobsBoard() {
    // State management
    const [jobs, setJobs] = useState<Job[]>([]); // Stores all job listings
    const [selectedJob, setSelectedJob] = useState<Job | null>(null); // Currently selected job for modal view
    const [userName, setUserName] = useState<string>(''); // Logged in user's name for display

    /**
     * Fetch and display the current user's name
     * Runs once on component mount
     */
    useEffect(() => {
        async function fetchUserName() {
            // Get the current authenticated user
            const {data: {user}} = await supabase.auth.getUser();
            if (user) {
                // Query the User table to get the user's name
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
    }, []);

    /**
     * Fetch all available job positions from the database
     * Runs once on component mount
     */
    useEffect(() => {
        async function fetchJobs() {
            // Query the Position table with a join to the Company table
            const {data, error} = await supabase
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
                // Transform the raw database data into our Job interface format
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

    // Define all possible residency terms for grouping
    const ResidencyTerm = ['R1', 'R1+R2', 'R2', 'R3', 'R4', 'R5'];
    
    // Group jobs by residency term and filter out empty groups
    const groupedJobs = ResidencyTerm.map(round => ({
        round,
        jobs: jobs.filter(job => job.round === round)
    })).filter(group => group.jobs.length > 0);

    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            {/* Sidebar Navigation */}
            <aside
                className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold tracking-tight">Menu</h2>
                <nav className="flex flex-1 flex-col gap-4 text-lg">
                    {/* Navigation links with active state highlighting */}
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

            {/* Main Content Area */}
            <main className="flex-1 p-10">
                <h1 className="text-3xl font-bold mb-8">Available Residencies</h1>
                
                {/* Display jobs grouped by residency term */}
                {groupedJobs.map(group => (
                    <div key={group.round} className="mb-10">
                        {/* Residency term heading */}
                        <h2 className="text-2xl font-semibold mb-4">{group.round}</h2>
                        
                        {/* Grid of job cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {group.jobs.map((job, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedJob(job)} // Open modal with job details when clicked
                                    className="text-left rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-lg hover:shadow-xl transition-shadow"
                                >
                                    {/* Job card header with term and company */}
                                    <div className="flex justify-between items-center mb-2">
                                        <span
                                            className="text-sm font-medium bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full">
                                            {job.round}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-400">{job.company}</span>
                                    </div>
                                    
                                    {/* Job title */}
                                    <h3 className="text-xl font-bold mb-3">{job.title}</h3>
                                    
                                    {/* Job details summary */}
                                    <ul className="text-sm text-slate-300 space-y-1">
                                        <li><strong className="text-white">Email:</strong> {job.email}</li>
                                        <li><strong className="text-white">Residency Title:</strong> {job.residency}
                                        </li>
                                        <li><strong className="text-white">Salary:</strong> {job.salary}</li>
                                        <li><strong className="text-white">Location:</strong> {job.location}</li>
                                    </ul>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Modal for displaying detailed job information */}
                {selectedJob && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-slate-800 p-6 rounded-xl shadow-2xl max-w-lg w-full relative">
                            {/* Close button */}
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="absolute top-2 right-4 text-white text-xl font-bold"
                            >
                                &times;
                            </button>
                            
                            {/* Job title and company */}
                            <h2 className="text-2xl font-bold mb-2">{selectedJob.title}</h2>
                            <p className="text-slate-400 mb-4">{selectedJob.company} — {selectedJob.round}</p>
                            
                            {/* Full job description */}
                            <p className="text-white mb-4">
                                <strong>Job Description:</strong><br/>
                                {selectedJob.description}
                            </p>
                            
                            {/* Additional job details */}
                            <p className="text-sm text-slate-300">
                                <strong>Email:</strong> {selectedJob.email}<br/>
                                <strong>Residency:</strong> {selectedJob.residency}<br/>
                                <strong>Salary:</strong> {selectedJob.salary}<br/>
                                <strong>Location:</strong> {selectedJob.location}<br/>
                                <strong>Days In Person:</strong> {selectedJob.daysInPerson}<br/>
                                <strong>Company Address:</strong> {selectedJob.address}<br/>
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default JobsBoard;