import { useEffect, useState } from 'react'
import { searchImages, type ImageEngine, type ImageSearchResult } from '../../api/images'

const IMAGE_ENGINES: { value: ImageEngine; label: string }[] = [
  { value: 'bing', label: 'Bing' },
  { value: 'google', label: 'Google' },
  { value: 'duckduckgo', label: 'DuckDuckGo' },
  { value: 'wikimedia', label: 'Wikimedia' },
  { value: 'openverse', label: 'Openverse' },
]

export default function ImageSearchModal({
  initialQuery,
  onClose,
  onConfirm,
}: {
  initialQuery: string
  onClose: () => void
  onConfirm: (url: string) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [engine, setEngine] = useState<ImageEngine>('bing')
  const [results, setResults] = useState<ImageSearchResult[]>([])
  const [selected, setSelected] = useState<ImageSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const runSearch = async (nextPage: number, append: boolean) => {
    const term = query.trim()
    if (!term || loading) return
    setLoading(true)
    setError('')
    if (!append) {
      setResults([])
      setSelected(null)
    }
    try {
      const found = await searchImages({ query: term, engine, page: nextPage })
      setPage(nextPage)
      setSearched(true)
      setResults(append ? [...results, ...found] : found)
      if (!append) setSelected(null)
    } catch (failure) {
      setResults([])
      setSelected(null)
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="image-search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar imagen en internet"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="image-search-modal">
        <header>
          <div>
            <h2>Buscar imagen en internet</h2>
            <p>Elige una imagen para usarla como URL del ítem.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar búsqueda">
            ✕
          </button>
        </header>
        <div className="image-search-engines" role="tablist" aria-label="Motor de búsqueda">
          {IMAGE_ENGINES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={engine === item.value}
              className={engine === item.value ? 'active' : ''}
              disabled={loading}
              onClick={() => {
                setEngine(item.value)
                setResults([])
                setSelected(null)
                setError('')
                setPage(0)
                setSearched(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <form
          className="image-search-form"
          onSubmit={(event) => {
            event.preventDefault()
            void runSearch(1, false)
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej. portada del libro, póster de la película..."
            aria-label="Término de búsqueda de imágenes"
          />
          <button type="submit" disabled={loading || !query.trim()}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
        {error && <p className="image-search-error">{error}</p>}
        {results.length ? (
          <div className="image-search-grid">
            {results.map((result) => (
              <button
                key={result.imageUrl}
                type="button"
                title={result.title || result.imageUrl}
                aria-pressed={selected?.imageUrl === result.imageUrl}
                className={selected?.imageUrl === result.imageUrl ? 'selected' : ''}
                onClick={() => setSelected(selected?.imageUrl === result.imageUrl ? null : result)}
              >
                <img
                  src={result.thumbnailUrl}
                  alt={result.title || 'Resultado de imagen'}
                  loading="lazy"
                />
                <small>{result.source}</small>
              </button>
            ))}
          </div>
        ) : (
          !loading && (
            <p className="image-search-empty">
              {searched
                ? 'Sin resultados, prueba con otro término.'
                : 'Busca y haz clic en una imagen.'}
            </p>
          )
        )}
        {loading && <p className="image-search-empty">Buscando imágenes...</p>}
        <footer>
          <span>{selected ? `1 imagen seleccionada (${selected.source})` : 'Sin selección'}</span>
          <div>
            {results.length > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void runSearch(page + 1, true)}
              >
                Cargar más
              </button>
            )}
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="prompt-confirm"
              disabled={!selected}
              onClick={() => selected && onConfirm(selected.imageUrl)}
            >
              Usar esta imagen
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
