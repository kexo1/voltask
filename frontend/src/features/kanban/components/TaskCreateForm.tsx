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
  disabled?: boolean
  onSubmit: (data: TaskCreateData) => Promise<void>
}

export default function TaskCreateForm({ members, disabled = false, onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit({
        title: trimmedTitle,
        description: description.trim(),
        assigneeId: assigneeId || null,
      })
      setTitle('')
      setDescription('')
      setAssigneeId('')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Ulohu sa nepodarilo vytvorit.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="task-create-form" aria-labelledby="task-create-form-title">
      <h2 id="task-create-form-title">Vytvoriť úlohu</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="task-title">Názov úlohy</label>
        <input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Zadajte názov úlohy" required disabled={disabled || isSubmitting} />

        <label htmlFor="task-description">Popis</label>
        <textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Voliteľný popis úlohy" rows={3} disabled={disabled || isSubmitting} />

        <label htmlFor="task-assignee">Riešiteľ</label>
        <select id="task-assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} disabled={disabled || isSubmitting}>
          <option value="">Bez riešiteľa</option>
          {members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
        </select>

        {error && <p className="task-create-form__error" role="alert">{error}</p>}
        <button type="submit" disabled={disabled || isSubmitting}>
          {isSubmitting ? 'Ukladám…' : 'Vytvoriť úlohu'}
        </button>
      </form>
    </section>
  )
}
