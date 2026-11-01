import { useCallback, useEffect, useState } from 'react'
import {
  createSiteContext,
  deleteSiteContext,
  deleteSitePage,
  fetchSiteContexts,
  fetchSitePages,
  recaptureSitePage,
  saveSitePage,
  type SavedSite,
  type SiteContext,
} from '../api/sites'
import SectionHeading from './SectionHeading'
import styles from './SitesOfInterestTool.module.css'

export default function SitesOfInterestTool() {
  const [contexts, setContexts] = useState<SiteContext[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [pages, setPages] = useState<SavedSite[]>([])
  const [url, setUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const active = contexts.find((context) => context.id === activeId) ?? null

  const loadContexts = useCallback(async (preferredId?: number | null) => {
    const found = await fetchSiteContexts()
    setContexts(found)
    setActiveId((current) => {
      if (preferredId != null && found.some((context) => context.id === preferredId)) return preferredId
      if (current != null && found.some((context) => context.id === current)) return current
      return found[0]?.id ?? null
    })
  }, [])

  const loadPages = useCallback(async (contextId: number) => {
    const found = await fetchSitePages(contextId)
    setPages(found)
    return found
  }, [])

  useEffect(() => { void loadContexts().catch((error: unknown) => setMessage(errorText(error))) }, [loadContexts])
  useEffect(() => {
    if (activeId === null) { setPages([]); return }
    void loadPages(activeId).catch((error: unknown) => setMessage(errorText(error)))
  }, [activeId, loadPages])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setMessage('')
    try { await action() }
    catch (error) { setMessage(errorText(error)) }
    finally { setBusy(false) }
  }

  const addContext = () => {
    const name = newName.trim()
    if (!name) return
    void run(async () => {
      const created = await createSiteContext(name)
      await loadContexts(created.id)
      setCreating(false)
      setNewName('')
      setMessage(`Contexto “${created.name}” creado.`)
    })
  }

  const removeContext = () => {
    if (!active || !window.confirm(`¿Eliminar “${active.name}” y todos sus sitios guardados?`)) return
    void run(async () => {
      await deleteSiteContext(active.id)
      setActiveId(null)
      await loadContexts()
      setMessage('Contexto eliminado.')
    })
  }

  const addPage = () => {
    if (!active || !url.trim()) return
    void run(async () => {
      const saved = await saveSitePage(active.id, url.trim())
      setUrl('')
      await loadContexts(active.id)
      await loadPages(active.id)
      setMessage(`“${saved.title}” guardado con captura de pantalla.`)
    })
  }

  const refreshCapture = (page: SavedSite) => void run(async () => {
    const refreshed = await recaptureSitePage(page.id)
    setPages((current) => current.map((item) => item.id === page.id ? refreshed : item))
    setMessage(`Captura de “${refreshed.title}” actualizada.`)
  })

  const removePage = (page: SavedSite) => {
    if (!window.confirm(`¿Quitar “${page.title}” de este contexto?`)) return
    void run(async () => {
      await deleteSitePage(page.id)
      await loadPages(page.contextId)
      await loadContexts(page.contextId)
      setMessage('Sitio eliminado.')
    })
  }

  return <section className={styles.sites}>
    <SectionHeading eyebrow="TUS MARCADORES VISUALES" title="Sitios de interés" description="Guarda páginas web por contexto y consúltalas con una captura visual." status="PostgreSQL local" />

    <nav className={`${styles.contextTabs} app-tabs`} aria-label="Contextos de sitios">
      {contexts.map((context) => <button key={context.id} type="button" className={context.id === activeId ? 'active' : ''} onClick={() => setActiveId(context.id)}>{context.name}<b>{context.total}</b></button>)}
      <button type="button" className={styles.newContextTab} onClick={() => setCreating(true)}>＋ Nuevo contexto</button>
    </nav>

    {message && <div className={styles.notice} role="status"><span>{message}</span><button type="button" aria-label="Cerrar aviso" onClick={() => setMessage('')}>×</button></div>}
    {creating && <form className={styles.contextForm} onSubmit={(event) => { event.preventDefault(); addContext() }}><label><span>Nombre del contexto</span><input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} placeholder="Ej. Diseño, Recetas, Herramientas…" /></label><button className={styles.primaryButton} disabled={busy || !newName.trim()}>Crear contexto</button><button type="button" className={styles.secondaryButton} onClick={() => { setCreating(false); setNewName('') }}>Cancelar</button></form>}

    {active ? <>
      <div className={styles.contextHeading}><div><h2>{active.name}</h2><p>{active.total} {active.total === 1 ? 'sitio guardado' : 'sitios guardados'}</p></div><button className={styles.dangerButton} disabled={busy} onClick={removeContext}>Eliminar contexto</button></div>
      <form className={styles.addPanel} aria-label="Guardar sitio web" onSubmit={(event) => { event.preventDefault(); addPage() }}>
        <label htmlFor="site-url">Dirección del sitio</label>
        <div className={styles.addRow}><input id="site-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://ejemplo.com/pagina" /><button className={styles.primaryButton} disabled={busy || !url.trim()}>{busy ? 'Capturando…' : 'Guardar sitio'}</button></div>
        <small>Se abrirá la página en un navegador seguro y se guardará una captura de pantalla.</small>
      </form>
      {pages.length ? <div className={styles.cards}>{pages.map((page) => <article className={styles.card} key={page.id}>
        <a className={styles.cardImage} href={page.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${page.title}`}><img src={page.screenshot} alt={`Captura de ${page.title}`} loading="lazy" /></a>
        <div className={styles.cardMeta}><span>{page.hostname}</span><time dateTime={page.capturedAt}>Capturado {formatDate(page.capturedAt)}</time></div>
        <h3><a href={page.url} target="_blank" rel="noreferrer">{page.title}</a></h3>
        <p className={styles.cardUrl}>{page.url}</p>
        <div className={styles.cardActions}><button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => refreshCapture(page)}>↻ Actualizar captura</button><button type="button" className={styles.removeButton} disabled={busy} onClick={() => removePage(page)} aria-label={`Eliminar ${page.title}`}>Eliminar</button></div>
      </article>)}</div> : <div className={styles.empty}><span>◎</span><strong>Aún no hay sitios en este contexto.</strong><p>Agrega una URL para crear su captura visual.</p></div>}
    </> : <div className={styles.empty}><span>◎</span><strong>No hay contextos todavía.</strong><p>Crea uno para empezar a guardar sitios.</p><button className={styles.primaryButton} onClick={() => setCreating(true)}>＋ Crear contexto</button></div>}
  </section>
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
}

function errorText(error: unknown) { return error instanceof Error ? error.message : String(error) }
