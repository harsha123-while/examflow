
import { useState } from 'react'
import { supabase } from './lib/supabase'
import './Auth.css'

export default function Auth() {
  const [portal, setPortal] = useState('student')
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function choosePortal(value) {
    setPortal(value)
    setMode(value === 'student' ? 'login' : 'login')
    setMessage('')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        })

        if (error) throw error

        if (portal === 'student') {
          setMessage(
            data.session
              ? 'Student account created! Opening your dashboard...'
              : 'Account created. Confirm your email, then log in.'
          )
        } else {
          setMessage(
            'Account created, but teacher access is not yet approved. Contact the ExamFlow administrator to request the Examination In-Charge role.'
          )
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) throw error

        // App.jsx loads the database role and selects the correct dashboard.
        // The portal selected here never grants or changes a user's role.
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const portalNames = {
    student: 'Student',
    teacher: 'Teacher / Examination In-Charge',
    admin: 'Administrator',
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>ExamFlow</h1>
        <p className="auth-subtitle">
          Smart Examination Section Management System
        </p>

        <label>
          Choose your portal
          <select
            value={portal}
            onChange={(e) => choosePortal(e.target.value)}
          >
            <option value="student">Student Portal</option>
            <option value="teacher">Teacher Portal</option>
            <option value="admin">Admin Portal</option>
          </select>
        </label>

        <h2>{portalNames[portal]}</h2>

        {portal !== 'admin' && (
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => {
                setMode('login')
                setError('')
                setMessage('')
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => {
                setMode('signup')
                setError('')
                setMessage('')
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {mode === 'signup' && (
          <label>
            Full name
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            required
          />
        </label>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading
            ? 'Please wait...'
            : mode === 'signup'
              ? portal === 'teacher'
                ? 'Create Teacher Account'
                : 'Create Student Account'
              : `Login to ${portalNames[portal]}`}
        </button>

        {message && <p className="auth-success">{message}</p>}
        {error && <p className="auth-error">{error}</p>}

        <p className="auth-note">
          {portal === 'student' &&
            'Student accounts are created automatically.'}
          {portal === 'teacher' &&
            'Teacher registration does not grant staff privileges. The administrator must approve your role.'}
          {portal === 'admin' &&
            'Admin signup is disabled. Only an authorized administrator can grant Admin access.'}
        </p>
      </form>
    </main>
  )
}
