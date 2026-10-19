import { useState } from 'react'
import styles from './TasksList.module.css'
import { TaskItem } from './TaskItem'
import type { Task } from './TaskItem'
import SectionHeading from './SectionHeading'

interface TasksListProps {
  tasks: Task[]
  contexts: string[]
  activeContext: string
  showContextTabs: boolean
  onSelectContext: (context: string) => void
  onAddContext: () => void
  onRenameContext: (context: string, nextName: string) => boolean
  onDeleteContext: (context: string) => boolean
  onToggleTask: (id: string) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onAddTask: () => void
}

export function TasksList({
  tasks,
  contexts,
  activeContext,
  showContextTabs,
  onSelectContext,
  onAddContext,
  onRenameContext,
  onDeleteContext,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onAddTask,
}: TasksListProps) {
  const [manageOpen, setManageOpen] = useState(false)
  const [editingContext, setEditingContext] = useState<string | null>(null)
  const [contextDraft, setContextDraft] = useState('')
  const [contextError, setContextError] = useState('')
  const contextFilterActive = showContextTabs && activeContext !== '*'
  const visibleTasks = contextFilterActive
    ? tasks.filter((task) => task.project === activeContext)
    : tasks
  const pendingCount = visibleTasks.filter((task) => !task.completed).length

  return (
    <section className={styles.bottom} id="tareas">
      {showContextTabs && <SectionHeading eyebrow="ORGANIZA TU TRABAJO" title="Mis tareas" description="Tareas, fechas y contextos en un solo lugar." />}
      {showContextTabs && <nav className={`${styles.contextTabs} app-tabs`} aria-label="Filtrar tareas por contexto">
        <button type="button" className={activeContext === '*' ? 'active' : ''} onClick={() => onSelectContext('*')}>Todas <b>{tasks.length}</b></button>
        {contexts.map((context) => <button type="button" key={context} className={activeContext === context ? 'active' : ''} onClick={() => onSelectContext(context)}>{context}<b>{tasks.filter((task) => task.project === context).length}</b></button>)}
        <button type="button" className={styles.addContext} onClick={onAddContext} aria-label="Crear contexto">＋ <span>Nuevo contexto</span></button>
        <button type="button" className={styles.manageContexts} onClick={() => { setContextError(''); setManageOpen(true) }}>⚙ <span>Administrar</span></button>
      </nav>}
      <div className={styles.sectionHead}>
        <div className={styles.headInfo}>
          <h2>{showContextTabs && activeContext !== '*' ? activeContext : showContextTabs ? 'Todas las tareas' : 'Tareas pendientes'}</h2>
          <span className={styles.pendingCount}>
            {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button type="button" className={styles.addButton} onClick={onAddTask}>
          <svg width="16" height="16" aria-hidden="true">
            <use href="#icon-plus" />
          </svg>
          Agregar tarea
        </button>
      </div>
      <div className={styles.taskList}>
        {visibleTasks.length === 0 && <p className={styles.empty}>{contextFilterActive ? `Aún no hay tareas en “${activeContext}”.` : 'No hay tareas. ¡Agrega la primera!'}</p>}
        {visibleTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggleTask}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
      {manageOpen && <div className={styles.contextManagerOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setManageOpen(false) }}><section className={styles.contextManager} role="dialog" aria-modal="true" aria-labelledby="context-manager-title"><header><div><span className={styles.managerEyebrow}>ORGANIZACIÓN</span><h2 id="context-manager-title">Administrar contextos</h2></div><button type="button" className={styles.closeManager} onClick={() => setManageOpen(false)} aria-label="Cerrar">×</button></header><p className={styles.managerIntro}>Renombra pestañas o elimina contextos. Las tareas de un contexto eliminado se conservan y se mueven a otro.</p>{contextError && <p className={styles.contextError} role="alert">{contextError}</p>}<div className={styles.contextManagerList}>{contexts.map((context) => {
        const count = tasks.filter((task) => task.project === context).length
        const isEditing = editingContext === context
        return <div className={styles.contextManagerRow} key={context}>{isEditing ? <form className={styles.renameContextForm} onSubmit={(event) => { event.preventDefault(); const nextName = contextDraft.trim(); if (!nextName) { setContextError('Escribe un nombre para el contexto.'); return } if (!onRenameContext(context, nextName)) { setContextError('Ya existe un contexto con ese nombre.'); return } setEditingContext(null); setContextError('') }}><input autoFocus maxLength={40} value={contextDraft} onChange={(event) => setContextDraft(event.target.value)} aria-label={`Nuevo nombre para ${context}`} /><button type="submit">Guardar</button><button type="button" onClick={() => { setEditingContext(null); setContextError('') }}>Cancelar</button></form> : <><span className={styles.contextName}>{context}</span><span className={styles.contextTaskCount}>{count} {count === 1 ? 'tarea' : 'tareas'}</span><button type="button" className={styles.manageAction} onClick={() => { setEditingContext(context); setContextDraft(context); setContextError('') }}>Editar</button><button type="button" className={styles.manageDelete} onClick={() => { if (onDeleteContext(context)) setContextError('') }}>Eliminar</button></>}</div>
      })}{contexts.length === 0 && <p className={styles.managerEmpty}>No hay contextos que administrar.</p>}</div><footer><button type="button" className={styles.secondaryManageButton} onClick={() => setManageOpen(false)}>Cerrar</button></footer></section></div>}
    </section>
  )
}
