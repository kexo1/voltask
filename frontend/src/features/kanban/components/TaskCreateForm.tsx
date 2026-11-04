import { useState, type FormEvent } from 'react'
import './TaskCreateForm.css'

export type TeamMember = {
  id: string
  displayName: string
}

export type TaskCreateData = {
  title: string
  description: string
  assigneeId: string | null
}

type Props = {
  members: TeamMember[]
  onSubmit: (data: TaskCreateData) => void
}

export default function TaskCreateForm({ members, onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      assigneeId: assigneeId || null,
    })
    setTitle('')
    setDescription('')
    setAssigneeId('')
  }

  return (
    <section className="task-create-form" aria-labelledby="task-create-form-title">
      <h2 id="task-create-form-title">Vytvoriť úlohu</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="task-title">Názov úlohy</label>
        <input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Zadajte názov úlohy" required />

        <label htmlFor="task-description">Popis</label>
        <textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Voliteľný popis úlohy" rows={3} />

        <label htmlFor="task-assignee">Riešiteľ</label>
        <select id="task-assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
          <option value="">Bez riešiteľa</option>
          {members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
        </select>

        <button type="submit">Vytvoriť úlohu</button>
      </form>
    </section>
  )
}
