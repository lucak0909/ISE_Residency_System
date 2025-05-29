import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function App() {

  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const [name, setName]           = useState('');
  const [confirm, setConfirm]     = useState('');
  const [isSignUp, setIsSignUp]   = useState(false);   // ✨ new toggle

  async function handleLogin() {
    // TODO: replace console.log with your API call, e.g. fetch('/api/login', …)
    console.log('Logging in with', { email, password });
    navigate('/dashboard');
  }

  async function handleSignUp() {
    if (password !== confirm) {
      alert('Passwords do not match');
      return;
    }
    // TODO: replace console.log with your API call, e.g. fetch('/api/signup', …)
    console.log('Creating account', { name, email, password });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
