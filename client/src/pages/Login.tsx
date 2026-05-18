import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authConfig, fetchAuthConfig, login, user, isLoggedIn } = useAppStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isBackdoor = searchParams.get('backdoor') === '1';
  const urlError = searchParams.get('error');

  useEffect(() => {
    fetchAuthConfig();
  }, [fetchAuthConfig]);

  // If already logged in, go to dashboard
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  // Automatic SSO redirection if enabled, not backdoor, and no callback errors
  useEffect(() => {
    if (authConfig && authConfig.sso_enabled && !isBackdoor && !urlError && authConfig.jump_url) {
      window.location.href = authConfig.jump_url;
    }
  }, [authConfig, isBackdoor, urlError]);

  // Handle URL errors (e.g. callback failures)
  useEffect(() => {
    if (urlError) {
      setErrorMsg(decodeURIComponent(urlError));
      // Clean up the URL search params so the error doesn't persist on refresh or block future redirects
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('error');
        return next;
      }, { replace: true });
    }
  }, [urlError, setSearchParams]);

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter both username and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const res = await login({
      username: username.trim(),
      password: password.trim(),
      is_backdoor: isBackdoor
    });

    setIsSubmitting(false);

    if (res.success) {
      navigate('/');
    } else {
      setErrorMsg(res.error || 'Invalid credentials');
    }
  };

  const handleSSORedirect = () => {
    if (authConfig?.jump_url) {
      window.location.href = authConfig.jump_url;
    } else {
      setErrorMsg("SSO Jump URL not configured or service unavailable.");
    }
  };

  // If loading SSO configuration
  if (!authConfig) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <span className="text-gray-400 font-medium">Initializing Auth Engine...</span>
        </div>
      </div>
    );
  }

  const showSSO = authConfig.sso_enabled && !isBackdoor;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center font-sans p-6 relative overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60vw] h-[60vw] rounded-full bg-[#4f46e5] opacity-10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60vw] h-[60vw] rounded-full bg-[#ec4899] opacity-10 blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4f46e5] to-[#ec4899] flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
            <span className="font-extrabold text-xl text-white">Q</span>
          </div>
          <h2 className="font-extrabold text-3xl tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Welcome to <span className="bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">QuizMind</span>
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {showSSO ? 'Sign in using your Enterprise SSO credentials' : 'Access local accounts through secure backdoor'}
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium flex gap-3 items-center">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SSO Panel */}
        {showSSO ? (
          <div className="flex flex-col gap-6">
            {!urlError ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-10 h-10 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <span className="text-indigo-300 font-semibold animate-pulse text-sm">Redirecting to Central SSO...</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleSSORedirect}
                  className="w-full py-4 px-6 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 shadow-lg shadow-indigo-500/25 transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In with Central SSO
                </button>

                <div className="flex items-center justify-center mt-4">
                  <button
                    onClick={() => setSearchParams({ backdoor: '1' })}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline transition-colors"
                  >
                    Administrator Local Backdoor Bypass
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Local Login Form */
          <form onSubmit={handleLocalSubmit} className="flex flex-col gap-5">
            {authConfig.sso_enabled && (
              <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-300 font-medium leading-relaxed">
                ⚠️ <span className="font-bold">Security Alert</span>: SSO is active. Local backdoor logins are restricted to administrative credentials only.
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl font-bold bg-[#1e293b] hover:bg-[#334155] border border-white/10 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Verifying...
                </>
              ) : (
                'Submit Local Access'
              )}
            </button>

            {authConfig.sso_enabled && (
              <div className="flex items-center justify-center mt-4">
                <button
                  type="button"
                  onClick={() => setSearchParams({})}
                  className="text-xs text-pink-400 hover:text-pink-300 font-semibold underline transition-colors"
                >
                  Sign In using Central SSO instead
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
