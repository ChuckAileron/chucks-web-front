import { useEffect, useRef, useState } from 'react'
import styles from './TaskModal.module.css'
import type { Task } from './TaskItem'

export interface TaskInput {
  title: string
  project: string
  due: string
}

interface TaskModalProps {
  open: boolean
  task?: Task | null
  defaultContext?: string
  onClose: () => void
  onCreate: (data: TaskInput) => void
  onSave: (id: string, data: TaskInput) => void
}

export function TaskModal({ open, task, defaultContext = '', onClose, onCreate, onSave }: TaskModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [due, setDue] = useState('')

  const editing = task != null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      setTimeout(() => inputRef.current?.focus(), 0)
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '')
      setContext(task?.project ?? defaultContext)
      setDue(task?.due ?? '')
    }
  }, [open, task, defaultContext])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const data: TaskInput = {
      title: title.trim(),
      project: context.trim() || 'General',
      due: due.trim() || 'Hoy',
    }

    if (editing) {
      onSave(task.id, data)
    } else {
      onCreate(data)
    }
    onClose()
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>{editing ? 'Editar tarea' : 'Nueva tarea'}</h2>
        <p>{editing ? 'Ajusta los detalles de la tarea.' : 'Añade un paso concreto para avanzar.'}</p>

        <label htmlFor="task-title">Tarea</label>
        <input
          ref={inputRef}
          id="task-title"
          maxLength={80}
          required
          placeholder="¿Qué necesitas hacer?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="task-context">Contexto</label>
            <input
              id="task-context"
              maxLength={40}
              placeholder="Ej. Personal, trabajo, salud…"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="task-due">Fecha</label>
            <input
              id="task-due"
              maxLength={30}
              placeholder="Hoy"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={styles.primary}>
            {editing ? 'Guardar cambios' : 'Agregar tarea'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
