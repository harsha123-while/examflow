
import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Admin from './pages/Admin'
import Auth from './Auth'
import Allocation from './pages/Allocation'
import Attendance from './pages/Attendance'
import Reports from './pages/Reports'
import AdminRooms from './pages/AdminRooms'
import AdminStudents from './pages/AdminStudents'


function LoadingScreen() {
  return <div style={{ padding: 32 }}>Loading ExamFlow...</div>
}

function Dashboard({ profile }) {
  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) alert(error.message)
  }

  const roleNames = {
    student: 'Student',
    in_charge: 'Examination In-Charge',
    admin: 'Admin',
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <button onClick={handleLogout} style={{ float: 'right' }}>
        Log out
      </button>

      <h1>ExamFlow</h1>
      <h2>Welcome, {profile.full_name}!</h2>
      <p>Role: {roleNames[profile.role]}</p>

      {profile.role === 'student' && (
        <p>Your Student dashboard is ready. Exam allocations will appear
          here when that module is connected.</p>
      )}

      {profile.role === 'in_charge' && (
        <p>Your assigned rooms and attendance tools will appear here
          when that module is connected.</p>
      )}
    </div>
  )
}

function ProtectedRoute({ profile, allowedRole, children }) {
  if (profile.role !== allowedRole) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    let alive = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!alive) return

      if (error) setProfileError(error.message)
      setSession(data.session)
      setSessionLoading(false)
    }

    loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (alive) setSession(newSession)
      }
    )

    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let alive = true

    async function loadProfile() {
      setProfile(null)
      setProfileError('')

      if (!session?.user) {
        setProfileLoading(false)
        return
      }

      setProfileLoading(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!alive) return

      if (error) {
        setProfileError(error.message)
      } else if (!data) {
        setProfileError('Profile not found. Contact the administrator.')
      } else if (!['student', 'in_charge', 'admin'].includes(data.role)) {
        setProfileError('Your account has an invalid role.')
      } else {
        setProfile(data)
      }

      setProfileLoading(false)
    }

    loadProfile()

    return () => {
      alive = false
    }
  }, [session])

  if (sessionLoading) return <LoadingScreen />

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Auth />} />
        <Route path="/allocation" element={<Allocation />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin/rooms" element={<AdminRooms />} />
        <Route path="/admin/students" element={<AdminStudents />} />
      </Routes>
    )
  }

  if (profileLoading) return <LoadingScreen />

  if (profileError) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Unable to load your profile</h2>
        <p>{profileError}</p>
        <button onClick={() => supabase.auth.signOut()}>
          Log out
        </button>
      </div>
    )
  }

  if (!profile) return <LoadingScreen />

  const homePath =
    profile.role === 'admin'
      ? '/admin'
      : profile.role === 'in_charge'
        ? '/in-charge'
        : '/student'

  return (
    <Routes>
      <Route path="/" element={<Navigate to={homePath} replace />} />
      <Route path="/login" element={<Navigate to={homePath} replace />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute profile={profile} allowedRole="admin">
            <Admin />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute profile={profile} allowedRole="student">
            <Dashboard profile={profile} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/in-charge"
        element={
          <ProtectedRoute profile={profile} allowedRole="in_charge">
            <Dashboard profile={profile} />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  )
}
