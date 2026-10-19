import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import {
  createWikiPage,
  deleteWikiPage,
  fetchWikiCategories,
  fetchWikiPages,
  fetchWikiStats,
  setWikiCategoryBanner,
  updateWikiPage,
  type WikiCategory,
  type WikiPage,
  type WikiPageInput,
  type WikiStats,
} from '../api/wiki'
import { downloadTextFile, sanitizeFileName } from '../utils/files'
import { highlightCodeLines } from '../utils/wikiHighlight'
import SectionHeading from './SectionHeading'
import styles from './WikiTool.module.css'

type View = 'home' | 'browse' | 'recent' | 'pinned' | 'category' | 'page' | 'editor'
type ImportFile = { file: File; relativePath: string }
type Draft = {
  id: number | null
  title: string
  category: string
  icon: string
  summary: string
  content: string
  tag: string
  pinned: boolean
  banner: string
  bannerPosition: string
  parentId: number | null
}
const EMPTY_STATS: WikiStats = { total: 0, contributors: 0, lastUpdated: null }
const EMPTY_DRAFT: Draft = {
  id: null,
  title: '',
  category: '',
  icon: '📄',
  summary: '',
  content: '',
  tag: '',
  pinned: false,
  banner: '',
  bannerPosition: 'center',
  parentId: null,
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function relativeTime(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

function ancestors(page: WikiPage, pages: WikiPage[]) {
  const result: WikiPage[] = []
  let parent = page.parentId === null ? undefined : pages.find((item) => item.id === page.parentId)
  const seen = new Set<number>()
  while (parent && !seen.has(parent.id)) {
    result.unshift(parent)
    seen.add(parent.id)
    parent = parent.parentId === null ? undefined : pages.find((item) => item.id === parent?.parentId)
  }
  return result
}

function safeLink(value: string) {
  try {
    const url = new URL(value)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function inlineMarkdown(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(\[([^\]]+)\]\(([^)]+)\))|(<br\s*\/?>)/gi
  let last = 0
  let index = 0
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0
    if (at > last) nodes.push(text.slice(last, at))
    const token = match[0]
    const itemKey = `${key}-${index++}`
    if (/^<br\s*\/?>$/i.test(token)) nodes.push(<br key={itemKey} />)
    else if (token.startsWith('`')) nodes.push(<code key={itemKey}>{token.slice(1, -1)}</code>)
    else if (token.startsWith('**') || token.startsWith('__'))
      nodes.push(<strong key={itemKey}>{token.slice(2, -2)}</strong>)
    else if (token.startsWith('[')) {
      const href = safeLink(match[8])
      nodes.push(
        href ? (
          <a key={itemKey} href={href} target="_blank" rel="noreferrer">
            {match[7]}
          </a>
        ) : (
          match[7]
        ),
      )
    } else nodes.push(<em key={itemKey}>{token.slice(1, -1)}</em>)
    last = at + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function MarkdownContent({ content }: { content: string }) {
  const blocks: ReactNode[] = []
  const lines = content.split(/\r?\n/)
  let paragraph: string[] = []
  let list: string[] = []
  let quote: string[] = []
  let code: string[] | null = null
  let codeLanguage = ''
  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push(<p key={`p${blocks.length}`}>{paragraph.map((line, i) => <span key={i}>{i > 0 && <br />}{inlineMarkdown(line, `p${blocks.length}-${i}`)}</span>)}</p>)
    paragraph = []
  }
  const flushList = () => {
    if (!list.length) return
    blocks.push(<ul key={`ul${blocks.length}`}>{list.map((line, i) => <li key={i}>{inlineMarkdown(line, `li${blocks.length}-${i}`)}</li>)}</ul>)
    list = []
  }
  const flushQuote = () => {
    if (!quote.length) return
    blocks.push(<blockquote key={`q${blocks.length}`}>{quote.map((line, i) => <p key={i}>{inlineMarkdown(line, `q${blocks.length}-${i}`)}</p>)}</blockquote>)
    quote = []
  }
  const flushText = () => { flushParagraph(); flushList(); flushQuote() }
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (code) {
      if (/^```/.test(line.trim())) {
        blocks.push(<WikiCodeBlock key={`code${blocks.length}`} code={code.join('\n')} language={codeLanguage} />)
        code = null
      } else code.push(raw)
      continue
    }
    const fence = /^```\s*(\S*)/.exec(line.trim())
    if (fence) { flushText(); code = []; codeLanguage = fence[1] || ''; continue }
    if (!line.trim()) { flushText(); continue }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      flushText()
      const level = Math.min(heading[1].length, 4) + 1
      const tag = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5'
      blocks.push(<Heading key={`h${blocks.length}`} tag={tag}>{inlineMarkdown(heading[2], `h${blocks.length}`)}</Heading>)
      continue
    }
    const quoteLine = /^>\s?(.*)$/.exec(line)
    if (quoteLine) { flushParagraph(); flushList(); quote.push(quoteLine[1]); continue }
    const listLine = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (listLine) { flushParagraph(); flushQuote(); list.push(listLine[1]); continue }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { flushText(); blocks.push(<hr key={`hr${blocks.length}`} />); continue }
    flushList(); flushQuote(); paragraph.push(line)
  }
  flushText()
  if (code) blocks.push(<WikiCodeBlock key={`code${blocks.length}`} code={code.join('\n')} language={codeLanguage} />)
  return <div className={styles.markdown}>{blocks.length ? blocks : <p className={styles.muted}>Esta página todavía no tiene contenido.</p>}</div>
}

function Heading({ tag, children }: { tag: 'h2' | 'h3' | 'h4' | 'h5'; children: ReactNode }) {
  if (tag === 'h2') return <h2>{children}</h2>
  if (tag === 'h3') return <h3>{children}</h3>
  if (tag === 'h4') return <h4>{children}</h4>
  return <h5>{children}</h5>
}

function WikiCodeBlock({ code, language }: { code: string; language: string }) {
  const lines = code.split('\n')
  const highlighted = useMemo(() => highlightCodeLines(code, language), [code, language])
  const languageLabel = highlighted.language || language || 'texto'
  const hasPreview = lines.length > 5
  const [expanded, setExpanded] = useState(!hasPreview)
  const [wrap, setWrap] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const copyCode = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
      } else {
        const input = document.createElement('textarea')
        input.value = code
        input.setAttribute('readonly', '')
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.select()
        const succeeded = document.execCommand('copy')
        input.remove()
        if (!succeeded) throw new Error('No se pudo copiar')
      }
      setCopied(true)
      setCopyError(false)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
      setCopyError(true)
      window.setTimeout(() => setCopyError(false), 2500)
    }
  }
  return (
    <section className={styles.codeCard}>
      <div className={styles.codeToolbar}>
        <span className={styles.codeLanguage}>{languageLabel}</span>
        <span className={styles.codeFilename}>{languageLabel !== 'texto' ? `Bloque ${languageLabel}` : 'Bloque de código'}</span>
        <small>{lines.length} líneas</small>
        <button type="button" className={`${styles.codeCopy} ${copied ? styles.codeCopied : ''} ${copyError ? styles.codeCopyError : ''}`} onClick={(event) => void copyCode(event)} aria-live="polite" aria-label={copied ? 'Código copiado' : copyError ? 'No se pudo copiar el código' : 'Copiar código'} title={copyError ? 'No se pudo copiar; puedes seleccionar el texto manualmente' : 'Copiar código'}><svg><use href="#icon-copy" /></svg><span>{copied ? 'Copiado' : copyError ? 'Error al copiar' : 'Copiar'}</span></button>
      </div>
      <details className={styles.codeDetails} open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary aria-label={`${expanded ? 'Contraer' : 'Expandir'} bloque de código ${language}`}>
          {!expanded && <pre className={styles.codePreview}>{lines.slice(0, 5).map((line, index) => <span className={styles.codeLine} data-line={index + 1} key={index}>{highlighted.lines[index]?.map((token, tokenIndex) => token.className ? <span className={token.className} key={tokenIndex}>{token.text}</span> : token.text) || line || ' '}</span>)}</pre>}
          <span className={styles.codeExpand}>{expanded ? 'Contraer código' : `Ver código completo · ${lines.length} líneas`} <b>{expanded ? '⌃' : '⌄'}</b></span>
        </summary>
        {expanded && <div className={styles.codeScroll} tabIndex={0} role="region" aria-label={`Código ${languageLabel}, ${lines.length} líneas`}><pre className={`${styles.codeSource} ${wrap ? styles.codeWrap : ''}`}><code>{lines.map((line, index) => <span className={styles.codeLine} data-line={index + 1} key={index}>{highlighted.lines[index]?.map((token, tokenIndex) => token.className ? <span className={token.className} key={tokenIndex}>{token.text}</span> : token.text) || line || ' '}</span>)}</code></pre></div>}
        {expanded && <div className={styles.codeBottom}><label><input type="checkbox" checked={wrap} onChange={(event) => setWrap(event.target.checked)} /> Ajustar líneas</label><button type="button" onClick={() => setExpanded(false)}>Contraer bloque ↑</button></div>}
      </details>
    </section>
  )
}

export default function WikiTool() {
  const [pages, setPages] = useState<WikiPage[]>([])
  const [categories, setCategories] = useState<WikiCategory[]>([])
  const [stats, setStats] = useState<WikiStats>(EMPTY_STATS)
  const [view, setView] = useState<View>('home')
  const [activeCategory, setActiveCategory] = useState('')
  const [activePage, setActivePage] = useState<WikiPage | null>(null)
  const [structureOpen, setStructureOpen] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [importState, setImportState] = useState<{ label: string; current: number; total: number } | null>(null)
  const [message, setMessage] = useState('')
  const [bannerDraft, setBannerDraft] = useState('')
  const [editingBanner, setEditingBanner] = useState(false)
  const [importCategoryOpen, setImportCategoryOpen] = useState(false)
  const [importCategory, setImportCategory] = useState('General')
  const [customImportCategory, setCustomImportCategory] = useState(false)
  const [collapsedOutlineCategories, setCollapsedOutlineCategories] = useState<Set<string>>(new Set())
  const [collapsedOutlinePages, setCollapsedOutlinePages] = useState<Set<number>>(new Set())
  const fileRef = useRef<HTMLInputElement | null>(null)
  const bulkFileRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    try {
      const [nextPages, nextCategories, nextStats] = await Promise.all([
        fetchWikiPages(), fetchWikiCategories(), fetchWikiStats(),
      ])
      setPages(nextPages)
      setCategories(nextCategories)
      setStats(nextStats)
      setActivePage((current) => current ? nextPages.find((page) => page.id === current.id) ?? null : null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar la Wiki.')
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    bulkFileRef.current?.setAttribute('webkitdirectory', '')
    bulkFileRef.current?.setAttribute('directory', '')
  }, [])
  useEffect(() => {
    if (!structureOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setStructureOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [structureOpen])

  const normalizedTerm = normalize(search.trim())
  const filtered = useMemo(() => {
    if (normalizedTerm) {
      return pages.filter((page) => normalize([page.title, page.summary, page.tag, page.category, page.author, page.content].join(' ')).includes(normalizedTerm))
    }
    if (view === 'recent') return pages.slice(0, 20)
    if (view === 'pinned') return pages.filter((page) => page.pinned)
    if (view === 'category') return pages.filter((page) => page.category === activeCategory && page.parentId === null)
    return pages
  }, [pages, normalizedTerm, view, activeCategory])

  const go = (next: View) => { setView(next); setSearch(''); setActivePage(null); setDraft(null); setMessage('') }
  const openCategory = (name: string) => { setActiveCategory(name); setActivePage(null); setSearch(''); setView('category') }
  const openPage = (page: WikiPage) => { setActivePage(page); setSearch(''); setView('page') }
  const togglePinned = async (page: WikiPage) => {
    try {
      const updated = await updateWikiPage(page.id, { pinned: !page.pinned })
      setPages((current) => current.map((item) => item.id === updated.id ? updated : item))
      setActivePage((current) => current?.id === updated.id ? updated : current)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar la página destacada.')
    }
  }
  const toggleOutlineCategory = (name: string) => setCollapsedOutlineCategories((current) => {
    const next = new Set(current)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return next
  })
  const toggleOutlinePage = (id: number) => setCollapsedOutlinePages((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const startCreate = (parent?: WikiPage) => {
    setMessage('')
    setDraft({ ...EMPTY_DRAFT, category: parent?.category ?? (view === 'category' ? activeCategory : ''), parentId: parent?.id ?? null })
    setView('editor')
  }
  const startEdit = (page: WikiPage) => {
    setDraft({
      id: page.id, title: page.title, category: page.category, icon: page.icon, summary: page.summary,
      content: page.content, tag: page.tag, pinned: page.pinned, banner: page.banner,
      bannerPosition: page.bannerPosition, parentId: page.parentId,
    })
    setMessage('')
    setView('editor')
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft) return
    setBusy(true)
    setMessage('')
    try {
      const payload: WikiPageInput = {
        title: draft.title.trim(),
        category: draft.parentId === null ? draft.category.trim() || 'General' : pages.find((page) => page.id === draft.parentId)?.category || draft.category,
        icon: draft.icon.trim() || '📄', summary: draft.summary.trim(), content: draft.content,
        tag: draft.tag.trim(), pinned: draft.pinned, banner: draft.banner.trim(),
        bannerPosition: draft.bannerPosition, parentId: draft.parentId,
      }
      const saved = draft.id ? await updateWikiPage(draft.id, payload) : await createWikiPage(payload)
      setActivePage(saved)
      setDraft(null)
      setView('page')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la página.')
    } finally { setBusy(false) }
  }

  const remove = async (page: WikiPage) => {
    const childCount = descendants(page.id, pages).length
    const detail = childCount ? ` También se borrarán ${childCount} subpáginas.` : ''
    if (!window.confirm(`¿Borrar “${page.title}”?${detail}`)) return
    setBusy(true)
    try { await deleteWikiPage(page.id); setActivePage(null); setView('home'); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo borrar la página.') }
    finally { setBusy(false) }
  }

  const importMarkdown = async (file?: File) => {
    if (!file || !draft) return
    setImportState({ label: 'Leyendo archivo Markdown…', current: 0, total: 1 })
    try {
      const content = await file.text()
      const firstLine = content.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !/^#{1,6}\s/.test(line)) || ''
      setDraft({ ...draft, content, title: draft.title || file.name.replace(/\.(md|markdown|txt)$/i, ''), summary: draft.summary || firstLine.replace(/[*_`>#-]/g, '').slice(0, 160) })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo leer el archivo Markdown.')
    } finally {
      setImportState(null)
    }
  }

  const prepareFolderSelection = (files: File[]): ImportFile[] => {
    const selectedPaths = files.map((file) => (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name)
    const incomingRoots = [...new Set(selectedPaths.map((path) => path.split(/[\\/]/)[0] || 'Carpeta'))]
    const rootMap = new Map<string, string>()
    const rootsInUse = new Set<string>()
    for (const root of incomingRoots) {
      let uniqueRoot = root
      let suffix = 2
      while (rootsInUse.has(uniqueRoot)) uniqueRoot = `${root} (${suffix++})`
      rootsInUse.add(uniqueRoot)
      rootMap.set(root, uniqueRoot)
    }
    return files.map((file, index) => {
        const relativePath = selectedPaths[index].replace(/[\\/]/g, '/')
        const root = relativePath.split('/')[0] || 'Carpeta'
        return { file, relativePath: relativePath.replace(root, rootMap.get(root) ?? root) }
      })
  }

  const importMarkdownFolder = async (files: ImportFile[], selectedCategory: string) => {
    const markdownFiles = files.filter(({ file }) => /\.(md|markdown)$/i.test(file.name))
    if (!markdownFiles.length) {
      setMessage('No se encontraron archivos Markdown en la carpeta seleccionada.')
      return
    }
    const category = selectedCategory.trim() || 'General'
    const rootParentId = view === 'page' ? activePage?.id ?? null : null
    const folderFiles = new Map<string, ImportFile[]>()
    const rootFiles: ImportFile[] = []
    for (const entry of markdownFiles) {
      const segments = entry.relativePath.split(/[\\/]/)
      segments.pop()
      const folder = segments.join('/')
      if (!folder) rootFiles.push(entry)
      else folderFiles.set(folder, [...(folderFiles.get(folder) ?? []), entry])
    }
    const directorySet = new Set<string>()
    for (const folder of folderFiles.keys()) {
      const segments = folder.split('/')
      for (let depth = 1; depth <= segments.length; depth += 1) directorySet.add(segments.slice(0, depth).join('/'))
    }
    const directories = [...directorySet].sort((left, right) => left.split('/').length - right.split('/').length || left.localeCompare(right))
    const pageByDirectory = new Map<string, WikiPage>()
    const total = rootFiles.length + directories.length + [...folderFiles.values()].reduce((sum, groupedFiles) => sum + (groupedFiles.length > 1 ? groupedFiles.length : 0), 0)
    let processed = 0
    const advance = () => {
      processed += 1
      setImportState({ label: 'Importando páginas y estructura de carpetas…', current: processed, total })
    }
    const summaryOf = (content: string) => content.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !/^#{1,6}\s/.test(line) && !/^```/.test(line))?.replace(/[*_`>#-]/g, '').slice(0, 160) ?? ''
    setBulkBusy(true)
    setImportState({ label: 'Preparando archivos Markdown…', current: 0, total })
    setMessage('')
    let created = 0
    let failed = 0
    try {
      for (const { file } of rootFiles) {
        try {
          const content = await file.text()
          await createWikiPage({ title: file.name.replace(/\.(md|markdown)$/i, ''), category, parentId: rootParentId, content, summary: summaryOf(content), icon: '📄' })
          created += 1
        } catch { failed += 1 }
        finally { advance() }
      }
      for (const directory of directories) {
        const parentPath = directory.includes('/') ? directory.slice(0, directory.lastIndexOf('/')) : ''
        const parentId = parentPath ? pageByDirectory.get(parentPath)?.id : rootParentId
        if (parentPath && parentId === undefined) {
          const skippedFiles = folderFiles.get(directory)?.length ?? 0
          const skipped = 1 + (skippedFiles > 1 ? skippedFiles : 0)
          failed += skipped
          for (let index = 0; index < skipped; index += 1) advance()
          continue
        }
        const containedFiles = [...(folderFiles.get(directory) ?? [])].sort((a, b) => a.file.name.localeCompare(b.file.name))
        const title = directory.split('/').pop() || 'Carpeta importada'
        let folderPage: WikiPage
        try {
          const content = containedFiles.length === 1 ? await containedFiles[0].file.text() : ''
          folderPage = await createWikiPage({ title, category, parentId: parentId ?? null, icon: '📄', summary: containedFiles.length === 1 ? summaryOf(content) : `Contiene ${containedFiles.length} documentos.`, content })
          pageByDirectory.set(directory, folderPage)
          created += 1
        } catch {
          const skipped = 1 + (containedFiles.length > 1 ? containedFiles.length : 0)
          failed += skipped
          for (let index = 0; index < skipped; index += 1) advance()
          continue
        }
        advance()
        if (containedFiles.length > 1) {
          for (const { file } of containedFiles) {
            try {
              const content = await file.text()
              await createWikiPage({ title: file.name.replace(/\.(md|markdown)$/i, ''), category, parentId: folderPage.id, content, summary: summaryOf(content), icon: '📄' })
              created += 1
            } catch { failed += 1 }
            finally { advance() }
          }
        }
      }
      await load()
      setMessage(`${created} página${created === 1 ? '' : 's'} importada${created === 1 ? '' : 's'}.${failed ? ` ${failed} no se pudieron importar.` : ''}`)
    } finally { setBulkBusy(false); setImportState(null) }
  }

  const exportPage = (page: WikiPage) => downloadTextFile(`${sanitizeFileName(page.slug)}.md`, `# ${page.title}\n\n${page.content}`)
  const exportPageTree = (page: WikiPage) => {
    const tree = [page, ...descendants(page.id, pages)]
    downloadTextFile(`${sanitizeFileName(page.slug)}-wiki.json`, JSON.stringify({ format: 'chucks-wiki', pages: tree }, null, 2))
  }
  const exportWiki = () => downloadTextFile('wiki-chucks-web.json', JSON.stringify({ format: 'chucks-wiki', pages }, null, 2))

  const saveBanner = async () => {
    if (!activeCategory) return
    setBusy(true)
    try {
      await setWikiCategoryBanner(activeCategory, bannerDraft)
      setEditingBanner(false)
      await load()
      setMessage('Banner de categoría guardado.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar el banner.') }
    finally { setBusy(false) }
  }

  const currentCategory = categories.find((category) => category.name === activeCategory)
  const recent = pages.slice(0, 5)
  const pinned = pages.filter((page) => page.pinned).slice(0, 3)
  const pageChildren = activePage ? pages.filter((page) => page.parentId === activePage.id) : []
  const heading = view === 'editor' ? (draft?.id ? 'Editar página' : 'Nueva página')
    : view === 'page' ? activePage?.title ?? 'Wiki'
      : normalizedTerm ? 'Resultados de búsqueda'
        : view === 'category' ? activeCategory
          : view === 'recent' ? 'Páginas recientes'
            : view === 'pinned' ? 'Páginas destacadas'
              : view === 'browse' ? 'Todas las páginas' : 'Inicio'

  return (
    <section className={styles.wiki}>
      {importState && <div className={styles.importOverlay} role="status" aria-live="polite"><div className={styles.importLoader}><span className={styles.spinner} /><strong>{importState.label}</strong>{importState.total > 1 && <><small>{Math.min(importState.current, importState.total)} de {importState.total} elementos</small><span className={styles.progressTrack}><i style={{ width: `${Math.min(100, (importState.current / importState.total) * 100)}%` }} /></span></>}</div></div>}
      {importCategoryOpen && <div className={styles.categoryDialogOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setImportCategoryOpen(false) }}><form className={styles.categoryDialog} role="dialog" aria-modal="true" aria-labelledby="wiki-import-category-title" onSubmit={(event) => { event.preventDefault(); bulkFileRef.current?.click() }}><span className={styles.eyebrow}>IMPORTAR CONTENIDO</span><h2 id="wiki-import-category-title">Importar carpetas</h2><p>Selecciona varias carpetas a la vez. Se conservará la jerarquía completa y los archivos Markdown.</p><label htmlFor="wiki-import-category">Categoría para todo el contenido</label><select id="wiki-import-category" value={customImportCategory ? '__new__' : importCategory} onChange={(event) => { const value = event.target.value; setCustomImportCategory(value === '__new__'); setImportCategory(value === '__new__' ? '' : value) }}><option value="General">General</option>{categories.filter((category) => category.name !== 'General').map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}<option value="__new__">＋ Nueva categoría…</option></select>{customImportCategory && <input className={styles.newCategoryInput} value={importCategory} onChange={(event) => setImportCategory(event.target.value)} placeholder="Nombre de la nueva categoría" autoFocus required /> }<footer><button type="button" className={styles.ghostButton} onClick={() => setImportCategoryOpen(false)}>Cancelar</button><button className={styles.primaryButton}>Seleccionar carpetas</button></footer></form></div>}
      <div className={styles.wikiIntro}>
        <SectionHeading eyebrow="BASE DE CONOCIMIENTO" title="Wiki" description="Documentación, procesos e ideas. Todo conectado." status="PostgreSQL local" />
        <header className={styles.header}>
        <label className={styles.search}>
          <span aria-hidden="true">⌕</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); if (event.target.value) setView('browse') }} placeholder="Buscar páginas, temas o contenido…" aria-label="Buscar en la Wiki" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">×</button>}
        </label>
        <div className={styles.headerActions}>
          <button className={`${styles.secondaryButton} ${styles.structureButton}`} onClick={() => setStructureOpen(true)}><svg><use href="#icon-layers" /></svg><span>Estructura</span></button>
          <button className={`${styles.secondaryButton} ${styles.importButton}`} onClick={() => { const preferred = view === 'category' ? activeCategory : activePage?.category || 'General'; const exists = preferred === 'General' || categories.some((category) => category.name === preferred); setImportCategory(preferred); setCustomImportCategory(!exists); setImportCategoryOpen(true) }} disabled={bulkBusy}>{bulkBusy ? 'Importando…' : 'Importar carpetas'}</button>
          <input ref={bulkFileRef} type="file" accept=".md,.markdown" multiple hidden onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; if (files.length) { setImportCategoryOpen(false); void importMarkdownFolder(prepareFolderSelection(files), importCategory) } }} />
          <button className={styles.secondaryButton} onClick={exportWiki} disabled={!pages.length}>Exportar wiki</button>
          <button className={styles.primaryButton} onClick={() => startCreate()}>＋ Nueva página</button>
        </div>
        </header>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={styles.sidebarLabel}>ESPACIO DE TRABAJO</p>
          <button className={view === 'home' ? styles.selected : ''} onClick={() => go('home')}><span>⌂</span> Inicio</button>
          <p className={styles.sidebarLabel}>PÁGINAS</p>
          <button className={view === 'browse' ? styles.selected : ''} onClick={() => go('browse')}><span>▤</span> Todas las páginas <small>{pages.length}</small></button>
          <button className={view === 'recent' ? styles.selected : ''} onClick={() => go('recent')}><span>◷</span> Recientes</button>
          <button className={view === 'pinned' ? styles.selected : ''} onClick={() => go('pinned')}><span>★</span> Destacadas</button>
          <p className={styles.sidebarLabel}>CATEGORÍAS</p>
          {categories.map((category) => <button key={category.name} className={view === 'category' && activeCategory === category.name ? styles.selected : ''} onClick={() => openCategory(category.name)}><span>{category.icon}</span> {category.name}<small>{category.total}</small></button>)}
          {!categories.length && <p className={styles.sidebarEmpty}>Tus categorías aparecerán aquí.</p>}
          <div className={styles.sidebarFooter}><b>{stats.total}</b> páginas en tu base de conocimiento</div>
        </aside>

        <main className={styles.content}>
          <div className={styles.breadcrumb}><button onClick={() => go('home')}>Wiki</button><span>/</span><strong>{heading}</strong></div>
          {message && <div className={styles.notice} role="status">{message}<button onClick={() => setMessage('')} aria-label="Cerrar">×</button></div>}

          {view === 'editor' && draft ? (
            <form className={styles.editor} onSubmit={(event) => void save(event)}>
              <div className={styles.editorHeading}><div><span className={styles.eyebrow}>EDITOR DE CONTENIDO</span><h2>{draft.id ? 'Editar página' : 'Crear una página'}</h2><p>Documenta procesos, ideas y referencias en un solo lugar.</p></div><button type="button" className={styles.ghostButton} onClick={() => { setDraft(null); setView(activePage ? 'page' : 'home') }}>Cerrar</button></div>
              <div className={styles.formGrid}>
                <label className={styles.wide}><span>Título <i>*</i></span><input required maxLength={200} autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Guía de incorporación" /></label>
                <label><span>Categoría</span><input list="wiki-category-options" disabled={draft.parentId !== null} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="General" /><datalist id="wiki-category-options">{categories.map((category) => <option value={category.name} key={category.name} />)}</datalist></label>
                <label><span>Página padre</span><select value={draft.parentId ?? ''} onChange={(event) => { const parentId = event.target.value ? Number(event.target.value) : null; const parent = pages.find((page) => page.id === parentId); setDraft({ ...draft, parentId, category: parent?.category ?? draft.category }) }}><option value="">Página principal</option>{pages.filter((page) => page.id !== draft.id && !descendants(draft.id ?? -1, pages).some((child) => child.id === page.id)).map((page) => <option key={page.id} value={page.id}>{[...ancestors(page, pages).map((item) => item.title), page.title].join(' / ')}</option>)}</select></label>
                <label><span>Ícono (emoji)</span><input value={draft.icon} maxLength={8} onChange={(event) => setDraft({ ...draft, icon: event.target.value })} placeholder="📄" /></label>
                <label><span>Etiqueta</span><input value={draft.tag} maxLength={80} onChange={(event) => setDraft({ ...draft, tag: event.target.value })} placeholder="Referencia, proceso…" /></label>
                <label className={styles.wide}><span>Resumen</span><input maxLength={500} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="Descripción breve para los listados" /></label>
                <label className={styles.wide}><span>Banner de página (URL, opcional)</span><div className={styles.bannerFields}><input type="url" value={draft.banner} onChange={(event) => setDraft({ ...draft, banner: event.target.value })} placeholder="https://…" /><select value={draft.bannerPosition} onChange={(event) => setDraft({ ...draft, bannerPosition: event.target.value })} disabled={!draft.banner}><option value="top">Arriba</option><option value="center">Centro</option><option value="bottom">Abajo</option></select></div></label>
                <label className={styles.wide}><span>Contenido <small>Markdown</small></span><div className={styles.markdownTools}><button type="button" className={styles.secondaryButton} onClick={() => fileRef.current?.click()}>Importar archivo .md</button><span>Admite títulos, listas, citas, enlaces y bloques de código.</span><input ref={fileRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden onChange={(event) => { void importMarkdown(event.target.files?.[0]); event.target.value = '' }} /></div><textarea className={styles.textarea} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder={'## Introducción\n\nEscribe aquí el contenido de la página…\n\n- Primer punto'} /></label>
                <label className={styles.checkbox}><input type="checkbox" checked={draft.pinned} onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })} /><span>Destacar esta página en el inicio</span></label>
              </div>
              <footer className={styles.editorFooter}>{draft.id ? <button type="button" className={styles.dangerButton} onClick={() => { const page = pages.find((item) => item.id === draft.id); if (page) void remove(page) }}>Borrar página</button> : <span />}<div><button type="button" className={styles.secondaryButton} onClick={() => { setDraft(null); setView(activePage ? 'page' : 'home') }}>Cancelar</button><button className={styles.primaryButton} disabled={busy || !draft.title.trim()}>{busy ? 'Guardando…' : 'Guardar página'}</button></div></footer>
            </form>
          ) : view === 'page' && activePage ? (
            <article className={styles.page}>
              {activePage.banner && <div className={styles.pageBanner}><img src={activePage.banner} alt="" style={{ objectPosition: activePage.bannerPosition }} onError={(event) => { event.currentTarget.hidden = true }} /></div>}
              <div className={styles.pageHeader}><div><div className={styles.pageMeta}><span>{activePage.icon} {activePage.category}</span>{activePage.tag && <span>{activePage.tag}</span>}</div><h2>{activePage.title}</h2>{activePage.summary && <p>{activePage.summary}</p>}<small>Actualizado {relativeTime(activePage.updatedAt)}{activePage.author ? ` · ${activePage.author}` : ''}</small></div><div className={styles.pageActions}><button className={`${styles.secondaryButton} ${styles.favoriteButton} ${activePage.pinned ? styles.isPinned : ''}`} aria-pressed={activePage.pinned} onClick={() => void togglePinned(activePage)}><svg><use href="#icon-star" /></svg>{activePage.pinned ? 'Destacada' : 'Destacar'}</button><button className={styles.secondaryButton} onClick={() => startCreate(activePage)}>＋ Subpágina</button><button className={styles.secondaryButton} onClick={() => exportPage(activePage)}>Exportar .md</button><button className={styles.secondaryButton} onClick={() => exportPageTree(activePage)}>Exportar árbol</button><button className={styles.secondaryButton} onClick={() => startEdit(activePage)}>Editar</button><button className={styles.dangerButton} onClick={() => void remove(activePage)} disabled={busy}>Borrar</button></div></div>
              <MarkdownContent content={activePage.content} />
              <section className={styles.subpages}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>CONTENIDO RELACIONADO</span><h3>Subpáginas</h3></div><button className={styles.textButton} onClick={() => startCreate(activePage)}>＋ Agregar</button></div>{pageChildren.length ? <PageList pages={pageChildren} onOpen={openPage} onTogglePin={togglePinned} /> : <p className={styles.emptyInline}>Todavía no hay subpáginas.</p>}</section>
            </article>
          ) : view === 'home' && !normalizedTerm ? (
            <div className={styles.home}>
              <section className={styles.welcome}><div><span className={styles.eyebrow}>TU BASE DE CONOCIMIENTO</span><h2>Ideas claras, conocimiento conectado.</h2><p>Guarda documentación, procesos y respuestas para encontrarlos cuando los necesites.</p><button className={styles.primaryButton} onClick={() => go('browse')}>Explorar páginas <span>→</span></button></div><div className={styles.welcomeArt} aria-hidden="true"><span>✦</span><i>▤</i><b>⌘</b></div><div className={styles.stats}><div><b>{stats.total}</b><span>Páginas</span></div><div><b>{categories.length}</b><span>Categorías</span></div><div><b>{stats.contributors}</b><span>Colaboradores</span></div><div><b>{relativeTime(stats.lastUpdated)}</b><span>Última actualización</span></div></div></section>
              <section className={styles.section}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>PARA SEGUIR</span><h3>Páginas recientes</h3></div><button className={styles.textButton} onClick={() => go('recent')}>Ver todas →</button></div>{recent.length ? <PageList pages={recent} onOpen={openPage} onTogglePin={togglePinned} /> : <EmptyState onCreate={() => startCreate()} title="Tu Wiki empieza aquí" text="Crea una página para guardar tu primer conocimiento." />}</section>
              <section className={styles.section}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ACCESO RÁPIDO</span><h3>Páginas destacadas</h3></div><button className={styles.textButton} onClick={() => go('pinned')}>Ver todas →</button></div>{pinned.length ? <div className={styles.featuredGrid}>{pinned.map((page) => <button key={page.id} className={styles.featuredCard} onClick={() => openPage(page)}><span>{page.icon}</span><strong>{page.title}</strong><small>{page.summary || page.category}</small><em>Abrir página →</em></button>)}</div> : <p className={styles.emptyInline}>Marca páginas como destacadas para verlas aquí.</p>}</section>
              {!!categories.length && <section className={styles.section}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ORGANIZACIÓN</span><h3>Explorar categorías</h3></div></div><div className={styles.categoryGrid}>{categories.map((category) => <button key={category.name} className={styles.categoryCard} onClick={() => openCategory(category.name)}><span>{category.icon}</span><div><strong>{category.name}</strong><small>{category.total} páginas</small></div><b>→</b></button>)}</div></section>}
            </div>
          ) : (
            <section className={styles.listView}>
              {view === 'category' && currentCategory && <div className={styles.categoryBanner} style={{ backgroundImage: currentCategory.banner ? `linear-gradient(90deg, rgba(11,25,44,.82), rgba(11,25,44,.2)), url("${currentCategory.banner.replace(/"/g, '')}")` : undefined, color: currentCategory.banner ? '#fff' : 'var(--ink)' }}><div><span>{currentCategory.icon}</span><h2>{currentCategory.name}</h2><p>{currentCategory.total} páginas en esta categoría</p></div><button className={styles.bannerEditButton} onClick={() => { setBannerDraft(currentCategory.banner); setEditingBanner((value) => !value) }}>{editingBanner ? 'Cerrar' : 'Editar banner'}</button>{editingBanner && <div className={styles.bannerEditor}><input type="url" value={bannerDraft} onChange={(event) => setBannerDraft(event.target.value)} placeholder="URL de imagen (opcional)" /><button className={styles.primaryButton} onClick={() => void saveBanner()} disabled={busy}>Guardar</button></div>}</div>}
              <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>{normalizedTerm ? 'BÚSQUEDA' : view === 'pinned' ? 'ACCESO RÁPIDO' : 'BIBLIOTECA'}</span><h2>{heading}</h2></div><button className={styles.primaryButton} onClick={() => startCreate()}>{view === 'category' ? '＋ Nueva página' : '＋ Crear página'}</button></div>
              {filtered.length ? <PageList pages={filtered} allPages={pages} onOpen={openPage} onTogglePin={togglePinned} /> : <EmptyState onCreate={() => startCreate()} title={normalizedTerm ? 'Sin resultados' : 'Aún no hay páginas'} text={normalizedTerm ? 'Prueba con otros términos de búsqueda.' : 'Crea la primera página de esta sección.'} />}
            </section>
          )}
        </main>

      </div>
      {structureOpen && <div className={styles.structureOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setStructureOpen(false) }}><aside className={styles.outline} role="dialog" aria-modal="true" aria-labelledby="wiki-structure-title"><div className={styles.outlineHeader}><div><span className={styles.eyebrow}>NAVEGACIÓN</span><h2 id="wiki-structure-title">Jerarquía</h2></div><button className={styles.ghostButton} aria-label="Cerrar estructura" onClick={() => setStructureOpen(false)}>×</button></div><p className={styles.drawerIntro}>Explora las categorías y subpáginas sin perder tu lugar.</p>{categories.length ? categories.map((category) => {
        const roots = pages.filter((page) => page.category === category.name && page.parentId === null)
        const collapsed = collapsedOutlineCategories.has(category.name)
        return <section key={category.name}><div className={styles.outlineCategoryRow}><button type="button" className={styles.outlineToggle} aria-label={`${collapsed ? 'Expandir' : 'Contraer'} categoría ${category.name}`} aria-expanded={!collapsed} disabled={!roots.length} onClick={() => toggleOutlineCategory(category.name)}>{roots.length ? collapsed ? '›' : '⌄' : '·'}</button><button className={styles.outlineCategory} onClick={() => { openCategory(category.name); setStructureOpen(false) }}><span>{category.icon}</span>{category.name}<small>{category.total}</small></button></div>{!collapsed && roots.map((page) => <TreePage key={page.id} page={page} pages={pages} activeId={activePage?.id ?? null} collapsedPages={collapsedOutlinePages} onToggle={toggleOutlinePage} onOpen={(target) => { openPage(target); setStructureOpen(false) }} />)}</section>
      }) : <p className={styles.emptyInline}>Las categorías aparecerán aquí.</p>}</aside></div>}
    </section>
  )
}

function descendants(id: number, pages: WikiPage[]): WikiPage[] {
  const result: WikiPage[] = []
  const queue = [id]
  while (queue.length) {
    const parentId = queue.shift()!
    for (const page of pages) if (page.parentId === parentId && !result.some((item) => item.id === page.id)) { result.push(page); queue.push(page.id) }
  }
  return result
}

function PageList({ pages, allPages = pages, onOpen, onTogglePin }: { pages: WikiPage[]; allPages?: WikiPage[]; onOpen: (page: WikiPage) => void; onTogglePin: (page: WikiPage) => void }) {
  return <div className={styles.pageList}>{pages.map((page) => <div key={page.id} className={styles.pageRow}><span className={styles.pageIcon}>{page.icon}</span><button className={styles.pageRowOpen} onClick={() => onOpen(page)}><strong>{page.title}</strong><small>{page.summary || 'Sin resumen todavía.'}</small></button><span className={styles.pageRowCategory}>{page.parentId !== null ? ancestors(page, allPages).map((item) => item.title).join(' / ') || page.category : page.category}</span><time>{relativeTime(page.updatedAt)}</time><button type="button" className={`${styles.pagePin} ${page.pinned ? styles.isPinned : ''}`} aria-label={`${page.pinned ? 'Quitar de destacadas' : 'Destacar'} ${page.title}`} aria-pressed={page.pinned} onClick={() => onTogglePin(page)}><svg><use href="#icon-star" /></svg></button><span className={styles.rowArrow}>→</span></div>)}</div>
}

function TreePage({ page, pages, activeId, collapsedPages, onToggle, onOpen }: { page: WikiPage; pages: WikiPage[]; activeId: number | null; collapsedPages: Set<number>; onToggle: (id: number) => void; onOpen: (page: WikiPage) => void }) {
  const children = pages.filter((item) => item.parentId === page.id)
  const collapsed = collapsedPages.has(page.id)
  return <div className={styles.treeNode}><div className={styles.treePageRow}>{children.length ? <button type="button" className={styles.treeToggle} aria-label={`${collapsed ? 'Expandir' : 'Contraer'} ${page.title}`} aria-expanded={!collapsed} onClick={() => onToggle(page.id)}>{collapsed ? '›' : '⌄'}</button> : <span className={styles.treeToggleSpacer} />}<button className={`${styles.treePage} ${activeId === page.id ? styles.treeActive : ''}`} onClick={() => onOpen(page)}><span>{page.icon}</span>{page.title}</button></div>{!collapsed && children.length > 0 && <div className={styles.treeChildren}>{children.map((child) => <TreePage key={child.id} page={child} pages={pages} activeId={activeId} collapsedPages={collapsedPages} onToggle={onToggle} onOpen={onOpen} />)}</div>}</div>
}

function EmptyState({ title, text, onCreate }: { title: string; text: string; onCreate: () => void }) {
  return <div className={styles.emptyState}><span>📖</span><h3>{title}</h3><p>{text}</p><button className={styles.primaryButton} onClick={onCreate}>＋ Nueva página</button></div>
}
