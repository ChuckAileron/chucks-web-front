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
    <header className={`${styles.header} ${active === 'home' ? styles.homeHeader : ''}`}>
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
        {active === 'home' ? <>
          <ThemeToggle compact />
          <button className={styles.avatarButton} type="button" aria-label="Abrir menú de cuenta" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>TU</button>
          {profileOpen && <div className={styles.profileMenu}>
            <button type="button" onClick={() => { onShowNotifications(); setProfileOpen(false) }}>Notificaciones</button>
            <button type="button" className={styles.logout} onClick={() => { setProfileOpen(false); onLogout() }}>Salir</button>
          </div>}
        </> : <>
          <ThemeToggle />
          <button className={styles.notification} aria-label="Ver notificaciones" onClick={onShowNotifications}><svg><use href="#icon-bell" /></svg></button>
          <span className={styles.avatar} aria-label="Cuenta personal">TU</span>
          <button className={styles.logout} type="button" onClick={onLogout}>Salir</button>
        </>}
      </div>
    </header>
  )
}
