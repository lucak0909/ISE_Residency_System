import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../helper/supabaseClient';

interface JobPreview {
    title: string;
    company: string;
    description: string;
    email: string;
    salary: string;
    location: string;
    daysInPerson: number;
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
    const [loading, setLoading] = useState(false);
    const [jobsPreview, setJobsPreview] = useState<JobPreview[]>([]);

    // ---------- Fetch CompanyID + CompanyName on mount ----------
    useEffect(() => {
        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user?.email) return;
            const { data: userRow } = await supabase
                .from('User')
                .select('ID')
                .eq('Email', user.email.toLowerCase())
                .maybeSingle();
            if (!userRow) return;
            setCompanyID(userRow.ID);
            const { data: compRow } = await supabase
                .from('Company')
                .select('CompanyName')
                .eq('CompanyID', userRow.ID)
                .maybeSingle();
            if (compRow) setCompanyName(compRow.CompanyName || '');
        })();
    }, []);

    // --------------------- Helpers ---------------------
    const resetForm = () => {
        setTitle('');
        setDescription('');
        setContactEmail('');
        setSalary('');
        setLocation('');
        setDaysInPerson(0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyID) return alert('Company ID not loaded');
        setLoading(true);
        try {
            const { error } = await supabase.from('Position').insert({
                CompanyID: companyID,
                Title: title,
                Salary: salary,
                Location: location,
                Description: description,
                Email: contactEmail,
                DaysInPerson: daysInPerson || null,      });
            if (error) throw error;
            setJobsPreview((prev) => [
                ...prev,
                { title, company: companyName, description, email: contactEmail, salary, location, daysInPerson },
            ]);
            resetForm();
        } catch (err: any) {
            alert(err.message || 'Could not create listing');
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
                    <div className="mt-auto pt-6">
                        <NavLink to="/login" className="block w-full rounded-md bg-red-600/80 px-3 py-2 text-center font-medium hover:bg-red-600">
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
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </main>
        </div>
    );
}
