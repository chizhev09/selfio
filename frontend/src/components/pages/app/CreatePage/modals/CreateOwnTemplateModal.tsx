// Модалка на экране «Создать»: одно фото пользователя, текст сценария, качество и формат (без второго референса).
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import {
  PROFILE_TOP_UP_TOKENS_PER_PRO_GEN,
  PROFILE_TOP_UP_TOKENS_PER_REGULAR_GEN,
} from '../../ProfilePage/constants/profilePageConstants'
import '../../LibraryPage/modalWindows/GenerateModal.css'
import './CreateOwnTemplateModal.css'

type GenerationQuality = 'standard' | 'pro'
type GenerationAspectRatio = '9:16' | '1:1' | '4:5' | '16:9'

interface CreateOwnTemplateModalProps {
  isOpen: boolean
  quality: GenerationQuality
  aspectRatio: GenerationAspectRatio
  userTokenBalance: number
  /** Подтягивает баланс с /api/users/me при открытии sheet. */
  refreshBalance?: () => void | Promise<void>
  onQualityChange: (value: GenerationQuality) => void
  onAspectRatioChange: (value: GenerationAspectRatio) => void
  selectedPhotoPreviewUrl: string | null
  onPhotoSelect: (file: File | null) => void
  prompt: string
  onPromptChange: (value: string) => void
  /** false, пока не выбрано фото — кнопка отправки неактивна. */
  canSubmit: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: () => void
}

/** Рендерит нижний sheet: фото, промт сценария, качество и формат. */
export function CreateOwnTemplateModal({
  isOpen,
  quality,
  aspectRatio,
  userTokenBalance,
  refreshBalance,
  onQualityChange,
  onAspectRatioChange,
  selectedPhotoPreviewUrl,
  onPhotoSelect,
  prompt,
  onPromptChange,
  canSubmit,
  isSubmitting,
  onClose,
  onSubmit,
}: CreateOwnTemplateModalProps) {
  const [openedHint, setOpenedHint] = useState<'quality' | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const generationCost =
    quality === 'pro' ? PROFILE_TOP_UP_TOKENS_PER_PRO_GEN : PROFILE_TOP_UP_TOKENS_PER_REGULAR_GEN

  /** При открытии модалки обновляет баланс с сервера. */
  useEffect(() => {
    if (!isOpen) {
      return
    }
    void refreshBalance?.()
  }, [isOpen, refreshBalance])

  /** Открывает выбор файла для лица/тела пользователя. */
  function handleOpenPhotoDialog() {
    photoInputRef.current?.click()
  }

  /** Пробрасывает выбранное фото наружу и сбрасывает input для повторного выбора. */
  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    onPhotoSelect(file)
    event.currentTarget.value = ''
  }

  /** Показывает или скрывает текст подсказки по секции модалки. */
  function handleToggleHint(hint: 'quality') {
    setOpenedHint((prev) => (prev === hint ? null : hint))
  }

  /** Прокидывает ввод промта наверх без лишней логики. */
  function handlePromptInput(event: ChangeEvent<HTMLTextAreaElement>) {
    onPromptChange(event.target.value)
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className="generation-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            className="generation-modal generation-modal--compact-own"
            initial={{ y: '100%', opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }}
            aria-label="Модальное окно генерации по вашему описанию"
          >
            <header className="generation-modal__header">
              <button type="button" className="generation-modal__close" onClick={onClose} aria-label="Закрыть">
                <X size={18} />
              </button>
              <div className="generation-modal__title-wrap">
                <h3>Свой сценарий</h3>
                <p className="generation-modal__subtitle">
                  Одно фото и текст: что хотите видеть в кадре. Чёткий свет и лицо без масок дают стабильнее результат.
                </p>
              </div>
            </header>

            <div className="generation-modal__media-row">
              <div className="generation-modal__media-col">
                <span className="generation-modal__media-label">Прикрепите ваше фото</span>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="generation-modal__media-file-input"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  className="generation-modal__media-input"
                  aria-label="Добавить ваше фото"
                  onClick={handleOpenPhotoDialog}
                >
                  {selectedPhotoPreviewUrl ? (
                    <img src={selectedPhotoPreviewUrl} alt="Ваше фото" className="generation-modal__picked-preview" />
                  ) : (
                    <Plus size={18} strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <div className="create-own-modal__prompt">
              <label className="generation-modal__media-label" htmlFor="create-own-template-prompt">
                Промт
              </label>
              <textarea
                id="create-own-template-prompt"
                className="create-own-modal__prompt-input"
                value={prompt}
                onChange={handlePromptInput}
                placeholder="Опишите сцену, свет, настроение; можно оставить пустым — подставится нейтральный текст."
                rows={3}
                autoComplete="off"
              />
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

            <div className="generation-modal__coins" aria-label="Текущий баланс монет">
              <span className="generation-modal__coins-label">Баланс</span>
              <span>🪙 {userTokenBalance.toLocaleString('ru-RU')}</span>
            </div>

            <button
              type="button"
              className="generation-modal__submit"
              onClick={onSubmit}
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? 'Отправка...' : `Сгенерировать 🪙 ${generationCost}`}
            </button>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  )
}
