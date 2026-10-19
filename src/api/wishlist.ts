import { requestJson, requestVoid } from './http'

export interface WishlistPrice {
  id: number
  wishlistId: number
  store: string
  url: string
  price: number | null
  currency: string | null
  checkedAt: string | null
  error: string | null
}

export interface WishlistItem {
  id: number
  name: string
  manufacturer: string
  year: number | null
  imageUrl: string | null
  createdAt: string
  updatedAt: string
  prices: WishlistPrice[]
}

export interface WishlistItemInput {
  name?: string
  manufacturer?: string | null
  year?: number | null
  imageUrl?: string | null
}

export const fetchWishlist = (q?: string) =>
  requestJson<WishlistItem[]>(`/wishlist${q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)

export const createWishlistItem = (body: WishlistItemInput) =>
  requestJson<WishlistItem>('/wishlist', { method: 'POST', body })

export const updateWishlistItem = (id: number, body: WishlistItemInput) =>
  requestJson<WishlistItem>(`/wishlist/${id}`, { method: 'PATCH', body })

export const deleteWishlistItem = (id: number) => requestVoid(`/wishlist/${id}`, { method: 'DELETE' })

export interface WishlistRefreshResult {
  updated: number
  failed: number
  items: WishlistItem[]
}

export const refreshWishlist = () =>
  requestJson<WishlistRefreshResult>('/wishlist/refresh', { method: 'POST' })

export const addWishlistPrice = (id: number, body: { url: string; store?: string }) =>
  requestJson<WishlistPrice>(`/wishlist/${id}/prices`, { method: 'POST', body })

export const refreshWishlistPrice = (priceId: number) =>
  requestJson<WishlistPrice>(`/wishlist/prices/${priceId}/refresh`, { method: 'POST' })

export const deleteWishlistPrice = (priceId: number) =>
  requestVoid(`/wishlist/prices/${priceId}`, { method: 'DELETE' })
