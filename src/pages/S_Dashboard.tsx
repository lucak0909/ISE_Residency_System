import { useState, useEffect } from "react";
import { NavLink } from 'react-router-dom';
import { supabase } from "../helper/supabaseClient";

async function verifyBucketAccess() {
    try {
        // List all buckets to verify access
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

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
        const { data: files, error: listError } = await supabase.storage
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

function FinalMatchDisplay() {
    const [matchedCompany, setMatchedCompany] = useState<{
        companyName: string;
        position: string | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMatchData() {
            try {
                setLoading(true);

                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user?.email) return;

                // Get student ID
                const { data: userData } = await supabase
                    .from('User')
                    .select('ID')
                    .eq('Email', user.email.toLowerCase())
                    .single();

                if (!userData) return;

                // Check for match in FinalMatches table
                const { data: matchData } = await supabase
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
                    // Get position details
                    const { data: positionData } = await supabase
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
    }, []);

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

export default function StudentDashboard() {
    /*  local component state  */
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [linkedin, setLinkedin] = useState("");
    const [github, setGithub] = useState("");
    const [qca, setQca] = useState<number | null>(null);
    const [yearOfStudy, setYearOfStudy] = useState("");
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<number | null>(null);
    const [uploadingCV, setUploadingCV] = useState(false);
    const [currentCVName, setCurrentCVName] = useState<string | null>(null);
    const [currentCVPath, setCurrentCVPath] = useState<string | null>(null);
    const [userName, setUserName] = useState('');

    // Available year of study options
    const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

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
        async function fetchStudentData() {
            try {
                setLoading(true);

                // Verify bucket access
                const bucketAccessible = await verifyBucketAccess();
                if (!bucketAccessible) {
                    console.error("Cannot access the 'cvs' bucket - check permissions");
                }

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
                            setQca(studentData.QCA);
                            setGithub(studentData.GitHub || "");
                            setLinkedin(studentData.LinkedIn || "");
                            setYearOfStudy(studentData.YearOfStudy || "");
                        }

                        // Fetch the current CV information
                        const {data: cvData, error: cvError} = await supabase
                            .from('StudentCV')
                            .select('FilePath')
                            .eq('StudentID', userData.ID)
                            .order('DateUploaded', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (cvError) {
                            console.error('Error fetching CV data:', cvError);
                        } else if (cvData && cvData.FilePath) {
                            // Extract filename from path
                            const pathParts = cvData.FilePath.split('/');
                            const fileName = pathParts[pathParts.length - 1];
                            setCurrentCVName(fileName);

                            // Get the public URL for the CV file
                            try {
                                console.log("Attempting to get public URL for:", cvData.FilePath);

                                // Try to get the public URL
                                const { data, error: urlError } = await supabase.storage
                                    .from('cvs')
                                    .getPublicUrl(cvData.FilePath);

                                if (urlError) {
                                    console.error("Error getting public URL:", urlError);
                                } else if (data && data.publicUrl) {
                                    console.log("CV URL successfully retrieved:", data.publicUrl);
                                    setCurrentCVPath(data.publicUrl);
                                } else {
                                    console.log("Failed to get public URL - no data returned");
                                }
                            } catch (error) {
                                console.error("Exception getting public URL:", error);
                            }
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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!userId) {
            alert("User ID not found. Please log in again.");
            return;
        }

        try {
            setUploadingCV(true);

            // Update student profile in the database
            const { error: updateError } = await supabase
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
                const fileName = `${userId}_${Date.now()}_${cvFile.name}`;
                const filePath = `${userId}/${fileName}`;

                console.log("Uploading file to path:", filePath);

                const { error: uploadError } = await supabase.storage
                    .from('cvs')
                    .upload(filePath, cvFile);

                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    throw uploadError;
                }

                try {
                    // First, check if a CV record already exists for this student
                    const { data: existingCV, error: checkError } = await supabase
                        .from('StudentCV')
                        .select('CVID')
                        .eq('StudentID', userId)
                        .maybeSingle();

                    if (checkError) {
                        console.error('Error checking existing CV:', checkError);
                    }

                    // If a record exists, update it using the CVID as the primary key
                    if (existingCV) {
                        const { error: updateError } = await supabase
                            .from('StudentCV')
                            .update({
                                FilePath: filePath,
                                DateUploaded: new Date().toISOString()
                            })
                            .eq('CVID', existingCV.CVID);

                        if (updateError) {
                            console.error('Error updating CV record:', updateError);
                            throw updateError;
                        }
                    } else {
                        // If no record exists, insert a new one
                        const newCVID = Date.now();

                        const { error: insertError } = await supabase
                            .from('StudentCV')
                            .insert({
                                CVID: newCVID,
                                FilePath: filePath,
                                StudentID: userId,
                                DateUploaded: new Date().toISOString()
                            });

                        if (insertError) {
                            console.error('Error inserting CV record:', insertError);
                            throw insertError;
                        }
                    }

                    // Get the public URL for the CV file
                    try {
                        console.log("Attempting to get public URL for:", filePath);

                        // Try to get the public URL
                        const { data, error: urlError } = await supabase.storage
                            .from('cvs')
                            .getPublicUrl(filePath);

                        if (urlError) {
                            console.error("Error getting public URL:", urlError);
                        } else if (data && data.publicUrl) {
                            setCurrentCVPath(data.publicUrl);
                            console.log("New CV URL:", data.publicUrl); // Debug log

                            // Update the displayed CV name
                            setCurrentCVName(fileName);
                            setCvFile(null);
                        } else {
                            console.error("Failed to get public URL");
                            throw new Error("Failed to get public URL for uploaded file");
                        }
                    } catch (error) {
                        // If database operation fails, delete the uploaded file to avoid orphaned files
                        await supabase.storage
                            .from('cvs')
                            .remove([filePath]);

                        throw error;
                    }
                } catch (error) {
                    // If database operation fails, delete the uploaded file to avoid orphaned files
                    await supabase.storage
                        .from('cvs')
                        .remove([filePath]);

                    throw error;
                }
            }

            alert("Profile updated successfully!");
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert(`Failed to update profile: ${error.message}`);
        } finally {
            setUploadingCV(false);
        }
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
                <section className="mx-auto mb-12 w-full max-w-xl rounded-xl border border-slate-500/60 bg-slate-800/25 p-8 text-center">
                    <h2 className="mb-3 text-2xl font-semibold">Your Residency Match</h2>
                    <FinalMatchDisplay />
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

                            {/* CV View Button */}
                            <div className="mt-4">
                                <h3 className="mb-2 font-medium">Your Current CV</h3>
                                {currentCVPath ? (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm text-slate-300">
                                            {currentCVName || "CV uploaded"}
                                        </p>
                                        <a
                                            href={currentCVPath}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                                <path d="M8 11a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0-3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                            </svg>
                                            View CV
                                        </a>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">No CV uploaded yet.</p>
                                )}
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