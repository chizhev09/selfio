// Главная страница лендинга: шапка, герой, «Как это работает», библиотека, качество, отзывы, нижняя тёмная полоса.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Download, Menu, Palette, Smartphone, Star, X } from 'lucide-react'
import AuthFullscreenModal from './auth/AuthFullscreenModal'
import { motion } from 'framer-motion'
import avatar1 from './Media/avatars/avatar1.jpg'
import avatar2 from './Media/avatars/avatar2.jpg'
import avatar3 from './Media/avatars/avatar3.jpg'
import avatar4 from './Media/avatars/avatar4.jpg'
import packPhoto1 from './Media/photoPack1/1.jpg'
import packPhoto2 from './Media/photoPack1/2.jpg'
import packPhoto3 from './Media/photoPack1/3.jpg'
import packPhoto4 from './Media/photoPack1/4.jpg'
import packPhoto5 from './Media/photoPack1/5.jpg'
import qualityPack2Q1 from './Media/photoPack2/q1.jpg'
import qualityPack2Q2 from './Media/photoPack2/q2.jpg'
import qualityPack2Q3 from './Media/photoPack2/q3.jpg'
import qualityPack2Q4 from './Media/photoPack2/q4.jpg'
import qualityPack2Q5 from './Media/photoPack2/q5.jpg'
import k1 from './Media/karusel/k1.jpg'
import k2 from './Media/karusel/k2.jpg'
import k3 from './Media/karusel/k3.jpg'
import k4 from './Media/karusel/k4.jpg'
import k5 from './Media/karusel/k5.jpg'
import logoTelegram from '../app/ProfilePage/Media/logo_telegram.svg'
import logoVk from '../app/ProfilePage/Media/logo_vk.svg'
import logoMax from '../app/ProfilePage/Media/logo_max.svg'
import './LandingPage.css'
import { CARE_CONTACT_EMAIL, careSocialChannels, type CareSocialChannelId } from '../../../careContact'
import { LEGAL_OPERATOR_FULL_NAME, LEGAL_OPERATOR_INN } from '../../../legalOperator'
import {
  buildLibraryCollagesFromSpecs,
  libraryCollageSpecs,
  libraryUrlByNumber,
} from './libraryMedia'

/** Иконки соцсетей для строк «Мы в …» в подвале (те же файлы, что в профиле). */
const landingCareLogoById: Record<CareSocialChannelId, string> = {
  telegram: logoTelegram,
  vk: logoVk,
  max: logoMax,
}

/** Абзацы «истории» про качество и реализм: визуально связаны волнистой пунктирной линией. */
const qualityStoryBlocks = [
  'Мы заточили модель под одну задачу — чтобы портрет выглядел как с настоящей съёмки: плотный кадр, естественная кожа, честный свет и глубина, а не «пластиковый» фильтр. Каждый запуск — это попытка приблизиться к тому, что даёт дорогой фотограф и студийное оборудование.',
  'Нейросеть учитывает мелочи, из‑за которых ИИ-фото обычно «сдаётся»: микрорельеф кожи, блики в глазах, мягкие тени, переходы тона. Вы не теряете индивидуальность лица — мы избегаем шаблонной «одинаковости» и лишней сглаженности, когда портрет превращается в манекен.',
  'Реализм для нас — не лозунг, а измеримая цель: чтобы снимок можно было показать близким, выложить в профиль или распечатать без стыда за артефакты и «нейросетевой» блеск. Поэтому в приоритете баланс детализации и естественности, а не глянец любой ценой.',
] as const

const qualityFilmstripPhotos = [
  qualityPack2Q1,
  qualityPack2Q2,
  qualityPack2Q3,
  qualityPack2Q4,
  qualityPack2Q5,
] as const

/** Пункты оглавления лендинга: id совпадает с элементом для прокрутки. */
const landingNavSections = [
  { id: 'landing-hero', label: 'Главная' },
  { id: 'how-it-works-heading', label: 'Как это работает' },
  { id: 'library-heading', label: 'Библиотека' },
  { id: 'quality-heading', label: 'Качество' },
  { id: 'reviews-heading', label: 'Отзывы' },
] as const

type LandingReviewItem = {
  name: string
  text: string
}

const landingReviewItems: LandingReviewItem[] = [
  {
    name: 'Марина К.',
    text: 'Пока пила чай — уже готово. Смотрю и улыбаюсь: свет мягкий, лицо живое, как после настоящей съёмки, только без беготни и нервов.',
  },
  {
    name: 'Денис Л.',
    text: 'Нужно было фото на работу срочно. За один вечер сделал — чётко, аккуратно, коллеги спрашивают, где фотографировался.',
  },
  {
    name: 'Елена В.',
    text: 'Хотела одну общую фотку с детьми — все наши, узнаваемые, без «странных» лиц. Смотрю каждый день, сердце радуется.',
  },
  {
    name: 'Артём П.',
    text: 'Пробовал кучу сайтов — то долго, то выходит как из мультика. Здесь быстро и по-настоящему красиво, уже не первый раз заказываю.',
  },
  {
    name: 'Ольга С.',
    text: 'Для профиля хотелось выглядеть опрятно, но не «как из паспорта». Получилось свежо и уверенно — сама себе нравлюсь.',
  },
  {
    name: 'Игорь Н.',
    text: 'Заказал большую печать на стену — боялся, что размоется. Всё чётко, цвета ровные, смотрится дорого.',
  },
]

/** SVG под именем в отзыве: мазок кисти с градиентом. */
function LandingReviewBrushUnderline({ gradientId }: { gradientId: string }) {
  return (
    <svg
      className="landing-page__reviews-brush"
      viewBox="0 0 320 22"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.55" />
          <stop offset="35%" stopColor="#dc2626" stopOpacity="0.72" />
          <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.58" />
          <stop offset="100%" stopColor="#991b1b" stopOpacity="0.42" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M4,14 C52,9 108,17 158,12 C208,7 258,15 316,10 L318,18 C268,20 218,17 168,19 C118,21 68,18 18,20 C12,20 6,18 2,16 Z"
      />
      <path
        fill={`url(#${gradientId})`}
        opacity={0.4}
        d="M6,13 Q80,8 160,12 Q240,16 314,11 L312,15 Q220,18 140,15 Q60,12 8,15 Z"
      />
    </svg>
  )
}

const landingReviewsConfettiColors = [
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#3b82f6',
  '#f43f5e',
] as const

/** Статичное декоративное конфетти веером из центра под заголовком (без анимации). */
function LandingReviewsConfettiStrip() {
  const count = 34
  return (
    <div className="landing-page__reviews-confetti landing-page__reviews-confetti--top" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const t = count > 1 ? (i / (count - 1)) * 2 - 1 : 0
        const spread = 42 + (i % 5) * 16
        const dx = t * spread
        const dy = -(6 + Math.abs(t) * 22 + (i % 3) * 5)
        const r = -55 + ((i * 19) % 110)
        const scale = 0.82 + ((i * 7) % 5) * 0.04
        const opacity = 0.78 + ((i * 3) % 4) * 0.04
        return (
          <span
            key={i}
            className="landing-page__reviews-confetti-bit"
            style={{
              backgroundColor:
                landingReviewsConfettiColors[i % landingReviewsConfettiColors.length],
              ['--dx' as string]: `${dx}px`,
              ['--dy' as string]: `${dy}px`,
              ['--r' as string]: `${r}deg`,
              ['--s' as string]: String(scale),
              ['--o' as string]: String(opacity),
            }}
          />
        )
      })}
    </div>
  )
}

/** Карточка отзыва: пять звёзд, имя с подчёркиванием-кистью и текст. */
function LandingReviewCard({
  item,
  gradientId,
}: {
  item: LandingReviewItem
  gradientId: string
}) {
  return (
    <article className="landing-page__reviews-card">
      <div className="landing-page__reviews-stars" aria-label="Оценка 5 из 5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className="landing-page__reviews-star"
            size={8}
            strokeWidth={0}
            fill="currentColor"
            aria-hidden
          />
        ))}
      </div>
      <div className="landing-page__reviews-name-block">
        <span className="landing-page__reviews-name-text">{item.name}</span>
        <LandingReviewBrushUnderline gradientId={gradientId} />
      </div>
      <p className="landing-page__reviews-text">{item.text}</p>
    </article>
  )
}

/** Готовит уникальный id для градиента кисти в SVG. */
function landingReviewSafeSvgId(reactId: string): string {
  return `landing-reviews-brush-${reactId.replace(/:/g, '')}`
}

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

/** Блок отзывов: верхние конфетти и зигзаг карточек под заголовком секции. */
function LandingReviewsBlock() {
  const baseId = useId()

  return (
    <div className="landing-page__reviews">
      <LandingReviewsConfettiStrip />
      <div className="landing-page__reviews-list">
        {landingReviewItems.map((item, index) => (
          <LandingReviewCard
            key={`${item.name}-${index}`}
            item={item}
            gradientId={landingReviewSafeSvgId(`${baseId}-${index}`)}
          />
        ))}
      </div>
    </div>
  )
}

const avatars = [avatar1, avatar2, avatar3, avatar4]
const karuselTrackFallback = [k1, k2, k3, k4, k5] as const
/** Локальные кадры нижней карусели героя (без подгрузки с бэка). */
const karuselTrack = [...karuselTrackFallback]
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

// This file renders the landing: hero, how-it-works, library, quality, closing с отзывами; styles in LandingPage.css.
function LandingPage() {
  // Эта функция отображает лендинг; основные CTA открывают окно входа.
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const closeAuth = useCallback(() => setAuthOpen(false), [])
  const openAuth = useCallback(() => setAuthOpen(true), [])

  const goToSection = useCallback((sectionId: string) => {
    setMenuOpen(false)
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [])

  const libraryCollages = useMemo(
    () => buildLibraryCollagesFromSpecs(libraryUrlByNumber(), libraryCollageSpecs),
    []
  )
  const libraryCount = libraryCollages.length
  const libraryMarqueeTrack = useMemo(
    () => [...libraryCollages, ...libraryCollages],
    [libraryCollages]
  )

  // Три превью для блока под текстом: из библиотеки по номерам или запасные кадры из героя.
  const libraryCtaFanPhotos = useMemo(() => {
    const byNum = libraryUrlByNumber()
    const nums = [3, 11, 17] as const
    const fromLib = nums.map((n) => byNum.get(n)).filter((u): u is string => u != null)
    if (fromLib.length === 3) {
      return fromLib
    }
    return [packPhoto1, packPhoto2, packPhoto3]
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
      {authOpen ? <AuthFullscreenModal onClose={closeAuth} /> : null}

      <div className="landing-page__body">
        <div className="landing-page__hero-bg" aria-hidden="true" />
        <div className="landing-page__content">
          <div className="landing-page__badges-wrap">
            <div className="landing-page__marquee-outer landing-page__marquee-outer--top">
              <motion.div
                className="landing-page__marquee-track"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 88, ease: 'linear', repeat: Infinity }}
              >
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
              </motion.div>
            </div>
            <div className="landing-page__marquee-outer landing-page__marquee-outer--bottom">
              <motion.div
                className="landing-page__marquee-track"
                animate={{ x: ['-50%', '0%'] }}
                transition={{ duration: 96, ease: 'linear', repeat: Infinity }}
              >
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
              </motion.div>
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
                <div className="landing-page__carousel-outer">
                  <motion.div
                    className="landing-page__carousel-track"
                    animate={{ x: ['0%', '-50%'] }}
                    transition={{ duration: 72, ease: 'linear', repeat: Infinity }}
                  >
                    {[...karuselTrack, ...karuselTrack].map((photo, index) => (
                      <img
                        key={`karusel-${index}-${String(photo).slice(0, 48)}`}
                        src={photo}
                        alt={`Пример работы ${(index % karuselTrack.length) + 1}`}
                        className="landing-page__carousel-img"
                        loading="lazy"
                        decoding="async"
                      />
                    ))}
                  </motion.div>
                </div>
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

          <section
            className="landing-page__library"
            aria-labelledby="library-heading"
          >
            <div className="landing-page__library-inner">
              <h2 id="library-heading" className="landing-page__library-title">
                Выбирайте из огромной библиотеки готовых ИИ-фотосессий
              </h2>

              {libraryCount === 0 ? (
                <p className="landing-page__library-empty">
                  Добавьте 18 изображений в папку{' '}
                  <code className="landing-page__library-empty-code">Media/library</code> (например{' '}
                  <code className="landing-page__library-empty-code">1.jpg</code> …{' '}
                  <code className="landing-page__library-empty-code">18.jpg</code>), затем обновите
                  страницу.
                </p>
              ) : (
                <div
                  className="landing-page__library-carousel"
                  aria-roledescription="carousel"
                  aria-label="Примеры готовых ИИ-фотосессий, лента прокручивается автоматически"
                >
                  <div className="landing-page__library-carousel-outer">
                    <motion.div
                      className="landing-page__library-carousel-track"
                      animate={{ x: ['0%', '-50%'] }}
                      transition={{
                        duration: Math.max(36, libraryCount * 6),
                        ease: 'linear',
                        repeat: Infinity,
                      }}
                    >
                      {libraryMarqueeTrack.map((collage, i) => (
                        <div
                          key={`library-card-${i}-${collage.caption}`}
                          className="landing-page__library-card"
                        >
                          <div className="landing-page__library-collage">
                            {collage.photos.map((src, pi) => (
                              <img
                                key={`lib-${i}-img-${pi}`}
                                className="landing-page__library-collage-img"
                                src={src}
                                alt={`${collage.caption}, кадр ${pi + 1}`}
                                loading={i === 0 ? 'eager' : 'lazy'}
                              />
                            ))}
                          </div>
                          <p className="landing-page__library-carousel-caption">
                            {collage.caption}
                          </p>
                        </div>
                      ))}
                    </motion.div>
                  </div>
                </div>
              )}

              <div className="landing-page__library-prose">
                <p>
                  Каталог Selfio собран так, чтобы вам не приходилось придумывать сценарий с нуля: сотни
                  готовых ИИ-фотосессий — от снимка на документы и делового портрета до семейных кадров,
                  романтичных историй и смелых образов для соцсетей. Вы выбираете направление, загружаете
                  селфи — и нейросеть подстраивает свет, фон и настроение под выбранный шаблон.
                </p>
                <p>
                  Каждый стиль в библиотеке можно открыть как отправную точку: при желании вы уточняете
                  детали промптом или оставляете всё как задумано авторами шаблона. Так вы экономите время
                  и всё равно получаете разнообразие — от сдержанной классики до выразительных креативных
                  кадров, не снимаясь в студии и не подбирая референсы часами.
                </p>
                <p>
                  Библиотека регулярно пополняется: новые тренды, сезонные идеи и форматы под разные
                  задачи — от резюме и личного бренда до подарочных альбомов и контента на месяцы вперёд.
                </p>
              </div>

              <div className="landing-page__library-cta">
                <div className="landing-page__library-cta-fan" aria-hidden="true">
                  {libraryCtaFanPhotos.map((src, i) => (
                    <img
                      key={`library-cta-fan-${i}`}
                      src={src}
                      alt=""
                      className={`landing-page__library-cta-fan-img landing-page__library-cta-fan-img--${i}`}
                    />
                  ))}
                </div>
                <div className="landing-page__library-cta-wrap">
                  <button
                    type="button"
                    className="landing-page__cta landing-page__library-cta-btn"
                    onClick={openAuth}
                  >
                    Смотреть библиотеку
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section
            className="landing-page__quality"
            aria-labelledby="quality-heading"
          >
            <div className="landing-page__quality-inner">
              <h2 id="quality-heading" className="landing-page__quality-title">
                <span className="landing-page__quality-title-spark landing-page__quality-title-spark--left" aria-hidden="true">
                  <span className="landing-page__quality-title-spark-line" />
                  <span className="landing-page__quality-title-spark-line" />
                  <span className="landing-page__quality-title-spark-line" />
                </span>
                <span className="landing-page__quality-title-copy">
                  <span className="landing-page__quality-title-line">
                    Качество и{' '}
                    <span className="landing-page__quality-realism">реализм</span>
                    {' '}
                    —
                  </span>
                  <span className="landing-page__quality-title-line landing-page__quality-title-line--brand">
                    в основе{' '}
                    <span className="landing-page__quality-brand">Selfio</span>
                  </span>
                </span>
                <span className="landing-page__quality-title-spark landing-page__quality-title-spark--right" aria-hidden="true">
                  <span className="landing-page__quality-title-spark-line" />
                  <span className="landing-page__quality-title-spark-line" />
                  <span className="landing-page__quality-title-spark-line" />
                </span>
              </h2>
              <div className="landing-page__quality-body">
                <div className="landing-page__quality-wave-column" aria-hidden="true">
                  <svg
                    className="landing-page__quality-wave"
                    viewBox="0 0 40 400"
                    preserveAspectRatio="none"
                    focusable="false"
                  >
                    <path
                      className="landing-page__quality-wave-path"
                      d="M20,0 Q22.5,50 20,100 Q17.5,150 20,200 Q22.5,250 20,300 Q17.5,350 20,400"
                      fill="none"
                      stroke="rgba(255,255,255,0.88)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeDasharray="7 11"
                    />
                  </svg>
                </div>
                <div className="landing-page__quality-nodes">
                  {qualityStoryBlocks.map((block, index) => (
                    <div key={`quality-${index}`} className="landing-page__quality-node">
                      <span className="landing-page__quality-node-dot" />
                      <p className="landing-page__quality-text">{block}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="landing-page__quality-filmstrip-wrap"
              aria-hidden="true"
            >
              <div className="landing-page__quality-filmstrip">
                <div className="landing-page__quality-filmstrip-rotor">
                  <div className="landing-page__quality-filmstrip-row landing-page__quality-filmstrip-row--top">
                    {qualityFilmstripPhotos.slice(0, 3).map((src, index) => (
                      <img
                        key={`quality-film-top-${index}`}
                        src={src}
                        alt=""
                        className="landing-page__quality-filmstrip-img"
                        loading="lazy"
                      />
                    ))}
                  </div>
                  <div className="landing-page__quality-filmstrip-row landing-page__quality-filmstrip-row--bottom">
                    {qualityFilmstripPhotos.slice(3, 5).map((src, index) => (
                      <div
                        key={`quality-film-bottom-${index}`}
                        className="landing-page__quality-filmstrip-half"
                      >
                        <img
                          src={src}
                          alt=""
                          className="landing-page__quality-filmstrip-img"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            className="landing-page__closing"
            aria-labelledby="reviews-heading"
          >
            <div className="landing-page__closing-inner">
              <h2 id="reviews-heading" className="landing-page__closing-title">
                Отзывы клиентов
              </h2>
              <LandingReviewsBlock />
            </div>
          </section>

          <section
            className="landing-page__post-reviews"
            aria-label="Нижний блок страницы"
          >
            <div className="landing-page__post-reviews-inner">
              <p className="landing-page__post-reviews-brand">Selfio</p>
              <div className="landing-page__post-reviews-grid">
                <div className="landing-page__post-reviews-block">
                  <h3 className="landing-page__post-reviews-heading">
                    Юридическая информация
                  </h3>
                  <nav
                    className="landing-page__post-reviews-nav"
                    aria-label="Документы и политики"
                  >
                    <Link className="landing-page__post-reviews-link" to="/docs/terms">
                      Условия пользования
                    </Link>
                    <Link className="landing-page__post-reviews-link" to="/docs/privacy-policy">
                      Политика конфиденциальности
                    </Link>
                    <Link className="landing-page__post-reviews-link" to="/docs/personal-data-policy">
                      Политика обработки персональных данных
                    </Link>
                  </nav>
                  <div className="landing-page__post-reviews-operator">
                    <p className="landing-page__post-reviews-operator-inn">
                      ИНН {LEGAL_OPERATOR_INN}
                    </p>
                    <p className="landing-page__post-reviews-operator-name">
                      {LEGAL_OPERATOR_FULL_NAME}
                    </p>
                  </div>
                </div>
                <div className="landing-page__post-reviews-block">
                  <h3 className="landing-page__post-reviews-heading">
                    Связаться с нами
                  </h3>
                  <ul className="landing-page__post-reviews-social">
                    {careSocialChannels.map((ch) => (
                      <li key={ch.id}>
                        <a
                          className="landing-page__post-reviews-social-link"
                          href={ch.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={ch.ariaLabel}
                        >
                          <img
                            src={landingCareLogoById[ch.id]}
                            alt=""
                            className="landing-page__post-reviews-social-icon"
                            width={22}
                            height={22}
                          />
                          <span>{ch.label}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  <div className="landing-page__post-reviews-mail">
                    <p className="landing-page__post-reviews-mail-label">Электронная почта</p>
                    <a
                      className="landing-page__post-reviews-link landing-page__post-reviews-link--standalone"
                      href={`mailto:${CARE_CONTACT_EMAIL}`}
                    >
                      {CARE_CONTACT_EMAIL}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default LandingPage
