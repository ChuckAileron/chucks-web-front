import { requestJson, requestVoid } from './http'

export interface CalendarEvent { id: number; title: string; label: string; color: string; startDate: string; endDate: string; allDay: boolean; startTime: string | null; endTime: string | null; description: string; images: string[]; isHoliday: boolean; createdAt: string; updatedAt: string }
export type CalendarEventInput = Omit<Partial<CalendarEvent>, 'id' | 'createdAt' | 'updatedAt'> & { title: string; startDate: string; endDate: string }
export const EVENT_COLORS = ['teal', 'azul', 'naranja', 'rojo', 'verde', 'morado', 'amarillo']

export const fetchCalendarColors = () => requestJson<string[]>('/calendar/colors')
export const fetchCalendarEvents = (start: string, end: string) => requestJson<CalendarEvent[]>(`/calendar/events?start=${start}&end=${end}`)
export const createCalendarEvent = (body: CalendarEventInput) => requestJson<CalendarEvent>('/calendar/events', { method: 'POST', body })
export const updateCalendarEvent = (id: number, body: Partial<CalendarEventInput>) => requestJson<CalendarEvent>(`/calendar/events/${id}`, { method: 'PATCH', body })
export const deleteCalendarEvent = (id: number) => requestVoid(`/calendar/events/${id}`, { method: 'DELETE' })
export const refreshCalendarHolidays = (year: number) => requestJson<{ year: number; total: number }>(`/calendar/holidays/${year}/refresh`, { method: 'POST' })
