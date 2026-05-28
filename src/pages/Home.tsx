import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles, Code, Gamepad2, Rocket } from 'lucide-react';
import StarsBackground from '../components/StarsBackground';

export default function Home() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center text-white overflow-hidden font-sans">
      <StarsBackground />
      <div className="z-10 text-center max-w-3xl px-6">
        <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl mb-8 shadow-2xl">
          <Bot className="w-16 h-16 text-blue-400" />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
          LuaForge
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 mb-10 font-light leading-relaxed">
          The ultimate AI-powered Roblox Game Pack generator. Describe your idea and get full Lua scripts, maps, and templates instantly.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/signup" 
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-3 transition-all transform hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            Get Started
          </Link>
          <Link 
            to="/pricing" 
            className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all"
          >
            Pricing Plans
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
            <Code className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">Instant Lua Scripts</h3>
            <p className="text-slate-400 text-sm">Valid, robust Luau code ready to be pasted directly into Roblox Studio.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
            <Gamepad2 className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">Full Game Packs</h3>
            <p className="text-slate-400 text-sm">Includes overviews, map setup instructions, and game loops.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
            <Rocket className="w-8 h-8 text-pink-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">Rapid Prototyping</h3>
            <p className="text-slate-400 text-sm">Save weeks of development time by letting AI do the heavy lifting.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
