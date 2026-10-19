import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ACCOUNT_COLUMN_TYPES,
  createAccount,
  createAccountRegister,
  deleteAccount,
  deleteAccountRegister,
  fetchAccountMonthly,
  fetchAccountRegisters,
  fetchAccountYears,
  fetchAccounts,
  reorderAccounts,
  updateAccount,
  updateAccountRegister,
  type Account,
  type AccountColumn,
  type AccountColumnType,
  type AccountRegister,
  type MonthlyTotal,
} from '../api/accounts'
import styles from './CuentasTool.module.css'
import SectionHeading from './SectionHeading'

type View = 'chart' | 'registers' | 'settings'
type AccountDraft = { name: string; description: string; columns: AccountColumn[] }
type RegisterDraft = { id?: number; name: string; date: string; amount: string; values: Record<string, unknown> }
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const EMPTY_ACCOUNT: AccountDraft = { name: '', description: '', columns: [] }
const CURRENT_YEAR = new Date().getFullYear()
const today = (() => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` })()
const amountText = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 2 })

export default function CuentasTool() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [registers, setRegisters] = useState<AccountRegister[]>([])
  const [monthly, setMonthly] = useState<MonthlyTotal[]>([])
  const [years, setYears] = useState<number[]>([])
  const [year, setYear] = useState(CURRENT_YEAR)
  const [view, setView] = useState<View>('chart')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [accountDraft, setAccountDraft] = useState<AccountDraft>(EMPTY_ACCOUNT)
  const [registerDraft, setRegisterDraft] = useState<RegisterDraft | null>(null)
  const account = accounts.find((item) => item.id === activeId) ?? null

  const loadAccounts = useCallback(async (preferredId?: number) => {
    const found = await fetchAccounts()
    setAccounts(found)
    const selected = found.find((item) => item.id === (preferredId ?? activeId)) ?? found[0] ?? null
    setActiveId(selected?.id ?? null)
    if (selected) setAccountDraft({ name: selected.name, description: selected.description, columns: selected.columns })
    else { setRegisters([]); setMonthly([]); setYears([]) }
    return found
  }, [activeId])

  useEffect(() => { void loadAccounts().catch((error: unknown) => setMessage(errorText(error))) }, [loadAccounts])
  useEffect(() => {
    if (activeId === null) { setRegisters([]); setMonthly([]); setYears([]); return }
    Promise.all([fetchAccountRegisters(activeId, search), fetchAccountYears(activeId)]).then(([rows, available]) => {
      const currentYear = new Date().getFullYear()
      const choices = [...new Set([currentYear, ...available])].sort((a, b) => b - a)
      setRegisters(rows); setYears(choices); setYear((current) => choices.includes(current) ? current : currentYear)
    }).catch((error: unknown) => setMessage(errorText(error)))
  }, [activeId, search])
  useEffect(() => {
    if (activeId === null) return
    void fetchAccountMonthly(activeId, year).then(setMonthly).catch((error: unknown) => setMessage(errorText(error)))
  }, [activeId, year])

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('')
    try { await action() } catch (error) { setMessage(errorText(error)) } finally { setBusy(false) }
  }

  const saveAccount = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      const saved = creating ? await createAccount(accountDraft) : await updateAccount(activeId as number, accountDraft)
      setCreating(false); setView('chart'); await loadAccounts(saved.id); setMessage(creating ? 'Cuenta creada.' : 'Cuenta actualizada.')
    })
  }

  const removeAccount = () => {
    if (!account || !window.confirm(`¿Eliminar la cuenta “${account.name}” y todos sus movimientos?`)) return
    void run(async () => { await deleteAccount(account.id); setCreating(false); setActiveId(null); await loadAccounts(); setView('chart'); setMessage('Cuenta eliminada.') })
  }

  const moveAccount = (id: number, direction: -1 | 1) => void run(async () => {
    const ordered = [...accounts]; const index = ordered.findIndex((item) => item.id === id); const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    await reorderAccounts(ordered.map((item) => item.id)); await loadAccounts(id)
  })

  const saveRegister = (event: FormEvent) => {
    event.preventDefault()
    if (!account || !registerDraft) return
    void run(async () => {
      const payload = { accountId: account.id, name: registerDraft.name, date: registerDraft.date, amount: Number(registerDraft.amount), values: registerDraft.values }
      if (registerDraft.id) await updateAccountRegister(registerDraft.id, payload)
      else await createAccountRegister({ ...payload, accountId: account.id })
      setRegisterDraft(null); setMessage(registerDraft.id ? 'Movimiento actualizado.' : 'Movimiento agregado.')
      setRegisters(await fetchAccountRegisters(account.id, search)); setMonthly(await fetchAccountMonthly(account.id, year)); setYears([...new Set([new Date().getFullYear(), ...await fetchAccountYears(account.id)])].sort((a, b) => b - a))
    })
  }

  const removeRegister = (item: AccountRegister) => {
    if (!window.confirm(`¿Eliminar el movimiento “${item.name}”?`)) return
    void run(async () => { await deleteAccountRegister(item.id); setRegisters(await fetchAccountRegisters(item.accountId, search)); setMonthly(await fetchAccountMonthly(item.accountId, year)); setYears([...new Set([new Date().getFullYear(), ...await fetchAccountYears(item.accountId)])].sort((a, b) => b - a)); setMessage('Movimiento eliminado.') })
  }

  const updateColumn = (index: number, patch: Partial<AccountColumn>) => setAccountDraft({ ...accountDraft, columns: accountDraft.columns.map((column, position) => position === index ? { ...column, ...patch } : column) })
  const addColumn = () => setAccountDraft({ ...accountDraft, columns: [...accountDraft.columns, { name: `campo_${accountDraft.columns.length + 1}`, label: 'Nuevo campo', type: 'string', required: false }] })
  const editRegister = (item: AccountRegister) => { setRegisterDraft({ id: item.id, name: item.name, date: item.date, amount: String(item.amount), values: item.values }); setView('registers') }

  return <section className={styles.accounts}>
    <SectionHeading eyebrow="ADMINISTRACIÓN PERSONAL" title="Cuentas" description="Controla gastos, pagos y ahorros por cuenta." status="PostgreSQL local" />
    <nav className={`${styles.tabs} app-tabs`} aria-label="Secciones de cuentas"><button className={view === 'chart' ? 'active' : ''} onClick={() => setView('chart')}>Gráfico</button><button className={view === 'registers' ? 'active' : ''} onClick={() => { setRegisterDraft(null); setView('registers') }}>Movimientos <b>{registers.length}</b></button><button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>Configurar cuenta</button></nav>
    <div className={styles.workspace}>
      <div className={styles.accountBar}><div className={styles.accountTabs}>{accounts.map((item) => <button key={item.id} className={item.id === activeId && !creating ? styles.accountActive : ''} onClick={() => { setActiveId(item.id); setCreating(false); setRegisterDraft(null); setAccountDraft({ name: item.name, description: item.description, columns: item.columns }) }}>{item.name}</button>)}</div><button className={styles.secondaryButton} onClick={() => { setCreating(true); setActiveId(null); setAccountDraft(EMPTY_ACCOUNT); setView('settings') }}>＋ Nueva cuenta</button></div>
      {message && <div className={styles.notice} role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Cerrar aviso">×</button></div>}
      {view === 'settings' ? <form className={styles.editor} onSubmit={saveAccount}><div className={styles.sectionHead}><div><span className={styles.eyebrow}>CONFIGURACIÓN</span><h2>{creating ? 'Nueva cuenta' : 'Configurar cuenta'}</h2></div></div><div className={styles.formGrid}><label>Nombre<input required maxLength={80} value={accountDraft.name} onChange={(event) => setAccountDraft({ ...accountDraft, name: event.target.value })} /></label><label className={styles.wide}>Descripción<textarea value={accountDraft.description} onChange={(event) => setAccountDraft({ ...accountDraft, description: event.target.value })} rows={3} /></label></div><section className={styles.schema}><div className={styles.sectionHead}><div><h3>Campos personalizados</h3><p>Define los datos adicionales de cada movimiento.</p></div><button type="button" className={styles.secondaryButton} onClick={addColumn}>＋ Agregar campo</button></div>{accountDraft.columns.map((column, index) => <div className={styles.columnRow} key={index}><input aria-label="Etiqueta" value={column.label} onChange={(event) => updateColumn(index, { label: event.target.value })} placeholder="Etiqueta" /><input aria-label="Nombre interno" value={column.name} onChange={(event) => updateColumn(index, { name: event.target.value })} placeholder="clave_interna" /><select value={column.type} onChange={(event) => updateColumn(index, { type: event.target.value as AccountColumnType })}>{ACCOUNT_COLUMN_TYPES.map((type) => <option key={type} value={type}>{columnTypeLabel(type)}</option>)}</select><label className={styles.required}><input type="checkbox" checked={column.required} onChange={(event) => updateColumn(index, { required: event.target.checked })} /> Obligatorio</label><button type="button" className={styles.deleteSmall} onClick={() => setAccountDraft({ ...accountDraft, columns: accountDraft.columns.filter((_, i) => i !== index) })}>Quitar</button></div>)}{!accountDraft.columns.length && <p className={styles.muted}>No hay campos personalizados.</p>}</section><section className={styles.schema}><div className={styles.sectionHead}><div><h3>Orden de cuentas</h3><p>Organiza las pestañas de esta sección.</p></div></div>{accounts.map((item, index) => <div className={styles.orderRow} key={item.id}><span>{item.name}</span><button disabled={index === 0 || busy} onClick={() => moveAccount(item.id, -1)} type="button" aria-label={`Subir ${item.name}`}>↑</button><button disabled={index === accounts.length - 1 || busy} onClick={() => moveAccount(item.id, 1)} type="button" aria-label={`Bajar ${item.name}`}>↓</button></div>)}</section><footer className={styles.formFooter}>{account && !creating ? <button type="button" className={styles.dangerButton} onClick={removeAccount}>Eliminar cuenta</button> : <span />}<span /><button className={styles.primaryButton} disabled={busy || !accountDraft.name.trim()}>{busy ? 'Guardando…' : creating ? 'Crear cuenta' : 'Guardar cambios'}</button></footer></form>
      : view === 'registers' ? <section><div className={styles.sectionHead}><div><span className={styles.eyebrow}>REGISTROS</span><h2>{account?.name ?? 'Movimientos'}</h2></div><button className={styles.primaryButton} disabled={!account} onClick={() => setRegisterDraft({ name: '', date: today, amount: '', values: {} })}>＋ Agregar movimiento</button></div><label className={styles.search}>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar movimientos…" /></label>{registerDraft && account && <RegisterEditor account={account} draft={registerDraft} setDraft={setRegisterDraft} onSave={saveRegister} onCancel={() => setRegisterDraft(null)} busy={busy} />}{registers.length ? <div className={styles.registerList}>{registers.map((item) => <article key={item.id} className={styles.registerRow}><div className={styles.registerDate}>{formatDate(item.date)}</div><div className={styles.registerInfo}><strong>{item.name}</strong><small>{account?.columns.map((column) => item.values[column.name] !== undefined ? `${column.label}: ${formatAccountValue(column, item.values[column.name])}` : '').filter(Boolean).join(' · ')}</small></div><b className={item.amount < 0 ? styles.negative : styles.positive}>{amountText(item.amount)}</b><div><button className={styles.secondaryButton} onClick={() => editRegister(item)}>Editar</button><button className={styles.deleteSmall} onClick={() => removeRegister(item)}>Eliminar</button></div></article>)}</div> : <EmptyAccount text="No hay movimientos para mostrar." />}</section>
      : <section><div className={styles.chartHead}><div><span className={styles.eyebrow}>RESUMEN ANUAL</span><h2>{account ? `Variación mensual · ${account.name}` : 'Variación mensual'}</h2></div><label>Año<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>{account && monthly.some((item) => item.count > 0) ? <MonthlyChart totals={monthly} /> : <EmptyAccount text={account ? `Sin movimientos en ${year}. Agrega movimientos para ver el gráfico.` : 'Crea una cuenta para comenzar a registrar movimientos.'} />}</section>}
    </div>
  </section>
}

function RegisterEditor({ account, draft, setDraft, onSave, onCancel, busy }: { account: Account; draft: RegisterDraft; setDraft: (draft: RegisterDraft | null) => void; onSave: (event: FormEvent) => void; onCancel: () => void; busy: boolean }) {
  const setValue = (name: string, value: unknown) => setDraft({ ...draft, values: { ...draft.values, [name]: value } })
  return <form className={styles.registerEditor} onSubmit={(event) => onSave(event)}><div className={styles.formGrid}><label>Concepto<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Fecha<input required type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>Monto<input required type="number" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></label>{account.columns.map((column) => <AccountColumnInput key={column.name} column={column} value={draft.values[column.name]} onChange={(value) => setValue(column.name, value)} />)}</div><div className={styles.formFooter}><span /><button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancelar</button><button className={styles.primaryButton} disabled={busy}>{busy ? 'Guardando…' : 'Guardar movimiento'}</button></div></form>
}

function AccountColumnInput({ column, value, onChange }: { column: AccountColumn; value: unknown; onChange: (value: unknown) => void }) {
  if (column.type === 'boolean') return <label className={styles.booleanInput}><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />{column.label}</label>
  const type = column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : column.type === 'url' ? 'url' : 'text'
  const shown = column.type === 'tags' && Array.isArray(value) ? value.join(', ') : column.type === 'date' && typeof value === 'string' ? value.slice(0, 10) : String(value ?? '')
  return <label>{column.label}{column.type === 'tags' ? <input value={shown} onChange={(event) => onChange(event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} placeholder="Separar con comas" /> : <input type={type} required={column.required} value={shown} onChange={(event) => onChange(type === 'number' ? event.target.value : event.target.value)} />}</label>
}

function MonthlyChart({ totals }: { totals: MonthlyTotal[] }) {
  const max = Math.max(1, ...totals.map((item) => Math.abs(item.total)))
  return <div className={styles.chart}>{totals.map((item) => { const barStyle = item.total >= 0 ? { height: `${Math.max(1, Math.abs(item.total) / max * 46)}%`, bottom: '50%' } : { height: `${Math.max(1, Math.abs(item.total) / max * 46)}%`, top: '50%' }; return <div className={styles.chartCol} key={item.month} title={`${MONTHS[item.month - 1]}: ${amountText(item.total)} · ${item.count} movimientos`}><div className={styles.barTrack}><i className={item.total < 0 ? styles.negativeBar : styles.positiveBar} style={barStyle} /></div><span>{MONTHS[item.month - 1]}</span><small>{amountText(item.total)}</small></div> })}</div>
}

function EmptyAccount({ text }: { text: string }) { return <div className={styles.empty}><span>▤</span><p>{text}</p></div> }
function formatDate(value: string) { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}` }
function formatAccountValue(column: AccountColumn, value: unknown) { if (column.type === 'boolean') return value ? 'Sí' : 'No'; if (Array.isArray(value)) return value.join(', '); return String(value ?? '—') }
function columnTypeLabel(type: AccountColumnType) { return ({ string: 'Texto', number: 'Número', boolean: 'Sí / No', date: 'Fecha', url: 'URL', tags: 'Etiquetas' })[type] }
function errorText(error: unknown) { return error instanceof Error ? error.message : String(error) }
