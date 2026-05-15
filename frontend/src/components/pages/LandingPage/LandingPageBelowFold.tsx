// Нижняя часть лендинга: библиотека, качество, отзывы и подвал с юридической информацией и контактами.
import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import qualityPack2Q1 from './Media/photoPack2/q1.webp'
import qualityPack2Q2 from './Media/photoPack2/q2.webp'
import qualityPack2Q3 from './Media/photoPack2/q3.webp'
import qualityPack2Q4 from './Media/photoPack2/q4.webp'
import qualityPack2Q5 from './Media/photoPack2/q5.webp'
import logoTelegram from '../app/ProfilePage/Media/logo_telegram.svg'
import logoVk from '../app/ProfilePage/Media/logo_vk.svg'
import logoMax from '../app/ProfilePage/Media/logo_max.svg'
import { CARE_CONTACT_EMAIL, careSocialChannels, type CareSocialChannelId } from '../../../careContact'
import { LEGAL_OPERATOR_FULL_NAME, LEGAL_OPERATOR_INN } from '../../../legalOperator'
import {
  buildLibraryCollagesFromSpecs,
  libraryCollageSpecs,
  loadLibraryUrlByNumber,
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

type LandingPageBelowFoldProps = {
  onOpenAuth: () => void
  packPhotoFallback: readonly [string, string, string]
}

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

/** Рендерит секции библиотеки, качества, отзывов и нижнего подвала лендинга. */
export default function LandingPageBelowFold({
  onOpenAuth,
  packPhotoFallback,
}: LandingPageBelowFoldProps) {
  const [libraryByNum, setLibraryByNum] = useState<Map<number, string> | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadLibraryUrlByNumber().then((map) => {
      if (!cancelled) {
        setLibraryByNum(map)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const libraryCollages = useMemo(() => {
    if (!libraryByNum) {
      return []
    }
    return buildLibraryCollagesFromSpecs(libraryByNum, libraryCollageSpecs)
  }, [libraryByNum])

  const libraryCount = libraryCollages.length

  const libraryMarqueeTrack = useMemo(
    () => [...libraryCollages, ...libraryCollages],
    [libraryCollages],
  )

  const libraryCtaFanPhotos = useMemo(() => {
    if (!libraryByNum) {
      return packPhotoFallback
    }
    const nums = [3, 11, 17] as const
    const fromLib = nums.map((n) => libraryByNum.get(n)).filter((u): u is string => u != null)
    if (fromLib.length === 3) {
      return fromLib as [string, string, string]
    }
    return packPhotoFallback
  }, [libraryByNum, packPhotoFallback])

  return (
    <>
      <section
        className="landing-page__library"
        aria-labelledby="library-heading"
      >
        <div className="landing-page__library-inner">
          <h2 id="library-heading" className="landing-page__library-title">
            Выбирайте из огромной библиотеки готовых ИИ-фотосессий
          </h2>

          {libraryCount > 0 ? (
            <div
              className="landing-page__library-carousel"
              aria-roledescription="carousel"
              aria-label="Примеры готовых ИИ-фотосессий, лента прокручивается автоматически"
            >
              <div className="landing-page__library-carousel-outer">
                <div
                  className="landing-page__library-carousel-track landing-page__library-carousel-track--scroll"
                  style={{
                    ['--landing-library-marquee-duration' as string]: `${Math.max(36, libraryCount * 6)}s`,
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
                            loading={i === 0 && pi === 0 ? 'eager' : 'lazy'}
                          />
                        ))}
                      </div>
                      <p className="landing-page__library-carousel-caption">
                        {collage.caption}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

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
                  loading="lazy"
                />
              ))}
            </div>
            <div className="landing-page__library-cta-wrap">
              <button
                type="button"
                className="landing-page__cta landing-page__library-cta-btn"
                onClick={onOpenAuth}
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
                        loading="lazy"
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
    </>
  )
}