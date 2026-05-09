import { create } from 'zustand'

interface User {
  id: number;
  username: string;
  email?: string;
}

interface Gamify {
  level: number;
  xp: number;
  streak: number;
}

interface AppState {
  user: User | null;
  gamify: Gamify;
  isSidebarOpen: boolean;
  setUser: (user: User | null) => void;
  setGamify: (gamify: Gamify) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  gamify: { level: 1, xp: 0, streak: 0 },
  isSidebarOpen: false,
  setUser: (user) => set({ user }),
  setGamify: (gamify) => set({ gamify }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}))
