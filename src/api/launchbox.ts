import type { CollectionItem } from './collections'
import { requestJson } from './http'

export interface LaunchBoxMapping {
  platformColumn: string
  releaseDateColumn?: string
  publisherColumn?: string
  developerColumn?: string
}

export interface LaunchBoxMetadata {
  boxartUrl?: string
  releaseDate?: string
  publisher?: string
  developer?: string
}

export interface LaunchBoxRow {
  name: string
  platform?: string
  itemId?: number
}

export interface LaunchBoxResultEntry {
  name: string
  platform: string
  itemId: number | null
  found: boolean
  title?: string
  platformLabel?: string
  metadata?: LaunchBoxMetadata | null
  error?: string
}

export interface LaunchBoxSingleResult {
  inCollection: boolean
  itemId: number | null
  found: boolean
  title: string
  platformLabel: string
  metadata: LaunchBoxMetadata | null
}

export type LaunchBoxJobStatus = 'running' | 'done' | 'cancelled'

export interface LaunchBoxJobProgress {
  jobId: string
  status: LaunchBoxJobStatus
  current: number
  total: number
  name: string
  message: string
}

export interface LaunchBoxApplySummary {
  applied: number
  missing: number
  skipped: number
  failed: number
}

export interface LaunchBoxCsvApplySummary extends LaunchBoxApplySummary {
  fileName: string
}

export const searchLaunchBoxSingle = (body: {
  collectionId: number
  platformColumn: string
  name: string
  platform?: string
}) => requestJson<LaunchBoxSingleResult>('/launchbox/single', { method: 'POST', body })

export const applyLaunchBoxOne = (body: {
  mapping: LaunchBoxMapping
  itemId: number
  metadata?: LaunchBoxMetadata | null
}) => requestJson<CollectionItem>('/launchbox/apply-one', { method: 'POST', body })

export const parseLaunchBoxCsv = (csvText: string) =>
  requestJson<{ headers: string[]; rows: Array<{ name: string; platform: string }> }>(
    '/launchbox/csv/parse',
    { method: 'POST', body: { csvText } },
  )

export const matchLaunchBoxRows = (body: {
  collectionId: number
  platformColumn: string
  rows: LaunchBoxRow[]
}) =>
  requestJson<{
    matched: Array<{ name: string; platform: string; itemId: number }>
    missing: Array<{ name: string; platform: string }>
  }>('/launchbox/match-rows', { method: 'POST', body })

export const startLaunchBoxBulk = (rows: LaunchBoxRow[]) =>
  requestJson<{ jobId: string }>('/launchbox/bulk', { method: 'POST', body: { rows } })

export const fetchLaunchBoxBulkProgress = (jobId: string) =>
  requestJson<LaunchBoxJobProgress>(`/launchbox/bulk/${jobId}`)

export const fetchLaunchBoxBulkResults = (jobId: string) =>
  requestJson<{ status: LaunchBoxJobStatus; results: LaunchBoxResultEntry[] }>(
    `/launchbox/bulk/${jobId}/results`,
  )

export const cancelLaunchBoxBulk = (jobId: string) =>
  requestJson<{ cancelled: boolean }>(`/launchbox/bulk/${jobId}/cancel`, { method: 'POST' })

export const applyLaunchBoxBulk = (body: {
  mapping: LaunchBoxMapping
  results: LaunchBoxResultEntry[]
}) => requestJson<LaunchBoxApplySummary>('/launchbox/apply-bulk', { method: 'POST', body })

export const applyLaunchBoxResultsCsv = (body: {
  collectionId: number
  mapping: LaunchBoxMapping
  csvText: string
  fileName?: string
}) => requestJson<LaunchBoxCsvApplySummary>('/launchbox/apply-results-csv', { method: 'POST', body })
