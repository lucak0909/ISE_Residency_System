import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import { supabase } from '../helper/supabaseClient';
import bcrypt from 'bcryptjs';

/**
 * Login / Sign‑up component
 * --------------------------------------------------------------
 * • Users never choose their role. Role is inferred from e‑mail.
 *     – student  →  8‑digit ID@studentmail.ul.ie  → ID = first 8 digits.
 *     – company  →  e‑mail in WhiteList table     → ID = random 8‑digit int.
 * • Enum in DB is `usertype` (admin | student | company) – values lower‑case.
 * • Passwords are handled by Supabase Auth **and** stored (bcrypt‑hashed) in
 *   our own `User.PasswordHash` column for legacy queries.
 * --------------------------------------------------------------
 */
export default function AuthPage() {
  /* ------------------------------------------------------------------
   * Local state
   * ----------------------------------------------------------------*/
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ------------------------------------------------------------------
   * Helpers
   * ----------------------------------------------------------------*/
  const studentRegex = /^\d{8}@studentmail\.ul\.ie$/i;

  function nameParts(name: string) {
    const [first = '', ...rest] = name.trim().split(/\s+/);
    return { first, last: rest.join(' ') };
  }

  async function generateUniqueID(): Promise<number> {
    // Generate a random 8‑digit integer that does not already exist in User.ID
    while (true) {
      const candidate = Math.floor(1_000_0000 + Math.random() * 9_000_0000);
      const { data } = await supabase.from('User').select('ID').eq('ID', candidate).maybeSingle();
      if (!data) return candidate;
    }
  }

  /* ------------------------------------------------------------------
   * Sign‑up
   * ----------------------------------------------------------------*/
  const handleSignUp = async () => {
    if (password !== confirm) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    const emailLower = email.trim().toLowerCase();

    try {
      let role: 'student' | 'company';
      let id: number;

      // ----- Role inference -----
      if (studentRegex.test(emailLower)) {
        role = 'student';
        id = parseInt(emailLower.substring(0, 8), 10);
      } else {
        const { data: white } = await supabase
            .from('WhiteList')
            .select('Email')
            .eq('Email', emailLower)
            .maybeSingle();
        if (!white) throw new Error('Email is not authorised as a Company/Partner');
        role = 'company';
        id = await generateUniqueID();
      }

      /* ---------- Supabase Auth ---------- */
      const { error: authErr } = await supabase.auth.signUp({ email: emailLower, password });
      if (authErr) throw authErr;

      // BCrypt hash for local User table (optional but mirrors legacy schema)
      const passwordHash = bcrypt.hashSync(password, 10);

      /* ---------- Domain inserts ---------- */
      const { first, last } = nameParts(fullName);

      const { error: userErr } = await supabase.from('User').insert({
        ID: id,
        Email: emailLower,
        Username: id.toString(),
        FirstName: first,
        Surname: last,
        Role: role,
        PasswordHash: passwordHash,
      });
      if (userErr) throw userErr;

      if (role === 'student') {
        const { error } = await supabase.from('Student').insert({ StudentID: id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('Company').insert({ CompanyID: id, Email: emailLower });
        if (error) throw error;
      }

      alert('Account created! Check your inbox to confirm your email.');
      setIsSignUp(false);
      setEmail('');
      setPassword('');
      setConfirm('');
      setFullName('');
    } catch (err: any) {
      alert(err.message || 'Sign‑up failed');
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------
   * Login
   * ----------------------------------------------------------------*/
  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      const { data: user, error } = await supabase
          .from('User')
          .select('Role')
          .eq('Email', email.toLowerCase())
          .maybeSingle();
      if (error) throw error;

      if (user?.Role === 'student') navigate('/StudentDashboard');
      else if (user?.Role === 'company') navigate('/PartnerDashboard');
      else navigate('/');
    } catch (err: any) {
      alert(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------
   * Dispatch
   * ----------------------------------------------------------------*/
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isSignUp ? handleSignUp() : handleLogin();
  };

  /* ------------------------------------------------------------------
   * UI
   * ----------------------------------------------------------------*/
  return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white p-4">
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
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-2 font-medium hover:bg-indigo-500 active:scale-95 disabled:opacity-60"
          >
            {loading ? 'Please wait…' : isSignUp ? 'Sign up' : 'Log in'}
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
