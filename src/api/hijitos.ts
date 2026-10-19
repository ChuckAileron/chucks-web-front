import { requestJson, requestVoid } from './http'

export type HijitoPriority = 'bajo' | 'medio' | 'alto'
export interface HijitoSubtask { id: number; taskId: number; description: string; done: boolean; createdAt: string }
export interface HijitoTask { id: number; trackSlug: string; description: string; dueDate: string; priority: HijitoPriority; done: boolean; createdAt: string; updatedAt: string; subtasks: HijitoSubtask[] }
export interface HijitoTrack { slug: string; name: string; banner: string; bannerX: number; bannerY: number; createdAt: string; updatedAt: string; tasks: HijitoTask[]; stats: { total: number; done: number; pending: number; percent: number } }

export const fetchHijitos = () => requestJson<HijitoTrack[]>('/hijitos')
export const fetchHijitosBanner = async () => {
  const result = await requestJson<{ banner?: string } | string | undefined>('/hijitos/banner')
  return typeof result === 'string' ? result : result?.banner ?? ''
}
export const setHijitosBanner = async (banner: string) => {
  const result = await requestJson<{ banner?: string } | string | undefined>('/hijitos/banner', { method: 'PUT', body: { banner } })
  return typeof result === 'string' ? result : result?.banner ?? banner
}
export const updateHijitoTrack = (slug: string, patch: Partial<Pick<HijitoTrack, 'name' | 'banner' | 'bannerX' | 'bannerY'>>) =>
  requestJson<HijitoTrack>(`/hijitos/tracks/${encodeURIComponent(slug)}`, { method: 'PATCH', body: patch })
export const createHijitoTask = (body: { trackSlug: string; description: string; dueDate?: string; priority?: HijitoPriority }) =>
  requestJson<HijitoTask>('/hijitos/tasks', { method: 'POST', body })
export const updateHijitoTask = (id: number, patch: Partial<Pick<HijitoTask, 'trackSlug' | 'description' | 'dueDate' | 'priority' | 'done'>>) =>
  requestJson<HijitoTask>(`/hijitos/tasks/${id}`, { method: 'PATCH', body: patch })
export const deleteHijitoTask = (id: number) => requestVoid(`/hijitos/tasks/${id}`, { method: 'DELETE' })
export const createHijitoSubtask = (taskId: number, description: string) =>
  requestJson<HijitoSubtask>(`/hijitos/tasks/${taskId}/subtasks`, { method: 'POST', body: { description } })
export const updateHijitoSubtask = (id: number, patch: Partial<Pick<HijitoSubtask, 'description' | 'done'>>) =>
  requestJson<HijitoSubtask>(`/hijitos/subtasks/${id}`, { method: 'PATCH', body: patch })
export const deleteHijitoSubtask = (id: number) => requestVoid(`/hijitos/subtasks/${id}`, { method: 'DELETE' })
