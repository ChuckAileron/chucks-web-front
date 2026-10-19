import { useCallback, useEffect, useState } from 'react'
import {
  createCalendarEvent,
  deleteCalendarEvent,
  EVENT_COLORS,
  fetchCalendarColors,
  fetchCalendarEvents,
  refreshCalendarHolidays,
  updateCalendarEvent,
  type CalendarEvent,
  type CalendarEventInput,
} from '../api/calendar'
import SectionHeading from './SectionHeading'
import styles from './CalendarioTool.module.css'

type Draft = Omit<CalendarEventInput, 'images'> & { id?: number; images: string[]; startTime: string; endTime: string }
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const CURRENT_YEAR = new Date().getFullYear()
const TODAY_DATE = new Date()
const TODAY_ISO = `${TODAY_DATE.getFullYear()}-${String(TODAY_DATE.getMonth() + 1).padStart(2, '0')}-${String(TODAY_DATE.getDate()).padStart(2, '0')}`
const emptyDraft = (date: string, color = 'teal'): Draft => ({ title: '', label: '', color, startDate: date, endDate: date, allDay: true, startTime: '', endTime: '', description: '', images: [] })

export default function CalendarioTool() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [colors, setColors] = useState<string[]>(EVENT_COLORS)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedDayLabel, setSelectedDayLabel] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const found = await fetchCalendarEvents(`${year}-01-01`, `${year}-12-31`)
    setEvents(found)
  }, [year])

  useEffect(() => { void reload().catch((error: unknown) => setMessage(errorText(error))) }, [reload])
  useEffect(() => { void fetchCalendarColors().then(setColors).catch(() => setColors(EVENT_COLORS)) }, [])

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('')
    try { await action() } catch (error) { setMessage(errorText(error)) } finally { setBusy(false) }
  }

  const openDay = (day: string) => {
    setSelectedDay(day)
    const [dayYear, dayMonth, dayNumber] = day.split('-').map(Number)
    const date = new Date(dayYear, dayMonth - 1, dayNumber)
    setSelectedDayLabel(date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
  }
  const newEvent = (day: string) => { setSelectedDay(null); setDraft(emptyDraft(day, colors[0] || 'teal')) }
  const editEvent = (event: CalendarEvent) => {
    setSelectedDay(null)
    setDraft({ ...event, startTime: event.startTime ?? '', endTime: event.endTime ?? '' })
  }

  const save = () => {
    if (!draft) return
    void run(async () => {
      const payload: CalendarEventInput = { ...draft, startTime: draft.allDay ? null : draft.startTime || null, endTime: draft.allDay ? null : draft.endTime || null }
      if (draft.id) await updateCalendarEvent(draft.id, payload)
      else await createCalendarEvent(payload)
      setDraft(null)
      await reload()
      setMessage(draft.id ? 'Evento actualizado.' : 'Evento creado.')
    })
  }

  const remove = () => {
    if (!draft?.id || !window.confirm(`¿Eliminar el evento “${draft.title}”?`)) return
    void run(async () => { await deleteCalendarEvent(draft.id!); setDraft(null); await reload(); setMessage('Evento eliminado.') })
  }

  const updateHolidays = () => void run(async () => {
    const result = await refreshCalendarHolidays(year)
    await reload()
    setMessage(`Feriados actualizados: ${result.total} para ${result.year}.`)
  })

  const daysEvents = (day: string) => events.filter((event) => event.startDate <= day && event.endDate >= day).sort((a, b) => Number(a.allDay) === Number(b.allDay) ? (a.startTime ?? '').localeCompare(b.startTime ?? '') : a.allDay ? -1 : 1)
  const years = Array.from({ length: Math.max(8, CURRENT_YEAR - 1999 + 2) }, (_, index) => CURRENT_YEAR + 1 - index).filter((value) => value >= 2000)

  return <section className={styles.calendar}>
    <SectionHeading eyebrow="PLANIFICA TU TIEMPO" title="Calendario" description="Eventos, fechas importantes y recordatorios en una vista anual." status="PostgreSQL local" />
    {message && <div className={styles.notice} role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Cerrar">×</button></div>}
    <div className={styles.yearBar}><button className={styles.secondaryButton} disabled={year <= 2000} onClick={() => setYear((value) => value - 1)} aria-label="Año anterior">‹</button><label><span>Año</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><button className={styles.secondaryButton} disabled={year >= CURRENT_YEAR + 1} onClick={() => setYear((value) => value + 1)} aria-label="Año siguiente">›</button><button className={styles.secondaryButton} disabled={busy} onClick={updateHolidays}>{busy ? 'Actualizando…' : 'Actualizar feriados de Chile'}</button></div>
    <div className={styles.monthGrid}>{MONTHS.map((_, index) => <Month key={`${year}-${index}`} year={year} month={index + 1} events={events} onSelectDay={openDay} />)}</div>

    {selectedDay && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDay(null) }}><section className={styles.dayDialog} role="dialog" aria-modal="true" aria-labelledby="calendar-day-title"><header><div><span className={styles.eyebrow}>AGENDA DEL DÍA</span><h2 id="calendar-day-title">{selectedDayLabel}</h2></div><button className={styles.closeButton} onClick={() => setSelectedDay(null)} aria-label="Cerrar">×</button></header><button className={styles.primaryButton} onClick={() => newEvent(selectedDay)}>＋ Nuevo evento</button><div className={styles.dayAgenda}>{daysEvents(selectedDay).map((event) => <button key={event.id} className={`${styles.agendaEvent} ${styles[`color_${event.color}`]}`} onClick={() => editEvent(event)}><strong>{event.isHoliday && '⚑ '}{event.title}</strong><span>{event.allDay ? 'Todo el día' : `${event.startTime || ''}${event.endTime ? ` – ${event.endTime}` : ''}`}</span></button>)}{!daysEvents(selectedDay).length && <p>Sin eventos para este día.</p>}</div></section></div>}

    {draft && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setDraft(null) }}><form className={styles.eventDialog} onSubmit={(event) => { event.preventDefault(); save() }}><header><div><span className={styles.eyebrow}>{draft.id ? 'EDITAR EVENTO' : 'NUEVO EVENTO'}</span><h2>{draft.id ? draft.title : 'Crear evento'}</h2></div><button type="button" className={styles.closeButton} onClick={() => setDraft(null)} aria-label="Cerrar">×</button></header><div className={styles.formGrid}><label className={styles.wide}>Título<input required maxLength={180} autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Reunión, entrega, viaje…" /></label><label>Etiqueta<input maxLength={80} value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="Personal, trabajo…" /></label><label>Color<select value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })}>{colors.map((color) => <option key={color} value={color}>{colorName(color)}</option>)}</select></label><label>Desde<input type="date" required value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value, endDate: draft.endDate < event.target.value ? event.target.value : draft.endDate })} /></label><label>Hasta<input type="date" required min={draft.startDate} value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label><label className={`${styles.checkbox} ${styles.wide}`}><input type="checkbox" checked={draft.allDay} onChange={(event) => setDraft({ ...draft, allDay: event.target.checked })} /> Todo el día</label>{!draft.allDay && <><label>Hora de inicio<input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></label><label>Hora de fin<input type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></label></>}<label className={styles.wide}>Descripción<textarea rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><ImageUrlField value={draft.images} onChange={(images) => setDraft({ ...draft, images })} /></div><footer>{draft.id && !draft.isHoliday ? <button type="button" className={styles.dangerButton} onClick={remove}>Eliminar</button> : <span /> }<span /><button type="button" className={styles.secondaryButton} onClick={() => setDraft(null)}>Cancelar</button><button className={styles.primaryButton} disabled={busy}>{busy ? 'Guardando…' : 'Guardar evento'}</button></footer></form></div>}
  </section>
}

function Month({ year, month, events, onSelectDay }: { year: number; month: number; events: CalendarEvent[]; onSelectDay: (day: string) => void }) {
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7
  const days = new Date(year, month, 0).getDate()
  const cells: Array<number | null> = [...Array.from({ length: offset }, () => null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const today = localToday()
    return <section className={styles.month}><h2>{MONTHS[month - 1]}</h2><div className={styles.weekdays}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => <span key={day}>{day}</span>)}</div><div className={styles.days}>{cells.map((day, index) => {
    if (!day) return <span className={styles.blankDay} key={`blank-${index}`} />
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayEvents = events.filter((event) => event.startDate <= date && event.endDate >= date).sort((a, b) => Number(b.allDay) - Number(a.allDay) || (a.startTime ?? '').localeCompare(b.startTime ?? ''))
    return <button type="button" key={date} className={`${styles.day} ${date === today ? styles.today : ''} ${dayEvents.some((event) => event.isHoliday) ? styles.holiday : ''}`} onClick={() => onSelectDay(date)}><span className={styles.dayNumber}>{day}</span><span className={styles.dayEvents}>{dayEvents.slice(0, 2).map((event) => <span key={event.id} className={`${styles.eventPill} ${styles[`color_${event.color}`]}`} title={event.title}>{event.isHoliday ? '⚑' : event.title}</span>)}{dayEvents.length > 2 && <small>+{dayEvents.length - 2}</small>}</span></button>
  })}</div></section>
}

function ImageUrlField({ value, onChange }: { value: string[]; onChange: (images: string[]) => void }) {
  const [url, setUrl] = useState('')
  const add = () => { const clean = url.trim(); if (!/^https?:\/\//i.test(clean) || value.includes(clean)) return; onChange([...value, clean]); setUrl('') }
  return <div className={`${styles.imageUrls} ${styles.wide}`}><label>Imágenes por URL</label><div><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /><button type="button" className={styles.secondaryButton} onClick={add} disabled={!url.trim()}>Agregar</button></div>{value.map((image) => <span key={image}>{image}<button type="button" onClick={() => onChange(value.filter((item) => item !== image))} aria-label="Quitar imagen">×</button></span>)}</div>
}

function colorName(color: string) { return ({ teal: 'Turquesa', azul: 'Azul', naranja: 'Naranja', rojo: 'Rojo', verde: 'Verde', morado: 'Morado', amarillo: 'Amarillo' })[color] ?? color }
function localToday() { return TODAY_ISO }
function errorText(error: unknown) { return error instanceof Error ? error.message : String(error) }
