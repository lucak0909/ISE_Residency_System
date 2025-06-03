import { useState, useEffect } from "react";
import { NavLink } from 'react-router-dom';
import { supabase } from '../helper/supabaseClient';

interface Student {
    ID: number;
    FirstName: string;
    Surname: string;
    displayName?: string;
}

export default function PartnerRanking() {
    // State for students and rankings
    const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
    const [rankedStudents, setRankedStudents] = useState<Student[]>([]);
    const [dragged, setDragged] = useState<Student | null>(null);
    
    // State for company ID and loading states
    const [companyID, setCompanyID] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Fetch company ID and students on mount
    useEffect(() => {
        async function fetchData() {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user?.email) return;
                
                // Get company ID from User table
                const { data: userData } = await supabase
                    .from('User')
                    .select('ID')
                    .eq('Email', user.email.toLowerCase())
                    .maybeSingle();
                
                if (userData) {
                    setCompanyID(userData.ID);
                    
                    // Fetch students who have been allocated interviews with this company
                    const { data: interviewData } = await supabase
                        .from('InterviewAllocated')
                        .select('StudentID')
                        .eq('CompanyID', userData.ID);
                    
                    if (interviewData && interviewData.length > 0) {
                        // Get student details
                        const studentIDs = interviewData.map(item => item.StudentID);
                        const { data: students } = await supabase
                            .from('User')
                            .select('ID, FirstName, Surname')
                            .in('ID', studentIDs)
                            .eq('Role', 'student');
                        
                        if (students) {
                            // Format student data with display names
                            const formattedStudents = students.map(student => ({
                                ...student,
                                displayName: `${student.FirstName} ${student.Surname}`
                            }));
                            
                            // Check if rankings already exist
                            const { data: existingRankings } = await supabase
                                .from('CompanyInterviewRank')
                                .select('StudentID, Rank')
                                .eq('CompanyID', userData.ID)
                                .order('Rank');
                            
                            if (existingRankings && existingRankings.length > 0) {
                                // Restore previous rankings
                                const ranked = existingRankings
                                    .map(ranking => {
                                        return formattedStudents.find(s => s.ID === ranking.StudentID);
                                    })
                                    .filter(Boolean) as Student[];
                                
                                setRankedStudents(ranked);
                                
                                // Set remaining students as available
                                const rankedIDs = ranked.map(s => s.ID);
                                setAvailableStudents(
                                    formattedStudents.filter(s => !rankedIDs.includes(s.ID))
                                );
                            } else {
                                // No existing rankings, all students are available
                                setAvailableStudents(formattedStudents);
                            }
                        }
                    } else {
                        // Fallback to mock data if no interviews allocated
                        const mockStudents = Array.from({ length: 6 }, (_, i) => ({
                            ID: i + 1,
                            FirstName: `Student`,
                            Surname: `${i + 1}`,
                            displayName: `Student ${i + 1}`
                        }));
                        setAvailableStudents(mockStudents);
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                alert("Failed to load student data. Please try again later.");
            } finally {
                setFetchLoading(false);
            }
        }
        
        fetchData();
    }, []);

    // Drag and drop handlers
    const dragData = (e: React.DragEvent, student: Student) => {
        e.dataTransfer.setData("text/plain", student.ID.toString());
        setDragged(student);
    };

    const allowDrop = (e: React.DragEvent) => e.preventDefault();

    const dropToRanking = (e: React.DragEvent) => {
        e.preventDefault();
        const studentId = parseInt(e.dataTransfer.getData("text/plain"), 10);
        
        // Check if student ID is valid and not already in the ranked list
        if (!studentId || rankedStudents.some(s => s.ID === studentId)) return;

        const student = availableStudents.find(s => s.ID === studentId);
        if (!student) return;

        // Remove from available students
        setAvailableStudents(prev => prev.filter(s => s.ID !== studentId));
        
        // Add to ranked students
        setRankedStudents(prev => [...prev, student]);
        setDragged(null);
    };

    const dropToAvailable = (e: React.DragEvent) => {
        e.preventDefault();
        const studentId = parseInt(e.dataTransfer.getData("text/plain"), 10);
        
        // Check if student ID is valid and exists in the ranked list
        if (!studentId || !rankedStudents.some(s => s.ID === studentId)) return;

        const student = rankedStudents.find(s => s.ID === studentId);
        if (!student) return;

        // Remove from ranked students
        setRankedStudents(prev => prev.filter(s => s.ID !== studentId));
        
        // Add to available students if not already there
        if (!availableStudents.some(s => s.ID === studentId)) {
            setAvailableStudents(prev => [...prev, student].sort((a, b) => 
                a.displayName?.localeCompare(b.displayName || '') || 0
            ));
        }
        setDragged(null);
    };

    const handleReorder = (targetStudent: Student) => {
        if (!dragged || dragged.ID === targetStudent.ID) return;
        
        setRankedStudents(prev => {
            // Check if dragged student is in the list
            if (!prev.some(s => s.ID === dragged.ID)) return prev;
            
            // Create a new array without the dragged student
            const next = prev.filter(s => s.ID !== dragged.ID);
            
            // Find the index of the target student
            const idx = next.findIndex(s => s.ID === targetStudent.ID);
            
            // Insert the dragged student at that index
            next.splice(idx, 0, dragged);
            return next;
        });
        setDragged(null);
    };

    // Submit rankings to database
    const submitRankings = async () => {
        if (!companyID || rankedStudents.length === 0) return;
        
        setLoading(true);
        setSubmitSuccess(false);
        
        try {
            // First delete any existing rankings
            await supabase
                .from('CompanyInterviewRank')
                .delete()
                .eq('CompanyID', companyID);
            
            // Insert new rankings
            const rankings = rankedStudents.map((student, index) => ({
                CompanyID: companyID,
                StudentID: student.ID,
                Rank: index + 1
            }));
            
            const { error } = await supabase
                .from('CompanyInterviewRank')
                .insert(rankings);
                
            if (error) throw error;
            
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000);
        } catch (error: any) {
            console.error("Error submitting rankings:", error);
            alert(`Failed to save rankings: ${error.message || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-slate-900 text-white">
            <aside
                className="sticky top-0 flex h-screen w-60 flex-col gap-6 border-r border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold tracking-tight">Menu</h2>

                <nav className="flex flex-1 flex-col gap-4 text-lg">
                    <NavLink to="/PartnerDashboard"
                             className="rounded-md px-3 py-2 hover:bg-slate-700/50">
                        Partner Dashboard
                    </NavLink>

                    <NavLink to="/PartnerRanking"
                             className="rounded-md bg-indigo-600/20 px-3 py-2 font-semibold ring-2 ring-indigo-600/30">
                        Interviewee Ranking
                    </NavLink>

                    <div className="mt-auto pt-6">
                        <NavLink to="/login"
                                 className="block w-full rounded-md bg-red-600/80 px-3 py-2 text-center font-medium hover:bg-red-600">
                            Log Out
                        </NavLink>
                    </div>
                </nav>
            </aside>

            <main className="flex-1 px-8 py-16 lg:px-14 lg:py-20">
                <h1 className="mb-16 text-center text-4xl font-extrabold tracking-tight md:text-6xl">
                    Partner Rankings
                </h1>

                {fetchLoading ? (
                    <div className="flex justify-center">
                        <div className="animate-pulse text-xl text-slate-300">Loading student data...</div>
                    </div>
                ) : (
                    <div className="mx-auto w-full lg:w-[60%]">
                        <div className="grid grid-cols-1 gap-20 lg:grid-cols-2">
                            <section
                                onDragOver={allowDrop}
                                onDrop={dropToAvailable}
                                className="w-full rounded-xl border border-slate-500/60 bg-slate-800/25 p-10"
                            >
                                <h2 className="mb-8 text-3xl font-semibold tracking-wide">Interviewees</h2>
                                {availableStudents.length === 0 ? (
                                    <p className="text-lg italic text-slate-400">No unranked students</p>
                                ) : (
                                    <ul className="space-y-3 text-lg">
                                        {availableStudents.map((student) => (
                                            <li
                                                key={student.ID}
                                                draggable
                                                onDragStart={(e) => dragData(e, student)}
                                                className="cursor-grab rounded-md border border-white/40 px-5 py-2 hover:border-white/60 active:opacity-70"
                                            >
                                                {student.displayName || `${student.FirstName} ${student.Surname}`}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section
                                onDragOver={allowDrop}
                                onDrop={dropToRanking}
                                className="flex w-full flex-col rounded-xl border border-slate-500/60 bg-slate-800/25 p-10"
                            >
                                <h2 className="mb-8 text-3xl font-semibold tracking-wide">Your Ranking</h2>

                                {rankedStudents.length === 0 ? (
                                    <p className="text-lg italic text-slate-400">Drag students here to rank them</p>
                                ) : (
                                    <ol className="space-y-3 text-lg">
                                        {rankedStudents.map((student, i) => (
                                            <li
                                                key={student.ID}
                                                draggable
                                                onDragStart={(e) => dragData(e, student)}
                                                onDragOver={allowDrop}
                                                onDrop={() => handleReorder(student)}
                                                className="cursor-grab rounded-md border border-white/40 px-5 py-2 hover:border-white/60 active:opacity-70"
                                            >
                                                {i + 1}. {student.displayName || `${student.FirstName} ${student.Surname}`}
                                            </li>
                                        ))}
                                    </ol>
                                )}

                                <div className="mt-auto pt-6">
                                    {submitSuccess && (
                                        <div className="mb-4 rounded-md bg-green-600/20 p-3 text-center text-green-400 ring-1 ring-green-500/30">
                                            Rankings saved successfully!
                                        </div>
                                    )}
                                    
                                    <button
                                        onClick={submitRankings}
                                        disabled={rankedStudents.length === 0 || loading}
                                        className="w-full rounded-md bg-indigo-600 px-5 py-3 text-lg font-semibold hover:bg-indigo-500 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    >
                                        {loading ? "Saving..." : "Submit Ranking"}
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}