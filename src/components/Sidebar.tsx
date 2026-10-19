import styles from './Sidebar.module.css'
import brandIcon from '../assets/chucks-web-icon.svg'

export type NavKey = 'home' | 'tasks' | 'hijitos' | 'accounts' | 'calendar' | 'weight' | 'collection' | 'wiki' | 'shopping'

interface NavItem {
  key: NavKey
  label: string
  icon: string
  count?: number
}

interface SidebarProps {
  active: NavKey
  onNavigate: (key: NavKey) => void
  pendingCount: number
  open: boolean
  onClose: () => void
  onAddTask: () => void
}

export function Sidebar({ active, onNavigate, pendingCount, open, onClose, onAddTask }: SidebarProps) {
  const navItems: NavItem[] = [
    { key: 'home', label: 'Vista general', icon: '#icon-grid' },
    { key: 'tasks', label: 'Mis tareas', icon: '#icon-check', count: pendingCount },
    { key: 'hijitos', label: 'Hijitos', icon: '#icon-paw' },
    { key: 'accounts', label: 'Cuentas', icon: '#icon-wallet' },
    { key: 'calendar', label: 'Calendario', icon: '#icon-calendar' },
    { key: 'collection', label: 'Colección', icon: '#icon-collection' },
    { key: 'shopping', label: 'Lista de compras', icon: '#icon-cart' },
    { key: 'weight', label: 'Control de peso', icon: '#icon-scale' },
    { key: 'wiki', label: 'Wiki', icon: '#icon-book' },
  ]

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onNavigate('home')
    onClose()
  }

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`} id="sidebar" aria-label="Navegación principal">
      <div className={styles.brandRow}>
        <a className={styles.brand} href="#" aria-label="CHUCK's Web, inicio" onClick={handleBrandClick}>
          <img src={brandIcon} alt="" className={styles.brandIcon} />
        </a>
        <button className={styles.addTask} onClick={onAddTask}>
          <svg>
            <use href="#icon-plus" />
          </svg>
          Agregar tarea
        </button>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <a
            key={item.key}
            href={`#${item.key}`}
            className={`${styles.navLink} ${active === item.key ? styles.active : ''}`}
            onClick={(e) => {
              e.preventDefault()
              onNavigate(item.key)
              onClose()
            }}
            data-nav={item.key}
          >
            <svg>
              <use href={item.icon} />
            </svg>
            {item.label}
            {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
          </a>
        ))}
      </nav>

      <div className={styles.sidebarBottom}>
        <div className={styles.help}>
          <strong>Un espacio para tus ideas.</strong>
          <p>Menos ruido. Más enfoque.</p>
          <a
            href="#tasks"
            onClick={(e) => {
              e.preventDefault()
              onNavigate('tasks')
              onClose()
            }}
          >
            Explora tus tareas
            <svg>
              <use href="#icon-arrow" />
            </svg>
          </a>
        </div>
        <div className={styles.profile}>
          <span className={styles.avatar}>TU</span>
          <div>
            Tu workspace
            <small>Cuenta personal</small>
          </div>
          <svg>
            <use href="#icon-settings" />
          </svg>
        </div>
      </div>
    </aside>
  )
}
