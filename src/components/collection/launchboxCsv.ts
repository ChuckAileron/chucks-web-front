import type { LaunchBoxResultEntry } from '../../api/launchbox'

export const RESULT_CSV_HEADERS = [
  'Name',
  'Platform',
  'Found',
  'LaunchBox Title',
  'Boxart_URL',
  'Release_Date',
  'Publisher',
  'Developer',
]

export function buildResultCsv(results: LaunchBoxResultEntry[]) {
  const escape = (value: unknown) => {
    const text = String(value ?? '')
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [RESULT_CSV_HEADERS.join(',')]
  for (const entry of results) {
    const row: Record<string, string> = {
      Name: entry.name,
      Platform: entry.platform,
      Found: entry.found ? 'Sí' : 'No',
      'LaunchBox Title': entry.title || '',
      Boxart_URL: entry.metadata?.boxartUrl || '',
      Release_Date: entry.metadata?.releaseDate || '',
      Publisher: entry.metadata?.publisher || '',
      Developer: entry.metadata?.developer || '',
    }
    lines.push(RESULT_CSV_HEADERS.map((header) => escape(row[header])).join(','))
  }
  return lines.join('\r\n')
}
