// Регистрация по почте, логину и паролю без подтверждения email; после успеха — автоматический вход.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../../../../auth/apiClient'
import { setTokens } from '../../../../../auth/authStorage'
import { messageFromErrorResponse } from '../messageFromErrorResponse'
import '../AuthPages.css'

/** Отправляет регистрацию и затем запрос логина, сохраняет токены и ведёт в приложение. */
function EmailRegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  /** Обрабатывает отправку формы регистрации. */
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const reg = await api.post('/api/auth/register', {
        email: email.trim(),
        username: username.trim(),
        password,
      })
      if (reg.status !== 201) {
        setError(messageFromErrorResponse(reg))
        setPending(false)
        return
      }
      const loginRes = await api.post('/api/auth/login', { login: email.trim(), password })
      if (loginRes.status !== 200) {
        setError(messageFromErrorResponse(loginRes))
        setPending(false)
        return
      }
      const data = loginRes.data as { access_token: string; refresh_token: string }
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
        <h1>Регистрация по почте</h1>
        <p className="auth-lead auth-lead--dark">
          Укажите почту, имя пользователя (логин) и пароль. Аккаунт сразу готов к входу, без писем и кодов.
        </p>
        <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
          <div className="auth-field">
            <label htmlFor="email-register-email">Почта</label>
            <input
              id="email-register-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="email-register-username">Логин (имя пользователя)</label>
            <input
              id="email-register-username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(ev) => setUsername(ev.target.value)}
              required
              maxLength={30}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="email-register-password">Пароль</label>
            <input
              id="email-register-password"
              name="password"
              type="password"
              autoComplete="new-password"
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
            {pending ? 'Создание…' : 'Создать аккаунт'}
          </button>
        </form>
        <p className="auth-lead auth-lead--dark" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          Уже есть аккаунт? <Link to="/login/email">Войти по почте</Link>
        </p>
      </div>
    </div>
  )
}

export default EmailRegisterPage
