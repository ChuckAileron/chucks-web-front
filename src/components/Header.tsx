import { useState } from 'react'
import styles from './Header.module.css'
import { ThemeToggle } from './ThemeToggle'
import type { NavKey } from './Sidebar'

interface HeaderProps {
  active: NavKey
  onToggleMenu: () => void
  menuOpen: boolean
  onShowNotifications: () => void
  onLogout: () => void
}

export function Header({ active, onToggleMenu, menuOpen, onShowNotifications, onLogout }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const getCrumb = () => {
    switch (active) {
      case 'tasks':
        return 'Mis tareas'
      case 'hijitos':
        return 'Hijitos'
      case 'accounts':
        return 'Cuentas'
      case 'calendar':
        return 'Calendario'
      case 'weight':
        return 'Control de peso'
      case 'collection':
        return 'Colección'
      case 'wiki':
        return 'Wiki'
      case 'shopping':
        return 'Lista de Compras'
      case 'sites':
        return 'Sitios de interés'
      default:
        return 'Vista general'
    }
  }

  return (
    <header className={styles.header}>
      <button
        className={styles.mobileMenu}
        id="menu"
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-controls="sidebar"
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
      >
        <svg>
          <use href="#icon-menu" />
        </svg>
      </button>
      <div className={styles.breadcrumb}>
        <span>Workspace</span>
        <span>/</span>
        <strong>{getCrumb()}</strong>
      </div>
      <div className={styles.headerRight}>
        <span className={styles.demoBadge}>PROTOTIPO</span>
        <button className={styles.avatarButton} type="button" aria-label="Abrir menú de cuenta" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>
          TU
        </button>
        {profileOpen && <div className={styles.profileMenu}>
          <ThemeToggle />
          <button type="button" onClick={() => { onShowNotifications(); setProfileOpen(false) }}>Notificaciones</button>
          <button type="button" className={styles.logout} onClick={() => { setProfileOpen(false); onLogout() }}>Salir</button>
        </div>}
      </div>
    </header>
  )
}
