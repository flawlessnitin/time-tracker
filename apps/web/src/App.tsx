import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Timer from './pages/Timer'
import Calendar from './pages/Calendar'
import './App.css'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/signin"
        element={!isAuthenticated ? <SignIn /> : <Navigate to="/timer" />}
      />
      <Route
        path="/signup"
        element={!isAuthenticated ? <SignUp /> : <Navigate to="/timer" />}
      />
      <Route
        path="/"
        element={isAuthenticated ? <Layout /> : <Navigate to="/signin" />}
      >
        <Route index element={<Navigate to="/timer" />} />
        <Route path="timer" element={<Timer />} />
        <Route path="calendar" element={<Calendar />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
