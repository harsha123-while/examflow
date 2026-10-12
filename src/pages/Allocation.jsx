
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Allocation() {
  const [exams, setExams] = useState([])
  const [rooms, setRooms] = useState([])
  const [students, setStudents] = useState([])
  const [examId, setExamId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [seatNumber, setSeatNumber] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    setError('')

    const [examResult, roomResult, studentResult] = await Promise.all([
      supabase.from('exams').select('id,title,course_code,status'),
      supabase.from('rooms').select('id,room_number,capacity,is_available'),
      supabase.from('students').select('id,roll_no,full_name,department'),
    ])

    const problem = examResult.error || roomResult.error || studentResult.error

    if (problem) {
      setError(problem.message)
    } else {
      setExams(examResult.data || [])
      setRooms((roomResult.data || []).filter(room => room.is_available))
      setStudents(studentResult.data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function allocateStudent(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!examId || !roomId || !studentId || !seatNumber) {
      setError('Please complete all fields.')
      return
    }

    const seat = Number(seatNumber)
    const room = rooms.find(item => item.id === roomId)

    if (!room) {
      setError('Select an available room.')
      return
    }

    if (!Number.isInteger(seat) || seat < 1 || seat > room.capacity) {
      setError(`Seat number must be between 1 and ${room.capacity}.`)
      return
    }

    const { data: existingStudent, error: studentCheckError } = await supabase
      .from('allocations')
      .select('id')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (studentCheckError) {
      setError(studentCheckError.message)
      return
    }

    if (existingStudent) {
      setError('This student is already allocated for this exam.')
      return
    }

    const { data: existingSeat, error: seatCheckError } = await supabase
      .from('allocations')
      .select('id')
      .eq('exam_id', examId)
      .eq('room_id', roomId)
      .eq('seat_number', seat)
      .maybeSingle()

    if (seatCheckError) {
      setError(seatCheckError.message)
      return
    }

    if (existingSeat) {
      setError('That seat is already occupied for this exam.')
      return
    }

    const { count, error: countError } = await supabase
      .from('allocations')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', examId)
      .eq('room_id', roomId)

    if (countError) {
      setError(countError.message)
      return
    }

    if ((count || 0) >= room.capacity) {
      setError('This room has reached its capacity.')
      return
    }

    const { error: insertError } = await supabase
      .from('allocations')
      .insert({
        exam_id: examId,
        room_id: roomId,
        student_id: studentId,
        seat_number: seat,
      })

    if (insertError) {
      setError(insertError.message)
      return
    }

    setMessage('Student allocated successfully!')
    setStudentId('')
    setSeatNumber('')
    await loadData()
  }

  return (
    <main style={{ maxWidth: 900, margin: '30px auto', padding: 20 }}>
      <h1>Student Allocation</h1>
      <p>Assign students to exam rooms and seats.</p>

      {loading ? (
        <p>Loading exams, rooms and students...</p>
      ) : (
        <form onSubmit={allocateStudent}>
          <label>
            Exam
            <select value={examId} onChange={e => setExamId(e.target.value)} required>
              <option value="">Select exam</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} {exam.course_code ? `(${exam.course_code})` : ''}
                </option>
              ))}
            </select>
          </label>

          <br /><br />

          <label>
            Room
            <select value={roomId} onChange={e => setRoomId(e.target.value)} required>
              <option value="">Select room</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.room_number} — capacity {room.capacity}
                </option>
              ))}
            </select>
          </label>

          <br /><br />

          <label>
            Student
            <select value={studentId} onChange={e => setStudentId(e.target.value)} required>
              <option value="">Select student</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.roll_no} — {student.full_name}
                </option>
              ))}
            </select>
          </label>

          <br /><br />

          <label>
            Seat number
            <input
              type="number"
              min="1"
              value={seatNumber}
              onChange={e => setSeatNumber(e.target.value)}
              required
            />
          </label>

          <br /><br />
          <button type="submit">Allocate Student</button>
        </form>
      )}

      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <button onClick={loadData} style={{ marginTop: 15 }}>
        Refresh Data
      </button>
    </main>
  )
}
