import styles from './Hero.module.css'
import bannerImg from '../assets/banner.jpg'
import type { NavKey } from './Sidebar'

interface HeroProps {
  active: NavKey
  onNavigate: (key: NavKey) => void
}

const quickLinks: { key: NavKey; label: string; icon: string }[] = [
  { key: 'home', label: 'Vista general', icon: '#icon-grid' },
  { key: 'tasks', label: 'Mis tareas', icon: '#icon-check' },
  { key: 'collection', label: 'Colección', icon: '#icon-collection' },
  { key: 'wiki', label: 'Wiki', icon: '#icon-book' },
  { key: 'shopping', label: 'Lista de Compras', icon: '#icon-cart' },
]

export function Hero({ active, onNavigate }: HeroProps) {
  return (
    <>
      <div className={styles.banner}>
        <img src={bannerImg} alt="Banner de CHUCK's Web" />
      </div>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h2>Espacio personal.</h2>
          <p>Pendientes, ideas y próximos pasos, en un mismo lugar.</p>
          <a href="#tareas" onClick={(e) => { e.preventDefault(); onNavigate('tasks'); }}>
            Ver tareas pendientes
            <svg>
              <use href="#icon-arrow" />
            </svg>
          </a>
        </div>
        <nav className={styles.quickNav} aria-label="Accesos rápidos">
          {quickLinks.map((item) => (
            <button
              key={item.key}
              className={`${styles.quickNavItem} ${active === item.key ? styles.active : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <svg>
                <use href={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>
      </section>
    </>
  )
}
