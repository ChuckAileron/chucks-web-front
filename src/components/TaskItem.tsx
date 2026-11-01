import styles from './TaskItem.module.css'

export interface Task {
  id: string
  title: string
  project: string
  due: string
  completed: boolean
}

interface TaskItemProps {
  task: Task
  onToggle: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  showActions?: boolean
  homePreview?: boolean
}

export function TaskItem({ task, onToggle, onEdit, onDelete, showActions = true, homePreview = false }: TaskItemProps) {
  return (
    <div className={`${styles.task} ${homePreview ? styles.homePreview : ''}`}>
      <input
        type="checkbox"
        id={`task-${task.id}`}
        checked={task.completed}
        onChange={() => onToggle(task.id)}
      />
      <label htmlFor={`task-${task.id}`} className={task.completed ? styles.completed : ''}>
        {task.title}
      </label>
      <span className={styles.tag}>{task.project}</span>
      <time>{task.due}</time>
      {showActions && <div className={styles.actions}>
        <button
          type="button"
          className={styles.editBtn}
          aria-label={`Editar tarea ${task.title}`}
          onClick={() => onEdit(task)}
        >
          <svg width="16" height="16" aria-hidden="true">
            <use href="#icon-pencil" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.deleteBtn}
          aria-label={`Eliminar tarea ${task.title}`}
          onClick={() => onDelete(task.id)}
        >
          <svg width="16" height="16" aria-hidden="true">
            <use href="#icon-trash" />
          </svg>
        </button>
      </div>}
    </div>
  )
}
