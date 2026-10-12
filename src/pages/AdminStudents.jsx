import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const empty = { roll_no: "", name: "", department: "", section: "" };

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  async function load() {
    const { data, error: err } = await supabase
      .from("students").select("*").order("roll_no");
    if (err) setError(err.message);
    else setStudents(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setError("");
    const roll = form.roll_no.trim().toUpperCase();
    if (!roll || !form.name.trim() || !form.department.trim() || !form.section.trim()) {
      return setError("Roll number, name, department and section are required");
    }
    const { data: dup } = await supabase
      .from("students").select("id").eq("roll_no", roll);
    if (dup && dup.length > 0) return setError("Roll number already exists");

    const { error: err } = await supabase.from("students").insert([{
      roll_no: roll,
      name: form.name.trim(),
      department: form.department.trim(),
      section: form.section.trim(),
    }]);
    if (err) return setError(err.message);
    setForm(empty);
    load();
  }

  return (
    <div>
      <h2>Students</h2>
      <form onSubmit={add}>
        {Object.keys(empty).map((k) => (
          <input key={k} placeholder={k} value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        ))}
        <button type="submit">Add student</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <table>
        <thead>
          <tr><th>Roll</th><th>Name</th><th>Dept</th><th>Section</th></tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.roll_no}</td><td>{s.name}</td>
              <td>{s.department}</td><td>{s.section}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}