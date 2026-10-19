import { requestJson, requestVoid } from './http'

export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'url' | 'tags'

export interface CollectionColumn {
  id: number
  collectionId: number
  name: string
  label: string
  type: ColumnType
  required: boolean
  position: number
}

export interface Collection {
  id: number
  name: string
  description: string
  type: string
  position: number
  createdAt: string
  updatedAt: string
  columns: CollectionColumn[]
}

export interface CollectionItem {
  id: number
  collectionId: number
  name: string
  values: Record<string, unknown>
  imageUrl: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface CollectionColumnExport {
  name: string
  label: string
  type: ColumnType
  required: boolean
  position: number
}

export interface CollectionExport {
  format: 'chucks-collection'
  collection: {
    id: number
    name: string
    description: string
    type: string
    createdAt: string
    updatedAt: string
    columns: CollectionColumnExport[]
  }
  items: Array<{
    id: number
    name: string
    values: Record<string, unknown>
    imageUrl: string | null
    tags: string[]
    createdAt: string
    updatedAt: string
  }>
}

export interface CollectionInput {
  name: string
  description?: string
  type?: string
  columns?: Array<{ name: string; label: string; type: ColumnType; required?: boolean }>
}

export interface CollectionItemInput {
  name?: string
  imageUrl?: string | null
  tags?: string[]
  values?: Record<string, unknown>
}

export const fetchCollections = () => requestJson<Collection[]>('/collections')

export const fetchCollection = (id: number) => requestJson<Collection>(`/collections/${id}`)

export const createCollection = (body: CollectionInput) =>
  requestJson<Collection>('/collections', { method: 'POST', body })

export const updateCollection = (id: number, body: CollectionInput) =>
  requestJson<Collection>(`/collections/${id}`, { method: 'PATCH', body })

export const deleteCollection = (id: number) =>
  requestVoid(`/collections/${id}`, { method: 'DELETE' })

export const reorderCollections = (ids: number[]) =>
  requestJson<Collection[]>('/collections/reorder', { method: 'PUT', body: { ids } })

export const fetchCollectionItems = (collectionId: number, q?: string) =>
  requestJson<CollectionItem[]>(
    `/collections/${collectionId}/items${q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`,
  )

export const createCollectionItem = (collectionId: number, body: CollectionItemInput) =>
  requestJson<CollectionItem>(`/collections/${collectionId}/items`, { method: 'POST', body })

export const updateCollectionItem = (itemId: number, body: CollectionItemInput) =>
  requestJson<CollectionItem>(`/collections/items/${itemId}`, { method: 'PATCH', body })

export const deleteCollectionItem = (itemId: number) =>
  requestVoid(`/collections/items/${itemId}`, { method: 'DELETE' })

export const exportCollection = (id: number) =>
  requestJson<CollectionExport>(`/collections/${id}/export`)

export const importCollection = (payload: Record<string, unknown>) =>
  requestJson<Collection>('/collections/import', { method: 'POST', body: { payload } })
