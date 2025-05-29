import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import { supabase } from '../helper/supabaseClient';

export default function App() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [confirm, setConfirm] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);


    function deriveStudentId(emailAddr: string): number | null {
        const lc = emailAddr.toLowerCase();
        if (!lc.endsWith('@studentmail.ul.ie')) return null;
        const prefix = lc.split('@')[0];
        if (!/^\d+$/.test(prefix)) return null; // must be only digits
        return parseInt(prefix, 10);
    }

    async function handleLogin() {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(error.message);
            return;
        }

        navigate(
            email.toLowerCase().endsWith('@studentmail.ul.ie')
                ? '/StudentDashboard'
                : '/PartnerDashboard',
        );
    }

    async function handleSignUp() {
        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }

        // Split the full name into first- & surname
        const trimmedName = name.trim();
        const [firstName, ...rest] = trimmedName.split(' ');
        const surname = rest.join(' ');

        // Determine Type (0 = student, 1 = partner/staff)
        const isStudent = email.toLowerCase().endsWith('@studentmail.ul.ie');
        const type = isStudent ? 0 : 1;

        // Build the row payload
        const emailPrefix = email.split('@')[0];
        const studentId = deriveStudentId(email);

        const newUser: Record<string, any> = {
            Email: email,
            Username: emailPrefix,
            Password: password, // ❗ hash in production
            FirstName: firstName,
            Surname: surname,
            Type: type,
        };

        // Only include ID for studentmail addresses with a numeric prefix
        if (studentId !== null) newUser.ID = studentId;

        const { error } = await supabase.from('User').insert(newUser);

        if (error) {
            console.error(error);
            alert(error.message ?? 'Something went wrong while creating your account.');
            return;
        }

        navigate(isStudent ? '/StudentDashboard' : '/PartnerDashboard');
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        isSignUp ? handleSignUp() : handleLogin();
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
            <div className="absolute top-16 text-center">
                <h1 className="text-6xl font-bold tracking-tight">ISE Jobs Board</h1>
                <h1>____________________________________________</h1>
            </div>

            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-8 shadow-lg"
            >
                <h1 className="text-center text-2xl font-semibold">
                    {isSignUp ? 'Create an account' : 'Sign in'}
                </h1>

                {isSignUp && (
                    <input
                        type="text"
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full rounded-lg bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                )}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg bg-slate-700 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />

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

                <button
                    type="submit"
                    className="w-full rounded-lg bg-indigo-600 py-2 font-medium hover:bg-indigo-500 active:scale-95"
                >
                    {isSignUp ? 'Sign up' : 'Log in'}
                </button>

                <p className="text-center text-sm text-slate-400">
                    {isSignUp ? (
                        <>
                            Already have an account?{' '}
                            <button
                                type="button"
                                className="font-medium text-indigo-400 hover:underline"
                                onClick={() => setIsSignUp(false)}
                            >
                                Log in
                            </button>
                        </>
                    ) : (
                        <>
                            New here?{' '}
                            <button
                                type="button"
                                className="font-medium text-indigo-400 hover:underline"
                                onClick={() => setIsSignUp(true)}
                            >
                                Create one
                            </button>
                        </>
                    )}
                </p>
            </form>
        </div>
    );
}