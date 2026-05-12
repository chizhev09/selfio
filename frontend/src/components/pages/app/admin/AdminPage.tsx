//==== Страница админки: логин по паролю и отображение сводных метрик пользователей/платежей. ====
import { useMemo, useState } from 'react'
import './AdminPage.css'

/** Пусто — тот же origin (прод: selfio.ru + Nginx /api); иначе полный URL бэкенда для нестандартной сборки. */
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, '') || ''

/** Собирает URL ручек /api/admin/… (на одном сервере с фронтом ходит через тот же /api, что и основное приложение). */
function adminApiUrl(suffix: string): string {
  const s = suffix.startsWith('/') ? suffix : `/${suffix}`
  return API_ORIGIN ? `${API_ORIGIN}/api/admin${s}` : `/api/admin${s}`
}

type UsersStats = {
  total_users: number
  registered_today: number
  registered_last_7_days: number
  registered_last_30_days: number
}

type PaymentsStats = {
  paid_total: number
  paid_last_24h: number
  paid_last_7_days: number
  paid_last_30_days: number
  revenue_rub_last_30_days: number
  tokens_sold_last_30_days: number
}

function AdminPage() {
  // Хранит введённый пароль админки.
  const [password, setPassword] = useState('')
  // Хранит статус успешной проверки пароля.
  const [isAuthed, setIsAuthed] = useState(false)
  // Хранит сообщение об ошибке входа.
  const [error, setError] = useState('')
  // Хранит метрики пользователей для верхнего блока админ-панели.
  const [usersStats, setUsersStats] = useState<UsersStats | null>(null)
  // Хранит метрики платежей для нижнего блока админ-панели.
  const [paymentsStats, setPaymentsStats] = useState<PaymentsStats | null>(null)
  // Хранит статус отправки формы входа.
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Отправляет пароль на backend и открывает админ-панель при успехе.
  const submitAdminPassword = async () => {
    if (isSubmitting) {
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const response = await fetch(adminApiUrl('/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (response.ok) {
        setIsAuthed(true)
        const headers = { 'X-Admin-Password': password }
        const [usersResponse, paymentsResponse] = await Promise.all([
          fetch(adminApiUrl('/stats/users'), { headers }),
          fetch(adminApiUrl('/stats/payments'), { headers }),
        ])
        if (usersResponse.ok) {
          const users = (await usersResponse.json()) as UsersStats
          setUsersStats(users)
        } else {
          setUsersStats(null)
        }
        if (paymentsResponse.ok) {
          const payments = (await paymentsResponse.json()) as PaymentsStats
          setPaymentsStats(payments)
        } else {
          setPaymentsStats(null)
        }
        return
      }
      const payload = (await response.json().catch(() => ({}))) as { detail?: string }
      setIsAuthed(false)
      setUsersStats(null)
      setPaymentsStats(null)
      setError(payload.detail || 'Не удалось войти в админ-панель.')
    } catch {
      setIsAuthed(false)
      setUsersStats(null)
      setPaymentsStats(null)
      setError('Ошибка сети при входе в админ-панель.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Форматирует числовые значения для красивого отображения на карточках.
  const numberFormatter = useMemo(() => new Intl.NumberFormat('ru-RU'), [])

  // Возвращает форматированное число или прочерк, если данных еще нет.
  const displayNumber = (value: number | undefined): string => {
    if (typeof value !== 'number') {
      return '—'
    }
    return numberFormatter.format(value)
  }

  // Показывает контент админ-панели после успешного ввода пароля.
  if (isAuthed) {
    return (
      <main className="admin-page">
        <section className="admin-page__panel admin-page__panel--sticky">
          <h2 className="admin-page__title">Пользователи</h2>
          <div className="admin-page__stats-grid">
            <article className="admin-page__stat-card">
              <p className="admin-page__stat-label">Всего пользователей</p>
              <p className="admin-page__stat-value">{displayNumber(usersStats?.total_users)}</p>
            </article>
            <article className="admin-page__stat-card">
              <p className="admin-page__stat-label">Регистраций за сегодня</p>
              <p className="admin-page__stat-value">{displayNumber(usersStats?.registered_today)}</p>
            </article>
            <article className="admin-page__stat-card">
              <p className="admin-page__stat-label">Регистраций за 7 дней</p>
              <p className="admin-page__stat-value">{displayNumber(usersStats?.registered_last_7_days)}</p>
            </article>
            <article className="admin-page__stat-card">
              <p className="admin-page__stat-label">Регистраций за 30 дней</p>
              <p className="admin-page__stat-value">{displayNumber(usersStats?.registered_last_30_days)}</p>
            </article>
          </div>
        </section>
        <section className="admin-page__panel">
          <h2 className="admin-page__title">Платежи</h2>
          <div className="admin-page__stats-grid">
            <article className="admin-page__stat-card">
              <p className="admin-page__stat-label">Всего успешных оплат</p>
              <p className="admin-page__stat-value">{displayNumber(paymentsStats?.paid_total)}</p>
            </article>
            <article className="admin-page__stat-card">
              <p className="admin-page__stat-label">Оплат за 24 часа</p>
              <p className="admin-page__stat-value">{displayNumber(paymentsStats?.paid_last_24h)}</p>
            </article>
            <article className="admin-page__stat-card">
              <p className="admin-page__stat-label">Оплат за 7 дней</p>
              <p className="admin-page__stat-value">{displayNumber(paymentsStats?.paid_last_7_days)}</p>
            </article>
            <article className="admin-page__stat-card">
              <p className="admin-page__stat-label">Оплат за 30 дней</p>
              <p className="admin-page__stat-value">{displayNumber(paymentsStats?.paid_last_30_days)}</p>
            </article>
            <article className="admin-page__stat-card">
              <p className="admin-page__stat-label">Выручка за 30 дней, RUB</p>
              <p className="admin-page__stat-value">{displayNumber(paymentsStats?.revenue_rub_last_30_days)}</p>
            </article>
            <article className="admin-page__stat-card">
              <p className="admin-page__stat-label">Продано токенов за 30 дней</p>
              <p className="admin-page__stat-value">{displayNumber(paymentsStats?.tokens_sold_last_30_days)}</p>
            </article>
          </div>
        </section>
      </main>
    )
  }

  // Показывает форму входа с полем пароля и пустой кнопкой.
  return (
    <main className="admin-page">
      <form
        className="admin-page__login-form"
        onSubmit={(event) => {
          event.preventDefault()
          void submitAdminPassword()
        }}
      >
        <input
          className="admin-page__input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          className="admin-page__button"
          type="submit"
          aria-label="admin-action"
          disabled={isSubmitting || password.trim().length === 0}
        />
      </form>
      {error ? <p className="admin-page__error">{error}</p> : null}
    </main>
  )
}

export default AdminPage
