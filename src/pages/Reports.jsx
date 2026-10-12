
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Reports() {
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadExams()
  }, [])

  async function loadExams() {
    setError('')

    const { data, error } = await supabase
      .from('exams')
      .select('id, title, course_code, exam_date, department')
      .order('exam_date', { ascending: true })

    if (error) {
      setError(error.message)
      return
    }

    setExams(data || [])
  }

  async function generateReport() {
    setError('')
    setMessage('')
    setRows([])

    if (!selectedExam) {
      setError('Please select an exam.')
      return
    }

    setLoading(true)

    try {
      const { data: allocations, error: allocationError } = await supabase
        .from('allocations')
        .select(`
          id,
          seat_number,
          rooms (room_number),
          students (roll_no, full_name, department, section)
        `)
        .eq('exam_id', selectedExam)
        .order('seat_number')

      if (allocationError) throw allocationError

      const allocationRows = allocations || []

      if (allocationRows.length === 0) {
        setMessage('No student allocations found for this exam.')
        return
      }

      const allocationIds = allocationRows.map(row => row.id)

      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('allocation_id, status')
        .in('allocation_id', allocationIds)

      if (attendanceError) throw attendanceError

      const attendanceMap = Object.fromEntries(
        (attendance || []).map(item => [
          item.allocation_id,
          item.status,
        ])
      )

      const reportRows = allocationRows.map(row => ({
        allocationId: row.id,
        seat: row.seat_number,
        room: row.rooms?.room_number || 'Unknown',
        roll: row.students?.roll_no || 'Unknown',
        name: row.students?.full_name || 'Unknown',
        department: row.students?.department || 'Unknown',
        section: row.students?.section || '—',
        status: attendanceMap[row.id] || 'unmarked',
      }))

      setRows(reportRows)
      setMessage('Report generated successfully.')
    } catch (err) {
      setError(err.message || 'Could not generate the report.')
    } finally {
      setLoading(false)
    }
  }

  const absentRows = rows.filter(row => row.status === 'absent')
  const presentCount = rows.filter(row => row.status === 'present').length
  const unmarkedCount = rows.filter(row => row.status === 'unmarked').length

  const roomGroups = Object.values(
    rows.reduce((groups, row) => {
      if (!groups[row.room]) {
        groups[row.room] = {
          room: row.room,
          students: [],
        }
      }

      groups[row.room].students.push(row)
      return groups
    }, {})
  )

  const departmentGroups = Object.values(
    rows.reduce((groups, row) => {
      const department = row.department

      if (!groups[department]) {
        groups[department] = {
          department,
          total: 0,
          present: 0,
          absent: 0,
          unmarked: 0,
        }
      }

      groups[department].total += 1
      groups[department][row.status] += 1

      return groups
    }, {})
  )

  return (
    <main style={{ maxWidth: 1100, margin: '30px auto', padding: 20 }}>
      <h1>Examination Reports</h1>
      <p>View attendance, absentees and department statistics.</p>

      <label>
        Select exam
        <select
          value={selectedExam}
          onChange={e => setSelectedExam(e.target.value)}
        >
          <option value="">Choose an exam</option>
          {exams.map(exam => (
            <option key={exam.id} value={exam.id}>
              {exam.title} {exam.course_code ? `(${exam.course_code})` : ''}
            </option>
          ))}
        </select>
      </label>

      <br /><br />

      <button onClick={generateReport} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Report'}
      </button>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {message && <p>{message}</p>}

      {rows.length > 0 && (
        <>
          <h2>Summary</h2>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            margin: '16px 0',
          }}>
            <span>Allocated: <strong>{rows.length}</strong></span>
            <span>Present: <strong>{presentCount}</strong></span>
            <span>Absent: <strong>{absentRows.length}</strong></span>
            <span>Unmarked: <strong>{unmarkedCount}</strong></span>
          </div>

          <h2>Room-wise Absentee Statement</h2>

          {roomGroups.map(group => (
            <section key={group.room} style={{ marginBottom: 24 }}>
              <h3>Room {group.room}</h3>

              {group.students.some(row => row.status === 'absent') ? (
                <ul>
                  {group.students
                    .filter(row => row.status === 'absent')
                    .map(row => (
                      <li key={row.allocationId}>
                        Seat {row.seat}: {row.roll} — {row.name}
                      </li>
                    ))}
                </ul>
              ) : (
                <p>No recorded absentees for this room.</p>
              )}
            </section>
          ))}

          <h2>Department Statistics</h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
            }}>
              <thead>
                <tr>
                  <th style={{ padding: 10 }}>Department</th>
                  <th style={{ padding: 10 }}>Total</th>
                  <th style={{ padding: 10 }}>Present</th>
                  <th style={{ padding: 10 }}>Absent</th>
                  <th style={{ padding: 10 }}>Unmarked</th>
                </tr>
              </thead>
              <tbody>
                {departmentGroups.map(group => (
                  <tr key={group.department}>
                    <td style={{ padding: 10 }}>{group.department}</td>
                    <td style={{ padding: 10 }}>{group.total}</td>
                    <td style={{ padding: 10 }}>{group.present}</td>
                    <td style={{ padding: 10 }}>{group.absent}</td>
                    <td style={{ padding: 10 }}>{group.unmarked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Exam-wise Absentee List</h2>
          {absentRows.length > 0 ? (
            <ul>
              {absentRows.map(row => (
                <li key={row.allocationId}>
                  {row.roll} — {row.name}, Room {row.room}
                </li>
              ))}
            </ul>
          ) : (
            <p>No recorded absentees for this exam.</p>
          )}

          <button
            onClick={() => window.print()}
            style={{ marginTop: 20 }}
          >
            Print Report
          </button>
        </>
      )}
    </main>
  )
}
