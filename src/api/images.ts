import { requestJson } from './http'

export const IMAGE_ENGINES = ['bing', 'google', 'duckduckgo', 'wikimedia', 'openverse'] as const

export type ImageEngine = (typeof IMAGE_ENGINES)[number]

export interface ImageSearchResult {
  imageUrl: string
  thumbnailUrl: string
  title: string
  source: string
  pageUrl: string
  width?: number
  height?: number
}

export const searchImages = (body: { query: string; engine?: ImageEngine; page?: number }) =>
  requestJson<ImageSearchResult[]>('/images/search', { method: 'POST', body })
