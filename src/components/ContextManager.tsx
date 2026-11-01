import { useState, type FormEvent } from 'react'
import styles from './ContextManager.module.css'

export interface ManagedContext {
  id: number | string
  name: string
  total: number
}

interface ContextManagerProps {
  contexts: ManagedContext[]
  elementLabel: string
  onClose: () => void
  onRename: (id: ManagedContext['id'], name: string) => Promise<void>
  onDelete: (context: ManagedContext) => Promise<void>
}

export default function ContextManager({ contexts, elementLabel, onClose, onRename, onDelete }: ContextManagerProps) {
  const [editingId, setEditingId] = useState<ManagedContext['id'] | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const saveName = async (event: FormEvent) => {
    event.preventDefault()
    if (editingId === null) return
    const name = nameDraft.trim()
    if (!name) { setError('Escribe un nombre para el contexto.'); return }
    setBusy(true)
    setError('')
    try {
      await onRename(editingId, name)
      setEditingId(null)
      setNameDraft('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally { setBusy(false) }
  }

  const removeContext = async (context: ManagedContext) => {
    const totalText = context.total ? ` También se eliminarán ${context.total} ${elementLabel}.` : ''
    if (!window.confirm(`¿Eliminar el contexto “${context.name}”?${totalText}`)) return
    setBusy(true)
    setError('')
    try { await onDelete(context) }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setBusy(false) }
  }

  return <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="context-manager-title">
      <header><div><span className={styles.eyebrow}>ORGANIZACIÓN</span><h2 id="context-manager-title">Administrar contextos</h2></div><button type="button" className={styles.close} onClick={onClose} disabled={busy} aria-label="Cerrar">×</button></header>
      <p className={styles.intro}>Cambia el nombre o elimina contextos y sus elementos guardados.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.list}>{contexts.map((context) => editingId === context.id
        ? <form className={styles.renameForm} key={context.id} onSubmit={(event) => void saveName(event)}>
            <input autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={80} aria-label="Nombre del contexto" />
            <button type="submit" disabled={busy || !nameDraft.trim()}>Guardar</button>
            <button type="button" onClick={() => { setEditingId(null); setError('') }} disabled={busy}>Cancelar</button>
          </form>
        : <div className={styles.row} key={context.id}>
            <span className={styles.name}>{context.name}</span>
            <span className={styles.count}>{context.total} {context.total === 1 ? elementLabel.replace(/s$/, '') : elementLabel}</span>
            <button type="button" className={styles.edit} disabled={busy} onClick={() => { setEditingId(context.id); setNameDraft(context.name); setError('') }}>Renombrar</button>
            <button type="button" className={styles.delete} disabled={busy} onClick={() => void removeContext(context)} aria-label={`Eliminar contexto ${context.name}`}>Eliminar</button>
          </div>)}
      {!contexts.length && <p className={styles.empty}>No hay contextos que administrar.</p>}
      </div>
      <footer><button type="button" className={styles.closeFooter} onClick={onClose} disabled={busy}>Cerrar</button></footer>
    </section>
  </div>
}
