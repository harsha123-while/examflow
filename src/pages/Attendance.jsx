
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Attendance() {
  const [examRooms, setExamRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState('')
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadExamRooms()
  }, [])

  async function loadExamRooms() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('exam_rooms')
      .select(`
        id,
        exams (id, title, course_code, exam_date, session),
        rooms (id, room_number, capacity)
      `)

    if (error) {
      setError(error.message)
      setExamRooms([])
    } else {
      setExamRooms(data || [])
    }

    setLoading(false)
  }

  async function loadStudents(roomAssignmentId) {
    setSelectedRoom(roomAssignmentId)
    setStudents([])
    setMarks({})
    setSubmitted(false)
    setMessage('')
    setError('')

    if (!roomAssignmentId) return

    setLoading(true)

    const assignment = examRooms.find(
      item => item.id === roomAssignmentId
    )

    if (!assignment) {
      setLoading(false)
      return
    }

    const { data: allocationData, error: allocationError } = await supabase
      .from('allocations')
      .select(`
        id,
        seat_number,
        students (id, roll_no, full_name, department)
      `)
      .eq('exam_id', assignment.exams.id)
      .eq('room_id', assignment.rooms.id)
      .order('seat_number')

    if (allocationError) {
      setError(allocationError.message)
      setLoading(false)
      return
    }

    const allocationRows = allocationData || []

    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('allocation_id, status')
      .in('allocation_id', allocationRows.map(row => row.id))

    if (attendanceError && allocationRows.length > 0) {
      setError(attendanceError.message)
      setLoading(false)
      return
    }

    const initialMarks = {}
    for (const row of allocationRows) {
      const saved = (attendanceData || []).find(
        item => item.allocation_id === row.id
      )
      initialMarks[row.id] = saved?.status || ''
    }

    const { data: submission, error: submissionError } = await supabase
      .from('attendance_submissions')
      .select('status')
      .eq('exam_room_id', roomAssignmentId)
      .maybeSingle()

    if (submissionError) {
      setError(submissionError.message)
      setLoading(false)
      return
    }

    setStudents(allocationRows)
    setMarks(initialMarks)
    setSubmitted(submission?.status === 'submitted')
    setLoading(false)
  }

  function markStudent(allocationId, status) {
    setMarks(previous => ({
      ...previous,
      [allocationId]: status,
    }))
  }

  async function submitAttendance() {
    setMessage('')
    setError('')

    if (!selectedRoom) {
      setError('Select an exam room first.')
      return
    }

    if (students.length === 0) {
      setError('There are no allocated students in this room.')
      return
    }

    const unmarked = students.filter(row => !marks[row.id])
    if (unmarked.length > 0) {
      setError(`Mark all students first. ${unmarked.length} remain unmarked.`)
      return
    }

    const assignment = examRooms.find(
      item => item.id === selectedRoom
    )

    if (!assignment) {
      setError('The selected exam-room assignment was not found.')
      return
    }

    setSaving(true)

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError) throw authError
      if (!authData.user) throw new Error('Please log in again.')

      // Save each student's mark. Existing records are updated.
      const attendanceRows = students.map(row => ({
        allocation_id: row.id,
        status: marks[row.id],
        marked_by: authData.user.id,
        marked_at: new Date().toISOString(),
      }))

      const { error: markError } = await supabase
        .from('attendance')
        .upsert(attendanceRows, { onConflict: 'allocation_id' })

      if (markError) throw markError

      // Mark the room's attendance as submitted.
      const { error: submissionError } = await supabase
        .from('attendance_submissions')
        .upsert({
          exam_room_id: selectedRoom,
          submitted_by: authData.user.id,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        }, { onConflict: 'exam_room_id' })

      if (submissionError) throw submissionError

      setSubmitted(true)
      setMessage('Attendance submitted successfully!')
    } catch (err) {
      setError(err.message || 'Unable to submit attendance.')
    } finally {
      setSaving(false)
    }
  }

  const presentCount = students.filter(
    row => marks[row.id] === 'present'
  ).length

  const absentCount = students.filter(
    row => marks[row.id] === 'absent'
  ).length

  const unmarkedCount = students.length - presentCount - absentCount

  return (
    <main style={{ maxWidth: 1000, margin: '30px auto', padding: 20 }}>
      <h1>Examination Attendance</h1>
      <p>Mark every allocated student before submitting attendance.</p>

      <label>
        Exam and room
        <select
          value={selectedRoom}
          onChange={e => loadStudents(e.target.value)}
        >
          <option value="">Select exam and room</option>
          {examRooms.map(item => (
            <option key={item.id} value={item.id}>
              {item.exams?.title || 'Exam'} — Room {item.rooms?.room_number}
            </option>
          ))}
        </select>
      </label>

      {loading && <p>Loading attendance data...</p>}

      {selectedRoom && !loading && (
        <>
          <div style={{
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            margin: '20px 0',
          }}>
            <span>Present: <strong>{presentCount}</strong></span>
            <span>Absent: <strong>{absentCount}</strong></span>
            <span>Unmarked: <strong>{unmarkedCount}</strong></span>
          </div>

          {students.length === 0 && (
            <p>No students have been allocated to this room.</p>
          )}

          {students.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
              }}>
                <thead>
                  <tr>
                    <th style={{ padding: 10 }}>Seat</th>
                    <th style={{ padding: 10 }}>Roll number</th>
                    <th style={{ padding: 10 }}>Student name</th>
                    <th style={{ padding: 10 }}>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(row => (
                    <tr key={row.id}>
                      <td style={{ padding: 10 }}>{row.seat_number}</td>
                      <td style={{ padding: 10 }}>
                        {row.students?.roll_no}
                      </td>
                      <td style={{ padding: 10 }}>
                        {row.students?.full_name}
                      </td>
                      <td style={{ padding: 10 }}>
                        <select
                          value={marks[row.id] || ''}
                          disabled={submitted}
                          onChange={e =>
                            markStudent(row.id, e.target.value)
                          }
                        >
                          <option value="">Unmarked</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={submitAttendance}
            disabled={
              saving ||
              submitted ||
              students.length === 0 ||
              unmarkedCount > 0
            }
            style={{ marginTop: 20, padding: '12px 20px' }}
          >
            {saving
              ? 'Submitting...'
              : submitted
                ? 'Attendance Submitted'
                : 'Submit Attendance'}
          </button>

          {submitted && (
            <p>Attendance for this room has already been submitted.</p>
          )}
        </>
      )}

      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <button onClick={loadExamRooms} style={{ marginTop: 12 }}>
        Refresh exam rooms
      </button>
    </main>
  )
}
