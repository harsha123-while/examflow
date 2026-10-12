import './Admin.css'

const stats = [
  { label: 'Total Exams', value: 12 },
  { label: 'Students', value: 340 },
  { label: 'Teachers', value: 18 },
  { label: 'Upcoming', value: 4 },
]

const exams = [
  { id: 1, name: 'Maths Midterm', date: '20 Oct', status: 'Scheduled' },
  { id: 2, name: 'Physics Quiz', date: '22 Oct', status: 'Scheduled' },
  { id: 3, name: 'English Final', date: '10 Oct', status: 'Completed' },
]

export default function Admin() {
  return (
    <div className="admin">
      <h1>Admin Dashboard</h1>

      <div className="cards">
        {stats.map((s) => (
          <div className="card" key={s.label}>
            <p className="card-value">{s.value}</p>
            <p className="card-label">{s.label}</p>
          </div>
        ))}
      </div>

      <h2>Exams</h2>
      <table>
        <thead>
          <tr>
            <th>Exam</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {exams.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td>{e.date}</td>
              <td>{e.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}