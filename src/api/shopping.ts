import { requestJson, requestVoid } from './http'

export interface ShopContext {
  id: number
  name: string
  total: number
  createdAt: string
}

export interface ShopItem {
  id: number
  contextId: number
  url: string
  name: string
  page: string
  imageUrl: string | null
  price: number | null
  usdPrice: number | null
  currency: string | null
  condition: string | null
  store: string | null
  active: boolean
  error: string | null
  checkedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ShopSort = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'date-asc' | 'date-desc'

export const fetchShopContexts = () => requestJson<ShopContext[]>('/shopping/contexts')
export const createShopContext = (name: string) =>
  requestJson<ShopContext>('/shopping/contexts', { method: 'POST', body: { name } })
export const deleteShopContext = (id: number) => requestVoid(`/shopping/contexts/${id}`, { method: 'DELETE' })
export const fetchShopItems = (contextId: number, sort: ShopSort) =>
  requestJson<ShopItem[]>(`/shopping/contexts/${contextId}/items?sort=${encodeURIComponent(sort)}`)
export const addShopLinks = (contextId: number, text: string) =>
  requestJson<{ added: number; skipped: number; failed: number }>(`/shopping/contexts/${contextId}/links`, { method: 'POST', body: { text } })
export const refreshShopItems = (contextId: number) =>
  requestJson<{ updated: number; failed: number }>(`/shopping/contexts/${contextId}/refresh`, { method: 'POST' })
export const clearShopItems = (contextId: number) =>
  requestJson<{ removed: number }>(`/shopping/contexts/${contextId}/inactive`, { method: 'DELETE' })
