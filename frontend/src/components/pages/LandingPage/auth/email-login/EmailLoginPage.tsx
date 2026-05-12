// Вход по email и паролю; возврат — на выбор способов (/login).
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../../../../auth/apiClient'
import { setTokens } from '../../../../../auth/authStorage'
import { messageFromErrorResponse } from '../messageFromErrorResponse'
import '../AuthPages.css'

/** Отправляет учётные данные на /api/auth/login и переводит в приложение при успехе. */
function EmailLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  /** Обрабатывает отправку формы входа. */
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res = await api.post('/api/auth/login', { login: email.trim(), password })
      if (res.status !== 200) {
        setError(messageFromErrorResponse(res))
        setPending(false)
        return
      }
      const data = res.data as { access_token: string; refresh_token: string }
      setTokens(data.access_token, data.refresh_token)
      navigate('/app/library', { replace: true })
    } catch {
      setError('Сеть недоступна. Проверьте подключение.')
      setPending(false)
    }
  }

  return (
    <div className="auth-page auth-page--dark">
      <div className="auth-card">
        <Link className="auth-back auth-back--dark" to="/login">
          ← К способам входа
        </Link>
        <h1>Вход по почте</h1>
        <p className="auth-lead auth-lead--dark">
          Введите почту или имя пользователя и пароль. Если вы входили только через Яндекс, Google или VK ID — пароль здесь не подойдёт; войдите тем же способом.
        </p>
        <p className="auth-lead auth-lead--dark" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
          Нет аккаунта? <Link to="/login/email/register">Зарегистрироваться по почте</Link>
        </p>
        <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
          <div className="auth-field">
            <label htmlFor="email-login-email">Email или имя</label>
            <input
              id="email-login-email"
              name="login"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="email-login-password">Пароль</label>
            <input
              id="email-login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="auth-submit" type="submit" disabled={pending}>
            {pending ? 'Вход…' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default EmailLoginPage
