// Полноэкранная авторизация: коллаж из Media сверху, провайдеры (Яндекс, Google, VK ID), согласие и документы.
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import googleLogo from '../Media/logo/google_logo.svg'
import vkLogo from '../Media/logo/vk_logo.svg'
import yandexLogo from '../Media/logo/yandex_logo.svg'
import { loadAuthHeroCollagePool } from './authHeroCollageMedia'
import './AuthFullscreenModal.css'

const COLLAGE_TILE_COUNT = 5

/** Перемешивает копию пула и возвращает первые n URL для коллажа. */
function pickCollageUrls(pool: string[], n: number): string[] {
  if (pool.length === 0) {
    return []
  }
  const copy = [...pool]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = copy[i]
    copy[i] = copy[j]!
    copy[j] = t!
  }
  return copy.slice(0, Math.min(n, copy.length))
}

type AuthFullscreenModalProps = {
  onClose: () => void
}

/** Блокирует прокрутку body, пока модалка открыта. */
function useBodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
}

/** Единый текст под заголовком для входа и регистрации. */
const authCopy = {
  subtitle: 'Портреты и фотосессии без студии',
  lead: 'Войдите, чтобы продолжить',
} as const

function AuthFullscreenModal({ onClose }: AuthFullscreenModalProps) {
  const [agreed, setAgreed] = useState(false)
  const [consentError, setConsentError] = useState(false)
  const consentId = useId()
  const consentBoxRef = useRef<HTMLDivElement>(null)
  const consentInputRef = useRef<HTMLInputElement>(null)
  const [collageUrls, setCollageUrls] = useState<string[]>([])
  useBodyScrollLock()

  useEffect(() => {
    let cancelled = false
    void loadAuthHeroCollagePool().then((pool) => {
      if (!cancelled) {
        setCollageUrls(pickCollageUrls(pool, COLLAGE_TILE_COUNT))
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /** Редирект на Яндекс OAuth после принятия условий. */
  function startYandex() {
    if (!agreed) {
      setConsentError(true)
      consentBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      requestAnimationFrame(() => {
        consentInputRef.current?.focus()
      })
      return
    }
    setConsentError(false)
    window.location.assign('/api/auth/oauth/yandex/start')
  }

  /** Редирект на Google OAuth после принятия условий. */
  function startGoogle() {
    if (!agreed) {
      setConsentError(true)
      consentBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      requestAnimationFrame(() => {
        consentInputRef.current?.focus()
      })
      return
    }
    setConsentError(false)
    window.location.assign('/api/auth/oauth/google/start')
  }

  /** Редирект на VK ID (ВКонтакте, Mail и др. в одном окне) после принятия условий. */
  function startVkId() {
    if (!agreed) {
      setConsentError(true)
      consentBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      requestAnimationFrame(() => {
        consentInputRef.current?.focus()
      })
      return
    }
    setConsentError(false)
    window.location.assign('/api/auth/oauth/vkid/start')
  }

  return createPortal(
    <div
      className="auth-fs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-fs-title"
      data-auth-mode="login"
    >
      <button type="button" className="auth-fs__close" onClick={onClose} aria-label="Закрыть">
        <X size={22} strokeWidth={1.75} />
      </button>

      <div className="auth-fs__video-wrap" aria-hidden="true">
        <div className="auth-fs__media-stage">
          {collageUrls.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className={`auth-fs__media-tile auth-fs__media-tile--${i}`}
            >
              <img src={src} alt="" className="auth-fs__media-img" decoding="async" />
            </div>
          ))}
        </div>
        <div className="auth-fs__video-shadow" />
      </div>

      <div className="auth-fs__content">
        <h1 id="auth-fs-title" className="auth-fs__title">
          <span className="auth-fs__title-welcome">Добро пожаловать в</span>
          <span className="auth-fs__title-brand">Selfio</span>
        </h1>
        <p className="auth-fs__subtitle">{authCopy.subtitle}</p>
        <p className="auth-fs__lead">{authCopy.lead}</p>

        <div className="auth-fs__providers">
          <button type="button" className="auth-fs__provider" onClick={startYandex}>
            <span className="auth-fs__provider-icon auth-fs__provider-icon--logo" aria-hidden>
              <img src={yandexLogo} alt="" className="auth-fs__provider-logo" width={28} height={28} />
            </span>
            Яндекс
          </button>
          <button type="button" className="auth-fs__provider" onClick={startGoogle}>
            <span className="auth-fs__provider-icon auth-fs__provider-icon--logo" aria-hidden>
              <img src={googleLogo} alt="" className="auth-fs__provider-logo" width={28} height={28} />
            </span>
            Google
          </button>
          <button type="button" className="auth-fs__provider" onClick={startVkId}>
            <span className="auth-fs__provider-icon auth-fs__provider-icon--logo" aria-hidden>
              <img src={vkLogo} alt="" className="auth-fs__provider-logo" width={28} height={28} />
            </span>
            VK ID
          </button>
        </div>

        <p className="auth-fs__email-fallback">
          <Link to="/login/email" replace>
            Войти по адресу почты
          </Link>
        </p>

        <div
          ref={consentBoxRef}
          className={
            consentError
              ? 'auth-fs__consent-box auth-fs__consent-box--invalid'
              : 'auth-fs__consent-box'
          }
        >
          <label className="auth-fs__consent" htmlFor={consentId}>
            <input
              ref={consentInputRef}
              id={consentId}
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                const v = e.target.checked
                setAgreed(v)
                if (v) {
                  setConsentError(false)
                }
              }}
            />
            <span>
              Я ознакомлен(а) и согласен(на) с условиями пользования и обработки персональных данных
            </span>
          </label>
        </div>

        {consentError ? (
          <p className="auth-fs__consent-error" role="alert">
            Пожалуйста, примите условия, чтобы продолжить
          </p>
        ) : null}

        <div className="auth-fs__legal">
          <Link to="/docs/terms" onClick={onClose}>
            Условия пользования
          </Link>
          <Link to="/docs/personal-data-policy" onClick={onClose}>
            Политика обработки персональных данных
          </Link>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default AuthFullscreenModal
