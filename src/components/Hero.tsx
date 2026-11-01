import styles from './Hero.module.css'
import type { NavKey } from './Sidebar'

interface HeroProps {
  active: NavKey
  onNavigate: (key: NavKey) => void
}

const quickLinks: { key: NavKey; label: string; description: string; icon: string }[] = [
  { key: 'tasks', label: 'Mis tareas', description: 'Organiza tu día', icon: '#icon-check' },
  { key: 'hijitos', label: 'Hijitos', description: 'Cuida de los tuyos', icon: '#icon-paw' },
  { key: 'accounts', label: 'Cuentas', description: 'Todo en orden', icon: '#icon-wallet' },
  { key: 'calendar', label: 'Calendario', description: 'Tus próximos días', icon: '#icon-calendar' },
  { key: 'collection', label: 'Colección', description: 'Tus favoritos', icon: '#icon-collection' },
  { key: 'shopping', label: 'Lista de compras', description: 'No olvides nada', icon: '#icon-cart' },
  { key: 'weight', label: 'Control de peso', description: 'Sigue tu progreso', icon: '#icon-scale' },
  { key: 'wiki', label: 'Wiki', description: 'Ideas y notas', icon: '#icon-book' },
]

export function Hero({ active, onNavigate }: HeroProps) {
  return <section className={styles.home}>
    <header className={styles.welcomeHeader}>
      <div>
        <span className={styles.eyebrow}>Tu espacio, a tu manera</span>
        <h1>Hola, Chuck <span aria-hidden="true">👋</span></h1>
        <p>Todo lo que importa, en un solo lugar.</p>
      </div>
      <span className={styles.dateTag}>TU VISTA GENERAL</span>
    </header>

    <section className={styles.welcomeHero} aria-label="Bienvenido a CHUCK's Web">
      <div className={styles.heroContent}>
        <span className={styles.eyebrow}>Tu universo personal</span>
        <h2>CHUCK’s <span>Web.</span></h2>
        <p>Organiza tus días, guarda tus ideas y disfruta el camino.</p>
        <span className={styles.heroNote}><i aria-hidden="true" /> Tu espacio está listo</span>
      </div>
      <div className={styles.heroVisual} aria-hidden="true" />
    </section>

    <section className={styles.spaces} aria-labelledby="home-spaces-title">
      <div className={styles.sectionHead}>
        <div><h2 id="home-spaces-title">Tus espacios</h2><p>Accede rápido a lo que necesitas.</p></div>
      </div>
      <nav className={styles.quickNav} aria-label="Accesos rápidos">
        {quickLinks.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`${styles.quickNavItem} ${active === item.key ? styles.active : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className={styles.iconBox}><svg aria-hidden="true"><use href={item.icon} /></svg></span>
            <span className={styles.cardCopy}><strong>{item.label}</strong><small>{item.description}</small></span>
            <svg className={styles.arrow} aria-hidden="true"><use href="#icon-arrow" /></svg>
          </button>
        ))}
      </nav>
    </section>
  </section>
}
