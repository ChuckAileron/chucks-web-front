import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createHijitoSubtask,
  createHijitoTask,
  deleteHijitoSubtask,
  deleteHijitoTask,
  fetchHijitos,
  fetchHijitosBanner,
  setHijitosBanner,
  updateHijitoSubtask,
  updateHijitoTask,
  updateHijitoTrack,
  type HijitoPriority,
  type HijitoSubtask,
  type HijitoTask,
  type HijitoTrack,
} from '../api/hijitos'
import SectionHeading from './SectionHeading'
import styles from './HijitosTool.module.css'

type TaskDraft = { id?: number; trackSlug: string; description: string; dueDate: string; priority: HijitoPriority }
const PRIORITY_ORDER: Record<HijitoPriority, number> = { alto: 0, medio: 1, bajo: 2 }
const PRIORITY_LABELS: Record<HijitoPriority, string> = { alto: 'Alta', medio: 'Media', bajo: 'Baja' }
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
const formatDate = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : ''

export default function HijitosTool() {
  const [tracks, setTracks] = useState<HijitoTrack[]>([])
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null)
  const [trackDraft, setTrackDraft] = useState<HijitoTrack | null>(null)
  const [editingBanner, setEditingBanner] = useState(false)
  const [bannerDraft, setBannerDraft] = useState('')

  const load = useCallback(async () => {
    const [nextTracks, nextBanner] = await Promise.all([fetchHijitos(), fetchHijitosBanner()])
    setTracks(nextTracks)
    setBanner(nextBanner)
  }, [])

  useEffect(() => {
    void load().catch((error: unknown) => setMessage(errorText(error))).finally(() => setLoading(false))
  }, [load])

  const perform = async (action: () => Promise<void>) => {
    setBusy(true)
    setMessage('')
    try { await action(); await load() }
    catch (error) { setMessage(errorText(error)) }
    finally { setBusy(false) }
  }

  const saveTask = (event: FormEvent) => {
    event.preventDefault()
    if (!taskDraft) return
    void perform(async () => {
      const payload = { trackSlug: taskDraft.trackSlug, description: taskDraft.description.trim(), dueDate: taskDraft.dueDate, priority: taskDraft.priority }
      if (taskDraft.id) await updateHijitoTask(taskDraft.id, payload)
      else await createHijitoTask(payload)
      setTaskDraft(null)
    })
  }

  const removeTask = (task: HijitoTask) => {
    if (!window.confirm(`¿Eliminar la tarea “${task.description}” y sus subtareas?`)) return
    void perform(async () => { await deleteHijitoTask(task.id) })
  }

  const saveTrack = (event: FormEvent) => {
    event.preventDefault()
    if (!trackDraft) return
    void perform(async () => {
      await updateHijitoTrack(trackDraft.slug, { name: trackDraft.name, banner: trackDraft.banner, bannerX: trackDraft.bannerX, bannerY: trackDraft.bannerY })
      setTrackDraft(null)
    })
  }

  const saveMainBanner = () => void perform(async () => {
    await setHijitosBanner(bannerDraft)
    setEditingBanner(false)
  })

  const pending = tracks.reduce((sum, track) => sum + track.stats.pending, 0)

  return <section className={styles.hijitos}>
    <SectionHeading eyebrow="ORGANIZA EL DÍA A DÍA" title="Hijitos" description={`Seguimiento de tareas de Izumi y Pepita · ${pending} pendientes.`} status="PostgreSQL local" />
    {message && <div className={styles.notice} role="status">{message}<button onClick={() => setMessage('')} aria-label="Cerrar aviso">×</button></div>}
    {loading ? <div className={styles.loading}>Cargando contextos…</div> : <>
      <section className={styles.mainBanner}>
        {banner ? <img src={banner} alt="Banner principal de Hijitos" /> : <div className={styles.bannerPlaceholder}><span>🐾</span><strong>Un espacio para tus compañeros</strong></div>}
        <div className={styles.bannerOverlay}><span className={styles.eyebrow}>UN ESPACIO PARA ELLOS</span><h2>Pequeños pasos,<br />grandes cuidados.</h2><button className={styles.secondaryButton} onClick={() => { setBannerDraft(banner); setEditingBanner(true) }}>Cambiar banner</button></div>
      </section>
      <div className={styles.trackGrid}>{tracks.map((track) => <TrackPanel key={track.slug} track={track} busy={busy} onEdit={() => setTrackDraft(track)} onNewTask={() => setTaskDraft({ trackSlug: track.slug, description: '', dueDate: '', priority: 'medio' })} onEditTask={(task) => setTaskDraft({ id: task.id, trackSlug: task.trackSlug, description: task.description, dueDate: task.dueDate, priority: task.priority })} onDeleteTask={removeTask} onRefresh={load} onMessage={setMessage} />)}</div>
    </>}
    {taskDraft && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setTaskDraft(null) }}><form className={styles.dialog} onSubmit={saveTask}><span className={styles.eyebrow}>TAREAS</span><h2>{taskDraft.id ? 'Editar tarea' : 'Nueva tarea'}</h2><label>Contexto<select value={taskDraft.trackSlug} onChange={(event) => setTaskDraft({ ...taskDraft, trackSlug: event.target.value })}>{tracks.map((track) => <option key={track.slug} value={track.slug}>{track.name}</option>)}</select></label><label>Descripción<input autoFocus required maxLength={500} value={taskDraft.description} onChange={(event) => setTaskDraft({ ...taskDraft, description: event.target.value })} placeholder="¿Qué hay que hacer?" /></label><div className={styles.dialogRow}><label>Fecha de compromiso<input type="date" value={taskDraft.dueDate} onChange={(event) => setTaskDraft({ ...taskDraft, dueDate: event.target.value })} /></label><label>Prioridad<select value={taskDraft.priority} onChange={(event) => setTaskDraft({ ...taskDraft, priority: event.target.value as HijitoPriority })}><option value="alto">Alta</option><option value="medio">Media</option><option value="bajo">Baja</option></select></label></div><footer>{taskDraft.id && <button type="button" className={styles.dangerButton} onClick={() => { const target = tracks.flatMap((track) => track.tasks).find((task) => task.id === taskDraft.id); setTaskDraft(null); if (target) removeTask(target) }}>Eliminar</button>}<span /><button type="button" className={styles.secondaryButton} onClick={() => setTaskDraft(null)}>Cancelar</button><button className={styles.primaryButton} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button></footer></form></div>}
    {trackDraft && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setTrackDraft(null) }}><form className={styles.dialog} onSubmit={saveTrack}><span className={styles.eyebrow}>PERSONALIZAR CONTEXTO</span><h2>Configurar {trackDraft.name}</h2><label>Nombre<input required maxLength={80} value={trackDraft.name} onChange={(event) => setTrackDraft({ ...trackDraft, name: event.target.value })} /></label><label>Banner (URL)<input type="url" value={trackDraft.banner} onChange={(event) => setTrackDraft({ ...trackDraft, banner: event.target.value })} placeholder="https://…" /></label><div className={styles.dialogRow}><label>Posición horizontal<input type="number" min="0" max="100" value={trackDraft.bannerX} onChange={(event) => setTrackDraft({ ...trackDraft, bannerX: Number(event.target.value) })} /></label><label>Posición vertical<input type="number" min="0" max="100" value={trackDraft.bannerY} onChange={(event) => setTrackDraft({ ...trackDraft, bannerY: Number(event.target.value) })} /></label></div><footer><span /><button type="button" className={styles.secondaryButton} onClick={() => setTrackDraft(null)}>Cancelar</button><button className={styles.primaryButton} disabled={busy}>Guardar</button></footer></form></div>}
    {editingBanner && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingBanner(false) }}><div className={styles.dialog}><span className={styles.eyebrow}>PORTADA</span><h2>Banner principal</h2><label>URL de imagen<input autoFocus type="url" value={bannerDraft} onChange={(event) => setBannerDraft(event.target.value)} placeholder="https://…" /></label><footer><span /><button className={styles.secondaryButton} onClick={() => setEditingBanner(false)}>Cancelar</button><button className={styles.primaryButton} onClick={saveMainBanner} disabled={busy}>Guardar</button></footer></div></div>}
  </section>
}

function TrackPanel({ track, busy, onEdit, onNewTask, onEditTask, onDeleteTask, onRefresh, onMessage }: {
  track: HijitoTrack; busy: boolean; onEdit: () => void; onNewTask: () => void; onEditTask: (task: HijitoTask) => void;
  onDeleteTask: (task: HijitoTask) => void; onRefresh: () => Promise<void>; onMessage: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showDone, setShowDone] = useState(false)
  const [subtaskDraft, setSubtaskDraft] = useState<Record<number, string>>({})
  const pending = track.tasks.filter((task) => !task.done).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.id - b.id)
  const completed = track.tasks.filter((task) => task.done).sort((a, b) => b.id - a.id)
  const toggleExpanded = (id: number) => setExpanded((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleDone = async (task: HijitoTask) => { try { await updateHijitoTask(task.id, { done: !task.done }); await onRefresh() } catch (error) { onMessage(errorText(error)) } }
  const addSubtask = async (taskId: number) => { const text = subtaskDraft[taskId]?.trim(); if (!text) return; try { await createHijitoSubtask(taskId, text); setSubtaskDraft({ ...subtaskDraft, [taskId]: '' }); await onRefresh() } catch (error) { onMessage(errorText(error)) } }
  const toggleSubtask = async (subtask: HijitoSubtask) => { try { await updateHijitoSubtask(subtask.id, { done: !subtask.done }); await onRefresh() } catch (error) { onMessage(errorText(error)) } }
  const deleteSubtask = async (subtask: HijitoSubtask) => { if (!window.confirm('¿Eliminar esta subtarea?')) return; try { await deleteHijitoSubtask(subtask.id); await onRefresh() } catch (error) { onMessage(errorText(error)) } }
  return <article className={styles.track}>
    <div className={styles.trackBanner}>{track.banner ? <img src={track.banner} alt={`Banner de ${track.name}`} style={{ objectPosition: `${track.bannerX}% ${track.bannerY}%` }} onError={(event) => { event.currentTarget.hidden = true }} /> : <div><span>🐾</span><strong>{track.name}</strong></div>}<button onClick={onEdit} aria-label={`Configurar ${track.name}`}>Editar contexto</button></div>
    <div className={styles.trackHeading}><div><span className={styles.paw}>🐾</span><div><h2>{track.name}</h2><p>{track.stats.total} tareas · {track.stats.pending} pendientes · {track.stats.done} realizadas</p></div></div><Progress percent={track.stats.percent} /></div>
    <div className={styles.taskGroupHead}><h3>Pendientes</h3><button className={styles.textAction} onClick={onNewTask}>＋ Nueva tarea</button></div>
    {pending.length ? <ul className={styles.taskList}>{pending.map((task) => <li className={styles.taskRow} key={task.id}><input type="checkbox" checked={task.done} onChange={() => void toggleDone(task)} aria-label={`Marcar ${task.description} como realizada`} /><button className={styles.taskSummary} onClick={() => toggleExpanded(task.id)}><span>{task.description}</span><b className={`${styles.priority} ${styles[`priority_${task.priority}`]}`}>{PRIORITY_LABELS[task.priority]}</b>{task.dueDate && <time className={task.dueDate < today() ? styles.overdue : ''}>{formatDate(task.dueDate)}</time>}{task.subtasks.length > 0 && <small>{task.subtasks.filter((subtask) => subtask.done).length}/{task.subtasks.length} ✓</small>}</button><div className={styles.taskActions}><button onClick={() => onEditTask(task)} aria-label={`Editar ${task.description}`}>Editar</button><button className={styles.deleteIcon} onClick={() => onDeleteTask(task)} aria-label={`Eliminar ${task.description}`}>×</button></div>{expanded.has(task.id) && <div className={styles.subtasks}>{task.subtasks.length === 0 && <p>Sin subtareas todavía.</p>}{task.subtasks.map((subtask) => <div key={subtask.id} className={styles.subtask}><input type="checkbox" checked={subtask.done} onChange={() => void toggleSubtask(subtask)} aria-label={`Marcar ${subtask.description}`} /><span className={subtask.done ? styles.subtaskDone : ''}>{subtask.description}</span><button className={styles.deleteIcon} onClick={() => void deleteSubtask(subtask)} aria-label={`Eliminar subtarea ${subtask.description}`}>×</button></div>)}<form className={styles.subtaskForm} onSubmit={(event) => { event.preventDefault(); void addSubtask(task.id) }}><input value={subtaskDraft[task.id] ?? ''} onChange={(event) => setSubtaskDraft({ ...subtaskDraft, [task.id]: event.target.value })} placeholder="Agregar subtarea…" /><button disabled={busy || !subtaskDraft[task.id]?.trim()}>Agregar</button></form></div>}</li>)}</ul> : <p className={styles.emptyTasks}>Sin tareas pendientes. ¡A crear la primera!</p>}
    {completed.length > 0 && <div className={styles.completed}><button onClick={() => setShowDone((value) => !value)} aria-expanded={showDone}>Realizadas ({completed.length}) <span>{showDone ? '⌃' : '⌄'}</span></button>{showDone && <ul className={styles.taskList}>{completed.map((task) => <li className={styles.taskRow} key={task.id}><input type="checkbox" checked onChange={() => void toggleDone(task)} aria-label={`Volver a pendiente: ${task.description}`} /><button className={styles.taskSummary} onClick={() => toggleExpanded(task.id)}><span>{task.description}</span><b className={`${styles.priority} ${styles[`priority_${task.priority}`]}`}>{PRIORITY_LABELS[task.priority]}</b></button><div className={styles.taskActions}><button onClick={() => onEditTask(task)}>Editar</button><button className={styles.deleteIcon} onClick={() => onDeleteTask(task)}>×</button></div></li>)}</ul>}</div>}
  </article>
}

function Progress({ percent }: { percent: number }) {
  const radius = 29
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, percent))
  return <svg className={styles.progress} viewBox="0 0 72 72" role="img" aria-label={`${clamped}% completado`}><circle className={styles.progressTrack} cx="36" cy="36" r={radius} /><circle className={styles.progressValue} cx="36" cy="36" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamped / 100)} /><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle">{clamped}%</text></svg>
}

function errorText(error: unknown) { return error instanceof Error ? error.message : String(error) }
