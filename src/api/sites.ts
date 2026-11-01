import { requestJson, requestVoid } from './http'

export interface SiteContext {
  id: number
  name: string
  total: number
  createdAt: string
}

export interface SavedSite {
  id: number
  contextId: number
  url: string
  title: string
  hostname: string
  screenshot: string
  capturedAt: string
  createdAt: string
  updatedAt: string
}

export const fetchSiteContexts = () => requestJson<SiteContext[]>('/sites/contexts')
export const createSiteContext = (name: string) =>
  requestJson<SiteContext>('/sites/contexts', { method: 'POST', body: { name } })
export const deleteSiteContext = (id: number) => requestVoid(`/sites/contexts/${id}`, { method: 'DELETE' })
export const renameSiteContext = (id: number, name: string) =>
  requestJson<SiteContext>(`/sites/contexts/${id}`, { method: 'PATCH', body: { name } })
export const fetchSitePages = (contextId: number) =>
  requestJson<SavedSite[]>(`/sites/contexts/${contextId}/pages`)
export const saveSitePage = (contextId: number, url: string) =>
  requestJson<SavedSite>(`/sites/contexts/${contextId}/pages`, { method: 'POST', body: { url } })
export const recaptureSitePage = (id: number) =>
  requestJson<SavedSite>(`/sites/pages/${id}/capture`, { method: 'POST' })
export const deleteSitePage = (id: number) => requestVoid(`/sites/pages/${id}`, { method: 'DELETE' })
