import { useState, type FormEvent } from 'react'
import { login, register, requestPasswordReset, resetPassword } from '../api/auth'
import { useTheme } from '../hooks/useTheme'
import styles from './Login.module.css'

interface LoginProps {
  onAuthenticated: (token: string) => void
}

export function Login({ onAuthenticated }: LoginProps) {
  const { theme, toggleTheme } = useTheme()
  const [isRegister, setIsRegister] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('resetPassword') ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (isForgotPassword) {
        const result = await requestPasswordReset(email)
        setNotice(result.message)
        setIsForgotPassword(false)
        return
      }
      if (resetToken) {
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden.')
          return
        }
        const result = await resetPassword(resetToken, password)
        setNotice(result.message)
        setResetToken('')
        setPassword('')
        setConfirmPassword('')
        window.history.replaceState({}, '', window.location.pathname + window.location.search)
        return
      }
      const result = isRegister ? await register(email, password) : await login(email, password)
      onAuthenticated(result.accessToken)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={styles.screen}>
      <button className={styles.themeButton} type="button" onClick={toggleTheme}>
        {theme === 'dark' ? '☀ Claro' : '☾ Oscuro'}
      </button>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brandMark} aria-hidden="true">C</div>
        <span className={styles.eyebrow}>CHUCK'S WEB</span>
        <h1 id="login-title">{resetToken ? 'Crea una nueva contraseña' : isForgotPassword ? 'Recupera tu acceso' : isRegister ? 'Crea tu cuenta' : 'Qué bueno verte'}</h1>
        <p className={styles.description}>
          {resetToken
            ? 'Elige una contraseña nueva para volver a acceder a tu espacio.'
            : isForgotPassword
              ? 'Te enviaremos un enlace para restablecer la contraseña de tu cuenta.'
              : isRegister
            ? 'Registra la cuenta única para empezar a organizar tu espacio.'
            : 'Inicia sesión para entrar a tu espacio personal.'}
        </p>
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          {!resetToken && <><label htmlFor="login-email">Correo electrónico</label><input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.com"
            required
            maxLength={254}
          /></>}
          {!isForgotPassword && <><label htmlFor="login-password">{resetToken ? 'Nueva contraseña' : 'Contraseña'}</label><input
            id="login-password"
            type="password"
            autoComplete={isRegister || resetToken ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isRegister ? 'Al menos 12 caracteres' : 'Tu contraseña'}
            required
            minLength={12}
            maxLength={128}
          /></>}
          {resetToken && <><label htmlFor="login-confirm-password">Repite la nueva contraseña</label><input id="login-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} maxLength={128} /></>}
          {isForgotPassword && <p className={styles.hint}>Si el correo corresponde a la cuenta, recibirás instrucciones para continuar.</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          {notice && <p className={styles.notice} role="status">{notice}</p>}
          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? 'Un momento…' : resetToken ? 'Guardar contraseña' : isForgotPassword ? 'Enviar enlace' : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            {!busy && <span aria-hidden="true">→</span>}
          </button>
        </form>
        {!resetToken && <div className={styles.switchMode}>
          {!isForgotPassword && !isRegister && <><button type="button" onClick={() => { setError(''); setNotice(''); setIsForgotPassword(true) }}>¿Olvidaste tu contraseña?</button><br /></>}
          {isRegister ? '¿Ya tienes una cuenta?' : isForgotPassword ? '¿Recordaste tu contraseña?' : '¿Es tu primer acceso?'}{' '}
          <button type="button" onClick={() => { setError(''); setNotice(''); if (isForgotPassword) setIsForgotPassword(false); else setIsRegister((value) => !value) }}>
            {isRegister || isForgotPassword ? 'Inicia sesión' : 'Crear la primera cuenta'}
          </button>
        </div>}
        {resetToken && <div className={styles.switchMode}><button type="button" onClick={() => { setResetToken(''); setPassword(''); setConfirmPassword(''); window.history.replaceState({}, '', window.location.pathname + window.location.search) }}>Volver al inicio de sesión</button></div>}
        <p className={styles.footer}>Un espacio para tus ideas. Menos ruido. Más enfoque.</p>
      </section>
    </main>
  )
}
