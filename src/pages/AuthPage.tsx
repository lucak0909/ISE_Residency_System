import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
// @ts-ignore
import {supabase} from '../helper/supabaseClient';
import bcrypt from 'bcryptjs';

/**
 * AuthPage – Signup / Login
 * ------------------------------------------------------------------
 * Company flow:
 *   1. User signs up with e‑mail/password/full name.
 *   2. After signup prompt asks for Company Name and saves it to Company table.
 *
 * Student flow:
 *  1. User signs up with email/password/full name.
 *  2. Email must be a valid student email format.
 *
 *  Both:
 *  1. Must confirm email in supabase confirmation email.
 * ------------------------------------------------------------------
 */
export default function AuthPage() {
    const navigate = useNavigate();

    /* ----------------------------- State ----------------------------*/
    // Form input states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [fullName, setFullName] = useState('');
    // UI state toggles
    const [isSignUp, setIsSignUp] = useState(false); // Controls whether to show signup or login form
    const [loading, setLoading] = useState(false);   // Tracks async operations in progress

    /* ------------------------ Helpers ------------------------------*/
    // Regex to validate UL student email format (8 digits followed by @studentmail.ul.ie)
    const studentRegex = /^\d{8}@studentmail\.ul\.ie$/i;
    const trimmedEmail = email.trim().toLowerCase();
    // Determines if the email belongs to a student based on the regex pattern
    const isStudentEmail = studentRegex.test(trimmedEmail);

    /**
     * Splits a full name into first name and last name components
     * @param {string} name - The full name to split
     * @returns {{first: string, last: string}} Object containing first and last name
     */
    const splitName = (name: string) => {
        const [first = '', ...rest] = name.trim().split(/\s+/);
        return {first, last: rest.join(' ')};
    };

    /**
     * Generates a unique 8-digit ID for new users
     * Keeps generating random IDs until it finds one that doesn't exist in the database
     * @returns {Promise<number>} A unique ID number
     */
    const generateUniqueID = async (): Promise<number> => {
        while (true) {
            const id = Math.floor(1_000_0000 + Math.random() * 9_000_0000);
            const {data} = await supabase.from('User').select('ID').eq('ID', id).maybeSingle();
            if (!data) return id;
        }
    };

    /* -------------------------- Sign‑up ----------------------------*/
    /**
     * Handles the user signup process
     * - Validates passwords match
     * - Determines if user is a student or company based on email
     * - Creates authentication record in Supabase Auth
     * - Creates user record in User table
     * - Creates additional records in Student or Company table based on role
     * - Redirects to appropriate dashboard on success
     */
    const handleSignUp = async () => {
        // Validate passwords match
        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            let role: 'student' | 'company';
            let id: number;

            // Determine user role and ID based on email format
            if (isStudentEmail) {
                // For students, extract ID from email (first 8 digits)
                role = 'student';
                id = parseInt(trimmedEmail.substring(0, 8), 10);
            } else {
                // For companies, check if email is in whitelist and generate a new ID
                const {data: white} = await supabase.from('WhiteList').select('Email').eq('Email', trimmedEmail).maybeSingle();
                if (!white) throw new Error('Email not authorised for company signup');
                role = 'company';
                id = await generateUniqueID();
            }

            // Create authentication record in Supabase Auth
            const {error: authErr} = await supabase.auth.signUp({email: trimmedEmail, password});
            if (authErr) throw authErr;

            // Hash password for storage in User table
            const passwordHash = bcrypt.hashSync(password, 10);
            const {first, last} = splitName(fullName);
            
            // Create user record in User table
            const {error: userErr} = await supabase.from('User').insert({
                ID: id,
                Email: trimmedEmail,
                Username: id.toString(),
                FirstName: first,
                Surname: last,
                Role: role,
                PasswordHash: passwordHash,
            });
            if (userErr) throw userErr;

            // Create role-specific records and handle navigation
            if (role === 'student') {
                // Create student record
                const {error} = await supabase.from('Student').insert({StudentID: id});
                if (error) throw error;
                alert('Student account created!');
                navigate('/StudentDashboard');
            } else {
                // For companies, prompt for company name and create company record
                let companyName = '';
                while (!companyName) {
                    companyName = window.prompt('Enter your Company Name to finish signup:', '')?.trim() || '';
                    if (!companyName) alert('Company Name is required.');
                }
                const {error} = await supabase.from('Company').insert({
                    CompanyID: id,
                    Email: trimmedEmail,
                    CompanyName: companyName,
                });
                if (error) throw error;
                alert('Company account created!');
                navigate('/PartnerDashboard');
            }

            // Reset form after successful signup
            setIsSignUp(false);
            setEmail('');
            setPassword('');
            setConfirm('');
            setFullName('');
        } catch (err: any) {
            alert(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    /* --------------------------- Login -----------------------------*/
    /**
     * Handles the user login process
     * - Authenticates user with Supabase Auth
     * - Fetches user role from User table
     * - Redirects to appropriate dashboard based on role
     */
    const handleLogin = async () => {
        setLoading(true);
        try {
            // Authenticate with Supabase Auth
            const {error: authErr} = await supabase.auth.signInWithPassword({email: trimmedEmail, password});
            if (authErr) throw authErr;
            
            // Get user role to determine which dashboard to navigate to
            const {data: userRow} = await supabase.from('User').select('Role').eq('Email', trimmedEmail).maybeSingle();
            if (userRow?.Role === 'student') navigate('/StudentDashboard');
            else if (userRow?.Role === 'company') navigate('/PartnerDashboard');
            else navigate('/');
        } catch (err: any) {
            alert(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Form submission handler
     * Calls either signup or login function based on current form mode
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        isSignUp ? handleSignUp() : handleLogin();
    };

    /* --------------------------- JSX -------------------------------*/
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-white">
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-8 shadow-lg">
                <h1 className="text-center text-2xl font-semibold">{isSignUp ? 'Create an account' : 'Sign in'}</h1>

                {/* Full name input - only shown in signup mode */}
                {isSignUp && (
                    <input
                        type="text"
                        placeholder="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full rounded-lg bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                )}

                {/* Email input */}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {/* Password input */}
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {/* Confirm password input - only shown in signup mode */}
                {isSignUp && (
                    <input
                        type="password"
                        placeholder="Confirm password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        className="w-full rounded-lg bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                )}

                {/* Submit button - text changes based on mode and loading state */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-indigo-600 py-2 font-medium hover:bg-indigo-500 active:scale-95 disabled:opacity-60"
                >
                    {loading ? 'Please wait…' : isSignUp ? 'Sign up' : 'Log in'}
                </button>

                {/* Toggle between signup and login modes */}
                <p className="text-center text-sm text-slate-400">
                    {isSignUp ? (
                        <>
                            Already have an account?{' '}
                            <button type="button" className="font-medium text-indigo-400 hover:underline"
                                    onClick={() => setIsSignUp(false)}>
                                Log in
                            </button>
                        </>
                    ) : (
                        <>
                            New here?{' '}
                            <button type="button" className="font-medium text-indigo-400 hover:underline"
                                    onClick={() => setIsSignUp(true)}>
                                Create one
                            </button>
                        </>
                    )}
                </p>
            </form>
        </div>
    );
}