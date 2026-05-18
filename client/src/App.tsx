import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppStore } from './store/useAppStore'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Admin from './pages/Admin'
import QuizPlay from './pages/QuizPlay'
import QuizDetail from './pages/QuizDetail'
import Profile from './pages/Profile'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import ManageQuizzes from './pages/ManageQuizzes'
import ImportQuiz from './pages/ImportQuiz'
import EditQuiz from './pages/EditQuiz'
import EditQuestions from './pages/EditQuestions'
import QuizRoom from './pages/QuizRoom'
import RoomJoin from './pages/RoomJoin'
import Layout from './components/Layout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function AppContent() {
  const { user, isLoggedIn, isLoading, fetchMe, fetchAuthConfig } = useAppStore()

  useEffect(() => {
    fetchMe()
    fetchAuthConfig()
  }, [fetchMe, fetchAuthConfig])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <span className="text-gray-400 font-medium font-sans">Initializing QuizMind Engine...</span>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<Login />} />

        {/* Client Layout Routes (Protected / Guest Landing) */}
        <Route element={<Layout />}>
          <Route path="/" element={isLoggedIn ? <Dashboard /> : <Landing />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          
          {/* Protected Routes (Authenticated only) */}
          <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to="/login" replace />} />
          <Route path="/stats" element={isLoggedIn ? <Stats /> : <Navigate to="/login" replace />} />
          <Route path="/settings" element={isLoggedIn ? <Settings /> : <Navigate to="/login" replace />} />
          <Route path="/manage" element={isLoggedIn ? <ManageQuizzes /> : <Navigate to="/login" replace />} />
          <Route path="/manage/import" element={isLoggedIn ? <ImportQuiz /> : <Navigate to="/login" replace />} />
          <Route path="/manage/edit/:id" element={isLoggedIn ? <EditQuiz /> : <Navigate to="/login" replace />} />
          <Route path="/manage/edit/:id/questions" element={isLoggedIn ? <EditQuestions /> : <Navigate to="/login" replace />} />
          <Route path="/room/join" element={isLoggedIn ? <RoomJoin /> : <Navigate to="/login" replace />} />
          
          {/* Admin Control Panel */}
          <Route path="/admin" element={isLoggedIn && user?.role === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
        </Route>

        {/* Fullscreen Protected Views */}
        <Route path="/quiz/:id" element={isLoggedIn ? <QuizDetail /> : <Navigate to="/login" replace />} />
        <Route path="/quiz/:id/play" element={isLoggedIn ? <QuizPlay /> : <Navigate to="/login" replace />} />
        <Route path="/room/:code" element={isLoggedIn ? <QuizRoom /> : <Navigate to="/login" replace />} />

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
