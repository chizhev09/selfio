// Главная страница лендинга: шапка, герой, «Как это работает»; ниже — отложенный чанк.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Menu, Palette, Smartphone, X } from 'lucide-react'
import avatar1 from './Media/avatars/avatar1.webp'
import avatar2 from './Media/avatars/avatar2.webp'
import avatar3 from './Media/avatars/avatar3.webp'
import avatar4 from './Media/avatars/avatar4.webp'
import packPhoto1 from './Media/photoPack1/1.webp'
import packPhoto2 from './Media/photoPack1/2.webp'
import packPhoto3 from './Media/photoPack1/3.webp'
import packPhoto4 from './Media/photoPack1/4.webp'
import packPhoto5 from './Media/photoPack1/5.webp'
import { scheduleLandingBackgroundLoads } from './landingIdlePrefetch'
import './LandingPage.css'

const AuthFullscreenModal = lazy(() => import('./auth/AuthFullscreenModal'))
const LandingPageBelowFold = lazy(() => import('./LandingPageBelowFold'))
const LandingHeroCarousel = lazy(() => import('./LandingHeroCarousel'))

/** Пункты оглавления лендинга: id совпадает с элементом для прокрутки. */
const landingNavSections = [
  { id: 'landing-hero', label: 'Главная' },
  { id: 'how-it-works-heading', label: 'Как это работает' },
  { id: 'library-heading', label: 'Библиотека' },
  { id: 'quality-heading', label: 'Качество' },
  { id: 'reviews-heading', label: 'Отзывы' },
] as const

const landingNavDialogTitleId = 'landing-nav-dialog-title'

/** Полноэкранное меню навигации по секциям: чёрный фон, закрытие по клику вне списка, Escape и кнопке. */
function LandingNavOverlay({
  open,
  onClose,
  onPickSection,
}: {
  open: boolean
  onClose: () => void
  onPickSection: (sectionId: string) => void
}) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return createPortal(
    <div
      id="landing-nav-overlay"
      className="landing-page__nav-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={landingNavDialogTitleId}
      onClick={onClose}
    >
      <div
        className="landing-page__nav-overlay-inner"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="landing-page__nav-overlay-top">
          <p id={landingNavDialogTitleId} className="landing-page__nav-overlay-title">
            Разделы
          </p>
          <button
            ref={closeBtnRef}
            type="button"
            className="landing-page__nav-overlay-close"
            aria-label="Закрыть меню"
            onClick={onClose}
          >
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>
        <nav className="landing-page__nav-overlay-nav" aria-label="Секции страницы">
          <ul className="landing-page__nav-overlay-list">
            {landingNavSections.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="landing-page__nav-overlay-link"
                  onClick={() => onPickSection(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>,
    document.body
  )
}

const avatars = [avatar1, avatar2, avatar3, avatar4]
const packPhotos = [packPhoto1, packPhoto2, packPhoto3, packPhoto4, packPhoto5]

const howItWorksSteps = [
  {
    num: 1,
    title: 'Загрузите селфи',
    text: 'Для личного портрета — одно чёткое фото лица при дневном свете. Для парной или семейной съёмки — загрузите несколько селфи участников. Нейросеть объединит всех в одном кадре естественно и гармонично.',
  },
  {
    num: 2,
    title: 'Выберите стиль или опишите идею',
    text: 'Возьмите готовый шаблон из каталога: деловой портрет, нежное у камина, фото в пальто на фоне осеннего парка. Или напишите промт своими словами: «Хочу как в том самом кафе с пледом и какао». Нейросеть поймёт любой запрос.',
  },
  {
    num: 3,
    title: 'Получите результат',
    text: 'Через 1-2 минуты снимки готовы. Скачивайте по одному или целым архивом в высоком разрешении.',
  },
] as const

// Иконки на пунктире: тонкие линейные символы вместо цветных эмодзи.
const howItWorksTimelineIcons = [Smartphone, Palette, Download] as const

const badgeTrackTop = [
  'Без камеры',
  'Без студии',
  'Без фотографа',
  'Без макияжа',
  'Без укладки',
  'Без примерок',
  'Без записи',
  'Из дома',
  'С телефона',
  'По селфи',
  'Нейрофотограф',
  'Естественная ретушь',
  'Живой взгляд',
  'Как в жизни',
  'Глянцевый кадр',
  'Идеальный свет',
  'Чистая кожа',
  'Профессиональный портрет',
  'Эффект дорогой съёмки',
  'Сотни образов',
]
const badgeTrackBottom = [
  'По одному фото',
  'Без вспышки',
  'Без штатива',
  'Без обработки',
  'Без ожидания',
  'Без пробок',
  'Без чужих глаз',
  'В любой одежде',
  'В пижаме',
  'Онлайн',
  'Идеальный ракурс',
  'Выразительный портрет',
  'Сияющий тон',
  'Глубина в глазах',
  'Мягкие тени',
  'Обложка журнала',
  'Эстетика кадра',
  'Студийное качество',
  'Память навсегда',
  'Новый образ',
]

// Верх лендинга: шапка, герой и «Как это работает»; стили в LandingPage.css.
function LandingPage() {
  // Эта функция отображает лендинг; основные CTA открывают окно входа.
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [showCarousel, setShowCarousel] = useState(false)
  const [showBelowFold, setShowBelowFold] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const closeAuth = useCallback(() => setAuthOpen(false), [])
  const openAuth = useCallback(() => setAuthOpen(true), [])

  useEffect(() => {
    return scheduleLandingBackgroundLoads({
      onCarouselReady: () => setShowCarousel(true),
      onLibraryReady: () => setShowBelowFold(true),
    })
  }, [])

  const goToSection = useCallback((sectionId: string) => {
    setMenuOpen(false)
    if (
      sectionId === 'library-heading' ||
      sectionId === 'quality-heading' ||
      sectionId === 'reviews-heading'
    ) {
      setShowBelowFold(true)
    }
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [])

  return (
    <main className="landing-page">
      <header className="landing-page__header">
        <div className="landing-page__header-inner">
          <p className="landing-page__logo">Selfio</p>
          <div className="landing-page__header-actions">
            <button
              type="button"
              className="landing-page__header-link landing-page__header-link--btn"
              onClick={() => setAuthOpen(true)}
            >
              Войти
            </button>
            <button
              type="button"
              className="landing-page__menu-btn"
              aria-label="Открыть меню"
              aria-expanded={menuOpen}
              aria-controls="landing-nav-overlay"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <LandingNavOverlay open={menuOpen} onClose={closeMenu} onPickSection={goToSection} />
      {authOpen ? (
        <Suspense fallback={null}>
          <AuthFullscreenModal onClose={closeAuth} />
        </Suspense>
      ) : null}

      <div className="landing-page__body">
        <div className="landing-page__hero-bg" aria-hidden="true" />
        <div className="landing-page__content">
          <div className="landing-page__badges-wrap">
            <div className="landing-page__marquee-outer landing-page__marquee-outer--top">
              <div className="landing-page__marquee-track landing-page__marquee-track--top">
                {[...badgeTrackTop, ...badgeTrackTop].map((badge, index) => (
                  <span
                    key={`top-${badge}-${index}`}
                    className={
                      index % 4 === 3
                        ? 'landing-page__badge landing-page__badge--accent'
                        : 'landing-page__badge'
                    }
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="landing-page__marquee-outer landing-page__marquee-outer--bottom">
              <div className="landing-page__marquee-track landing-page__marquee-track--bottom">
                {[...badgeTrackBottom, ...badgeTrackBottom].map((badge, index) => (
                  <span
                    key={`bottom-${badge}-${index}`}
                    className={
                      index % 4 === 3
                        ? 'landing-page__badge landing-page__badge--accent'
                        : 'landing-page__badge'
                    }
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <section className="landing-page__section" id="landing-hero">
            <div className="landing-page__section-inner">
              <div className="landing-page__hero-mosaic">
                <div className="landing-page__hero-copy">
                  <h1 className="landing-page__title">
                    Профессиональная
                    <br />
                    ИИ-фотостудия
                  </h1>

                  <p className="landing-page__lead">
                    Нейросеть, обученная на миллионах профессиональных портретов.
                  </p>
                  <p className="landing-page__lead">
                    Результат — как после съёмки у топ-фотографа, дорого и красиво.
                  </p>
                </div>

                {packPhotos.map((photo, index) => (
                  <img
                    key={`mosaic-${index}`}
                    src={photo}
                    alt={`Пример портрета ${index + 1}`}
                    className="landing-page__mosaic-photo"
                    data-mosaic-slot={index}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding={index === 0 ? 'sync' : 'async'}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                  />
                ))}
              </div>

              <div className="landing-page__cta-wrap">
                <button type="button" className="landing-page__cta" onClick={openAuth}>
                  Попробовать бесплатно
                </button>
              </div>
              <div className="landing-page__cta-trend-wrap">
                <button type="button" className="landing-page__cta-trend-btn" onClick={openAuth}>
                  ИИ-тренды
                </button>
              </div>
              <div className="landing-page__social-proof">
                <div className="landing-page__avatar-row">
                  {avatars.map((avatar, index) => (
                    <img
                      key={avatar}
                      src={avatar}
                      alt={`Аватар пользователя ${index + 1}`}
                      className="landing-page__avatar"
                    />
                  ))}
                </div>
                <p className="landing-page__social-text">
                  Более 4000+ пользователей.
                </p>
              </div>

              <div className="landing-page__carousel-block">
                {showCarousel ? (
                  <Suspense
                    fallback={
                      <div
                        className="landing-page__carousel-outer landing-page__carousel-outer--placeholder"
                        aria-hidden
                      />
                    }
                  >
                    <LandingHeroCarousel />
                  </Suspense>
                ) : (
                  <div
                    className="landing-page__carousel-outer landing-page__carousel-outer--placeholder"
                    aria-hidden
                  />
                )}
              </div>
            </div>
          </section>

          <section className="landing-page__how" aria-labelledby="how-it-works-heading">
            <div className="landing-page__how-inner">
              <h2 id="how-it-works-heading" className="landing-page__how-title">
                Как это работает?
              </h2>
              <div className="landing-page__how-body">
                <ol className="landing-page__how-steps">
                  {howItWorksSteps.map((step) => (
                    <li key={step.num} className="landing-page__how-step">
                      <span className="landing-page__how-step-num" aria-hidden="true">
                        {step.num}
                      </span>
                      <div className="landing-page__how-step-copy">
                        <h3 className="landing-page__how-step-title">{step.title}</h3>
                        <p className="landing-page__how-step-text">{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="landing-page__how-timeline" aria-hidden="true">
                  <svg
                    className="landing-page__how-timeline-wave"
                    viewBox="0 0 40 400"
                    preserveAspectRatio="none"
                    focusable="false"
                  >
                    <path
                      className="landing-page__how-timeline-wave-path"
                      d="M20,0 Q22.5,50 20,100 Q17.5,150 20,200 Q22.5,250 20,300 Q17.5,350 20,400"
                      fill="none"
                      stroke="rgba(255,255,255,0.92)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeDasharray="7 11"
                    />
                  </svg>
                  {howItWorksSteps.map((step, index) => {
                    const Icon = howItWorksTimelineIcons[index]
                    return (
                      <span
                        key={`timeline-${step.num}`}
                        className={`landing-page__how-timeline-mark landing-page__how-timeline-mark--${index}`}
                      >
                        <Icon
                          aria-hidden
                          className="landing-page__how-timeline-icon"
                          size={22}
                          strokeWidth={2.1}
                        />
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          {showBelowFold ? (
            <Suspense fallback={null}>
              <LandingPageBelowFold
                onOpenAuth={openAuth}
                packPhotoFallback={[packPhoto1, packPhoto2, packPhoto3] as const}
              />
            </Suspense>
          ) : null}
        </div>
      </div>
    </main>
  )
}

export default LandingPage