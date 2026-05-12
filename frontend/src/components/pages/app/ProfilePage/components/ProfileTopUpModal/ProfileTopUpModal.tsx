// Нижняя модалка пополнения: три тарифа в горизонтальном скролле, по умолчанию видны первые две карточки.

import { Check, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type TransitionEvent } from 'react'
import { Link } from 'react-router-dom'
import { PROFILE_TOP_UP_PLANS, type ProfileTopUpPlan } from '../../constants/profilePageConstants'
import './ProfileTopUpModal.css'

type ProfileTopUpModalProps = {
  isOpen: boolean
  onClose: () => void
  /** Текст ошибки создания счёта (ENOT / сеть). */
  checkoutError?: string | null
  /** Вызывается при выборе пакета: редирект на оплату ENOT. */
  onSelectPlan?: (plan: ProfileTopUpPlan) => void | Promise<void>
}

/** Показывает нижний лист с горизонтальным скроллом карточек тарифов. */
export function ProfileTopUpModal({ isOpen, onClose, checkoutError, onSelectPlan }: ProfileTopUpModalProps) {
  const [sheetIn, setSheetIn] = useState(false)
  const closeReportedRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  /** Запускает анимацию закрытия листа вниз. */
  const beginClose = useCallback(() => {
    setSheetIn(false)
  }, [])

  /** После окончания анимации листа уведомляет родителя о закрытии. */
  function handleSheetTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== 'transform') return
    if (sheetIn || closeReportedRef.current) return
    closeReportedRef.current = true
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    closeReportedRef.current = false
    setSheetIn(false)
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setSheetIn(true))
    })
    return () => window.cancelAnimationFrame(id)
  }, [isOpen])

  /** Сбрасывает скролл в начало, чтобы по умолчанию были видны первые две карточки. */
  useEffect(() => {
    if (!isOpen || !sheetIn) return
    const el = scrollRef.current
    if (!el) return
    const reset = () => {
      el.scrollLeft = 0
    }
    window.requestAnimationFrame(reset)
  }, [isOpen, sheetIn])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') beginClose()
    }
    window.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, beginClose])

  if (!isOpen) {
    return null
  }

  /** Обрабатывает выбор тарифа: редирект на оплату или ошибка — лист не закрываем сами при ошибке. */
  async function handlePlanCardClick(plan: ProfileTopUpPlan) {
    await onSelectPlan?.(plan)
  }

  return (
    <div className={`profile-topup-modal${sheetIn ? ' profile-topup-modal--sheet-in' : ''}`} role="presentation">
      <button type="button" className="profile-topup-modal__backdrop" onClick={beginClose} aria-label="Закрыть" />
      <div
        className={`profile-topup-modal__sheet${sheetIn ? ' profile-topup-modal__sheet--in' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-topup-title"
        aria-describedby="profile-topup-subtitle"
        onTransitionEnd={handleSheetTransitionEnd}
      >
        <div className="profile-topup-modal__grab" aria-hidden />
        <button type="button" className="profile-topup-modal__icon-btn" onClick={beginClose} aria-label="Закрыть">
          <X size={20} strokeWidth={1.5} />
        </button>

        <header className="profile-topup-modal__intro">
          <h2 id="profile-topup-title" className="profile-topup-modal__intro-title">
            Тарифы
          </h2>
          <p id="profile-topup-subtitle" className="profile-topup-modal__intro-sub">
            Пополнение баланса
          </p>
          {checkoutError ? (
            <p className="profile-topup-modal__checkout-error" role="alert">
              {checkoutError}
            </p>
          ) : null}
        </header>

        <div
          ref={scrollRef}
          className="profile-topup-modal__scroll"
          tabIndex={0}
          aria-label="Тарифы, прокрутите вправо для пакета 1490 ₽"
        >
          <div className="profile-topup-modal__scroll-track">
            {PROFILE_TOP_UP_PLANS.map((plan) => (
              <button
                key={plan.planKey}
                type="button"
                className={`profile-topup-card${plan.featured ? ' profile-topup-card--featured' : ''}`}
                onClick={() => handlePlanCardClick(plan)}
              >
                <div className="profile-topup-card__top">
                  <span className="profile-topup-card__pill">{plan.pill}</span>
                  <p className="profile-topup-card__price">
                    {plan.rubles.toLocaleString('ru-RU')}
                    <span className="profile-topup-card__currency"> ₽</span>
                  </p>
                  <p className="profile-topup-card__desc">{plan.description}</p>
                </div>
                <span className="profile-topup-card__cta">Пополнить</span>
                <ul className="profile-topup-card__features">
                  {plan.features.map((line) => (
                    <li key={line} className="profile-topup-card__feature">
                      <Check className="profile-topup-card__check" size={16} strokeWidth={2.25} aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>

        <nav className="profile-topup-modal__legal" aria-label="Юридические документы">
          <Link className="profile-topup-modal__legal-link" to="/docs/public-offer">
            Договор оферты
          </Link>
          <span className="profile-topup-modal__legal-sep" aria-hidden>
            ·
          </span>
          <Link className="profile-topup-modal__legal-link" to="/docs/refund">
            Правила возврата
          </Link>
        </nav>
      </div>
    </div>
  )
}
