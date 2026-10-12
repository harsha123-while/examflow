import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Student() {
  const [rows, setRows] = useState([])
  const [student, setStudent] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const uid = auth?.user?.id
        if (!uid) throw new Error('Not logged in')

        const { data: stu, error: e1 } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', uid)
          .single()
        if (e1) throw e1
        setStudent(stu)

        const { data, error: e2 } = await supabase
          .from('allocations')
          .select('*, exams!inner(*), exam_rooms(*)')
          .eq('student_id', stu.id)
          .eq('exams.status', 'published')
        if (e2) throw e2
        setRows(data || [])
      } catch (err) {
        setError(err.message || String(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h2>Student Dashboard</h2>
      {student && (
        <p>
          {student.name} ({student.roll_no})
        </p>
      )}

      {error && (
        <p style={{ color: 'red' }}>Error: {error}</p>
      )}

      {!error && rows.length === 0 && (
        <p>No published exams for you yet.</p>
      )}

      {rows.map((r) => (
        <div
          key={r.id}
          style={{
            border: '1px solid #888',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>
            {r.exams?.subject || r.exams?.name || r.exams?.title}
          </h3>
          <p>Date: {r.exams?.exam_date || r.exams?.date}</p>
          <p>Session: {r.exams?.session}</p>
          <p>
            Room: {r.exam_rooms?.room_no || r.exam_rooms?.name || r.room_id}
          </p>
          <p>Seat: {r.seat_no || r.seat_number}</p>
        </div>
      ))}

      <button onClick={() => supabase.auth.signOut()}>Log out</button>
    </div>
  )
}