import { useState } from 'react'
import type { Collection, CollectionColumn } from '../../api/collections'
import ImageSearchModal from './ImageSearchModal'

export interface ItemDraft {
  id?: number
  name: string
  imageUrl: string
  tags: string
  values: Record<string, unknown>
}

export const EMPTY_ITEM: ItemDraft = { name: '', imageUrl: '', tags: '', values: {} }

export default function ItemEditor({
  collection,
  draft,
  setDraft,
  save,
  cancel,
  busy,
}: {
  collection: Collection
  draft: ItemDraft
  setDraft: (draft: ItemDraft | null) => void
  save: () => void
  cancel: () => void
  busy: boolean
}) {
  const setValue = (name: string, value: unknown) =>
    setDraft({ ...draft, values: { ...draft.values, [name]: value } })
  const [searchOpen, setSearchOpen] = useState(false)
  return (
    <div className="collection-item-editor">
      <header>
        <div>
          <h2>{draft.id ? 'Editar ítem' : 'Nuevo ítem'}</h2>
          <p>Completa la ficha para {collection.name}.</p>
        </div>
        <button onClick={cancel}>Cerrar</button>
      </header>
      <div className="collection-form-grid">
        <label>
          <span>Nombre *</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          <span>URL de imagen</span>
          <div className="collection-image-row">
            <input
              type="url"
              value={draft.imageUrl}
              placeholder="https://..."
              onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
            />
            <button type="button" onClick={() => setSearchOpen(true)}>
              Buscar en internet
            </button>
          </div>
          {draft.imageUrl ? (
            <img
              className="collection-image-preview"
              src={draft.imageUrl}
              alt="Vista previa de la imagen del ítem"
            />
          ) : null}
        </label>
        <label className="wide">
          <span>Etiquetas, separadas por comas</span>
          <input
            value={draft.tags}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
          />
        </label>
        {collection.columns.map((column) => (
          <ColumnInput
            key={column.name}
            column={column}
            value={draft.values[column.name]}
            setValue={(value) => setValue(column.name, value)}
          />
        ))}
      </div>
      <button className="collection-save-item" disabled={busy || !draft.name.trim()} onClick={save}>
        Guardar ítem
      </button>
      {searchOpen && (
        <ImageSearchModal
          initialQuery={draft.name}
          onClose={() => setSearchOpen(false)}
          onConfirm={(url) => {
            setDraft({ ...draft, imageUrl: url })
            setSearchOpen(false)
          }}
        />
      )}
    </div>
  )
}

function ColumnInput({
  column,
  value,
  setValue,
}: {
  column: CollectionColumn
  value: unknown
  setValue: (value: unknown) => void
}) {
  if (column.type === 'boolean')
    return (
      <label className="collection-check">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => setValue(e.target.checked)}
        />
        <span>{column.label}</span>
      </label>
    )
  const inputType =
    column.type === 'number'
      ? 'number'
      : column.type === 'date'
        ? 'date'
        : column.type === 'url'
          ? 'url'
          : 'text'
  const display =
    column.type === 'tags' && Array.isArray(value)
      ? value.join(', ')
      : column.type === 'date' && typeof value === 'string'
        ? value.slice(0, 10)
        : String(value ?? '')
  return (
    <label>
      <span>
        {column.label} {column.required ? '*' : ''}
      </span>
      <input
        type={inputType}
        value={display}
        onChange={(e) =>
          setValue(column.type === 'tags' ? e.target.value.split(',') : e.target.value)
        }
      />
    </label>
  )
}
