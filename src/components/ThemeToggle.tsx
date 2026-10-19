import styles from './ThemeToggle.module.css'
import { useTheme } from '../hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = `Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
    >
      <svg className={styles.moon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 13A9 9 0 0 1 11 3 9 9 0 1 0 21 13Z" />
      </svg>
      <svg className={styles.sun} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </svg>
      <span className={styles.themeLabel}>{isDark ? 'Claro' : 'Oscuro'}</span>
    </button>
  )
}