import { useCallback, useEffect, useState } from 'react'
import {
  addShopLinks,
  clearShopItems,
  createShopContext,
  deleteShopContext,
  fetchShopContexts,
  fetchShopItems,
  refreshShopItems,
  type ShopContext,
  type ShopItem,
  type ShopSort,
} from '../api/shopping'
import SectionHeading from './SectionHeading'
import styles from './ShoppingWishlistTool.module.css'

const SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: 'name-asc', label: 'Nombre · ascendente' },
  { value: 'name-desc', label: 'Nombre · descendente' },
  { value: 'price-asc', label: 'Precio · menor' },
  { value: 'price-desc', label: 'Precio · mayor' },
  { value: 'date-asc', label: 'Guardado · ascendente' },
  { value: 'date-desc', label: 'Guardado · descendente' },
]

export default function ShoppingWishlistTool() {
  const [contexts, setContexts] = useState<ShopContext[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [items, setItems] = useState<ShopItem[]>([])
  const [sort, setSort] = useState<ShopSort>('date-desc')
  const [links, setLinks] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const active = contexts.find((context) => context.id === activeId) ?? null

  const loadContexts = useCallback(async (preferredId?: number | null) => {
    const found = await fetchShopContexts()
    setContexts(found)
    setActiveId((current) => {
      if (preferredId != null && found.some((context) => context.id === preferredId)) return preferredId
      if (current != null && found.some((context) => context.id === current)) return current
      return found[0]?.id ?? null
    })
    return found
  }, [])

  const loadItems = useCallback(async (contextId: number, nextSort = sort) => {
    const found = await fetchShopItems(contextId, nextSort)
    setItems(found)
    return found
  }, [sort])

  useEffect(() => {
    void loadContexts().catch((error: unknown) => setMessage(errorMessage(error)))
  }, [loadContexts])

  useEffect(() => {
    if (activeId === null) { setItems([]); return }
    void loadItems(activeId).catch((error: unknown) => setMessage(errorMessage(error)))
  }, [activeId, loadItems])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setMessage('')
    try { await action() }
    catch (error) { setMessage(errorMessage(error)) }
    finally { setBusy(false) }
  }

  const createContext = () => {
    const name = newName.trim()
    if (!name) return
    void run(async () => {
      const created = await createShopContext(name)
      await loadContexts(created.id)
      setCreating(false)
      setNewName('')
      setMessage(`Pestaña “${created.name}” creada.`)
    })
  }

  const removeContext = () => {
    if (!active || !window.confirm(`¿Eliminar la pestaña “${active.name}” y todos sus artículos?`)) return
    void run(async () => {
      await deleteShopContext(active.id)
      setActiveId(null)
      await loadContexts()
      setMessage('Pestaña eliminada.')
    })
  }

  const saveLinks = () => {
    if (!active || !links.trim()) return
    void run(async () => {
      const result = await addShopLinks(active.id, links)
      setLinks('')
      await loadContexts(active.id)
      await loadItems(active.id)
      const details = [`${result.added} ${result.added === 1 ? 'enlace agregado' : 'enlaces agregados'}`]
      if (result.skipped) details.push(`${result.skipped} ya estaba${result.skipped === 1 ? '' : 'n'}`)
      if (result.failed) details.push(`${result.failed} con error`)
      setMessage(`${details.join(' · ')}.`)
    })
  }

  const refresh = () => {
    if (!active || !items.length) return
    void run(async () => {
      const result = await refreshShopItems(active.id)
      await loadItems(active.id)
      setMessage(`${result.updated} ${result.updated === 1 ? 'artículo actualizado' : 'artículos actualizados'}${result.failed ? ` · ${result.failed} con error` : ''}.`)
    })
  }

  const clearInactive = () => {
    if (!active) return
    const count = items.filter((item) => !item.active || item.error).length
    if (!count) { setMessage('No hay artículos inactivos o con error para limpiar.'); return }
    if (!window.confirm(`¿Quitar ${count} artículo${count === 1 ? '' : 's'} inactivo${count === 1 ? '' : 's'} o con error?`)) return
    void run(async () => {
      const result = await clearShopItems(active.id)
      await loadContexts(active.id)
      await loadItems(active.id)
      setMessage(`${result.removed} ${result.removed === 1 ? 'artículo quitado' : 'artículos quitados'}.`)
    })
  }

  return (
    <section className={styles.shopping}>
      <SectionHeading eyebrow="LISTA PERSONAL" title="Lista de compras" description="Guarda enlaces de tiendas, subastas y marketplaces organizados por contexto." status="PostgreSQL local" />

      <nav className={`${styles.contextTabs} app-tabs`} aria-label="Contextos de compra">
        {contexts.map((context) => <button key={context.id} type="button" className={context.id === activeId ? 'active' : ''} onClick={() => setActiveId(context.id)}>{context.name}<b>{context.total}</b></button>)}
        <button type="button" className={styles.newContextTab} onClick={() => setCreating(true)}>＋ Nueva pestaña</button>
      </nav>

      {message && <div className={styles.notice} role="status"><span>{message}</span><button type="button" aria-label="Cerrar aviso" onClick={() => setMessage('')}>×</button></div>}
      {creating && <form className={styles.contextForm} onSubmit={(event) => { event.preventDefault(); createContext() }}><label><span>Nombre del contexto</span><input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} placeholder="Ej. Accesorios PC, Música…" /></label><button className={styles.primaryButton} disabled={busy || !newName.trim()}>Crear pestaña</button><button type="button" className={styles.secondaryButton} onClick={() => { setCreating(false); setNewName('') }}>Cancelar</button></form>}

      {active ? <>
        <div className={styles.contextHeading}><div><h2>{active.name}</h2><p>{active.total} artículos guardados</p></div><button className={styles.dangerButton} disabled={busy} onClick={removeContext}>Eliminar pestaña</button></div>
        <section className={styles.addPanel} aria-label="Agregar enlaces a la lista">
          <label htmlFor="shop-links">Pega uno o varios enlaces, uno por línea</label>
          <textarea id="shop-links" value={links} onChange={(event) => setLinks(event.target.value)} placeholder={'https://tienda.com/articulo\nhttps://subasta.com/lote'} />
          <div className={styles.toolbar}>
            <button className={styles.primaryButton} disabled={busy || !links.trim()} onClick={saveLinks}>{busy ? 'Analizando…' : 'Analizar y guardar'}</button>
            <label className={styles.sort}><span>Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value as ShopSort)}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <button className={styles.secondaryButton} disabled={busy || !items.length} onClick={refresh}>Refrescar precios</button>
            <button className={styles.secondaryButton} disabled={busy || !items.some((item) => !item.active || item.error)} onClick={clearInactive}>Limpiar inactivos</button>
          </div>
        </section>
        {items.length ? <div className={styles.cards}>{items.map((item) => <ShopItemCard key={item.id} item={item} />)}</div> : <div className={styles.empty}><span>🛒</span><strong>Aún no hay artículos en esta pestaña.</strong><p>Pega enlaces de tiendas o marketplaces y pulsa “Analizar y guardar”.</p></div>}
      </> : <div className={styles.empty}><span>🛒</span><strong>No hay pestañas de contexto.</strong><p>Crea una pestaña, por ejemplo “Accesorios PC”, para empezar.</p><button className={styles.primaryButton} onClick={() => setCreating(true)}>＋ Crear contexto</button></div>}
    </section>
  )
}

function ShopItemCard({ item }: { item: ShopItem }) {
  const [imageFailed, setImageFailed] = useState(false)
  return <article className={`${styles.card} ${!item.active ? styles.inactive : ''}`}>
    <a className={styles.cardImage} href={item.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${item.name} en ${item.page}`}>
      {item.imageUrl && !imageFailed ? <img src={item.imageUrl} alt="" onError={() => setImageFailed(true)} /> : <span>SW</span>}
      <b className={item.active ? styles.activeBadge : styles.inactiveBadge}>{item.active ? 'Activo' : 'Inactivo'}</b>
    </a>
    <div className={styles.cardMeta}><span>{item.page}</span><time>{formatDate(item.createdAt)}</time></div>
    <h3><a href={item.url} target="_blank" rel="noreferrer">{item.name}</a></h3>
    <div className={styles.cardBottom}>
      {item.store && <span className={styles.store}>{item.store}</span>}
      <div className={styles.priceBlock}><strong>{formatPrice(item)}</strong>{item.condition && <small>{item.condition}</small>}{item.error && <small className={styles.error}>{item.error}</small>}</div>
    </div>
  </article>
}

function formatPrice(item: ShopItem) {
  if (item.price === null) return 'Precio pendiente'
  const primary = formatMoney(item.price, item.currency)
  if (item.usdPrice !== null && (item.currency || 'USD') !== 'USD') return `${primary} · ${formatMoney(item.usdPrice, 'USD')}`
  return primary
}

function formatMoney(value: number, currency: string | null) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(value) }
  catch { return `${value.toFixed(2)} ${currency || ''}`.trim() }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
