import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/ui/Sidebar'
import BottomNav from './components/ui/BottomNav'
import Home from './pages/Home'
import NewWorkout from './pages/NewWorkout'
import WorkoutDetail from './pages/WorkoutDetail'
import ExerciseDetail from './pages/ExerciseDetail'
import History from './pages/History'

export default function App() {
  return (
    <BrowserRouter>
      <div className="dark min-h-screen bg-slate-950 text-slate-100">
        {/* Sidebar: visible on md+, hidden on mobile */}
        <Sidebar />

        {/* Main content: offset by sidebar width on md+ */}
        <div className="md:ml-16 lg:ml-60 min-h-screen flex flex-col">
          <main className="flex-1 pb-20 md:pb-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/new" element={<NewWorkout />} />
              <Route path="/workout/:id" element={<WorkoutDetail />} />
              <Route path="/exercise/:name" element={<ExerciseDetail />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </main>
        </div>

        {/* Bottom nav: visible on mobile only */}
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
