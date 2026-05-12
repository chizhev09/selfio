// Экран профиля: данные пользователя, баланс, служба заботы и выход.
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../../../auth/apiClient'
import '../AppShell/appTab.css'
import { ProfileAccountActions } from './components/ProfileAccountActions'
import { ProfileCareSection } from './components/ProfileCareSection'
import { ProfileErrorState } from './components/ProfileErrorState'
import { ProfileHeroSection } from './components/ProfileHeroSection'
import { ProfileInfoRows } from './components/ProfileInfoRows'
import { ProfileLegalSection } from './components/ProfileLegalSection'
import { ProfileLoadingState } from './components/ProfileLoadingState'
import { ProfileStatsSection } from './components/ProfileStatsSection'
import { ProfileTopUpSection } from './components/ProfileTopUpSection'
import { ProfileTopUpModal } from './components/ProfileTopUpModal/ProfileTopUpModal'
import { messageFromErrorResponse } from '../../LandingPage/auth/messageFromErrorResponse'
import { useProfilePage } from './hooks/useProfilePage'
import type { ProfileTopUpPlan } from './constants/profilePageConstants'
import './AppProfilePage.css'

/** Собирает экран профиля из секций после успешной загрузки /api/users/me. */
function ProfilePage() {
  const p = useProfilePage()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [paymentNotice, setPaymentNotice] = useState<{ kind: 'ok' | 'fail'; text: string } | null>(null)

  /** После редиректа с ЮMoney убираем query и обновляем профиль. */
  useEffect(() => {
    const raw = searchParams.get('payment')
    if (raw !== 'ok' && raw !== 'fail') {
      return
    }
    const next = new URLSearchParams(searchParams)
    next.delete('payment')
    setSearchParams(next, { replace: true })
    if (raw === 'ok') {
      void p.reloadProfile().finally(() => {
        setPaymentNotice({ kind: 'ok', text: 'Баланс обновлён после оплаты.' })
      })
    } else {
      setPaymentNotice({ kind: 'fail', text: 'Оплата не завершена или отменена.' })
    }
  }, [searchParams, setSearchParams, p.reloadProfile])

  /** Открывает модалку пополнения, если пришли из библиотеки с state.openTopUp. */
  useEffect(() => {
    const st = location.state as { openTopUp?: boolean } | null
    if (st?.openTopUp) {
      p.setIsTopUpOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate, p.setIsTopUpOpen])

  /** Создаёт заказ и открывает страницу оплаты ЮMoney. */
  async function handleTopUpCheckout(plan: ProfileTopUpPlan) {
    setCheckoutError(null)
    const res = await apiFetch('/api/payments/yoomoney/checkout', {
      method: 'POST',
      data: { plan_key: plan.planKey },
    })
    if (res.status !== 200) {
      setCheckoutError(messageFromErrorResponse(res))
      return
    }
    const data = res.data as { pay_url?: string }
    if (!data?.pay_url) {
      setCheckoutError('Не получена ссылка на оплату.')
      return
    }
    window.location.assign(data.pay_url)
  }

  if (p.loading) {
    return <ProfileLoadingState />
  }

  if (p.err || !p.me) {
    return <ProfileErrorState message={p.err ?? 'Нет данных.'} />
  }

  return (
    <div className="profile">
      <ProfileHeroSection me={p.me} />
      <ProfileStatsSection balance={p.balance} />
      {paymentNotice ? (
        <p
          className={`profile-payment-notice${paymentNotice.kind === 'fail' ? ' profile-payment-notice--fail' : ''}`}
          role="status"
        >
          {paymentNotice.text}
        </p>
      ) : null}
      <ProfileTopUpSection
        onOpen={() => {
          setCheckoutError(null)
          p.setIsTopUpOpen(true)
        }}
      />

      <section className="profile-panel">
        <ProfileInfoRows me={p.me} />
        <ProfileCareSection
          careOpen={p.careOpen}
          onToggle={() => p.setCareOpen(!p.careOpen)}
          onOpenCareLink={p.openCareLink}
        />
      </section>

      <ProfileAccountActions onLogout={p.logout} />
      <ProfileLegalSection />

      <ProfileTopUpModal
        isOpen={p.isTopUpOpen}
        checkoutError={checkoutError}
        onClose={() => {
          setCheckoutError(null)
          p.setIsTopUpOpen(false)
        }}
        onSelectPlan={handleTopUpCheckout}
      />
    </div>
  )
}

export default ProfilePage
