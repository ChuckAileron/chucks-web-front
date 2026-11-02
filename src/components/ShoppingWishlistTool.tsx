import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  addShopLinks,
  clearShopItems,
  createShopContext,
  deleteShopContext,
  deleteShopItem,
  fetchShopContexts,
  fetchShopItems,
  refreshShopItems,
  renameShopContext,
  updateShopItemTags,
  type ShopContext,
  type ShopItem,
  type ShopSort,
} from '../api/shopping'
import SectionHeading from './SectionHeading'
import ContextManager from './ContextManager'
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
  const [managingContexts, setManagingContexts] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const active = contexts.find((context) => context.id === activeId) ?? null

  const tagCounts = useMemo(() => {
    const counts = new Map<string, { key: string; label: string; count: number }>()
    for (const item of items) {
      for (const tag of item.tags ?? []) {
        const key = tag.toLocaleLowerCase()
        const entry = counts.get(key)
        if (entry) entry.count += 1
        else counts.set(key, { key, label: tag, count: 1 })
      }
    }
    return [...counts.values()].sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }))
  }, [items])

  const activeTagKey = activeTag && tagCounts.some((tag) => tag.key === activeTag) ? activeTag : null
  const visibleItems = activeTagKey
    ? items.filter((item) => (item.tags ?? []).some((tag) => tag.toLocaleLowerCase() === activeTagKey))
    : items

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
      setActiveTag(null)
      setCreating(false)
      setNewName('')
      setMessage(`Pestaña “${created.name}” creada.`)
    })
  }

  const renameContext = async (id: number | string, name: string) => {
    setBusy(true)
    try {
      await renameShopContext(Number(id), name)
      await loadContexts(activeId)
      setMessage(`Contexto renombrado a “${name}”.`)
    } finally { setBusy(false) }
  }

  const removeContext = async (contextId: number | string) => {
    setBusy(true)
    try {
      await deleteShopContext(Number(contextId))
      if (activeId === Number(contextId)) setActiveId(null)
      await loadContexts()
      setActiveTag(null)
      setMessage('Contexto eliminado.')
    } finally { setBusy(false) }
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

  const removeItem = (item: ShopItem) => {
    if (!active || !window.confirm(`¿Eliminar “${item.name}” de la lista?`)) return
    void run(async () => {
      await deleteShopItem(active.id, item.id)
      await loadContexts(active.id)
      await loadItems(active.id)
      setMessage('Artículo eliminado de la lista.')
    })
  }

  const saveItemTags = (item: ShopItem, tags: string[]) => {
    if (!active) return
    void run(async () => {
      const updated = await updateShopItemTags(active.id, item.id, tags)
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
      setMessage(tags.length ? 'Etiquetas actualizadas.' : 'Etiquetas quitadas.')
    })
  }

  const selectContext = (id: number) => {
    setActiveTag(null)
    setActiveId(id)
  }

  return (
    <section className={styles.shopping}>
      <SectionHeading eyebrow="LISTA PERSONAL" title="Lista de compras" description="Guarda enlaces de tiendas, subastas y marketplaces organizados por contexto." status="PostgreSQL local" />

      <nav className={`${styles.contextTabs} app-tabs`} aria-label="Contextos de compra">
        {contexts.map((context) => <button key={context.id} type="button" className={context.id === activeId ? 'active' : ''} onClick={() => selectContext(context.id)}>{context.name}<b>{context.total}</b></button>)}
        <button type="button" className={styles.newContextTab} onClick={() => setCreating(true)}>＋ Nueva pestaña</button>
        <button type="button" className={styles.manageContextsTab} onClick={() => setManagingContexts(true)}>⚙ Administrar</button>
      </nav>

      {message && <div className={styles.notice} role="status"><span>{message}</span><button type="button" aria-label="Cerrar aviso" onClick={() => setMessage('')}>×</button></div>}
      {creating && <form className={styles.contextForm} onSubmit={(event) => { event.preventDefault(); createContext() }}><label><span>Nombre del contexto</span><input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} placeholder="Ej. Accesorios PC, Música…" /></label><button className={styles.primaryButton} disabled={busy || !newName.trim()}>Crear pestaña</button><button type="button" className={styles.secondaryButton} onClick={() => { setCreating(false); setNewName('') }}>Cancelar</button></form>}
      {managingContexts && <ContextManager contexts={contexts} elementLabel="artículos" onClose={() => setManagingContexts(false)} onRename={renameContext} onDelete={(context) => removeContext(context.id)} />}

      {active ? <>
        <div className={styles.contextHeading}><div><h2>{active.name}</h2><p>{active.total} artículos guardados</p></div></div>
        <section className={styles.addPanel} aria-label="Agregar enlaces a la lista">
          <label htmlFor="shop-links">Pega uno o varios enlaces, uno por línea</label>
        <textarea id="shop-links" value={links} onChange={(event) => setLinks(event.target.value)} placeholder={'https://es.aliexpress.com/item/1005009801028580.html\nhttps://tienda.com/articulo'} />
          <div className={styles.toolbar}>
            <button className={styles.primaryButton} disabled={busy || !links.trim()} onClick={saveLinks}>{busy ? 'Analizando…' : 'Analizar y guardar'}</button>
            <label className={styles.sort}><span>Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value as ShopSort)}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <button className={styles.secondaryButton} disabled={busy || !items.length} onClick={refresh}>Refrescar precios</button>
            <button className={styles.secondaryButton} disabled={busy || !items.some((item) => !item.active || item.error)} onClick={clearInactive}>Limpiar inactivos</button>
          </div>
        </section>
        {items.length > 0 && (
          <div className={styles.tagFilters} role="group" aria-label="Categorías por etiqueta">
            <span className={styles.tagFiltersLabel}>Categorías</span>
            <button type="button" className={`${styles.tagFilter} ${!activeTagKey ? styles.tagFilterActive : ''}`} aria-pressed={!activeTagKey} onClick={() => setActiveTag(null)}>Todas<b>{items.length}</b></button>
            {tagCounts.map((tag) => <button key={tag.key} type="button" className={`${styles.tagFilter} ${activeTagKey === tag.key ? styles.tagFilterActive : ''}`} aria-pressed={activeTagKey === tag.key} onClick={() => setActiveTag((current) => current === tag.key ? null : tag.key)}>{tag.label}<b>{tag.count}</b></button>)}
            {!tagCounts.length && <span className={styles.tagFiltersEmpty}>Aún no hay etiquetas. Agrega una desde cualquier artículo.</span>}
          </div>
        )}
        {items.length === 0
          ? <div className={styles.empty}><span>🛒</span><strong>Aún no hay artículos en esta pestaña.</strong><p>Pega enlaces de tiendas o marketplaces y pulsa “Analizar y guardar”.</p></div>
          : visibleItems.length === 0
            ? <div className={styles.empty}><span aria-hidden="true">#</span><strong>No hay artículos con esta etiqueta.</strong><p>Prueba con otra categoría o quita el filtro.</p><button className={styles.secondaryButton} onClick={() => setActiveTag(null)}>Ver todos</button></div>
            : <div className={styles.cards}>{visibleItems.map((item) => <ShopItemCard key={item.id} item={item} busy={busy} onRemove={() => removeItem(item)} onSaveTags={(tags) => saveItemTags(item, tags)} onFilterTag={(tag) => setActiveTag(tag.toLocaleLowerCase())} />)}</div>}
      </> : <div className={styles.empty}><span>🛒</span><strong>No hay pestañas de contexto.</strong><p>Crea una pestaña, por ejemplo “Accesorios PC”, para empezar.</p><button className={styles.primaryButton} onClick={() => setCreating(true)}>＋ Crear contexto</button></div>}
    </section>
  )
}

function ShopItemCard({ item, busy, onRemove, onSaveTags, onFilterTag }: { item: ShopItem; busy: boolean; onRemove: () => void; onSaveTags: (tags: string[]) => void; onFilterTag: (tag: string) => void }) {
  const [imageFailed, setImageFailed] = useState(false)
  const [editingTags, setEditingTags] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const itemTags = item.tags ?? []

  const openTagEditor = () => {
    setTagDraft(itemTags.join(', '))
    setEditingTags(true)
  }

  const saveTags = (event: FormEvent) => {
    event.preventDefault()
    onSaveTags(parseTags(tagDraft))
    setEditingTags(false)
  }

  return <article className={`${styles.card} ${!item.active ? styles.inactive : ''}`}>
    <a className={styles.cardImage} href={item.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${item.name} en ${item.page}`}>
      {item.imageUrl && !imageFailed ? <img src={item.imageUrl} alt="" onError={() => setImageFailed(true)} /> : <span>SW</span>}
      <b className={item.active ? styles.activeBadge : styles.inactiveBadge}>{item.active ? 'Activo' : 'Inactivo'}</b>
    </a>
    <div className={styles.cardMeta}><span>{item.page}</span><time>{formatDate(item.createdAt)}</time></div>
    <h3><a href={item.url} target="_blank" rel="noreferrer">{item.name}</a></h3>
    <div className={styles.cardTags}>
      {itemTags.map((tag) => <button type="button" key={tag} className={styles.cardTag} onClick={() => onFilterTag(tag)} title={`Filtrar por ${tag}`}>{tag}</button>)}
      <button type="button" className={styles.editTagsButton} onClick={() => editingTags ? setEditingTags(false) : openTagEditor()} aria-expanded={editingTags}>{editingTags ? 'Cerrar etiquetas' : itemTags.length ? 'Editar etiquetas' : '＋ Agregar etiqueta'}</button>
    </div>
    {editingTags && <form className={styles.tagForm} onSubmit={saveTags}>
      <label htmlFor={`item-tags-${item.id}`}>Etiquetas del artículo</label>
      <input id={`item-tags-${item.id}`} autoFocus value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} maxLength={500} placeholder="Ej. regalos, ofertas, PC" aria-label={`Etiquetas de ${item.name}`} />
      <div className={styles.tagFormActions}><button className={styles.tagSaveButton} disabled={busy}>Guardar</button><button type="button" className={styles.tagCancelButton} onClick={() => setEditingTags(false)}>Cancelar</button></div>
    </form>}
    <div className={styles.cardBottom}>
      {item.store && <span className={styles.store}>{item.store}</span>}
      <div className={styles.priceBlock}><strong>{formatPrice(item)}</strong>{item.condition && <small>{item.condition}</small>}{item.error && <small className={styles.error}>{item.error}</small>}</div>
      <button type="button" className={styles.removeItemButton} disabled={busy} onClick={onRemove} aria-label={`Eliminar ${item.name}`}>Eliminar</button>
    </div>
  </article>
}

function parseTags(value: string) {
  const seen = new Set<string>()
  return value.split(/[,\n]/).flatMap((raw) => {
    const tag = raw.trim().replace(/^#+/, '').trim().slice(0, 40)
    if (!tag) return []
    const key = tag.toLocaleLowerCase()
    if (seen.has(key)) return []
    seen.add(key)
    return [tag]
  }).slice(0, 20)
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
