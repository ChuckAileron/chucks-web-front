import { requestJson } from './http'

export interface AuthResponse {
  user: { id: number; email: string }
  accessToken: string
}

export const login = (email: string, password: string) =>
  requestJson<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })

export const register = (email: string, password: string) =>
  requestJson<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { email, password },
  })

export const requestPasswordReset = (email: string) =>
  requestJson<{ message: string }>('/auth/password-reset/request', {
    method: 'POST',
    body: { email },
  })

export const resetPassword = (token: string, password: string) =>
  requestJson<{ message: string }>('/auth/password-reset/confirm', {
    method: 'POST',
    body: { token, password },
  })

export const validateSession = () =>
  requestJson<{ authenticated: true }>('/auth/me')
