import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './pages/Dashboard'
import QuizPlay from './pages/QuizPlay'
import QuizDetail from './pages/QuizDetail'
import Profile from './pages/Profile'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import ManageQuizzes from './pages/ManageQuizzes'
import ImportQuiz from './pages/ImportQuiz'
import EditQuiz from './pages/EditQuiz'
import EditQuestions from './pages/EditQuestions'
import Layout from './components/Layout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/quiz/:id" element={<QuizDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/manage" element={<ManageQuizzes />} />
            <Route path="/manage/import" element={<ImportQuiz />} />
            <Route path="/manage/edit/:id" element={<EditQuiz />} />
            <Route path="/manage/edit/:id/questions" element={<EditQuestions />} />
          </Route>
          <Route path="/quiz/:id/play" element={<QuizPlay />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
