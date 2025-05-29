import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: replace with your real API request
    console.log('Logging in with', { email, password });
  }

  return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <form
            onSubmit={handleSubmit}
            className="w-full max-w-xs space-y-4 rounded-2xl bg-slate-800 p-8 shadow-lg"
        >
          <h1 className="text-center text-2xl font-semibold">Sign in</h1>

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

          <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 py-2 font-medium hover:bg-indigo-500 active:scale-[.98]"
          >
            Log in
          </button>
        </form>
      </div>
  );
}
