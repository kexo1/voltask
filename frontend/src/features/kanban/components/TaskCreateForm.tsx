import { useState, type FormEvent } from 'react'
import './TaskCreateForm.css'

export type TeamMember = { id: string; displayName: string }
export type TaskCreateData = { title: string; description: string; assigneeId: string | null }
type Props = { members: TeamMember[]; disabled?: boolean; onSubmit: (data: TaskCreateData) => Promise<void>; onCancel?: () => void }

export default function TaskCreateForm({ members, disabled = false, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [assigneeId, setAssigneeId] = useState(''); const [error, setError] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false)
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!title.trim()) return
    setError(''); setIsSubmitting(true)
    try { await onSubmit({ title: title.trim(), description: description.trim(), assigneeId: assigneeId || null }); setTitle(''); setDescription(''); setAssigneeId('') }
    catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'Úlohu sa nepodarilo vytvoriť.') }
    finally { setIsSubmitting(false) }
  }
  return <section className="task-create-form" aria-labelledby="task-create-form-title"><div className="task-create-form__header"><h2 id="task-create-form-title">Nová úloha</h2>{onCancel && <button type="button" className="task-create-form__close" onClick={onCancel} aria-label="Zavrieť">×</button>}</div><form onSubmit={handleSubmit}><label htmlFor="task-title">Názov úlohy</label><input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Zadajte názov úlohy" required disabled={disabled || isSubmitting} /><label htmlFor="task-description">Popis</label><textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Voliteľný popis úlohy" rows={4} disabled={disabled || isSubmitting} /><label htmlFor="task-assignee">Riešiteľ</label><select id="task-assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} disabled={disabled || isSubmitting}><option value="">Bez riešiteľa</option>{members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select>{error && <p className="task-create-form__error" role="alert">{error}</p>}<button type="submit" disabled={disabled || isSubmitting}>{isSubmitting ? 'Ukladám…' : 'Vytvoriť úlohu'}</button></form></section>
}
