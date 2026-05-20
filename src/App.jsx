import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/ui/Sidebar'
import BottomNav from './components/ui/BottomNav'
import Home from './pages/Home'
import NewWorkout from './pages/NewWorkout'
import WorkoutDetail from './pages/WorkoutDetail'
import ExerciseDetail from './pages/ExerciseDetail'
import History from './pages/History'
import Progress from './pages/Progress'
import Profile from './pages/Profile'
import Login from './pages/Login'
import useAuthStore from './store/authStore'

function AuthGuard({ children }) {
  const user    = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const init = useAuthStore((s) => s.init)
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  )
}

function LoginPage() {
  const user    = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <Login />
}

function AppShell() {
  return (
    <AuthGuard>
      <div className="dark min-h-screen bg-slate-950 text-slate-100">
        <Sidebar />
        <div className="md:ml-16 lg:ml-60 min-h-screen flex flex-col pt-[env(safe-area-inset-top)]">
          <main className="flex-1 pb-20 md:pb-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/new" element={<NewWorkout />} />
              <Route path="/workout/:id" element={<WorkoutDetail />} />
              <Route path="/exercise/:name" element={<ExerciseDetail />} />
              <Route path="/history" element={<History />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  )
}
