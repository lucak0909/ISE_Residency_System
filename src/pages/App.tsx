import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import { supabase } from '../helper/supabaseClient';
import bcrypt from 'bcryptjs';

/**
 * AuthPage – Signup / Login
 * ------------------------------------------------------------------
 * Company flow:
 *   1. User signs up with e‑mail/password/full name.
 *   2. After signup prompt asks for Company Name and saves it to Company table.
 * Student flow remains unchanged.
 * ------------------------------------------------------------------
 */
export default function AuthPage() {
  const navigate = useNavigate();

  /* ----------------------------- State ----------------------------*/
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ------------------------ Helpers ------------------------------*/
  const studentRegex = /^\d{8}@studentmail\.ul\.ie$/i;
  const trimmedEmail = email.trim().toLowerCase();
  const isStudentEmail = studentRegex.test(trimmedEmail);

  const splitName = (name: string) => {
    const [first = '', ...rest] = name.trim().split(/\s+/);
    return { first, last: rest.join(' ') };
  };

  const generateUniqueID = async (): Promise<number> => {
    while (true) {
      const id = Math.floor(1_000_0000 + Math.random() * 9_000_0000);
      const { data } = await supabase.from('User').select('ID').eq('ID', id).maybeSingle();
      if (!data) return id;
    }
  };

  /* -------------------------- Sign‑up ----------------------------*/
  const handleSignUp = async () => {
    if (password !== confirm) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      let role: 'student' | 'company';
      let id: number;

      if (isStudentEmail) {
        role = 'student';
        id = parseInt(trimmedEmail.substring(0, 8), 10);
      } else {
        const { data: white } = await supabase.from('WhiteList').select('Email').eq('Email', trimmedEmail).maybeSingle();
        if (!white) throw new Error('Email not authorised for company signup');
        role = 'company';
        id = await generateUniqueID();
      }

      const { error: authErr } = await supabase.auth.signUp({ email: trimmedEmail, password });
      if (authErr) throw authErr;

      const passwordHash = bcrypt.hashSync(password, 10);
      const { first, last } = splitName(fullName);
      const { error: userErr } = await supabase.from('User').insert({
        ID: id,
        Email: trimmedEmail,
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
        alert('Student account created!');
        navigate('/StudentDashboard');
      } else {
        let companyName = '';
        while (!companyName) {
          companyName = window.prompt('Enter your Company Name to finish signup:', '')?.trim() || '';
          if (!companyName) alert('Company Name is required.');
        }
        const { error } = await supabase.from('Company').insert({
          CompanyID: id,
          Email: trimmedEmail,
          CompanyName: companyName,
        });
        if (error) throw error;
        alert('Company account created!');
        navigate('/PartnerDashboard');
      }

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
  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      if (authErr) throw authErr;
      const { data: userRow } = await supabase.from('User').select('Role').eq('Email', trimmedEmail).maybeSingle();
      if (userRow?.Role === 'student') navigate('/StudentDashboard');
      else if (userRow?.Role === 'company') navigate('/PartnerDashboard');
      else navigate('/');
    } catch (err: any) {
      alert(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isSignUp ? handleSignUp() : handleLogin();
  };

  /* --------------------------- JSX -------------------------------*/
  return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-white">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-800 p-8 shadow-lg">
          <h1 className="text-center text-2xl font-semibold">{isSignUp ? 'Create an account' : 'Sign in'}</h1>

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
                  <button type="button" className="font-medium text-indigo-400 hover:underline" onClick={() => setIsSignUp(false)}>
                    Log in
                  </button>
                </>
            ) : (
                <>
                  New here?{' '}
                  <button type="button" className="font-medium text-indigo-400 hover:underline" onClick={() => setIsSignUp(true)}>
                    Create one
                  </button>
                </>
            )}
          </p>
        </form>
      </div>
  );
}
