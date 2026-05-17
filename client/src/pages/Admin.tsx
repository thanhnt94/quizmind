import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

export default function Admin() {
  const navigate = useNavigate();
  const { user, isLoggedIn, isLoading } = useAppStore();

  const [activeTab, setActiveTab] = useState<'sso' | 'ai' | 'users' | 'maintenance'>('sso');
  const [globalLoading, setGlobalLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Tab 1: SSO Config state
  const [ssoUrl, setSsoUrl] = useState('');
  const [ssoClientId, setSsoClientId] = useState('');
  const [ssoClientSecret, setSsoClientSecret] = useState('');
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoTestStatus, setSsoTestStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ status: 'idle' });

  // Tab 2: AI Config state
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModels, setAiModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Tab 3: Users state
  const [usersList, setUsersList] = useState<any[]>([]);

  // Tab 4: Maintenance state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);

  // Enforce admin authorization
  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn) {
        navigate('/login');
      } else if (user?.role !== 'admin') {
        navigate('/');
      }
    }
  }, [isLoggedIn, user, isLoading, navigate]);

  // Load SSO & AI settings on mount
  useEffect(() => {
    if (isLoggedIn && user?.role === 'admin') {
      loadSSOConfig();
      loadAIConfig();
      loadUsersList();
      loadMaintenanceMode();
    }
  }, [isLoggedIn, user]);

  const loadSSOConfig = async () => {
    try {
      const res = await axios.get('/api/v1/admin/sso');
      setSsoUrl(res.data.central_auth_url || '');
      setSsoClientId(res.data.client_id || '');
      setSsoClientSecret(res.data.client_secret || '');
      setSsoEnabled(res.data.enabled || false);
    } catch (e) {
      console.error("Failed to load SSO configuration", e);
    }
  };

  const loadAIConfig = async () => {
    try {
      const res = await axios.get('/api/v1/admin/ai');
      setAiKey(res.data.api_key || '');
      setAiModel(res.data.model_id || 'gemini-2.5-flash');
      setAiEnabled(res.data.enabled || false);
    } catch (e) {
      console.error("Failed to load AI configuration", e);
    }
  };

  const loadUsersList = async () => {
    try {
      const res = await axios.get('/api/v1/admin/users');
      setUsersList(res.data || []);
    } catch (e) {
      console.error("Failed to load users list", e);
    }
  };

  const loadMaintenanceMode = async () => {
    try {
      const res = await axios.get('/api/v1/admin/maintenance');
      setMaintenanceEnabled(res.data.maintenance_enabled || false);
    } catch (e) {
      console.error("Failed to load maintenance mode", e);
    }
  };

  // Action: Save SSO config
  const handleSaveSSO = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setGlobalLoading(true);

    try {
      await axios.post('/api/v1/admin/sso', {
        central_auth_url: ssoUrl.trim(),
        client_id: ssoClientId.trim(),
        client_secret: ssoClientSecret.trim(),
        enabled: ssoEnabled
      });
      setSuccessMsg("SSO configuration updated successfully!");
    } catch (e) {
      setErrorMsg("Failed to save SSO configuration.");
    } finally {
      setGlobalLoading(false);
    }
  };

  // Action: Test SSO connection
  const handleTestSSO = async () => {
    if (!ssoUrl.trim()) {
      setSsoTestStatus({ status: 'error', message: 'CentralAuth URL is required to test' });
      return;
    }
    setSsoTestStatus({ status: 'loading' });
    try {
      const res = await axios.post('/api/v1/admin/sso/test', { central_auth_url: ssoUrl.trim() });
      if (res.data.status === 'success') {
        setSsoTestStatus({ status: 'success', message: res.data.message });
      } else {
        setSsoTestStatus({ status: 'error', message: res.data.message });
      }
    } catch (e: any) {
      setSsoTestStatus({ status: 'error', message: e.message || 'Connection test failed' });
    }
  };

  // Action: Save AI Config
  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setGlobalLoading(true);

    try {
      await axios.post('/api/v1/admin/ai', {
        api_key: aiKey.trim(),
        model_id: aiModel,
        enabled: aiEnabled
      });
      setSuccessMsg("AI configuration updated successfully!");
    } catch (e) {
      setErrorMsg("Failed to save AI configuration.");
    } finally {
      setGlobalLoading(false);
    }
  };

  // Action: List AI Models
  const handleListAIModels = async () => {
    if (!aiKey.trim()) {
      setErrorMsg("Google AI Studio API Key is required to list models.");
      return;
    }
    setLoadingModels(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await axios.post('/api/v1/admin/ai/list-models', { api_key: aiKey.trim() });
      if (res.data.models) {
        setAiModels(res.data.models);
        setSuccessMsg(`Discovered ${res.data.models.length} generative models!`);
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "Failed to fetch generative models.");
    } finally {
      setLoadingModels(false);
    }
  };

  // Action: Toggle Maintenance
  const handleToggleMaintenance = async () => {
    setSuccessMsg('');
    setErrorMsg('');
    setGlobalLoading(true);

    try {
      const res = await axios.post('/api/v1/admin/maintenance/toggle');
      setMaintenanceEnabled(res.data.maintenance_enabled);
      setSuccessMsg(`System maintenance mode ${res.data.maintenance_enabled ? 'ENABLED' : 'DISABLED'}!`);
    } catch (e) {
      setErrorMsg("Failed to toggle system maintenance mode.");
    } finally {
      setGlobalLoading(false);
    }
  };

  if (isLoading || globalLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <span className="text-gray-400 font-medium">Processing Admin Instruction...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans p-6 md:p-12 relative overflow-x-hidden selection:bg-[#6366f1] selection:text-white">
      {/* Glow Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60vw] h-[60vw] rounded-full bg-[#4f46e5] opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60vw] h-[60vw] rounded-full bg-[#ec4899] opacity-5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto z-10 relative">
        {/* Navigation Breadcrumb & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
              <span className="hover:text-indigo-400 cursor-pointer transition-colors" onClick={() => navigate('/')}>Dashboard</span>
              <span>/</span>
              <span className="text-indigo-300">Admin Control Panel</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              QuizMind System Control
            </h1>
          </div>

          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl font-bold bg-[#1e293b] hover:bg-[#334155] border border-white/10 transition-all text-sm self-start active:scale-95"
          >
            ← Return to Dashboard
          </button>
        </div>

        {/* Dynamic Alerts */}
        {successMsg && (
          <div className="p-4 mb-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium flex gap-3 items-center animate-fade-in shadow-lg shadow-emerald-500/5">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium flex gap-3 items-center animate-fade-in shadow-lg shadow-red-500/5">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dashboard Grid / Tabs Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Tabs */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => setActiveTab('sso')}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'sso' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              🔒 CentralAuth SSO
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'ai' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              🧠 Google Gemini AI
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'users' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              👥 User Registry
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'maintenance' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              ⚙️ System Control
            </button>
          </div>

          {/* Form Content Area */}
          <div className="lg:col-span-3 bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-8 shadow-xl">
            {/* Tab 1: SSO Config */}
            {activeTab === 'sso' && (
              <form onSubmit={handleSaveSSO} className="flex flex-col gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">CentralAuth SSO Integration</h3>
                  <p className="text-gray-400 text-sm">Synchronize user credentials across the platform effortlessly.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">CentralAuth Server URL</label>
                    <input
                      type="url"
                      value={ssoUrl}
                      onChange={(e) => setSsoUrl(e.target.value)}
                      placeholder="https://central-auth-domain.com"
                      className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Client ID</label>
                    <input
                      type="text"
                      value={ssoClientId}
                      onChange={(e) => setSsoClientId(e.target.value)}
                      placeholder="quizmind-sub-client"
                      className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Client Secret</label>
                    <input
                      type="password"
                      value={ssoClientSecret}
                      onChange={(e) => setSsoClientSecret(e.target.value)}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#0d1321]/50 border border-white/5 p-4 rounded-xl mt-2">
                  <input
                    type="checkbox"
                    id="ssoEnabled"
                    checked={ssoEnabled}
                    onChange={(e) => setSsoEnabled(e.target.checked)}
                    className="w-5 h-5 text-indigo-500 bg-[#0d1321] border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-0 focus:ring-0"
                  />
                  <label htmlFor="ssoEnabled" className="text-sm font-semibold select-none cursor-pointer">
                    Enable SSO Routing (Redirect regular logins to CentralAuth)
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 border-t border-white/5 pt-6 mt-4">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all text-sm flex items-center gap-2 active:scale-95"
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSSO}
                    disabled={ssoTestStatus.status === 'loading'}
                    className="px-6 py-3 rounded-xl font-bold bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-500/20 transition-all text-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {ssoTestStatus.status === 'loading' ? 'Testing Connection...' : 'Test Connection'}
                  </button>
                </div>

                {ssoTestStatus.status !== 'idle' && (
                  <div className={`p-4 rounded-xl text-sm font-medium ${ssoTestStatus.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : ssoTestStatus.status === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-white/[0.03] text-gray-400'}`}>
                    {ssoTestStatus.status === 'loading' && 'Checking central authentication health state...'}
                    {ssoTestStatus.status === 'success' && `✅ ${ssoTestStatus.message}`}
                    {ssoTestStatus.status === 'error' && `❌ ${ssoTestStatus.message}`}
                  </div>
                )}
              </form>
            )}

            {/* Tab 2: AI Config */}
            {activeTab === 'ai' && (
              <form onSubmit={handleSaveAI} className="flex flex-col gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Google Gemini AI Studio</h3>
                  <p className="text-gray-400 text-sm">Configure raw key credentials and active LLM models for generation.</p>
                </div>

                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Gemini API Key</label>
                    <input
                      type="password"
                      value={aiKey}
                      onChange={(e) => setAiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Active LLM Model</label>
                    <div className="flex gap-4">
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="flex-grow bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                      >
                        <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & recommended)</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro (High intelligence)</option>
                        <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                        <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                        {aiModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.display_name} ({m.id})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleListAIModels}
                        disabled={loadingModels}
                        className="px-5 py-3 rounded-xl font-bold bg-[#1e293b] hover:bg-[#334155] border border-white/10 transition-all text-sm whitespace-nowrap active:scale-95 disabled:opacity-50"
                      >
                        {loadingModels ? 'Fetching...' : 'Discover Models'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#0d1321]/50 border border-white/5 p-4 rounded-xl mt-2">
                  <input
                    type="checkbox"
                    id="aiEnabled"
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    className="w-5 h-5 text-indigo-500 bg-[#0d1321] border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-0 focus:ring-0"
                  />
                  <label htmlFor="aiEnabled" className="text-sm font-semibold select-none cursor-pointer">
                    Enable AI Services (Permit smart generation from text/audio/video)
                  </label>
                </div>

                <div className="border-t border-white/5 pt-6 mt-4">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all text-sm active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: User Registry */}
            {activeTab === 'users' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">User Registry</h3>
                  <p className="text-gray-400 text-sm">Full index of users initialized or synced locally in the database.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-3">ID</th>
                        <th className="py-4 px-3">Username</th>
                        <th className="py-4 px-3">Email Address</th>
                        <th className="py-4 px-3">System Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {usersList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 px-3 text-center text-gray-600 font-medium">
                            No synced users found in DB.
                          </td>
                        </tr>
                      ) : (
                        usersList.map((u) => (
                          <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 px-3 text-indigo-400 font-bold">{u.id}</td>
                            <td className="py-4 px-3 font-semibold">{u.username}</td>
                            <td className="py-4 px-3 text-gray-400">{u.email || 'None'}</td>
                            <td className="py-4 px-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                                {u.role.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Maintenance Mode */}
            {activeTab === 'maintenance' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">System Controls</h3>
                  <p className="text-gray-400 text-sm">Toggle global operational flags for platform administrative windows.</p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 mt-4">
                  <div className="flex gap-4 items-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${maintenanceEnabled ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {maintenanceEnabled ? '⚠️' : '✅'}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">System Maintenance Window</h4>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {maintenanceEnabled 
                          ? 'Maintenance Mode is active. Normal accounts are restricted.' 
                          : 'Platform is online and serving traffic under healthy conditions.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleMaintenance}
                    className={`px-6 py-3.5 rounded-xl font-bold transition-all text-sm active:scale-95 whitespace-nowrap ${maintenanceEnabled ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20'}`}
                  >
                    {maintenanceEnabled ? 'Disable Maintenance' : 'Enable Maintenance'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
