import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { deleteWeightEntry, fetchWeightState, saveWeightEntry, setWeightTarget, type WeightEntry, type WeightState } from '../api/weight'
import SectionHeading from './SectionHeading'
import styles from './ControlPesoTool.module.css'

type Notice = { text: string; error?: boolean }
const EMPTY: WeightState = { target: null, entries: [] }
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
const weightLabel = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })
const dateLabel = (value: string) => { const [year, month, day] = value.split('-'); return `${day}/${month}/${year.slice(2)}` }
const deltaLabel = (value: number) => `${value > 0 ? '+' : ''}${weightLabel(Math.round(value * 100) / 100)} kg`

export default function ControlPesoTool() {
  const [state, setState] = useState<WeightState>(EMPTY)
  const [targetInput, setTargetInput] = useState('')
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const current = await fetchWeightState()
    setState(current)
    return current
  }, [])

  useEffect(() => { void refresh().then((current) => setTargetInput(current.target === null ? '' : String(current.target))).catch((error: unknown) => setNotice({ text: errorText(error), error: true })) }, [refresh])

  const saveTarget = async (event: FormEvent) => {
    event.preventDefault()
    const raw = targetInput.trim().replace(',', '.')
    try {
      const saved = await setWeightTarget(raw ? Number(raw) : null)
      setState((current) => ({ ...current, target: saved }))
      setTargetInput(saved === null ? '' : String(saved))
      setNotice({ text: saved === null ? 'Se quitó el peso ideal objetivo.' : `Peso ideal guardado: ${weightLabel(saved)} kg.` })
    } catch (error) { setNotice({ text: errorText(error), error: true }) }
  }

  const addEntry = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const saved = await saveWeightEntry(date, Number(weight.trim().replace(',', '.')))
      await refresh()
      setWeight('')
      setNotice({ text: `Pesada del ${dateLabel(saved.date)} guardada: ${weightLabel(saved.weight)} kg.` })
    } catch (error) { setNotice({ text: errorText(error), error: true }) }
    finally { setBusy(false) }
  }

  const removeEntry = async (entry: WeightEntry) => {
    if (!window.confirm(`¿Eliminar la pesada del ${dateLabel(entry.date)}?`)) return
    try { await deleteWeightEntry(entry.date); await refresh(); setNotice({ text: `Se eliminó la pesada del ${dateLabel(entry.date)}.` }) }
    catch (error) { setNotice({ text: errorText(error), error: true }) }
  }

  const { target, entries } = state
  const first = entries[0] ?? null
  const last = entries[entries.length - 1] ?? null
  const change = first && last ? last.weight - first.weight : null
  const remaining = last && target !== null ? last.weight - target : null
  const progress = first && last && target !== null && first.weight > target ? Math.max(0, Math.min(100, ((first.weight - last.weight) / (first.weight - target)) * 100)) : null

  return <section className={styles.weightTool}>
    <SectionHeading eyebrow="BIENESTAR PERSONAL" title="Control de peso" description="Un espacio para registrar tu evolución." status="PostgreSQL local" />
    <section className={styles.stats} aria-label="Resumen de peso">
      <div className={styles.stat}><span className={styles.statLabel}>Última pesada</span><strong>{last ? `${weightLabel(last.weight)} kg` : '—'}</strong><span className={styles.sub}>{last ? dateLabel(last.date) : 'Sin registros'}</span></div>
      <div className={styles.stat}><span className={styles.statLabel}>Cambio desde el inicio</span><strong className={change === null ? '' : change > 0 ? styles.weightUp : styles.weightDown}>{change !== null ? deltaLabel(change) : '—'}</strong><span className={styles.sub}>{first ? `Desde ${dateLabel(first.date)}` : 'Sin registros'}</span></div>
      <div className={styles.stat}><span className={styles.statLabel}>Distancia a la meta</span><strong>{remaining !== null ? remaining > 0 ? `${weightLabel(remaining)} kg` : 'Meta lograda' : '—'}</strong><span className={styles.sub}>{target !== null ? `Meta: ${weightLabel(target)} kg` : 'Sin meta definida'}</span></div>
      <div className={styles.stat}><span className={styles.statLabel}>Avance hacia la meta</span><strong>{progress !== null ? `${Math.round(progress)} %` : '—'}</strong><span className={styles.sub}>Según inicio y meta</span></div>
    </section>
    <div className={styles.bodyGrid}>
      <section className={styles.panel} aria-label="Pesadas registradas">
        <div className={styles.panelTop}><div><h2>Pesadas registradas</h2><p>{entries.length} {entries.length === 1 ? 'registro' : 'registros'} · más recientes primero.</p></div></div>
        {entries.length ? <WeightChart entries={entries} target={target} /> : <p className={styles.chartEmpty}>Todavía no hay pesadas. Guarda la primera y la gráfica empezará a dibujarse.</p>}
        {entries.length ? <div className={styles.records} role="region" aria-label="Historial de pesadas"><div className={`${styles.record} ${styles.recordHead}`}><span>Fecha</span><span>Peso</span><span>Variación</span><span /></div>{[...entries].reverse().map((entry, index, reversed) => { const previous = reversed[index + 1]; const delta = previous ? entry.weight - previous.weight : null; return <div className={styles.record} key={entry.date}><span>{dateLabel(entry.date)}</span><span className={styles.weight}>{weightLabel(entry.weight)} kg</span><span className={`${styles.variation} ${delta === null ? '' : delta > 0 ? styles.weightUp : styles.weightDown}`}>{delta === null ? '—' : deltaLabel(delta)}</span><button className={styles.delete} onClick={() => void removeEntry(entry)} aria-label={`Eliminar pesada del ${dateLabel(entry.date)}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></svg></button></div> })}</div> : <p className={styles.hint}>Sin registros todavía.</p>}
      </section>
      <aside className={styles.aside}>
        <section className={`${styles.panel} ${styles.formPanel}`}>
          <div className={styles.formTitle}><span className={styles.formIcon}>◎</span><div><h3>Meta personal</h3><p>Ajústala cuando lo necesites.</p></div></div>
          <form onSubmit={(event) => void saveTarget(event)}>
            <label htmlFor="weight-goal">Peso objetivo (kg)</label>
            <div className={styles.field}><input id="weight-goal" type="number" step="0.1" min="1" max="999" placeholder="Ej. 75" value={targetInput} onChange={(event) => setTargetInput(event.target.value)} /><button className={styles.secondaryButton}>Guardar</button></div>
            <p className={styles.hint}>{target !== null ? `Meta actual: ${weightLabel(target)} kg. Déjala vacía para quitarla.` : 'Todavía no definiste un peso objetivo.'}</p>
          </form>
        </section>
        <section className={`${styles.panel} ${styles.formPanel}`}>
          <div className={styles.formTitle}><span className={styles.formIcon}>＋</span><div><h3>Registrar pesada</h3><p>Agrega un registro por fecha.</p></div></div>
          <form onSubmit={(event) => void addEntry(event)}>
            <label htmlFor="weight-date">Fecha</label>
            <input id="weight-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <label htmlFor="weight-value">Peso (kg)</label>
            <input id="weight-value" type="number" step="0.1" min="1" max="999" required placeholder="Ej. 78,4" value={weight} onChange={(event) => setWeight(event.target.value)} />
            <button className={`${styles.primaryButton} ${styles.wide}`} disabled={busy}>{busy ? 'Guardando…' : 'Guardar pesada'}</button>
            <p className={styles.hint}>Un registro por fecha; puedes corregirlo más adelante.</p>
          </form>
        </section>
      </aside>
    </div>
    {notice && <div className={`${styles.notice} ${notice.error ? styles.error : ''}`} role="status"><span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Cerrar">×</button></div>}
  </section>
}

function WeightChart({ entries, target }: { entries: WeightEntry[]; target: number | null }) {
  const width = 1200, height = 410, pad = { top: 20, right: 25, bottom: 32, left: 58 }
  const values = entries.map((entry) => entry.weight)
  const all = target === null ? values : [...values, target]
  const low = Math.min(...all), high = Math.max(...all), range = Math.max(high - low, 1)
  const min = low - range * .18, max = high + range * .18
  const firstDate = Date.parse(`${entries[0].date}T00:00:00`), lastDate = Date.parse(`${entries[entries.length - 1].date}T00:00:00`), span = lastDate - firstDate
  const x = (date: string) => span === 0 ? pad.left + (width - pad.left - pad.right) / 2 : pad.left + (Date.parse(`${date}T00:00:00`) - firstDate) / span * (width - pad.left - pad.right)
  const y = (value: number) => pad.top + (1 - (value - min) / (max - min)) * (height - pad.top - pad.bottom)
  const ticks = Array.from({ length: 4 }, (_, index) => min + (max - min) * index / 3)
  return <div className={styles.chartWrap}><svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfica de evolución de peso">{ticks.map((tick) => <g key={tick}><line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className={styles.gridLine} /><text x={pad.left - 9} y={y(tick) + 4} textAnchor="end" className={styles.axisLabel}>{weightLabel(tick)}</text></g>)}{target !== null && <g><line x1={pad.left} x2={width - pad.right} y1={y(target)} y2={y(target)} className={styles.targetLine} /><text x={width - pad.right} y={y(target) - 7} textAnchor="end" className={styles.targetLabel}>Meta {weightLabel(target)} kg</text></g>}<polyline points={entries.map((entry) => `${x(entry.date)},${y(entry.weight)}`).join(' ')} className={styles.chartLine} />{entries.map((entry) => <circle key={entry.date} cx={x(entry.date)} cy={y(entry.weight)} r="4" className={styles.chartDot}><title>{dateLabel(entry.date)} · {weightLabel(entry.weight)} kg</title></circle>)}<text x={pad.left} y={height - 8} className={styles.axisLabel}>{dateLabel(entries[0].date)}</text>{entries[0].date !== entries[entries.length - 1].date && <text x={width - pad.right} y={height - 8} textAnchor="end" className={styles.axisLabel}>{dateLabel(entries[entries.length - 1].date)}</text>}</svg></div>
}

function errorText(error: unknown) { return error instanceof Error ? error.message : String(error) }
