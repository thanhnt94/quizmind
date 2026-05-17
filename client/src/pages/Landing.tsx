import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col justify-between font-sans overflow-x-hidden selection:bg-[#6366f1] selection:text-white relative">
      {/* Background Neon Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#4f46e5] opacity-[0.15] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#ec4899] opacity-[0.15] blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4f46e5] to-[#ec4899] flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-extrabold text-lg text-white">Q</span>
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quiz<span className="bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">Mind</span></span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 rounded-xl font-semibold bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md active:scale-95"
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-20 flex flex-col items-center text-center z-10 flex-grow justify-center">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-sm font-medium text-indigo-300 mb-8 animate-pulse shadow-inner">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          QuizMind 2.0 SPA Platform
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.15]">
          Unleash the Power of <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI-Driven Quizzing
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-lg md:text-xl text-gray-400 mb-12 leading-relaxed">
          Instantly generate adaptive quizzes from audio, video, or raw text. Play, track, compete, and master any domain in real-time.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-5 mb-24">
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 shadow-lg shadow-indigo-500/25 transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Enter Platform
          </button>
          <button 
            onClick={() => navigate('/room/join')}
            className="px-8 py-4 rounded-xl font-bold bg-[#1e293b] hover:bg-[#334155] border border-white/10 transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Join Live Room
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {/* Card 1 */}
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.04] text-left group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Instant AI Generation</h3>
            <p className="text-gray-400 leading-relaxed">Leverage state-of-the-art Gemini LLMs to transform long materials into high-quality assessments in seconds.</p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.04] text-left group">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Real-Time Competition</h3>
            <p className="text-gray-400 leading-relaxed">Host multiplayer game rooms, answer concurrently, and climb the live leaderboards with friends.</p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.04] text-left group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">SSO Secure Core</h3>
            <p className="text-gray-400 leading-relaxed">Log in instantly with enterprise Central SSO credentials. Reliable local backdoor fallback is active for admins.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-gray-500 text-sm z-10 gap-4">
        <span>© {new Date().getFullYear()} QuizMind SPA. All rights reserved.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
