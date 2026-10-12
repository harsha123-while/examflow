import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const empty = { name: '', block: '', capacity: '' }

export default function AdminRooms() {
  const [rooms, setRooms] = useState([])
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('rooms').select('*').order('name')
    if (error) setMsg(error.message)
    else setRooms(data)
  }

  useEffect(() => { load() }, [])

  async function save(e) {
    e.preventDefault()
    setMsg('')
    const cap = Number(form.capacity)
    if (!form.name.trim() || !form.block.trim()) return setMsg('Room name and block are required.')
    if (!Number.isInteger(cap) || cap <= 0) return setMsg('Capacity must be a whole number above 0.')

    const row = { name: form.name.trim(), block: form.block.trim(), capacity: cap }
    const { error } = editId
      ? await supabase.from('rooms').update(row).eq('id', editId)
      : await supabase.from('rooms').insert(row)

    if (error) {
      return setMsg(error.code === '23505' ? 'A room with this name already exists.' : error.message)
    }
    setForm(empty); setEditId(null); setMsg(editId ? 'Room updated.' : 'Room added.')
    load()
  }

  function startEdit(r) {
    setEditId(r.id)
    setForm({ name: r.name, block: r.block, capacity: String(r.capacity) })
    setMsg('')
  }

  async function toggleActive(r) {
    await supabase.from('rooms').update({ active: !r.active }).eq('id', r.id)
    load()
  }

  async function remove(r) {
    if (!window.confirm('Delete room ' + r.name + '?')) return
    const { error } = await supabase.from('rooms').delete().eq('id', r.id)
    if (error) setMsg('Cannot delete: this room is already used in allocations.')
    else load()
  }

  const shown = rooms.filter(r =>
    (r.name + ' ' + r.block).toLowerCase().includes(search.toLowerCase()))
  const total = shown.reduce((s, r) => s + r.capacity, 0)

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h2>Rooms</h2>

      <form onSubmit={save} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input placeholder="Room name" value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Block" value={form.block}
          onChange={e => setForm({ ...form, block: e.target.value })} />
        <input placeholder="Capacity" type="number" value={form.capacity}
          onChange={e => setForm({ ...form, capacity: e.target.value })} />
        <button>{editId ? 'Update room' : 'Add room'}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setForm(empty) }}>Cancel</button>}
      </form>

      {msg && <p style={{ color: msg.includes('added') || msg.includes('updated') ? 'green' : 'crimson' }}>{msg}</p>}

      <input style={{ margin: '12px 0', width: '100%' }} placeholder="Search by room or block"
        value={search} onChange={e => setSearch(e.target.value)} />

      <p>Rooms: {shown.length} | Total seating capacity: {total}</p>

      <table width="100%" cellPadding="6" style={{ textAlign: 'left' }}>
        <thead><tr><th>Room</th><th>Block</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {shown.map(r => (
            <tr key={r.id}>
              <td>{r.name}</td><td>{r.block}</td><td>{r.capacity}</td>
              <td>{r.active ? 'Available' : 'Deactivated'}</td>
              <td>
                <button onClick={() => startEdit(r)}>Edit</button>{' '}
                <button onClick={() => toggleActive(r)}>{r.active ? 'Deactivate' : 'Activate'}</button>{' '}
                <button onClick={() => remove(r)}>Delete</button>
              </td>
            </tr>
          ))}
          {shown.length === 0 && <tr><td colSpan="5">No rooms found.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}