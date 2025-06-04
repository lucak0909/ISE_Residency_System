import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../helper/supabaseClient';

function MatchedStudentsDisplay({ companyID }: { companyID: number | null }) {
    const [matchedStudents, setMatchedStudents] = useState<Array<{
        studentName: string,
        studentEmail: string,
        qca: number | null
    }>>([]);
    const [loadingMatches, setLoadingMatches] = useState(true);

    useEffect(() => {
        async function fetchMatchedStudents() {
            if (!companyID) return;
            
            try {
                setLoadingMatches(true);
                
                // First, get the student IDs from FinalMatches table
                const { data: matchesData, error: matchesError } = await supabase
                    .from('FinalMatches')
                    .select('StudentID')
                    .eq('CompanyID', companyID);
                
                if (matchesError) {
                    console.error('Error fetching matches:', matchesError);
                    return;
                }
                
                if (!matchesData || matchesData.length === 0) {
                    setLoadingMatches(false);
                    return;
                }
                
                // Extract student IDs
                const studentIDs = matchesData.map(match => match.StudentID);
                
                // Now fetch student details from User table
                const { data: studentsData, error: studentsError } = await supabase
                    .from('User')
                    .select('ID, FirstName, Surname, Email')
                    .in('ID', studentIDs);
                
                if (studentsError) {
                    console.error('Error fetching student details:', studentsError);
                    return;
                }
                
                // Get QCA data from Student table
                const { data: qcaData, error: qcaError } = await supabase
                    .from('Student')
                    .select('StudentID, QCA')
                    .in('StudentID', studentIDs);
                
                if (qcaError) {
                    console.error('Error fetching QCA data:', qcaError);
                }
                
                // Combine the data
                const students = studentsData.map(user => {
                    const studentQCA = qcaData?.find(q => q.StudentID === user.ID)?.QCA || null;
                    return {
                        studentName: `${user.FirstName || ''} ${user.Surname || ''}`.trim(),
                        studentEmail: user.Email || '',
                        qca: studentQCA
                    };
                });
                
                setMatchedStudents(students);
                console.log('Matched students:', students);
            } catch (error) {
                console.error('Error in fetchMatchedStudents:', error);
            } finally {
                setLoadingMatches(false);
            }
        }
        
        fetchMatchedStudents();
    }, [companyID]);

    if (loadingMatches) {
        return <p className="text-lg text-slate-300">Loading matched students...</p>;
    }

    return (
        <section className="mx-auto mt-14 w-full max-w-3xl rounded-xl border border-slate-500/60 bg-slate-800/25 p-10">
            <h2 className="mb-6 text-2xl font-semibold">Matched Students</h2>
            
            {matchedStudents.length > 0 ? (
                <ul className="space-y-4">
                    {matchedStudents.map((student, idx) => (
                        <li key={idx} className="rounded-lg border border-white/30 p-6">
                            <h3 className="text-xl font-bold text-indigo-400">{student.studentName}</h3>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                                <span>Email: {student.studentEmail}</span>
                                {student.qca !== null && <span>QCA: {student.qca.toFixed(2)}</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-lg text-slate-300">No students have been matched with your company yet.</p>
            )}
        </section>
    );
}

interface JobPreview {
    title: string;
    company: string;
    description: string;
    email: string;
    salary: string;
    location: string;
    daysInPerson: number;
    residencyTerm: string; // Updated interface to include residencyTerm
}

export default function PartnerDashboard() {
    // ------------------------- State -------------------------
    const [companyID, setCompanyID] = useState<number | null>(null);
    const [companyName, setCompanyName] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [salary, setSalary] = useState('');
    const [location, setLocation] = useState('');
    const [daysInPerson, setDaysInPerson] = useState<number>(0);
    const [residencyTerm, setResidencyTerm] = useState('R1'); // Add this new state
    const [loading, setLoading] = useState(false);
    const [jobsPreview, setJobsPreview] = useState<JobPreview[]>([]);
    const [userName, setUserName] = useState<string>('');


    // ---------- Fetch CompanyID + CompanyName on mount ----------
    useEffect(() => {
        const fetchCompanyData = async () => {
            try {
                // Get current user
                const { data: authData, error: authError } = await supabase.auth.getUser();
                
                if (authError) {
                    console.error('Auth error:', authError);
                    return;
                }
                
                if (!authData.user?.email) {
                    console.error('No user email found');
                    return;
                }
                
                console.log('User email:', authData.user.email);
                
                // Get user record
                const { data: userRow, error: userError } = await supabase
                    .from('User')
                    .select('ID')
                    .eq('Email', authData.user.email.toLowerCase())
                    .maybeSingle();
                
                if (userError) {
                    console.error('User fetch error:', userError);
                    return;
                }
                
                if (!userRow) {
                    console.error('No user found with email:', authData.user.email);
                    return;
                }
                
                console.log('User ID:', userRow.ID);
                
                // Get company record
                const { data: compRow, error: compError } = await supabase
                    .from('Company')
                    .select('CompanyID, CompanyName')
                    .eq('CompanyID', userRow.ID)
                    .maybeSingle();
                
                if (compError) {
                    console.error('Company fetch error:', compError);
                    return;
                }
                
                if (!compRow) {
                    console.error('No company found with ID:', userRow.ID);
                    return;
                }
                
                console.log('Company data:', compRow);
                
                // Set state
                setCompanyID(compRow.CompanyID);
                setCompanyName(compRow.CompanyName || '');
            } catch (err) {
                console.error('Unexpected error:', err);
            }
        };
        
        fetchCompanyData();
    }, []);

    // First, let's add a function to fetch existing positions
    useEffect(() => {
        const fetchExistingPosition = async () => {
            if (!companyID) return;
            
            const { data, error } = await supabase
                .from('Position')
                .select('*')
                .eq('CompanyID', companyID)
                .maybeSingle();
            
            if (error) {
                console.error('Error fetching position:', error);
                return;
            }
            
            if (data) {
                // If a position already exists, populate the form with it
                setTitle(data.Title || '');
                setDescription(data.Description || '');
                setContactEmail(data.Email || '');
                setSalary(data.Salary || '');
                setLocation(data.Location || '');
                setDaysInPerson(data.DaysInPerson || 0);
                setResidencyTerm(data.ResidencyTerm || 'R1'); // Set residency term
                
                // Add to preview
                setJobsPreview([{
                    title: data.Title || '',
                    company: companyName,
                    description: data.Description || '',
                    email: data.Email || '',
                    salary: data.Salary || '',
                    location: data.Location || '',
                    daysInPerson: data.DaysInPerson || 0,
                    residencyTerm: data.ResidencyTerm || 'R1' // Include residency term in preview
                }]);
            }
        };
        
        if (companyID) {
            fetchExistingPosition();
        }
    }, [companyID, companyName]);

    //fetch user name on mount
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

    // --------------------- Helpers ---------------------
    const resetForm = () => {
        setTitle('');
        setDescription('');
        setContactEmail('');
        setSalary('');
        setLocation('');
        setDaysInPerson(0);
        setResidencyTerm('R1'); // Reset residency term
    };

    // Then modify the handleSubmit function to use upsert instead of insert
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log('Submit clicked, companyID:', companyID);

        if (!companyID) {
            console.error('Company ID is null or undefined');
            alert('Company ID not loaded. Please refresh the page and try again.');
            return;
        }

        setLoading(true);
        try {
            console.log('Attempting to upsert position with CompanyID:', companyID);

            const { data, error } = await supabase
                .from('Position')
                .upsert({
                    CompanyID: companyID,
                    Title: title,
                    Salary: salary,
                    Location: location,
                    Description: description,
                    Email: contactEmail,
                    DaysInPerson: daysInPerson || null,
                    ResidencyTerm: residencyTerm // Include residency term in upsert
                }, {
                    onConflict: 'CompanyID',
                    returning: 'minimal'
                });

            if (error) {
                console.error('Upsert error:', error);
                throw error;
            }

            console.log('Position upserted successfully');

            // Update the preview
            setJobsPreview([{
                title,
                company: companyName,
                description,
                email: contactEmail,
                salary,
                location,
                daysInPerson,
                residencyTerm // Include residency term in preview
            }]);

            alert('Position updated successfully!');
        } catch (err: any) {
            console.error('Error details:', err);
            alert(err.message || 'Could not update listing');
        } finally {
            setLoading(false);
        }
    };

    // --------------------- UI ---------------------
    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            {/* Sidebar */}
            <aside className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold tracking-tight">Menu</h2>
                <nav className="flex flex-1 flex-col gap-4 text-lg">
                    <NavLink to="/PartnerDashboard" className="rounded-md bg-indigo-600/20 px-3 py-2 font-semibold ring-2 ring-indigo-600/30">
                        Partner Dashboard
                    </NavLink>
                    <NavLink to="/PartnerRanking" className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Interviewee Ranking
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

            {/* Main */}
            <main className="flex-1 px-8 py-16 lg:px-14 lg:py-20">
                <h1 className="mb-12 text-center text-4xl font-extrabold tracking-tight md:text-6xl">Partner Dashboard</h1>

                {/* Job form */}
                <section className="mx-auto w-full max-w-3xl rounded-xl border border-slate-500/60 bg-slate-800/25 p-10">
                    <h2 className="mb-6 text-2xl font-semibold">Create Job Listing</h2>
                    <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
                        {/* Company name (read‑only) */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium">Company Name</label>
                            <input type="text" value={companyName} readOnly disabled className="rounded-md border border-white/30 bg-slate-700/40 p-3 opacity-60" />
                        </div>
                        {/* Job title */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="title">Job Title</label>
                            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        {/* Description */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="description">Job Description</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        {/* Contact email */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="email">Contact Email</label>
                            <input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        {/* Salary */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="salary">Monthly Salary (€)</label>
                            <input id="salary" type="number" min="0" step="100" value={salary} onChange={(e) => setSalary(e.target.value)} required className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        {/* Location */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="location">Location</label>
                            <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} required className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        {/* Days in person */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="days">Days In Person (per week)</label>
                            <input id="days" type="number" min="0" max="7" value={daysInPerson} onChange={(e) => setDaysInPerson(Number(e.target.value))} className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        {/* Residency Term */}
                        <div className="flex flex-col gap-2">
                            <label className="font-medium" htmlFor="residencyTerm">Residency Term</label>
                            <select id="residencyTerm" value={residencyTerm} onChange={(e) => setResidencyTerm(e.target.value)} className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="R1">R1</option>
                                <option value="R1+R2">R1+R2</option>
                                <option value="R3">R3</option>
                                <option value="R4">R4</option>
                                <option value="R5">R5</option>
                            </select>
                        </div>
                        <button type="submit" disabled={loading} className="w-full rounded-md bg-indigo-600 py-3 text-lg font-semibold hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60">
                            {loading ? 'Saving…' : 'Create Listing'}
                        </button>
                    </form>
                </section>

                {/* Preview */}
                {jobsPreview.length > 0 && (
                    <section className="mx-auto mt-14 w-full max-w-5xl rounded-xl border border-slate-500/60 bg-slate-800/25 p-10">
                        <h2 className="mb-6 text-2xl font-semibold">Your Listings</h2>
                        <ul className="space-y-6">
                            {jobsPreview.map((job, idx) => (
                                <li key={idx} className="rounded-lg border border-white/30 p-6">
                                    <h3 className="mb-2 text-xl font-bold">{job.title}</h3>
                                    <p className="mb-2 whitespace-pre-line text-slate-300">Description: {job.description}</p>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                        <span>Location: {job.location}</span>
                                        <span>Email: {job.email}</span>
                                        <span>Salary: €{job.salary} / month</span>
                                        <span>Days In Person: {job.daysInPerson}</span>
                                        <span>Residency Term: {job.residencyTerm}</span> {/* Display residency term */}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Matched Students */}
                <MatchedStudentsDisplay companyID={companyID} />
            </main>
        </div>
    );
}