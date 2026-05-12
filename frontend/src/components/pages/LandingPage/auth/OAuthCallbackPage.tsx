// Страница после редиректа OAuth (Яндекс, Google, VK ID): обмен code на JWT и переход в аккаунт.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../../../auth/apiClient'
import { setTokens } from '../../../../auth/authStorage'
import { invalidateCachedGet } from '../../app/AppShell/appBootstrapCache'
import './AuthPages.css'

/** В dev React Strict Mode монтирует эффект дважды; второй POST с тем же code уже получает 401. */
const oauthExchangeStarted = new Set<string>()

/** Показывает статус и обменивает одноразовый code из URL на JWT после редиректа провайдера. */
function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const err = searchParams.get('error')
    const errMsg = searchParams.get('message')
    if (err) {
      let decoded = errMsg ?? ''
      if (decoded) {
        try {
          decoded = decodeURIComponent(decoded)
        } catch {
          /* оставляем как есть */
        }
      }
      setMessage(decoded ? `${err}: ${decoded}` : `Ошибка: ${err}`)
      return
    }
    const code = searchParams.get('code')
    if (!code) {
      setMessage('Не передан код авторизации.')
      return
    }

    if (oauthExchangeStarted.has(code)) {
      return
    }
    oauthExchangeStarted.add(code)

    void (async () => {
      try {
        const res = await api.post('/api/auth/oauth/exchange', { code })
        if (res.status !== 200) {
          const j = res.data as { detail?: string }
          setMessage(typeof j.detail === 'string' ? j.detail : 'Не удалось завершить вход.')
          oauthExchangeStarted.delete(code)
          return
        }
        const data = res.data as { access_token: string; refresh_token: string }
        setTokens(data.access_token, data.refresh_token)
        invalidateCachedGet('/api/users/me')
        navigate('/app/library', { replace: true })
      } catch {
        oauthExchangeStarted.delete(code)
        setMessage('Не удалось завершить вход.')
      }
    })()
  }, [navigate, searchParams])

  if (!message) {
    return (
      <div className="auth-page auth-page--dark">
        <div className="auth-card">
          <p className="auth-lead auth-lead--dark">Завершаем вход…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page auth-page--dark">
      <div className="auth-card">
        <p className="auth-error">{message}</p>
        <Link className="auth-back auth-back--dark" to="/">
          На главную
        </Link>
      </div>
    </div>
  )
}

export default OAuthCallbackPage
