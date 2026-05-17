import { create } from 'zustand'
import axios from 'axios'

// Set default credentials handling so cookies are automatically sent/received
axios.defaults.withCredentials = true;

interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
}

interface Gamify {
  level: number;
  xp: number;
  streak: number;
}

interface AuthConfig {
  auth_provider: string;
  sso_enabled: boolean;
  jump_url?: string | null;
}

interface AppState {
  user: User | null;
  gamify: Gamify;
  isSidebarOpen: boolean;
  authConfig: AuthConfig | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setGamify: (gamify: Gamify) => void;
  toggleSidebar: () => void;
  fetchAuthConfig: () => Promise<void>;
  fetchMe: () => Promise<void>;
  login: (credentials: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  gamify: { level: 1, xp: 0, streak: 0 },
  isSidebarOpen: false,
  authConfig: null,
  isLoggedIn: false,
  isLoading: true,

  setUser: (user) => set({ user, isLoggedIn: !!user }),
  setGamify: (gamify) => set({ gamify }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  fetchAuthConfig: async () => {
    try {
      const res = await axios.get('/api/v1/auth/config')
      set({ authConfig: res.data })
    } catch (e) {
      console.error("Failed to fetch auth configuration", e)
    }
  },

  fetchMe: async () => {
    try {
      const res = await axios.get('/api/v1/auth/me')
      if (res.data && res.data.user) {
        set({ user: res.data.user, isLoggedIn: true, isLoading: false })
      } else {
        set({ user: null, isLoggedIn: false, isLoading: false })
      }
    } catch (e) {
      console.error("Failed to fetch user state", e)
      set({ user: null, isLoggedIn: false, isLoading: false })
    }
  },

  login: async (credentials) => {
    try {
      const res = await axios.post('/api/v1/auth/login', credentials)
      if (res.data.status === 'success') {
        set({ user: res.data.user, isLoggedIn: true })
        return { success: true }
      } else {
        return { success: false, error: res.data.message || 'Login failed' }
      }
    } catch (e: any) {
      console.error("Login request failed", e)
      return { success: false, error: e.response?.data?.detail || 'Network or server error' }
    }
  },

  logout: async () => {
    try {
      await axios.get('/logout').catch(() => {})
    } finally {
      set({ user: null, isLoggedIn: false })
      // For SSO or simple redirect, we force state reload at root
      window.location.href = '/'
    }
  }
}))
