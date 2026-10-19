import { useEffect, useState } from 'react'
import styles from './App.module.css'
import { Sidebar } from './components/Sidebar'
import type { NavKey } from './components/Sidebar'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { TasksList } from './components/TasksList'
import { ProjectModal } from './components/ProjectModal'
import { TaskModal } from './components/TaskModal'
import type { TaskInput } from './components/TaskModal'
import CollectionTool from './components/collection/CollectionTool'
import WikiTool from './components/WikiTool'
import ShoppingWishlistTool from './components/ShoppingWishlistTool'
import HijitosTool from './components/HijitosTool'
import CuentasTool from './components/CuentasTool'
import CalendarioTool from './components/CalendarioTool'
import ControlPesoTool from './components/ControlPesoTool'
import { IconSprite } from './components/IconSprite'
import type { Project } from './components/ProjectCard'
import type { Task } from './components/TaskItem'
import './styles/index.css'

const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Definir la dirección visual del sitio',
    project: 'Identidad digital',
    due: 'Hoy',
    completed: false,
  },
  {
    id: '2',
    title: 'Bocetar la primera pantalla',
    project: 'Mi próxima app',
    due: 'Mañana',
    completed: false,
  },
]
const initialContexts = [...new Set(initialTasks.map((task) => task.project))]

const notificationProject: Project = {
  id: 'notif',
  name: 'Todo al día',
  description: 'No tienes notificaciones nuevas en esta demostración.',
  status: 'idea',
  category: '',
  icon: 'folder',
  iconColor: 'gray',
}

function App() {
  const [activeNav, setActiveNav] = useState<NavKey>('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [contexts, setContexts] = useState<string[]>(initialContexts)
  const [activeContext, setActiveContext] = useState('*')
  const [notifOpen, setNotifOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const pendingCount = tasks.filter((t) => !t.completed).length

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [activeNav])

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task))
    )
  }

  const handleCreateTask = (data: TaskInput) => {
    const context = resolveContext(data.project)
    ensureContext(context)
    setTasks((prev) => [
      ...prev,
      { id: Date.now().toString(), ...data, project: context, completed: false },
    ])
  }

  const handleUpdateTask = (id: string, data: TaskInput) => {
    const context = resolveContext(data.project)
    ensureContext(context)
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...data, project: context } : task))
    )
  }

  const resolveContext = (value: string) => {
    const requested = value.trim() || 'General'
    return contexts.find((context) => context.toLocaleLowerCase() === requested.toLocaleLowerCase()) ?? requested
  }

  const ensureContext = (value: string) => {
    const context = value.trim() || 'General'
    setContexts((current) => current.some((item) => item.toLocaleLowerCase() === context.toLocaleLowerCase())
      ? current
      : [...current, context])
  }

  const handleAddContext = () => {
    const value = window.prompt('Nombre del nuevo contexto')
    const context = value?.trim()
    if (!context) return
    const existing = contexts.find((item) => item.toLocaleLowerCase() === context.toLocaleLowerCase())
    if (existing) {
      setActiveContext(existing)
      return
    }
    setContexts((current) => [...current, context])
    setActiveContext(context)
  }

  const handleRenameContext = (currentName: string, nextName: string) => {
    const name = nextName.trim()
    if (!name) return false
    const duplicate = contexts.find((context) => context.toLocaleLowerCase() === name.toLocaleLowerCase())
    if (duplicate && duplicate !== currentName) return false
    setContexts((current) => current.map((context) => context === currentName ? name : context))
    setTasks((current) => current.map((task) => task.project === currentName ? { ...task, project: name } : task))
    if (activeContext === currentName) setActiveContext(name)
    return true
  }

  const handleDeleteContext = (name: string) => {
    const affected = tasks.filter((task) => task.project === name).length
    const remaining = contexts.filter((context) => context !== name)
    if (name === 'General' && remaining.length === 0 && affected > 0) {
      window.alert('No se puede eliminar el único contexto con tareas. Crea o renombra otro contexto primero.')
      return false
    }
    const fallback = remaining[0] ?? 'General'
    const nextContexts = remaining.length ? remaining : affected ? ['General'] : []
    const message = affected
      ? `Las ${affected} tarea${affected === 1 ? '' : 's'} de “${name}” se moverán a “${fallback}”.`
      : 'El contexto se eliminará.'
    if (!window.confirm(`¿Eliminar el contexto “${name}”? ${message}`)) return false
    setContexts(nextContexts)
    if (affected) setTasks((current) => current.map((task) => task.project === name ? { ...task, project: fallback } : task))
    if (activeContext === name) setActiveContext(nextContexts.length ? fallback : '*')
    return true
  }

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id))
  }

  const handleOpenAddTask = () => {
    setEditingTask(null)
    setTaskModalOpen(true)
  }

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskModalOpen(true)
  }

  const handleCloseTaskModal = () => {
    setTaskModalOpen(false)
    setEditingTask(null)
  }

  return (
    <>
      <IconSprite />
      <div className={`${styles.scrim} ${menuOpen ? styles.open : ''}`} onClick={() => setMenuOpen(false)} />
      <Sidebar
        active={activeNav}
        onNavigate={setActiveNav}
        pendingCount={pendingCount}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onAddTask={handleOpenAddTask}
      />
      <div className={styles.shell}>
        <Header
          active={activeNav}
          onToggleMenu={() => setMenuOpen((o) => !o)}
          menuOpen={menuOpen}
          onShowNotifications={() => setNotifOpen(true)}
        />
        <main className={styles.main} id="inicio">
          {activeNav === 'home' && <Hero active={activeNav} onNavigate={setActiveNav} />}
          {(activeNav === 'home' || activeNav === 'tasks') && (
            <TasksList
              tasks={tasks}
              contexts={contexts}
              activeContext={activeContext}
              showContextTabs={activeNav === 'tasks'}
              onSelectContext={setActiveContext}
              onAddContext={handleAddContext}
              onRenameContext={handleRenameContext}
              onDeleteContext={handleDeleteContext}
              onToggleTask={handleToggleTask}
              onEditTask={handleOpenEditTask}
              onDeleteTask={handleDeleteTask}
              onAddTask={handleOpenAddTask}
            />
          )}
          {activeNav === 'collection' && <CollectionTool />}
          {activeNav === 'hijitos' && <HijitosTool />}
          {activeNav === 'accounts' && <CuentasTool />}
          {activeNav === 'calendar' && <CalendarioTool />}
          {activeNav === 'weight' && <ControlPesoTool />}
          {activeNav === 'wiki' && <WikiTool />}
          {activeNav === 'shopping' && <ShoppingWishlistTool />}
          <footer className={styles.footer}>
            <span>CHUCK's Web © 2026 · Prototipo con datos de ejemplo</span>
          </footer>
        </main>
      </div>
      <ProjectModal
        open={notifOpen}
        mode="view"
        project={notificationProject}
        onClose={() => setNotifOpen(false)}
        onCreate={() => {}}
      />
      <TaskModal
        open={taskModalOpen}
        task={editingTask}
        defaultContext={activeNav === 'tasks' && activeContext !== '*' ? activeContext : ''}
        onClose={handleCloseTaskModal}
        onCreate={handleCreateTask}
        onSave={handleUpdateTask}
      />
    </>
  )
}

export default App
