import type { Collection, ColumnType } from '../../api/collections'

export interface ColumnDraft {
  name: string
  label: string
  type: ColumnType
  required: boolean
}

export interface CollectionDraft {
  name: string
  description: string
  type: string
  columns: ColumnDraft[]
}

export const EMPTY_COLLECTION: CollectionDraft = {
  name: '',
  description: '',
  type: 'generic',
  columns: [],
}

export const TYPE_LABELS: Record<ColumnType, string> = {
  string: 'Texto',
  number: 'Número',
  boolean: 'Sí / No',
  date: 'Fecha',
  url: 'URL',
  tags: 'Etiquetas',
}

export function draftFromCollection(collection: Collection): CollectionDraft {
  return {
    name: collection.name,
    description: collection.description,
    type: collection.type,
    columns: collection.columns.map((column) => ({
      name: column.name,
      label: column.label,
      type: column.type,
      required: column.required,
    })),
  }
}

export default function CollectionEditor({
  draft,
  setDraft,
  isNew,
  canDelete,
  busy,
  save,
  remove,
  exportCollection,
  importCollection,
  collections,
  activeId,
  onMove,
}: {
  draft: CollectionDraft
  setDraft: (draft: CollectionDraft) => void
  isNew: boolean
  canDelete: boolean
  busy: boolean
  save: () => void
  remove: () => void
  exportCollection?: () => void
  importCollection?: () => void
  collections: Collection[]
  activeId: number | null
  onMove: (id: number, direction: -1 | 1) => void
}) {
  const addColumn = () =>
    setDraft({
      ...draft,
      columns: [
        ...draft.columns,
        {
          name: `campo_${draft.columns.length + 1}`,
          label: 'Nuevo campo',
          type: 'string',
          required: false,
        },
      ],
    })
  const updateColumn = (index: number, patch: Partial<ColumnDraft>) =>
    setDraft({
      ...draft,
      columns: draft.columns.map((column, position) =>
        position === index ? { ...column, ...patch } : column,
      ),
    })
  return (
    <div className="collection-settings">
      <section>
        <h2>{isNew ? 'Nueva colección' : 'Datos de la colección'}</h2>
        <div className="collection-form-grid">
          <label>
            <span>Nombre</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            <span>Tipo</span>
            <input
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            />
          </label>
          <label className="wide">
            <span>Descripción</span>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
        </div>
      </section>
      <section>
        <header>
          <div>
            <h2>Columnas de metadatos</h2>
            <p>Define los datos que tendrá cada ficha de esta colección.</p>
          </div>
          <button onClick={addColumn}>+ Agregar columna</button>
        </header>
        <div className="collection-columns">
          {draft.columns.map((column, index) => (
            <div key={index}>
              <input
                value={column.label}
                placeholder="Etiqueta"
                onChange={(e) => updateColumn(index, { label: e.target.value })}
              />
              <input
                value={column.name}
                placeholder="clave_interna"
                onChange={(e) => updateColumn(index, { name: e.target.value })}
              />
              <select
                value={column.type}
                onChange={(e) => updateColumn(index, { type: e.target.value as ColumnType })}
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={column.required}
                  onChange={(e) => updateColumn(index, { required: e.target.checked })}
                />
                Obligatoria
              </label>
              <button
                onClick={() =>
                  setDraft({
                    ...draft,
                    columns: draft.columns.filter((_, position) => position !== index),
                  })
                }
              >
                Quitar
              </button>
            </div>
          ))}
          {!draft.columns.length && <p>No hay columnas personalizadas.</p>}
        </div>
      </section>
      <section>
        <header>
          <div>
            <h2>Orden de las pestañas</h2>
            <p>Usa las flechas para cambiar el orden en que se muestran las colecciones.</p>
          </div>
        </header>
        <div className="collection-reorder">
          {collections.map((collection, index) => (
            <div key={collection.id} className={collection.id === activeId ? 'active' : ''}>
              <span>{collection.name}</span>
              <button
                type="button"
                disabled={index === 0 || busy}
                onClick={() => onMove(collection.id, -1)}
                title="Subir"
                aria-label={`Subir ${collection.name}`}
              >
                ▲
              </button>
              <button
                type="button"
                disabled={index === collections.length - 1 || busy}
                onClick={() => onMove(collection.id, 1)}
                title="Bajar"
                aria-label={`Bajar ${collection.name}`}
              >
                ▼
              </button>
            </div>
          ))}
          {!collections.length && (
            <p className="collection-columns-empty">No hay colecciones todavía.</p>
          )}
        </div>
      </section>
      <div className="collection-settings-actions">
        {canDelete && <button onClick={remove}>Eliminar colección</button>}
        {!isNew && exportCollection && (
          <button type="button" disabled={busy} onClick={exportCollection} title="Descarga un JSON con la colección completa (columnas e ítems)">
            Exportar JSON
          </button>
        )}
        {importCollection && (
          <button
            type="button"
            className="collection-import-action"
            disabled={busy}
            onClick={importCollection}
            title="Importa una o varias colecciones desde archivos JSON"
          >
            Importar JSON
          </button>
        )}
        <button disabled={busy || !draft.name.trim()} onClick={save}>
          {isNew ? 'Crear colección' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
