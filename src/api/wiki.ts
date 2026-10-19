import { requestJson, requestVoid } from './http'

export interface WikiPage {
  id: number
  title: string
  slug: string
  category: string
  icon: string
  summary: string
  content: string
  tag: string
  pinned: boolean
  author: string
  banner: string
  bannerPosition: string
  parentId: number | null
  createdAt: string
  updatedAt: string
}

export interface WikiCategory {
  name: string
  total: number
  icon: string
  banner: string
}

export interface WikiStats {
  total: number
  contributors: number
  lastUpdated: string | null
}

export type WikiPageInput = Omit<Partial<WikiPage>, 'id' | 'slug' | 'createdAt' | 'updatedAt'> & {
  title: string
}

export const fetchWikiPages = (query?: string) =>
  requestJson<WikiPage[]>(`/wiki/pages${query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`)

export const fetchWikiPage = (id: number) => requestJson<WikiPage>(`/wiki/pages/${id}`)
export const fetchWikiCategories = () => requestJson<WikiCategory[]>('/wiki/categories')
export const fetchWikiStats = () => requestJson<WikiStats>('/wiki/stats')
export const createWikiPage = (body: WikiPageInput) =>
  requestJson<WikiPage>('/wiki/pages', { method: 'POST', body })
export const updateWikiPage = (id: number, body: Partial<WikiPageInput>) =>
  requestJson<WikiPage>(`/wiki/pages/${id}`, { method: 'PATCH', body })
export const deleteWikiPage = (id: number) => requestVoid(`/wiki/pages/${id}`, { method: 'DELETE' })
export const setWikiCategoryBanner = (category: string, banner: string) =>
  requestJson<{ category: string; banner: string }>('/wiki/categories/banner', {
    method: 'POST',
    body: { category, banner },
  })
