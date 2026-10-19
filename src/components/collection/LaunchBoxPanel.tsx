import { useEffect, useRef, useState } from 'react'
import {
  createCollectionItem,
  type Collection,
  type CollectionColumn,
  type ColumnType,
} from '../../api/collections'
import {
  applyLaunchBoxBulk,
  applyLaunchBoxOne,
  applyLaunchBoxResultsCsv,
  cancelLaunchBoxBulk,
  fetchLaunchBoxBulkProgress,
  fetchLaunchBoxBulkResults,
  matchLaunchBoxRows,
  parseLaunchBoxCsv,
  searchLaunchBoxSingle,
  startLaunchBoxBulk,
  type LaunchBoxApplySummary,
  type LaunchBoxJobProgress,
  type LaunchBoxMapping,
  type LaunchBoxResultEntry,
  type LaunchBoxSingleResult,
} from '../../api/launchbox'
import { downloadTextFile } from '../../utils/files'
import LaunchboxPlatformSelect from './LaunchboxPlatformSelect'
import { buildResultCsv } from './launchboxCsv'

const EMPTY_MAPPING: LaunchBoxMapping = {
  platformColumn: '',
  releaseDateColumn: '',
  publisherColumn: '',
  developerColumn: '',
}

function columnMatches(column: CollectionColumn, pattern: RegExp, type?: ColumnType) {
  return (!type || column.type === type) && pattern.test(`${column.label} ${column.name}`)
}

function detectMapping(collection: Collection): LaunchBoxMapping {
  const find = (pattern: RegExp, type?: ColumnType) =>
    collection.columns.find((column) => columnMatches(column, pattern, type))
  return {
    platformColumn: find(/plataforma|platform/)?.name ?? '',
    releaseDateColumn: find(/fecha.*(lanzamiento|estreno)|release.*(date|day)/, 'date')?.name ?? '',
    publisherColumn: find(/publisher|editor|public[ae]dora/)?.name ?? '',
    developerColumn: find(/developer|desarrollador|desarrollos?|estudio/)?.name ?? '',
  }
}

function summaryText(summary: LaunchBoxApplySummary) {
  return `Aplicados: ${summary.applied} · Sin coincidencia: ${summary.missing} · Sin metadata: ${summary.skipped} · Errores: ${summary.failed}`
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export default function LaunchBoxPanel({
  collection,
  collections,
  onCollectionChanged,
  notify,
}: {
  collection: Collection | null
  collections: Collection[]
  onCollectionChanged: () => void
  notify: (message: string) => void
}) {
  const [mapping, setMapping] = useState<LaunchBoxMapping>(() =>
    collection ? detectMapping(collection) : EMPTY_MAPPING,
  )

  const [singleName, setSingleName] = useState('')
  const [singlePlatform, setSinglePlatform] = useState('')
  const [singleLoading, setSingleLoading] = useState(false)
  const [singleResult, setSingleResult] = useState<LaunchBoxSingleResult | null>(null)
  const [applying, setApplying] = useState(false)
  const [addToSelected, setAddToSelected] = useState<ReadonlySet<number>>(new Set())
  const [addingTo, setAddingTo] = useState(false)

  const [csv, setCsv] = useState<{ fileName: string; rows: { name: string; platform: string }[] } | null>(
    null,
  )
  const [match, setMatch] = useState<{
    matched: { name: string; platform: string; itemId: number }[]
    missing: { name: string; platform: string }[]
  } | null>(null)
  const [bulkResults, setBulkResults] = useState<LaunchBoxResultEntry[] | null>(null)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<LaunchBoxJobProgress | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [csvMessage, setCsvMessage] = useState('')

  const csvInputRef = useRef<HTMLInputElement | null>(null)
  const csvActionRef = useRef<'open' | 'apply'>('open')

  useEffect(() => {
    if (!bulkRunning || !jobId) return
    let stopped = false
    let timer: number | undefined
    const poll = async () => {
      try {
        const progress = await fetchLaunchBoxBulkProgress(jobId)
        if (stopped) return
        setBulkProgress(progress)
        if (progress.status === 'running') {
          timer = window.setTimeout(() => void poll(), 1000)
          return
        }
        const payload = await fetchLaunchBoxBulkResults(jobId)
        if (stopped) return
        setBulkResults(payload.results)
        const found = payload.results.filter((entry) => entry.found).length
        setCsvMessage(
          `${payload.results.length} juegos consultados · con metadata: ${found} · sin resultados: ${payload.results.length - found}.`,
        )
      } catch (error) {
        if (!stopped) setCsvMessage(errorMessage(error))
      } finally {
        if (!stopped) setBulkRunning(false)
      }
    }
    void poll()
    return () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
    }
  }, [bulkRunning, jobId])

  const matchCsvRows = async (rows: { name: string; platform: string }[]) => {
    if (!collection) {
      setCsvMessage('Selecciona una colección para emparejar los registros.')
      return
    }
    const result = await matchLaunchBoxRows({
      collectionId: collection.id,
      platformColumn: mapping.platformColumn,
      rows,
    })
    setMatch(result)
    setCsvMessage(
      `${result.matched.length} emparejados con la colección, ${result.missing.length} sin coincidencia exacta (nombre + plataforma).`,
    )
  }

  const selectCsv = async (file: File) => {
    setCsvMessage('')
    try {
      const parsed = await parseLaunchBoxCsv(await file.text())
      const source = { fileName: file.name, rows: parsed.rows }
      setCsv(source)
      setMatch(null)
      setBulkResults(null)
      await matchCsvRows(source.rows)
    } catch (error) {
      setCsvMessage(errorMessage(error))
    }
  }

  const runBulkSearch = async () => {
    if (!collection || !match || !match.matched.length) return
    setBulkRunning(true)
    setBulkResults(null)
    setBulkProgress(null)
    setJobId(null)
    setCsvMessage('')
    try {
      const started = await startLaunchBoxBulk(match.matched)
      setJobId(started.jobId)
    } catch (error) {
      setCsvMessage(errorMessage(error))
      setBulkRunning(false)
    }
  }

  const cancelBulk = async () => {
    if (!jobId) return
    try {
      await cancelLaunchBoxBulk(jobId)
    } catch (error) {
      setCsvMessage(errorMessage(error))
    }
  }

  const exportResults = () => {
    if (!bulkResults) return
    downloadTextFile(
      `launchbox-metadata-${new Date().toISOString().slice(0, 10)}.csv`,
      buildResultCsv(bulkResults),
      'text/csv',
    )
    setCsvMessage('CSV de resultados descargado.')
  }

  const applyBulk = async () => {
    if (!collection || !bulkResults) return
    setCsvMessage('')
    try {
      const summary = await applyLaunchBoxBulk({ mapping, results: bulkResults })
      setCsvMessage(summaryText(summary))
      notify('Metadatos de LaunchBox aplicados a la colección.')
      onCollectionChanged()
    } catch (error) {
      setCsvMessage(errorMessage(error))
    }
  }

  const applyResultsCsv = async (file: File) => {
    if (!collection) return
    setCsvMessage('')
    try {
      const summary = await applyLaunchBoxResultsCsv({
        collectionId: collection.id,
        mapping,
        csvText: await file.text(),
        fileName: file.name,
      })
      setCsvMessage(`${summaryText(summary)}${summary.fileName ? ` · ${summary.fileName}` : ''}`)
      notify('CSV de resultados aplicado a la colección.')
      onCollectionChanged()
    } catch (error) {
      setCsvMessage(errorMessage(error))
    }
  }

  const runSingle = async () => {
    if (!singleName.trim() || singleLoading) return
    setSingleLoading(true)
    setSingleResult(null)
    setAddToSelected(new Set())
    notify('')
    try {
      const result = await searchLaunchBoxSingle({
        collectionId: collection?.id ?? 0,
        platformColumn: mapping.platformColumn,
        name: singleName,
        platform: singlePlatform,
      })
      setSingleResult(result)
    } catch (error) {
      notify(errorMessage(error))
    } finally {
      setSingleLoading(false)
    }
  }

  const applySingle = async () => {
    if (
      !singleResult?.found ||
      !singleResult.inCollection ||
      !singleResult.itemId ||
      !singleResult.metadata
    )
      return
    setApplying(true)
    try {
      await applyLaunchBoxOne({
        mapping,
        itemId: singleResult.itemId,
        metadata: singleResult.metadata,
      })
      notify('Metadata aplicada al ítem.')
      onCollectionChanged()
    } catch (error) {
      notify(errorMessage(error))
    } finally {
      setApplying(false)
    }
  }

  const toggleAddTo = (id: number) => {
    setAddToSelected((selected) => {
      const next = new Set(selected)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addToCollections = async () => {
    if (!singleResult || !addToSelected.size) return
    const targets = collections.filter((candidate) => addToSelected.has(candidate.id))
    if (!targets.length) return
    setAddingTo(true)
    try {
      const name = singleResult.title || singleName.trim()
      const platformLabel = singleResult.platformLabel || singlePlatform.trim()
      for (const target of targets) {
        const targetMapping = detectMapping(target)
        const values: Record<string, unknown> = {}
        if (targetMapping.platformColumn && platformLabel)
          values[targetMapping.platformColumn] = platformLabel
        if (singleResult.metadata) {
          if (targetMapping.releaseDateColumn && singleResult.metadata.releaseDate)
            values[targetMapping.releaseDateColumn] = singleResult.metadata.releaseDate.slice(0, 10)
          if (targetMapping.publisherColumn && singleResult.metadata.publisher)
            values[targetMapping.publisherColumn] = singleResult.metadata.publisher
          if (targetMapping.developerColumn && singleResult.metadata.developer)
            values[targetMapping.developerColumn] = singleResult.metadata.developer
        }
        await createCollectionItem(target.id, {
          name,
          imageUrl: singleResult.metadata?.boxartUrl || null,
          tags: [],
          values,
        })
      }
      notify(`"${name}" se agregó a ${targets.length} colección(es).`)
      setAddToSelected(new Set())
      onCollectionChanged()
    } catch (error) {
      notify(errorMessage(error))
    } finally {
      setAddingTo(false)
    }
  }

  const progressPercent = bulkProgress?.total
    ? Math.floor(((bulkProgress.current || 0) / bulkProgress.total) * 100)
    : 0

  return (
    <div className="launchbox-panel">
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          if (csvActionRef.current === 'open') void selectCsv(file)
          else void applyResultsCsv(file)
        }}
      />
      {collection && collection.columns.length > 0 && (
        <section className="launchbox-section">
          <header>
            <div>
              <h3>Mapeo de columnas</h3>
              <p>
                Indica en qué columnas de la colección se guardan la plataforma y la metadata de
                LaunchBox. Se detectan automáticamente por su etiqueta.
              </p>
            </div>
          </header>
          <div className="launchbox-mapping">
            <label>
              <span>Plataforma</span>
              <select
                value={mapping.platformColumn}
                onChange={(event) => setMapping({ ...mapping, platformColumn: event.target.value })}
              >
                <option value="">— Sin usar —</option>
                {collection.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Fecha de lanzamiento (date)</span>
              <select
                value={mapping.releaseDateColumn}
                onChange={(event) =>
                  setMapping({ ...mapping, releaseDateColumn: event.target.value })
                }
              >
                <option value="">— Sin usar —</option>
                {collection.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Publisher</span>
              <select
                value={mapping.publisherColumn}
                onChange={(event) =>
                  setMapping({ ...mapping, publisherColumn: event.target.value })
                }
              >
                <option value="">— Sin usar —</option>
                {collection.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Developer</span>
              <select
                value={mapping.developerColumn}
                onChange={(event) =>
                  setMapping({ ...mapping, developerColumn: event.target.value })
                }
              >
                <option value="">— Sin usar —</option>
                {collection.columns.map((column) => (
                  <option key={column.name} value={column.name}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      <section className="launchbox-section">
        <header>
          <div>
            <h3>Buscar un juego</h3>
            <p>
              Ingresa nombre y plataforma para obtener su metadata desde el GamesDB de LaunchBox.
            </p>
          </div>
        </header>
        <form
          className="launchbox-single-form"
          onSubmit={(event) => {
            event.preventDefault()
            void runSingle()
          }}
        >
          <input
            value={singleName}
            onChange={(event) => setSingleName(event.target.value)}
            placeholder="Nombre del juego (ej. Super Mario World)"
            aria-label="Nombre del juego"
          />
          <LaunchboxPlatformSelect
            value={singlePlatform}
            onChange={setSinglePlatform}
            placeholder="Plataforma (opcional)"
            ariaLabel="Plataforma"
          />
          <button type="submit" disabled={singleLoading || !singleName.trim()}>
            {singleLoading ? 'Buscando...' : 'Buscar en LaunchBox'}
          </button>
        </form>
        {singleResult && (
          <article className="launchbox-single-result">
            <header>
              <h4>
                {singleResult.found
                  ? singleResult.title || singleName
                  : 'Sin resultados en LaunchBox'}
              </h4>
              {singleResult.inCollection ? (
                <span className="launchbox-badge ok">Sí está en la colección</span>
              ) : (
                <span className="launchbox-badge warn">No está en la colección</span>
              )}
            </header>
            {singleResult.found && singleResult.metadata && (
              <div className="launchbox-single-fields">
                {singleResult.metadata.boxartUrl ? (
                  <img
                    src={singleResult.metadata.boxartUrl}
                    alt="Portada"
                    loading="lazy"
                    onError={(event) => {
                      const image = event.target as HTMLImageElement
                      image.style.display = 'none'
                    }}
                  />
                ) : null}
                <p>
                  <b>Plataforma (LaunchBox)</b>
                  <span>{singleResult.platformLabel || '—'}</span>
                </p>
                <p>
                  <b>Fecha de lanzamiento</b>
                  <span>{singleResult.metadata.releaseDate || '—'}</span>
                </p>
                <p>
                  <b>Publisher</b>
                  <span>{singleResult.metadata.publisher || '—'}</span>
                </p>
                <p>
                  <b>Developer</b>
                  <span>{singleResult.metadata.developer || '—'}</span>
                </p>
              </div>
            )}
            {!singleResult.found && (
              <p className="launchbox-empty-hint">No se encontró el juego en LaunchBox.</p>
            )}
            <footer>
              <button
                disabled={
                  applying ||
                  !singleResult.found ||
                  !singleResult.inCollection ||
                  !singleResult.itemId ||
                  !singleResult.metadata
                }
                onClick={applySingle}
              >
                Aplicar al ítem de la colección
              </button>
            </footer>
            {!singleResult.inCollection && (
              <div className="launchbox-addto">
                <strong>Agregar a una colección</strong>
                <span>
                  El ítem no está en la colección; elige en cuál o cuáles agregarlo con su metadata
                  de LaunchBox.
                </span>
                {collections.length ? (
                  <>
                    <div className="launchbox-addto-list">
                      {collections.map((target) => (
                        <label key={target.id}>
                          <input
                            type="checkbox"
                            checked={addToSelected.has(target.id)}
                            onChange={() => toggleAddTo(target.id)}
                            disabled={addingTo}
                          />
                          {target.name}
                        </label>
                      ))}
                    </div>
                    <button
                      className="launchbox-primary"
                      disabled={addingTo || !addToSelected.size}
                      onClick={() => void addToCollections()}
                    >
                      {addingTo ? 'Agregando...' : `Agregar a ${addToSelected.size} colección(es)`}
                    </button>
                  </>
                ) : (
                  <p className="launchbox-empty-hint">No hay colecciones creadas todavía.</p>
                )}
              </div>
            )}
          </article>
        )}
      </section>

      <section className="launchbox-section">
        <header>
          <div>
            <h3>Procesar por CSV</h3>
            <p>
              Importa un CSV con las columnas de nombre y plataforma para buscar la metadata de
              todos los juegos. Los registros cuya llave no coincida exactamente con la colección se
              listan antes de buscar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              csvActionRef.current = 'open'
              csvInputRef.current?.click()
            }}
          >
            {csv ? `CSV: ${csv.fileName}` : 'Seleccionar CSV...'}
          </button>
        </header>
        {csv && (
          <>
            <div className="launchbox-match-summary">
              <strong>
                CSV cargado: {csv.rows.length} juegos · {match?.matched.length ?? 0} emparejados
              </strong>
              {(match?.missing.length ?? 0) > 0 && (
                <p className="launchbox-warn-text">
                  {match!.missing.length} no tienen coincidencia exacta en la colección (nombre +
                  plataforma); no se buscará su metadata:
                </p>
              )}
            </div>
            {match && match.missing.length > 0 && (
              <div className="launchbox-missing">
                {match.missing.slice(0, 200).map((entry) => (
                  <span key={`${entry.name}\u0000${entry.platform}`}>
                    {entry.name}
                    {entry.platform ? ` · ${entry.platform}` : ''}
                  </span>
                ))}
                {match.missing.length > 200 && (
                  <small>... y {match.missing.length - 200} más.</small>
                )}
              </div>
            )}
          </>
        )}
        {match && match.matched.length > 0 && (
          <div className="launchbox-bulk-actions">
            {!bulkRunning ? (
              <button
                type="button"
                className="launchbox-primary"
                onClick={() => void runBulkSearch()}
              >
                Buscar metadatos de {match.matched.length} juegos
              </button>
            ) : (
              <button type="button" className="launchbox-danger" onClick={() => void cancelBulk()}>
                Cancelar
              </button>
            )}
          </div>
        )}
        {bulkRunning && bulkProgress && (
          <div className="normalize-progress">
            <span>
              <strong>{bulkProgress.message || 'Buscando metadatos...'}</strong>
              <b>
                {bulkProgress.current}/{bulkProgress.total} ({progressPercent}%)
              </b>
            </span>
            <i>
              <b style={{ width: `${progressPercent}%` }} />
            </i>
          </div>
        )}
        {bulkResults && (
          <div className="launchbox-results">
            <div className="launchbox-results-table">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Nombre</th>
                    <th>Plataforma</th>
                    <th>Estado</th>
                    <th>Título (LaunchBox)</th>
                    <th>Lanzamiento</th>
                    <th>Publisher</th>
                    <th>Developer</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResults.map((entry) => (
                    <tr key={`${entry.name}\u0000${entry.platform}`}>
                      <td>
                        {entry.metadata?.boxartUrl ? (
                          <img
                            src={entry.metadata.boxartUrl}
                            alt=""
                            loading="lazy"
                            onError={(event) => {
                              const image = event.target as HTMLImageElement
                              image.style.display = 'none'
                            }}
                          />
                        ) : null}
                      </td>
                      <td>{entry.name}</td>
                      <td>{entry.platform}</td>
                      <td>
                        {entry.found ? (
                          <span className="launchbox-badge ok">OK</span>
                        ) : (
                          <span className="launchbox-badge warn" title={entry.error}>
                            {entry.error ? 'Error' : 'Sin datos'}
                          </span>
                        )}
                      </td>
                      <td>{entry.title || '—'}</td>
                      <td>{entry.metadata?.releaseDate || '—'}</td>
                      <td>{entry.metadata?.publisher || '—'}</td>
                      <td>{entry.metadata?.developer || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="launchbox-bulk-actions">
              <button type="button" onClick={exportResults}>
                Exportar CSV de resultados
              </button>
              <button type="button" className="launchbox-primary" onClick={() => void applyBulk()}>
                Aplicar a la colección
              </button>
            </div>
          </div>
        )}
        {collection && (
          <div className="launchbox-bulk-actions">
            <button
              type="button"
              onClick={() => {
                csvActionRef.current = 'apply'
                csvInputRef.current?.click()
              }}
            >
              Aplicar CSV de resultados guardado...
            </button>
          </div>
        )}
        {csvMessage && (
          <p className="collection-message" role="status">
            {csvMessage}
          </p>
        )}
      </section>
    </div>
  )
}
