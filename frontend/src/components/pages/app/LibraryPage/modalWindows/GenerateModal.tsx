// Модальное окно настроек генерации (нижний sheet); рендер в document.body, чтобы не ломать position:fixed внутри motion/transform.
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import {
  PROFILE_TOP_UP_TOKENS_PER_PRO_GEN,
  PROFILE_TOP_UP_TOKENS_PER_REGULAR_GEN,
} from '../../ProfilePage/constants/profilePageConstants'
import './GenerateModal.css'

type GenerationQuality = 'standard' | 'pro'
type GenerationAspectRatio = '9:16' | '1:1' | '4:5' | '16:9'

interface GenerateModalProps {
  isOpen: boolean
  templateTitle: string
  templateImageUrl: string
  quality: GenerationQuality
  aspectRatio: GenerationAspectRatio
  userTokenBalance: number
  onQualityChange: (value: GenerationQuality) => void
  onAspectRatioChange: (value: GenerationAspectRatio) => void
  selectedPhotoPreviewUrl: string | null
  onPhotoSelect: (file: File | null) => void
  isSubmitting: boolean
  onClose: () => void
  onSubmit: () => void
  /** Переход в профиль с открытием пополнения (при нехватке токенов). */
  onRequestTopUp: () => void
  /** Текст ошибки с сервера или загрузки — показывается внутри модалки (не под затемнением страницы). */
  submitError?: string | null
}

/** Возвращает альтернативный URL, если в S3 отличается регистр расширения файла. */
function withSwappedImageExtensionCase(url: string): string | null {
  if (url.endsWith('.jpg')) return `${url.slice(0, -4)}.JPG`
  if (url.endsWith('.JPG')) return `${url.slice(0, -4)}.jpg`
  if (url.endsWith('.jpeg')) return `${url.slice(0, -5)}.JPEG`
  if (url.endsWith('.JPEG')) return `${url.slice(0, -5)}.jpeg`
  if (url.endsWith('.png')) return `${url.slice(0, -4)}.PNG`
  if (url.endsWith('.PNG')) return `${url.slice(0, -4)}.png`
  if (url.endsWith('.webp')) return `${url.slice(0, -5)}.WEBP`
  if (url.endsWith('.WEBP')) return `${url.slice(0, -5)}.webp`
  return null
}

/** Рендерит модальное окно генерации с качеством, форматом и предпросмотром шаблона. */
export function GenerateModal({
  isOpen,
  templateTitle,
  templateImageUrl,
  quality,
  aspectRatio,
  userTokenBalance,
  onQualityChange,
  onAspectRatioChange,
  selectedPhotoPreviewUrl,
  onPhotoSelect,
  isSubmitting,
  onClose,
  onSubmit,
  onRequestTopUp,
  submitError = null,
}: GenerateModalProps) {
  const [openedHint, setOpenedHint] = useState<'quality' | null>(null)
  const [insufficientOpen, setInsufficientOpen] = useState(false)
  const [photoRequiredOpen, setPhotoRequiredOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const generationCost =
    quality === 'pro' ? PROFILE_TOP_UP_TOKENS_PER_PRO_GEN : PROFILE_TOP_UP_TOKENS_PER_REGULAR_GEN

  useEffect(() => {
    if (!isOpen) {
      setInsufficientOpen(false)
    }
  }, [isOpen])

  useEffect(() => {
    setInsufficientOpen(false)
  }, [quality])

  useEffect(() => {
    if (selectedPhotoPreviewUrl) {
      setPhotoRequiredOpen(false)
    }
  }, [selectedPhotoPreviewUrl])

  useEffect(() => {
    if (!isOpen) {
      setPhotoRequiredOpen(false)
    }
  }, [isOpen])

  /** Открывает системный диалог выбора изображения через скрытое поле. */
  function handleOpenFileDialog() {
    fileInputRef.current?.click()
  }

  /** Передаёт выбранный файл наружу и очищает value для повторного выбора того же файла. */
  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    onPhotoSelect(file)
    event.currentTarget.value = ''
  }

  /** Переключает видимость подсказки по секции модалки. */
  function handleToggleHint(hint: 'quality') {
    setOpenedHint((prev) => (prev === hint ? null : hint))
  }

  /** По нажатию «Сгенерировать»: проверяет баланс и наличие фото, затем вызывает родителя. */
  function handleSubmitClick() {
    if (userTokenBalance < generationCost) {
      setInsufficientOpen(true)
      return
    }
    if (!selectedPhotoPreviewUrl) {
      setPhotoRequiredOpen(true)
      return
    }
    setPhotoRequiredOpen(false)
    onSubmit()
  }

  /** Закрывает алерт о нехватке токенов. */
  function handleDismissInsufficient() {
    setInsufficientOpen(false)
  }

  const modalTree = (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            key="generation-modal-backdrop"
            className="generation-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            key="generation-modal-sheet"
            className="generation-modal"
            initial={{ y: '100%', opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }}
            aria-label="Модальное окно генерации"
          >
            <header className="generation-modal__header">
              <button type="button" className="generation-modal__close" onClick={onClose} aria-label="Закрыть">
                <X size={20} />
              </button>
              <div className="generation-modal__title-wrap">
                <h3>Генерация</h3>
                <p className="generation-modal__subtitle">
                  Выберите чёткое фото с хорошим освещением, где лицо видно полностью. Избегайте сильных фильтров,
                  масок и крупных перекрытий (очки с бликами, руки у лица, тени). Так генерация точнее переносит
                  образ, сохраняет естественные черты и даёт более дорогой визуальный результат.
                </p>
              </div>
            </header>

            <div className="generation-modal__media-row">
              <div className="generation-modal__media-col">
                <span className="generation-modal__media-label">Прикрепите ваше фото</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="generation-modal__media-file-input"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  className="generation-modal__media-input"
                  aria-label="Добавить медиа"
                  onClick={handleOpenFileDialog}
                >
                  {selectedPhotoPreviewUrl ? (
                    <img src={selectedPhotoPreviewUrl} alt="Выбранное фото" className="generation-modal__picked-preview" />
                  ) : (
                    <Plus size={22} />
                  )}
                </button>
              </div>
              <div className="generation-modal__media-divider" aria-hidden="true">
                <X size={16} />
              </div>
              <div className="generation-modal__media-col">
                <span className="generation-modal__media-label">Шаблон</span>
                <div className="generation-modal__template-preview">
                  <img
                    src={templateImageUrl}
                    alt={templateTitle}
                    onError={(event) => {
                      const img = event.currentTarget
                      const triedFallback = img.dataset.fallbackTried === '1'
                      if (triedFallback) return
                      const alt = withSwappedImageExtensionCase(img.src)
                      if (!alt) return
                      img.dataset.fallbackTried = '1'
                      img.src = alt
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="generation-modal__section">
              <div className="generation-modal__section-title">
                <span>Качество</span>
                <button
                  type="button"
                  className={`generation-modal__hint generation-modal__hint-button ${openedHint === 'quality' ? 'generation-modal__hint-button--active' : ''}`}
                  onClick={() => handleToggleHint('quality')}
                  aria-label="Подсказка по качеству"
                >
                  <span className="generation-modal__hint-circle" aria-hidden="true">
                    !
                  </span>
                  <span className="generation-modal__hint-link">Подробнее</span>
                </button>
              </div>
              {openedHint === 'quality' ? (
                <p className="generation-modal__hint-text">
                  Standard — разрешение 1K (Gemini), быстрее и экономнее. Pro — 2K (та же модель), выше детализация.
                </p>
              ) : null}
              <div className="generation-modal__options-row">
                <button
                  type="button"
                  className={`generation-modal__option ${quality === 'standard' ? 'generation-modal__option--active' : ''}`}
                  onClick={() => onQualityChange('standard')}
                >
                  Standard
                </button>
                <button
                  type="button"
                  className={`generation-modal__option generation-modal__option--pro ${quality === 'pro' ? 'generation-modal__option--active' : ''}`}
                  onClick={() => onQualityChange('pro')}
                >
                  Pro
                </button>
              </div>
            </div>
            <div className="generation-modal__section">
              <div className="generation-modal__section-title">
                <span>Формат</span>
              </div>
              <div className="generation-modal__options-row generation-modal__options-row--format">
                {(['9:16', '1:1', '4:5', '16:9'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`generation-modal__option generation-modal__option--format ${aspectRatio === value ? 'generation-modal__option--active' : ''}`}
                    onClick={() => onAspectRatioChange(value)}
                  >
                    <span>{value}</span>
                    <span
                      className={`generation-modal__ratio-preview generation-modal__ratio-preview--${value.replace(':', 'x')}`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="generation-modal__coins" aria-label="Текущий баланс токенов">
              <span className="generation-modal__coins-label">Баланс</span>
              <span>🪙 {userTokenBalance.toLocaleString('ru-RU')}</span>
            </div>

            {insufficientOpen ? (
              <div className="generation-modal__insufficient" role="alert">
                <button
                  type="button"
                  className="generation-modal__insufficient-close"
                  onClick={handleDismissInsufficient}
                  aria-label="Закрыть"
                >
                  <X size={18} strokeWidth={2} />
                </button>
                <p className="generation-modal__insufficient-text">Не хватает токенов для этой генерации.</p>
                <button type="button" className="generation-modal__insufficient-cta" onClick={onRequestTopUp}>
                  Пополнить баланс
                </button>
              </div>
            ) : null}

            {submitError ? (
              <p className="generation-modal__inline-error" role="alert">
                {submitError}
              </p>
            ) : null}
            {photoRequiredOpen && !submitError ? (
              <p className="generation-modal__inline-error" role="alert">
                Прикрепите своё фото слева — без него запрос на генерацию не отправляется.
              </p>
            ) : null}

            <button type="button" className="generation-modal__submit" onClick={handleSubmitClick} disabled={isSubmitting}>
              {isSubmitting ? 'Отправка...' : `Сгенерировать 🪙 ${generationCost}`}
            </button>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(modalTree, document.body)
}
