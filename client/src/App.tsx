import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './pages/Dashboard'
import QuizPlay from './pages/QuizPlay'
import QuizDetail from './pages/QuizDetail'
import Profile from './pages/Profile'
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
          </Route>
          <Route path="/quiz/:id/play" element={<QuizPlay />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
