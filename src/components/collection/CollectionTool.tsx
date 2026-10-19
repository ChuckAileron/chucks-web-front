import { useEffect, useRef, useState } from 'react'
import {
  createCollection,
  createCollectionItem,
  deleteCollection,
  deleteCollectionItem,
  exportCollection,
  fetchCollectionItems,
  fetchCollections,
  importCollection,
  reorderCollections,
  updateCollection,
  updateCollectionItem,
  type Collection,
  type CollectionItem,
  type ColumnType,
} from '../../api/collections'
import { downloadTextFile, sanitizeFileName } from '../../utils/files'
import CollectionEditor, {
  EMPTY_COLLECTION,
  draftFromCollection,
  type CollectionDraft,
} from './CollectionEditor'
import ItemEditor, { EMPTY_ITEM, type ItemDraft } from './ItemEditor'
import LaunchBoxPanel from './LaunchBoxPanel'
import WishlistView from './WishlistView'
import styles from './CollectionTool.module.css'
import SectionHeading from '../SectionHeading'

type View = 'catalog' | 'wishlist' | 'metadata' | 'settings'
type CatalogView = 'grid' | 'list'
type SortDirection = 'asc' | 'desc'
const CATALOG_VIEW_KEY = 'chucks.collection.catalog-view'
const CATALOG_SORT_KEY = 'chucks.collection.sort'

export default function CollectionTool() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [items, setItems] = useState<CollectionItem[]>([])
  const [view, setView] = useState<View>('catalog')
  const [search, setSearch] = useState('')
  const [catalogView, setCatalogView] = useState<CatalogView>(readCatalogView)
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [filterField, setFilterField] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingNewCollection, setEditingNewCollection] = useState(false)
  const [collectionDraft, setCollectionDraft] = useState<CollectionDraft>(EMPTY_COLLECTION)
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const actionsRef = useRef<HTMLDetailsElement | null>(null)

  const active = collections.find((collection) => collection.id === activeId) || null
  const configureCatalog = (collection: Collection) => {
    const sorting = savedCatalogSort(collection) || catalogDefaults(collection)
    setSortField(sorting.field)
    setSortDirection(sorting.direction)
    setFilterField('')
    setFilterValue('')
  }
  const changeCatalogView = (next: CatalogView) => {
    setCatalogView(next)
    localStorage.setItem(CATALOG_VIEW_KEY, next)
  }
  const changeSorting = (field: string, direction: SortDirection) => {
    setSortField(field)
    setSortDirection(direction)
    if (active) saveCatalogSort(active.id, field, direction)
  }
  const loadCollections = async (preferredId?: number) => {
    const result = await fetchCollections()
    const selected =
      result.find((collection) => collection.id === (preferredId ?? activeId)) || result[0] || null
    setCollections(result)
    setActiveId(selected?.id ?? null)
    if (selected) {
      setCollectionDraft(draftFromCollection(selected))
      configureCatalog(selected)
    } else setItems([])
  }
  useEffect(() => {
    fetchCollections()
      .then((result) => {
        setCollections(result)
        const selected = result[0]
        setActiveId(selected?.id ?? null)
        if (selected) {
          setCollectionDraft(draftFromCollection(selected))
          const sorting = savedCatalogSort(selected) || catalogDefaults(selected)
          setSortField(sorting.field)
          setSortDirection(sorting.direction)
          setFilterField('')
          setFilterValue('')
        }
      })
      .catch((error: unknown) => setMessage(errorMessage(error)))
  }, [])
  useEffect(() => {
    if (!activeId) return
    fetchCollectionItems(activeId, search)
      .then(setItems)
      .catch((error: unknown) => setMessage(errorMessage(error)))
  }, [activeId, search])
  useEffect(() => {
    if (!previewImage) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewImage(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [previewImage])
  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setMessage('')
    try {
      await action()
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const saveCollection = () =>
    run(async () => {
      const saved = editingNewCollection
        ? await createCollection(collectionDraft)
        : await updateCollection(activeId as number, collectionDraft)
      await loadCollections(saved.id)
      setEditingNewCollection(false)
      setMessage(editingNewCollection ? 'Colección creada.' : 'Colección actualizada.')
    })
  const removeCollection = () => {
    if (!active || !confirm(`¿Eliminar la colección "${active.name}" y todos sus ítems?`)) return
    run(async () => {
      await deleteCollection(active.id)
      setEditingNewCollection(false)
      await loadCollections()
      setMessage('Colección eliminada.')
    })
  }
  const moveCollection = (id: number, direction: -1 | 1) =>
    run(async () => {
      const ordered = [...collections]
      const index = ordered.findIndex((collection) => collection.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= ordered.length) return
      const [moved] = ordered.splice(index, 1)
      ordered.splice(target, 0, moved)
      await reorderCollections(ordered.map((collection) => collection.id))
      await loadCollections()
      setMessage('Orden de pestañas actualizado.')
    })
  const saveItem = () => {
    if (!active || !itemDraft) return
    run(async () => {
      const payload = {
        name: itemDraft.name,
        imageUrl: itemDraft.imageUrl || null,
        tags: itemDraft.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        values: itemDraft.values,
      }
      if (itemDraft.id) await updateCollectionItem(itemDraft.id, payload)
      else await createCollectionItem(active.id, payload)
      setItemDraft(null)
      setItems(await fetchCollectionItems(active.id, search))
      setMessage(itemDraft.id ? 'Ítem actualizado.' : 'Ítem agregado.')
    })
  }
  const removeItem = (item: CollectionItem) => {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return
    run(async () => {
      await deleteCollectionItem(item.id)
      setItems(await fetchCollectionItems(item.collectionId, search))
    })
  }
  const exportCollectionFile = (collection: Collection) =>
    run(async () => {
      const payload = await exportCollection(collection.id)
      downloadTextFile(
        `chucks-collection-${sanitizeFileName(collection.name.toLowerCase())}.json`,
        JSON.stringify(payload, null, 2),
      )
      setMessage(`Colección "${collection.name}" exportada.`)
    })
  const exportActive = () => {
    if (active) void exportCollectionFile(active)
  }
  const openImportPicker = () => importInputRef.current?.click()
  const importFiles = (files: File[]) =>
    run(async () => {
      const imported: string[] = []
      const errors: string[] = []
      let lastId: number | null = null
      for (const file of files) {
        try {
          const payload = parseCollectionPayload(await file.text())
          const collection = await importCollection(payload)
          imported.push(collection.name)
          lastId = collection.id
        } catch (error) {
          errors.push(`${file.name}: ${errorMessage(error)}`)
        }
      }
      if (lastId !== null) await loadCollections(lastId)
      setMessage(importSummary(files.length, imported.length, errors))
    })
  const editItem = (item: CollectionItem) =>
    setItemDraft({
      id: item.id,
      name: item.name,
      imageUrl: item.imageUrl || '',
      tags: item.tags.join(', '),
      values: item.values,
    })
  const catalogItems = active
    ? items
        .filter((item) => matchesItemFilter(item, active, filterField, filterValue))
        .sort((left, right) => compareItems(left, right, active, sortField, sortDirection))
    : []
  const platformColumn = active?.columns.find((column) => /^(plataforma|platform)$/i.test(column.label) || /^(plataforma|platform)$/i.test(column.name))
  const ownedColumn = active?.columns.find((column) => column.type === 'boolean' && /(colecci|owned|posee|complet)/i.test(`${column.label} ${column.name}`))
  const ownedCount = ownedColumn ? items.filter((item) => Boolean(item.values[ownedColumn.name])).length : null
  const clearFilters = () => {
    setSearch('')
    setFilterField('')
    setFilterValue('')
  }

  return (
    <section className="collection-tool">
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length) void importFiles(files)
        }}
      />
      {previewImage && <div className={styles.imagePreviewOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewImage(null) }}><div className={styles.imagePreviewModal} role="dialog" aria-modal="true" aria-label={`Vista original: ${previewImage.alt}`} tabIndex={-1}><button className={styles.imagePreviewClose} aria-label="Cerrar imagen" onClick={() => setPreviewImage(null)}>×</button><img src={previewImage.src} alt={previewImage.alt} /></div></div>}
      <SectionHeading eyebrow="TU BIBLIOTECA, A TU MANERA" title="Colección" description="Un lugar para guardar y organizar lo que te gusta." status="PostgreSQL local" />
      <div className="collection-tabs app-tabs">
        <button className={view === 'catalog' ? 'active' : ''} onClick={() => setView('catalog')}>
          Catálogo <b>{items.length}</b>
        </button>
        <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>
          Configuración
        </button>
        <button className={view === 'wishlist' ? 'active' : ''} onClick={() => setView('wishlist')}>
          Wishlist
        </button>
        <button className={view === 'metadata' ? 'active' : ''} onClick={() => setView('metadata')}>
          Metadata LaunchBox
        </button>
      </div>
      <div className="workspace collection-workspace">
        {view !== 'wishlist' && (
          <div className={styles.collectionBar}>
            <div className={styles.collections}>
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  className={`${styles.collectionButton} ${collection.id === activeId && !editingNewCollection ? styles.collectionActive : ''}`}
                  onClick={() => {
                    setActiveId(collection.id)
                    setEditingNewCollection(false)
                    setItemDraft(null)
                    setCollectionDraft(draftFromCollection(collection))
                    configureCatalog(collection)
                  }}
                >
                  {collection.name}
                </button>
              ))}
            </div>
            <button className={styles.secondaryButton}
              onClick={() => {
                setEditingNewCollection(true)
                setCollectionDraft(EMPTY_COLLECTION)
                setView('settings')
              }}
            >
              + Nueva colección
            </button>
          </div>
        )}
        {message && <p className="collection-message">{message}</p>}
        {view === 'catalog' ? (
          <>
            {active && <div className={styles.catalogHeading}>
              <div><h2>{active.name}</h2><p>{items.length} ediciones{ownedCount === null ? '' : ` · ${ownedCount} en colección`}</p></div>
              <button className={styles.primaryButton} disabled={busy} onClick={() => setItemDraft(EMPTY_ITEM)}><svg><use href="#icon-plus" /></svg>Agregar ítem</button>
            </div>}
            <div className={styles.tools}>
              <label className={styles.search}>
                <svg><use href="#icon-search" /></svg>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en tu colección…" aria-label="Buscar en tu colección" />
                {search && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch('')}>×</button>}
              </label>
              <button className={`${styles.secondaryButton} ${styles.filterButton}`} aria-expanded={filtersOpen} aria-controls="collection-filter-panel" onClick={() => setFiltersOpen((open) => !open)}><svg><use href="#icon-filter" /></svg>Filtros</button>
              <select className={styles.sort} aria-label="Ordenar por" value={sortField} onChange={(event) => changeSorting(event.target.value, sortDirection)}>
                <option value="name">Nombre</option>
                {active?.columns.map((column) => <option key={column.name} value={column.name}>{column.label}</option>)}
              </select>
              <button className={styles.directionButton} title={sortDirection === 'asc' ? 'Orden ascendente' : 'Orden descendente'} aria-label={sortDirection === 'asc' ? 'Cambiar a orden descendente' : 'Cambiar a orden ascendente'} onClick={() => changeSorting(sortField, sortDirection === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? '↑' : '↓'}</button>
              <div className={styles.viewSwitch} role="group" aria-label="Vista del catálogo">
                <button className={catalogView === 'grid' ? 'active' : ''} onClick={() => changeCatalogView('grid')} aria-label="Vista en tarjetas" aria-pressed={catalogView === 'grid'}><svg><use href="#icon-grid" /></svg></button>
                <button className={catalogView === 'list' ? 'active' : ''} onClick={() => changeCatalogView('list')} aria-label="Vista en lista" aria-pressed={catalogView === 'list'}><svg><use href="#icon-list" /></svg></button>
              </div>
              <details className={styles.overflow} ref={actionsRef}>
                <summary aria-label="Más opciones">•••</summary>
                <div className={styles.menuItems}>
                  <button type="button" onClick={() => { actionsRef.current?.removeAttribute('open'); openImportPicker() }}>Importar JSON</button>
                  <button type="button" disabled={!active || busy} onClick={() => { actionsRef.current?.removeAttribute('open'); void exportActive() }}>Exportar JSON</button>
                </div>
              </details>
            </div>
            {active && (
              filtersOpen && <div className={styles.filterPanel} id="collection-filter-panel">
                <label><span>Filtrar por</span><select value={filterField} onChange={(event) => { setFilterField(event.target.value); setFilterValue('') }}><option value="">Cualquier campo</option><option value="name">Nombre</option>{active.columns.map((column) => <option key={column.name} value={column.name}>{column.label}</option>)}</select></label>
                <label><span>Valor del filtro</span><input value={filterValue} onChange={(event) => setFilterValue(event.target.value)} placeholder="Ej. plataforma, año, etiquetas…" /></label>
                <button className={styles.secondaryButton} onClick={clearFilters}>Limpiar filtros</button>
              </div>
            )}
            {itemDraft && active && (
              <ItemEditor
                collection={active}
                draft={itemDraft}
                setDraft={setItemDraft}
                save={saveItem}
                cancel={() => setItemDraft(null)}
                busy={busy}
              />
            )}
            {!active ? (
              <EmptyCollection text="Crea una colección para empezar a guardar tus elementos." action="Nueva colección" onAction={() => { setEditingNewCollection(true); setCollectionDraft(EMPTY_COLLECTION); setView('settings') }} />
            ) : catalogItems.length ? (
              <div className={`${styles.cards} ${catalogView === 'list' ? styles.list : ''}`}>
                {catalogItems.map((item) => (
                  <article className={styles.card} key={item.id}>
                    <div className={styles.cover}>
                      {item.imageUrl ? <button type="button" className={styles.imagePreviewTrigger} onClick={() => setPreviewImage({ src: item.imageUrl as string, alt: `Portada de ${item.name}` })} aria-label={`Ver imagen original de ${item.name}`}><img src={item.imageUrl} alt={`Portada de ${item.name}`} onError={(event) => { event.currentTarget.hidden = true }} /></button> : <div className={styles.noCover}><svg><use href="#icon-collection" /></svg><span>Sin imagen</span></div>}
                      {platformColumn && item.values[platformColumn.name] !== undefined && <span className={styles.platform}>{String(item.values[platformColumn.name])}</span>}
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardTitle}><h3>{item.name}</h3></div>
                      <dl className={styles.fields}>
                      {active.columns.map((column) =>
                        item.values[column.name] === undefined || column.name === platformColumn?.name || column.name === ownedColumn?.name ? null : (
                          <div className={styles.field} key={column.name}>
                            <dt>{column.label}</dt>
                            <dd>{formatValue(item.values[column.name], column.type)}</dd>
                          </div>
                        ),
                      )}
                      </dl>
                      {!!item.tags.length && (
                        <div className={styles.tags}>
                          {item.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <footer className={styles.cardFooter}>
                      <span>{ownedColumn ? (item.values[ownedColumn.name] ? '✓ En colección' : 'No en colección') : item.tags.length ? `${item.tags.length} etiquetas` : 'Ficha de colección'}</span>
                      <div><button className={styles.editAction} onClick={() => editItem(item)}>Editar</button><button className={styles.deleteAction} onClick={() => removeItem(item)}>Eliminar</button></div>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyCollection
                text={search || filterValue ? 'No encontramos coincidencias.' : 'Esta colección aún no tiene ítems.'}
                action={search || filterValue ? 'Limpiar filtros' : 'Agregar ítem'}
                onAction={search || filterValue ? clearFilters : () => setItemDraft(EMPTY_ITEM)}
              />
            )}
          </>
        ) : view === 'wishlist' ? (
          <WishlistView />
        ) : view === 'metadata' ? (
          <LaunchBoxPanel
            key={active?.id ?? 'none'}
            collection={active}
            collections={collections}
            onCollectionChanged={() => {
              if (activeId)
                fetchCollectionItems(activeId, search)
                  .then(setItems)
                  .catch((error: unknown) => setMessage(errorMessage(error)))
            }}
            notify={setMessage}
          />
        ) : (
          <CollectionEditor
            draft={collectionDraft}
            setDraft={setCollectionDraft}
            isNew={editingNewCollection}
            canDelete={!!active && !editingNewCollection}
            busy={busy}
            save={saveCollection}
            remove={removeCollection}
            exportCollection={active && !editingNewCollection ? () => exportCollectionFile(active) : undefined}
            importCollection={openImportPicker}
            collections={collections}
            activeId={activeId}
            onMove={moveCollection}
          />
        )}
      </div>
    </section>
  )
}

function EmptyCollection({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return (
    <div className={styles.emptyState}>
      <svg><use href="#icon-collection" /></svg>
      <strong>{text}</strong>
      {action && onAction && <button className={styles.secondaryButton} onClick={onAction}>{action}</button>}
    </div>
  )
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function parseCollectionPayload(raw: string): Record<string, unknown> {
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    throw new Error('El archivo no contiene un JSON válido.')
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new Error('El archivo no contiene una colección válida.')
  const record = payload as Record<string, unknown>
  const nested =
    record.collection && typeof record.collection === 'object' && !Array.isArray(record.collection)
      ? (record.collection as Record<string, unknown>)
      : null
  const source = nested ?? record
  const hasIdentity = typeof source.name === 'string' || typeof record.type === 'string' || typeof source.type === 'string'
  const hasBody =
    Array.isArray(source.columns) || Array.isArray(source.items) || Array.isArray(record.items)
  if (!hasIdentity || !hasBody)
    throw new Error('Falta la estructura esperada de una colección (name, columns, items o type).')
  return record
}

function importSummary(total: number, imported: number, errors: string[]) {
  const base = `Importación: ${imported}/${total} archivo(s) importado(s) correctamente.`
  return errors.length ? `${base} Errores → ${errors.join(' · ')}` : base
}

function formatValue(value: unknown, type: ColumnType) {
  if (Array.isArray(value)) return value.join(', ')
  if (type === 'boolean') return value ? 'Sí' : 'No'
  if (type === 'date' && typeof value === 'string') return formatDate(value)
  return String(value)
}

function formatDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    return new Date(year, month - 1, day).toLocaleDateString()
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function defaultDateColumn(collection: Collection) {
  const dateColumns = collection.columns.filter((column) => column.type === 'date')
  return (
    dateColumns.find((column) =>
      /fecha.*(lanzamiento|estreno)|release.*date/i.test(`${column.label} ${column.name}`),
    ) || dateColumns[0]
  )
}

function readCatalogView(): CatalogView {
  return localStorage.getItem(CATALOG_VIEW_KEY) === 'list' ? 'list' : 'grid'
}

function readCatalogSorts() {
  try {
    return JSON.parse(localStorage.getItem(CATALOG_SORT_KEY) || '{}') as Record<
      string,
      { field: string; direction: SortDirection }
    >
  } catch {
    return {}
  }
}

function savedCatalogSort(collection: Collection) {
  const sorting = readCatalogSorts()[collection.id]
  const validField =
    sorting?.field === 'name' ||
    collection.columns.some((column) => column.name === sorting?.field)
  const validDirection = sorting?.direction === 'asc' || sorting?.direction === 'desc'
  return validField && validDirection ? sorting : null
}

function saveCatalogSort(id: number, field: string, direction: SortDirection) {
  const sorting = readCatalogSorts()

  sorting[id] = { field, direction }
  localStorage.setItem(CATALOG_SORT_KEY, JSON.stringify(sorting))
}

function catalogDefaults(collection: Collection): { field: string; direction: SortDirection } {
  const dateColumn = defaultDateColumn(collection)
  return dateColumn
    ? { field: dateColumn.name, direction: 'asc' }
    : { field: 'name', direction: 'asc' }
}

function itemFieldValue(item: CollectionItem, field: string) {
  return field === 'name' ? item.name : item.values[field]
}

function matchesItemFilter(
  item: CollectionItem,
  collection: Collection,
  field: string,
  filter: string,
) {
  const query = filter.trim().toLocaleLowerCase()
  if (!query) return true
  const values = field
    ? [itemFieldValue(item, field)]
    : [item.name, ...collection.columns.map((column) => item.values[column.name]), ...item.tags]
  return values.some((value) =>
    (Array.isArray(value) ? value.join(', ') : String(value ?? ''))
      .toLocaleLowerCase()
      .includes(query),
  )
}

function compareItems(
  left: CollectionItem,
  right: CollectionItem,
  collection: Collection,
  field: string,
  direction: SortDirection,
) {
  const leftValue = itemFieldValue(left, field)
  const rightValue = itemFieldValue(right, field)
  const leftEmpty = leftValue === undefined || leftValue === null || leftValue === ''
  const rightEmpty = rightValue === undefined || rightValue === null || rightValue === ''
  if (leftEmpty && rightEmpty) return 0
  if (leftEmpty) return 1
  if (rightEmpty) return -1
  const column = collection.columns.find((entry) => entry.name === field)
  let comparison: number
  if (column?.type === 'number') comparison = Number(leftValue) - Number(rightValue)
  else if (column?.type === 'date')
    comparison = new Date(String(leftValue)).getTime() - new Date(String(rightValue)).getTime()
  else if (column?.type === 'boolean') comparison = Number(leftValue) - Number(rightValue)
  else
    comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  return direction === 'asc' ? comparison : -comparison
}
