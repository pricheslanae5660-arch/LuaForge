import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import StarsBackground from '../components/StarsBackground';
import { Bot, LogIn } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: username });
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            tier: 'free',
            generationsUsed: 0,
            chatUsed: 0,
            resetsAt: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        } catch (dbErr) {
          console.error("Failed to set initial user document:", dbErr);
        }
      }
      navigate('/workbench');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center text-white overflow-hidden font-sans">
      <StarsBackground />
      <div className="z-10 w-full max-w-md px-6">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-blue-500/20 rounded-2xl">
              <Bot className="w-10 h-10 text-blue-400" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center mb-8">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          {error && (
            <div className="p-3 mb-6 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Email</label>
              <input
                type="email"
                value={email}
                autoComplete="email"
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Password</label>
              <input
                type="password"
                value={password}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="remember" 
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500/20" 
              />
              <label htmlFor="remember" className="text-sm text-slate-400">Remember me</label>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors mt-2"
            >
              <LogIn className="w-5 h-5" />
              {isLogin ? 'Log In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center text-slate-400 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-blue-400 hover:text-blue-300 font-bold"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
