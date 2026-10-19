import styles from './Hero.module.css'
import bannerImg from '../assets/banner.jpg'
import type { NavKey } from './Sidebar'

interface HeroProps {
  active: NavKey
  onNavigate: (key: NavKey) => void
}

const quickLinks: { key: NavKey; label: string; icon: string }[] = [
  { key: 'tasks', label: 'Mis tareas', icon: '#icon-check' },
  { key: 'hijitos', label: 'Hijitos', icon: '#icon-paw' },
  { key: 'accounts', label: 'Cuentas', icon: '#icon-wallet' },
  { key: 'calendar', label: 'Calendario', icon: '#icon-calendar' },
  { key: 'collection', label: 'Colección', icon: '#icon-collection' },
  { key: 'shopping', label: 'Lista de compras', icon: '#icon-cart' },
  { key: 'weight', label: 'Control de peso', icon: '#icon-scale' },
  { key: 'wiki', label: 'Wiki', icon: '#icon-book' },
]

export function Hero({ active, onNavigate }: HeroProps) {
  return (
    <>
      <div className={styles.banner}>
        <img src={bannerImg} alt="Banner de CHUCK's Web" />
      </div>
      <section className={styles.hero}>

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
