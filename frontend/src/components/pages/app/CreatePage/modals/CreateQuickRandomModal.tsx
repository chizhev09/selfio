// Модалка «Быстро»: тот же GenerateModal, что в библиотеке, со случайным шаблоном из ленты.
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { GenerateModal } from '../../LibraryPage/modalWindows/GenerateModal'
import { libraryApi, resolveGenerationModelForQuality } from '../../LibraryPage/services/libraryApi'
import type { Template } from '../../LibraryPage/types/library'
import '../../LibraryPage/modalWindows/GenerateModal.css'
import './CreateQuickRandomModal.css'

const DEFAULT_PROMPT = 'Сохранить естественный вид, аккуратно перенести стиль шаблона.'
type GenerationAspectRatio = '9:16' | '1:1' | '4:5' | '16:9'

interface CreateQuickRandomModalProps {
  isOpen: boolean
  userTokenBalance: number
  /** Обновляет баланс при открытии и когда показывается форма генерации. */
  refreshBalance?: () => void | Promise<void>
  onRequestTopUp: () => void
  onClose: () => void
}

/** Собирает ключ объекта S3 для картинки шаблона. */
function toLibraryObjectKey(imagePath: string): string {
  const normalized = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
  return normalized.startsWith('S3_selfio/library/') ? normalized : `S3_selfio/library/${normalized}`
}

/** Достаёт текст промта из manifest с запасным вариантом. */
function resolvePromptForType(manifest: Record<string, unknown> | null, generationType: 'one_to_one' | 'similar'): string {
  if (!manifest) return DEFAULT_PROMPT
  const oneToOne = manifest['one_to_one_prompt']
  const basePrompt = manifest['prompt']
  if (generationType === 'one_to_one' && typeof oneToOne === 'string' && oneToOne.trim()) {
    return oneToOne.trim()
  }
  if (typeof basePrompt === 'string' && basePrompt.trim()) {
    return basePrompt.trim()
  }
  const prompts = manifest['prompts']
  if (Array.isArray(prompts)) {
    const first = prompts.find((item): item is string => typeof item === 'string' && item.trim().length > 0)
    if (first) return first.trim()
  }
  if (typeof oneToOne === 'string' && oneToOne.trim()) {
    return oneToOne.trim()
  }
  return DEFAULT_PROMPT
}

/** Обёртка: подбор случайного шаблона, затем стандартная модалка генерации. */
export function CreateQuickRandomModal({
  isOpen,
  userTokenBalance,
  refreshBalance,
  onRequestTopUp,
  onClose,
}: CreateQuickRandomModalProps) {
  const navigate = useNavigate()
  const generationType: 'one_to_one' = 'one_to_one'

  const [pickLoading, setPickLoading] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)
  const [randomTemplate, setRandomTemplate] = useState<Template | null>(null)
  const [manifestData, setManifestData] = useState<Record<string, unknown> | null>(null)

  const [quality, setQuality] = useState<'standard' | 'pro'>('standard')
  const [aspectRatio, setAspectRatio] = useState<GenerationAspectRatio>('9:16')
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  /** При открытии заново тянем список и выбираем случайный шаблон; при закрытии сбрасываем всё. */
  useEffect(() => {
    if (!isOpen) {
      setSelectedPhotoPreviewUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl)
        }
        return null
      })
      setSelectedPhotoFile(null)
      setPickLoading(false)
      setPickError(null)
      setRandomTemplate(null)
      setManifestData(null)
      setSubmitError(null)
      setQuality('standard')
      setAspectRatio('9:16')
      setIsSubmitting(false)
      return
    }

    let cancelled = false

    /** Загружает все шаблоны и сохраняет один случайный. */
    async function pickRandomTemplate() {
      setPickLoading(true)
      setPickError(null)
      setRandomTemplate(null)
      setManifestData(null)
      try {
        const all = await libraryApi.getAllTemplates()
        if (cancelled) return
        if (all.length === 0) {
          setPickError('В библиотеке пока нет шаблонов')
          return
        }
        const picked = all[Math.floor(Math.random() * all.length)]!
        setRandomTemplate(picked)
      } catch (err) {
        if (!cancelled) {
          setPickError(err instanceof Error ? err.message : 'Не удалось загрузить шаблоны')
        }
      } finally {
        if (!cancelled) {
          setPickLoading(false)
        }
      }
    }

    void pickRandomTemplate()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  /** Подгружает manifest для выбранного случайного шаблона. */
  useEffect(() => {
    const manifestPath = randomTemplate?.manifest
    if (!manifestPath) {
      setManifestData(null)
      return
    }
    const pathForManifest: string = manifestPath
    let cancelled = false

    /** Читает JSON manifest по пути из карточки. */
    async function loadManifest() {
      try {
        const manifest = await libraryApi.getTemplateManifest(pathForManifest)
        if (cancelled) return
        setManifestData(manifest as Record<string, unknown>)
      } catch {
        if (!cancelled) {
          setManifestData(null)
        }
      }
    }
    void loadManifest()
    return () => {
      cancelled = true
    }
  }, [randomTemplate])

  useEffect(() => {
    /** Снимает blob-URL превью фото пользователя при смене или размонтировании. */
    return () => {
      if (selectedPhotoPreviewUrl) {
        URL.revokeObjectURL(selectedPhotoPreviewUrl)
      }
    }
  }, [selectedPhotoPreviewUrl])

  /** Закрывает модалку и чистит выбранное фото. */
  function handleClose() {
    if (selectedPhotoPreviewUrl) {
      URL.revokeObjectURL(selectedPhotoPreviewUrl)
    }
    setSelectedPhotoFile(null)
    setSelectedPhotoPreviewUrl(null)
    onClose()
  }

  /** Обновляет файл фото и превью для отправки. */
  function handlePhotoSelect(file: File | null) {
    if (selectedPhotoPreviewUrl) {
      URL.revokeObjectURL(selectedPhotoPreviewUrl)
    }
    if (!file) {
      setSelectedPhotoFile(null)
      setSelectedPhotoPreviewUrl(null)
      return
    }
    setSelectedPhotoFile(file)
    setSelectedPhotoPreviewUrl(URL.createObjectURL(file))
  }

  /** Грузит фото в S3 и ставит задачу генерации по случайному шаблону. */
  async function handleStartGeneration() {
    if (!randomTemplate || !selectedPhotoFile) {
      return
    }
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const userKey = await libraryApi.uploadUserPhotoFile(selectedPhotoFile)
      const promptToSend = resolvePromptForType(manifestData, generationType)
      const generationJob = await libraryApi.generateFromTemplate({
        generation_type: generationType,
        quality,
        model: resolveGenerationModelForQuality(quality),
        aspect_ratio: aspectRatio,
        template_id: randomTemplate.id,
        manifest_path: randomTemplate.manifest,
        selected_prompt: promptToSend,
        user_photo_object_key: userKey,
        template_photo_object_key: generationType === 'one_to_one' ? toLibraryObjectKey(randomTemplate.image) : undefined,
      })
      navigate('/app/photos', {
        state: {
          pendingGeneration: { requestId: generationJob.request_id },
        },
      })
      handleClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось отправить запрос генерации')
    } finally {
      setIsSubmitting(false)
    }
  }

  const showPickerUi = isOpen && (pickLoading || pickError !== null || randomTemplate === null)
  const showGenerateModal =
    isOpen && randomTemplate !== null && !pickLoading && pickError === null
  const heroSrc = randomTemplate ? libraryApi.getImageUrl(randomTemplate.image) : ''

  /** При открытии «Быстро» подтягивает актуальный баланс. */
  useEffect(() => {
    if (!isOpen) {
      return
    }
    void refreshBalance?.()
  }, [isOpen, refreshBalance])

  /** После выбора шаблона, когда открывается форма генерации — снова обновляет баланс. */
  useEffect(() => {
    if (!showGenerateModal) {
      return
    }
    void refreshBalance?.()
  }, [showGenerateModal, refreshBalance])

  return (
    <>
      <AnimatePresence>
        {showPickerUi ? (
          <>
            <motion.div
              className="generation-modal__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />
            <motion.section
              className="generation-modal create-quick-random__sheet"
              initial={{ y: '100%', opacity: 0.4 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.4 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.8 }}
              aria-busy={pickLoading}
              aria-label="Подбор случайного шаблона"
            >
              <header className="generation-modal__header create-quick-random__header">
                <button type="button" className="generation-modal__close" onClick={handleClose} aria-label="Закрыть">
                  <X size={20} />
                </button>
                <div className="generation-modal__title-wrap">
                  <h3>Быстрая генерация</h3>
                  <p className="generation-modal__subtitle">
                    {pickLoading
                      ? 'Подбираем случайный шаблон из библиотеки…'
                      : pickError
                        ? 'Проверьте сеть и откройте окно ещё раз.'
                        : ''}
                  </p>
                </div>
              </header>
              {pickError ? (
                <p className="create-quick-random__error" role="alert">
                  {pickError}
                </p>
              ) : null}
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>

      {submitError && showGenerateModal ? (
        <div className="create-quick-random__submit-error" role="alert">
          {submitError}
        </div>
      ) : null}

      <GenerateModal
        isOpen={showGenerateModal}
        templateTitle={randomTemplate?.title ?? ''}
        templateImageUrl={heroSrc}
        quality={quality}
        aspectRatio={aspectRatio}
        userTokenBalance={userTokenBalance}
        onQualityChange={setQuality}
        onAspectRatioChange={setAspectRatio}
        selectedPhotoPreviewUrl={selectedPhotoPreviewUrl}
        onPhotoSelect={handlePhotoSelect}
        isSubmitting={isSubmitting}
        onClose={handleClose}
        onSubmit={() => void handleStartGeneration()}
        onRequestTopUp={onRequestTopUp}
      />
    </>
  )
}
