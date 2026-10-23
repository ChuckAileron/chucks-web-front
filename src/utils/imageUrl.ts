/** Converts share links from Google Drive into URLs that can be used by an image element. */
export function imageUrlForDisplay(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'drive.google.com' && parsed.hostname !== 'www.drive.google.com') return url

    const fileId = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? parsed.searchParams.get('id')
    if (!fileId) return url

    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`
  } catch {
    return url
  }
}
