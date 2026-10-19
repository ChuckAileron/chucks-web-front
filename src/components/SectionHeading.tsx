import type { ReactNode } from 'react'
import styles from './SectionHeading.module.css'

export interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
  status?: ReactNode
}

export default function SectionHeading({ eyebrow, title, description, status }: SectionHeadingProps) {
  return <header className={styles.heading}><div className={styles.copy}><span className={styles.eyebrow}>{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{status && <span className={styles.status}><i aria-hidden="true" />{status}</span>}</header>
}
