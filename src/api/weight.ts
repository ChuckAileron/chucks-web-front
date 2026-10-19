import { requestJson, requestVoid } from './http'

export interface WeightEntry { date: string; weight: number; createdAt: string; updatedAt: string }
export interface WeightState { target: number | null; entries: WeightEntry[] }
export const fetchWeightState = () => requestJson<WeightState>('/weight')
export const setWeightTarget = (target: number | null) => requestJson<number | null>('/weight/target', { method: 'PUT', body: { target } })
export const saveWeightEntry = (date: string, weight: number) => requestJson<WeightEntry>('/weight/entries', { method: 'POST', body: { date, weight } })
export const deleteWeightEntry = (date: string) => requestVoid(`/weight/entries/${encodeURIComponent(date)}`, { method: 'DELETE' })
