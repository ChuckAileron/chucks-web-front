import { requestJson, requestVoid } from './http'

export type AccountColumnType = 'string' | 'number' | 'boolean' | 'date' | 'url' | 'tags'
export interface AccountColumn { name: string; label: string; type: AccountColumnType; required: boolean }
export interface Account { id: number; name: string; description: string; columns: AccountColumn[]; position: number; createdAt: string; updatedAt: string }
export interface AccountRegister { id: number; accountId: number; name: string; date: string; amount: number; values: Record<string, unknown>; createdAt: string; updatedAt: string }
export interface MonthlyTotal { month: number; total: number; count: number }
export interface AccountInput { name: string; description?: string; columns?: AccountColumn[] }
export interface AccountRegisterInput { accountId?: number; name?: string; date: string; amount: number; values?: Record<string, unknown> }

export const ACCOUNT_COLUMN_TYPES: AccountColumnType[] = ['string', 'number', 'boolean', 'date', 'url', 'tags']
export const fetchAccounts = () => requestJson<Account[]>('/accounts')
export const createAccount = (body: AccountInput) => requestJson<Account>('/accounts', { method: 'POST', body })
export const updateAccount = (id: number, body: Partial<AccountInput>) => requestJson<Account>(`/accounts/${id}`, { method: 'PATCH', body })
export const deleteAccount = (id: number) => requestVoid(`/accounts/${id}`, { method: 'DELETE' })
export const reorderAccounts = (ids: number[]) => requestJson<Account[]>('/accounts/reorder', { method: 'PUT', body: { ids } })
export const fetchAccountRegisters = (id: number, q = '') => requestJson<AccountRegister[]>(`/accounts/${id}/registers${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
export const fetchAccountYears = (id: number) => requestJson<number[]>(`/accounts/${id}/years`)
export const fetchAccountMonthly = (id: number, year: number) => requestJson<MonthlyTotal[]>(`/accounts/${id}/monthly?year=${year}`)
export const createAccountRegister = (body: AccountRegisterInput & { accountId: number }) => requestJson<AccountRegister>('/accounts/registers', { method: 'POST', body })
export const updateAccountRegister = (id: number, body: AccountRegisterInput) => requestJson<AccountRegister>(`/accounts/registers/${id}`, { method: 'PATCH', body })
export const deleteAccountRegister = (id: number) => requestVoid(`/accounts/registers/${id}`, { method: 'DELETE' })
