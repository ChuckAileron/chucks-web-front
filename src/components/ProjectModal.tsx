import { useEffect, useRef, useState } from 'react'
import styles from './ProjectModal.module.css'
import type { Project } from './ProjectCard'

interface ProjectModalProps {
  open: boolean
  mode: 'new' | 'view'
  project?: Project | null
  onClose: () => void
  onCreate: (name: string) => void
}

export function ProjectModal({ open, mode, project, onClose, onCreate }: ProjectModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      if (mode === 'new') {
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, mode])

  useEffect(() => {
    if (mode === 'new') {
      setName('')
    }
  }, [mode, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'new' && name.trim()) {
      onCreate(name.trim())
      onClose()
    }
  }

  const handleClose = () => {
    onClose()
  }

  const title = mode === 'new' ? 'Nuevo proyecto' : project?.name || 'Proyecto'
  const description = mode === 'new'
    ? 'Toda gran idea necesita un primer paso.'
    : `${project?.description || ''} Proyecto de ejemplo en tu espacio creativo.`

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>{title}</h2>
        <p>{description}</p>
        {mode === 'new' && (
          <>
            <label htmlFor="project-name">Nombre del proyecto</label>
            <input
              ref={inputRef}
              id="project-name"
              maxLength={45}
              required
              placeholder="¿Qué te gustaría crear?"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </>
        )}
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondary} onClick={handleClose}>
            {mode === 'new' ? 'Cancelar' : 'Cerrar'}
          </button>
          {mode === 'new' && (
            <button type="submit" className={styles.primary}>
              Crear proyecto
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}
