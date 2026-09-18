import { create } from 'zustand'
import axios from 'axios'

// Set default credentials handling so cookies are automatically sent/received
axios.defaults.withCredentials = true;

export interface UserSettings {
  theme: 'light' | 'dark';
  focus_timer_active: boolean;
  sfx_enabled: boolean;
  haptic_enabled: boolean;
  autoplay_audio: string;
  quiz_learning_mode: string;
  practice_range: string;
  score_mode: string;
  time_mode: string;
  last_quiz_id?: number | null;
  home_active_tab: string;
  roadmap_quiz_order?: number[];
  quizzes_quiz_order?: number[];
  shuffle_choices?: boolean;
  shuffle_questions?: boolean;
  auto_expand_explanation?: boolean;
  exam_batch_size?: number;
  instant_feedback?: boolean;
  font_size?: string;
  auto_advance?: string;
  show_mastery?: boolean;
  updated_at?: string | null;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'light',
  focus_timer_active: true,
  sfx_enabled: true,
  haptic_enabled: true,
  autoplay_audio: 'never',
  quiz_learning_mode: 'mcq',
  practice_range: 'all',
  score_mode: 'all',
  time_mode: 'question',
  last_quiz_id: null,
  home_active_tab: 'roadmap',
  roadmap_quiz_order: [],
  quizzes_quiz_order: [],
  shuffle_choices: true,
  shuffle_questions: true,
  auto_expand_explanation: true,
  exam_batch_size: 10,
  instant_feedback: true,
  font_size: '100%',
  auto_advance: 'off',
  show_mastery: true,
  updated_at: null,
};

interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  avatar_url?: string;
  settings?: UserSettings;
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
  userSettings: UserSettings;
  isSidebarOpen: boolean;
  authConfig: AuthConfig | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setGamify: (gamify: Gamify) => void;
  setUserSettings: (settings: UserSettings) => void;
  updateUserSettings: (partial: Partial<UserSettings>) => Promise<void>;
  toggleSidebar: () => void;
  fetchAuthConfig: () => Promise<void>;
  fetchMe: () => Promise<void>;
  login: (credentials: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  gamify: { level: 1, xp: 0, streak: 0 },
  userSettings: DEFAULT_USER_SETTINGS,
  isSidebarOpen: false,
  authConfig: null,
  isLoggedIn: false,
  isLoading: true,

  setUser: (user) => set({ user, isLoggedIn: !!user }),
  setGamify: (gamify) => set({ gamify }),
  setUserSettings: (settings) => set({ userSettings: settings }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  updateUserSettings: async (partialSettings) => {
    const current = get().userSettings;
    const merged = { ...current, ...partialSettings };
    set({ userSettings: merged });

    // Apply theme dynamically to document
    if (partialSettings.theme) {
      if (partialSettings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    try {
      await axios.patch('/api/v1/user/settings', partialSettings);
    } catch (e) {
      console.error("Failed to persist user settings to DB", e);
    }
  },

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
        const user = res.data.user;
        const settings = user.settings ? { ...DEFAULT_USER_SETTINGS, ...user.settings } : DEFAULT_USER_SETTINGS;
        
        // Sync theme to root class
        if (settings.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        set({ 
          user, 
          userSettings: settings,
          isLoggedIn: true, 
          isLoading: false 
        })
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
        await get().fetchMe();
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
    set({ user: null, isLoggedIn: false, userSettings: DEFAULT_USER_SETTINGS })
    window.location.href = '/logout'
  }
}))
