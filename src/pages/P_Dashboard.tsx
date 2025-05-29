import {useState} from "react";
import {NavLink} from "react-router-dom";

interface Job {
    company: string;
    title: string;
    description: string;
    email: string;
    salary: string;
    location: string;
}

export default function PartnerDashboard() {
    const [company, setCompany] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [email, setEmail] = useState("");
    const [salary, setSalary] = useState("");
    const [location, setLocation] = useState("");
    const [jobs, setJobs] = useState<Job[]>([]);

    function resetForm() {
        setCompany("");
        setTitle("");
        setDescription("");
        setEmail("");
        setSalary("");
        setLocation("");
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const newJob: Job = {company, title, description, email, salary, location};
        // TODO: persist to backend
        setJobs((j) => [...j, newJob]);
        alert("Job listing created (mock)");
        resetForm();
    }

    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            {/* Navigation */}
            <aside
                className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold tracking-tight">Menu</h2>

                <nav className="flex flex-1 flex-col gap-4 text-lg">
                    <NavLink
                        to="/PartnerDashboard"
                        className="rounded-md bg-indigo-600/20 px-3 py-2 font-semibold ring-2 ring-indigo-600/30"
                    >
                        Partner Dashboard
                    </NavLink>

                    <NavLink to="/PartnerRanking"
                             className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Interviewee Ranking
                    </NavLink>

                    <div className="mt-auto pt-6">
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
                <h1 className="mb-12 text-center text-4xl font-extrabold tracking-tight md:text-6xl">
                    Partner Dashboard
                </h1>

                {/* Job form */}
                <section
                    className="mx-auto w-full max-w-3xl rounded-xl border border-slate-500/60 bg-slate-800/25 p-10">
                    <h2 className="mb-6 text-2xl font-semibold">Create Job Listing</h2>

                    <form className="grid grid-cols-1 gap-6" onSubmit={handleSubmit}>
                        {/* Company name */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="company" className="font-medium">
                                Company Name
                            </label>
                            <input
                                id="company"
                                type="text"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                required
                                className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Job title */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="title" className="font-medium">
                                Job Title
                            </label>
                            <input
                                id="title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Job description */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="description" className="font-medium">
                                Job Description
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                rows={5}
                                className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Contact email */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="email" className="font-medium">
                                Contact Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Monthly salary */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="salary" className="font-medium">
                                Monthly Salary (€)
                            </label>
                            <input
                                id="salary"
                                type="number"
                                min="0"
                                step="100"
                                value={salary}
                                onChange={(e) => setSalary(e.target.value)}
                                required
                                className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Location */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="location" className="font-medium">
                                Location
                            </label>
                            <input
                                id="location"
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                required
                                placeholder="e.g. Amsterdam, NL"
                                className="rounded-md border border-white/30 bg-slate-700/40 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-md bg-indigo-600 py-3 text-lg font-semibold hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            Create Listing
                        </button>
                    </form>
                </section>

                {/* Listings preview */}
                {jobs.length > 0 && (
                    <section
                        className="mx-auto mt-14 w-full max-w-5xl rounded-xl border border-slate-500/60 bg-slate-800/25 p-10">
                        <h2 className="mb-6 text-2xl font-semibold">Your Listings</h2>
                        <ul className="space-y-6">
                            {jobs.map((job, idx) => (
                                <li key={idx} className="rounded-lg border border-white/30 p-6">
                                    <h3 className="mb-2 text-xl font-bold">
                                        {job.title} @ {job.company}
                                    </h3>
                                    <p className="mb-2 text-slate-300">{job.description}</p>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                        <span>Location: {job.location}</span>
                                        <span>Email: {job.email}</span>
                                        <span>Salary: €{job.salary} / month</span>
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