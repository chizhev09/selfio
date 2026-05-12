// Template details screen: large image, actions, and related photos.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useUserTokenBalance } from '../../../../hooks/useUserTokenBalance'
import { SearchResultsGrid } from './components/SearchResultsGrid'
import { GenerateModal } from './modalWindows/GenerateModal'
import { libraryApi } from './services/libraryApi'
import type { Template } from './types/library'
import './TemplateDetailsPage.css'
const DEFAULT_PROMPT = 'Сохранить естественный вид, аккуратно перенести стиль шаблона.'
type GenerationAspectRatio = '9:16' | '1:1' | '4:5' | '16:9'

/** Возвращает модель OpenRouter на основе выбранного качества генерации. */
function resolveModelByQuality(
  quality: 'standard' | 'pro',
): 'google/gemini-3-pro-image-preview' | 'flux 2 pro' {
  if (quality === 'pro') return 'flux 2 pro'
  return 'google/gemini-3-pro-image-preview'
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

/** Возвращает ключ S3 для шаблонной картинки на основе относительного пути из индекса. */
function toLibraryObjectKey(imagePath: string): string {
  const normalized = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
  return normalized.startsWith('S3_selfio/library/') ? normalized : `S3_selfio/library/${normalized}`
}

/** Возвращает промт из manifest для выбранного типа генерации с безопасным fallback. */
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

/** Рендерит экран детали шаблона с hero-фото, действиями и похожими карточками. */
function TemplateDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { templateId = '' } = useParams()
  const [template, setTemplate] = useState<Template | null>(null)
  const [related, setRelated] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const generationType: 'one_to_one' = 'one_to_one'
  const [quality, setQuality] = useState<'standard' | 'pro'>('standard')
  const [aspectRatio, setAspectRatio] = useState<GenerationAspectRatio>('9:16')
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState<string | null>(null)
  const [manifestData, setManifestData] = useState<Record<string, unknown> | null>(null)
  const [isSubmittingGeneration, setIsSubmittingGeneration] = useState(false)
  const { balance: userTokenBalance, refetch: refetchUserTokenBalance } = useUserTokenBalance()

  useEffect(() => {
    if (!isGenerateModalOpen) {
      return
    }
    void refetchUserTokenBalance()
  }, [isGenerateModalOpen, refetchUserTokenBalance])

  useEffect(() => {
    let cancelled = false

    /** Загружает выбранный шаблон и подборку похожих по категории/тегам. */
    async function loadTemplateDetails() {
      try {
        setLoading(true)
        setLoadError(null)
        const current = await libraryApi.getTemplateById(templateId)
        if (!current) {
          if (!cancelled) {
            setTemplate(null)
            setRelated([])
            setLoadError('Шаблон не найден')
          }
          return
        }
        const relatedItems = await libraryApi.getRelatedTemplates(current, 30)
        if (!cancelled) {
          setTemplate(current)
          setRelated(relatedItems)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить шаблон')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadTemplateDetails()

    /** Останавливает обновление state после ухода со страницы. */
    return () => {
      cancelled = true
    }
  }, [templateId])

  useEffect(() => {
    let cancelled = false
    /** Подгружает manifest выбранного шаблона и подготавливает список промтов для модалки. */
    async function loadManifest() {
      if (!template?.manifest) {
        if (!cancelled) {
          setManifestData(null)
        }
        return
      }
      try {
        const manifest = await libraryApi.getTemplateManifest(template.manifest)
        if (cancelled) return
        setManifestData(manifest as Record<string, unknown>)
      } catch (err) {
        console.warn('Failed to load template manifest, fallback to default prompt', err)
        if (!cancelled) {
          setManifestData(null)
        }
      }
    }
    void loadManifest()
    return () => {
      cancelled = true
    }
  }, [template?.manifest])

  useEffect(() => {
    /** Освобождает blob URL при смене фото или уходе со страницы. */
    return () => {
      if (selectedPhotoPreviewUrl) {
        URL.revokeObjectURL(selectedPhotoPreviewUrl)
      }
    }
  }, [selectedPhotoPreviewUrl])

  /** Возвращает пользователя назад к предыдущему экрану. */
  function handleBack() {
    navigate(`/app/library${location.search}`)
  }

  /** Открывает flow генерации по выбранному шаблону. */
  function handleGenerate() {
    setGenerationError(null)
    setIsGenerateModalOpen(true)
  }

  /** Переключает локальный флаг избранного (оптимистично). */
  function handleToggleFavorite() {
    setIsFavorite((prev) => !prev)
  }

  /** Открывает карточку похожего шаблона на этом же экране. */
  function handleOpenRelated(item: Template) {
    navigate(`/app/library/template/${item.id}${location.search}`)
  }

  /** Закрывает модальное окно генерации и сохраняет выбранные настройки. */
  function handleCloseGenerateModal() {
    setGenerationError(null)
    setIsGenerateModalOpen(false)
  }

  /** Закрывает генерацию и ведёт в профиль с открытым пополнением. */
  function handleNavigateToTopUpFromGenerate() {
    setGenerationError(null)
    setIsGenerateModalOpen(false)
    navigate('/app/profile', { state: { openTopUp: true } })
  }

  /** Сохраняет выбранное пользователем фото и формирует URL для локального предпросмотра. */
  function handlePhotoSelect(file: File | null) {
    if (selectedPhotoPreviewUrl) {
      URL.revokeObjectURL(selectedPhotoPreviewUrl)
    }
    if (!file) {
      setSelectedPhotoFile(null)
      setSelectedPhotoPreviewUrl(null)
      return
    }
    const nextPreviewUrl = URL.createObjectURL(file)
    setSelectedPhotoFile(file)
    setSelectedPhotoPreviewUrl(nextPreviewUrl)
  }

  /** Запускает генерацию с выбранными настройками. */
  async function handleStartGeneration() {
    if (!template || !selectedPhotoFile) {
      setGenerationError('Выберите фото перед запуском генерации')
      return
    }
    setIsSubmittingGeneration(true)
    setGenerationError(null)
    try {
      const contentType = selectedPhotoFile.type || 'image/jpeg'
      const presign = await libraryApi.presignUserPhotoUpload(selectedPhotoFile.name, contentType)
      const putResponse = await fetch(presign.upload_url, {
        method: presign.method || 'PUT',
        headers: presign.headers,
        body: selectedPhotoFile,
      })
      if (!putResponse.ok) {
        throw new Error(`Upload to S3 failed with status ${putResponse.status}`)
      }
      const completed = await libraryApi.completeUserPhotoUpload(
        presign.object_key,
        contentType,
        selectedPhotoFile.name,
      )
      const manifestRecord = await libraryApi.resolveManifestForGenerationSubmit(template.manifest, manifestData)
      if (manifestRecord) {
        setManifestData(manifestRecord)
      }
      const promptToSend = resolvePromptForType(manifestRecord, generationType)
      const selectedModel = resolveModelByQuality(quality)
      const generationJob = await libraryApi.generateFromTemplate({
        generation_type: generationType,
        quality,
        model: selectedModel,
        aspect_ratio: aspectRatio,
        template_id: template.id,
        manifest_path: template.manifest,
        selected_prompt: promptToSend,
        user_photo_object_key: completed.object_key,
        template_photo_object_key: generationType === 'one_to_one' ? toLibraryObjectKey(template.image) : undefined,
      })
      navigate('/app/photos', {
        state: {
          pendingGeneration: { requestId: generationJob.request_id },
        },
      })
      setIsGenerateModalOpen(false)
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Не удалось отправить запрос генерации')
    } finally {
      setIsSubmittingGeneration(false)
    }
  }

  if (loading) {
    return <div className="template-details template-details__state">Загрузка шаблона...</div>
  }

  if (loadError || !template) {
    return <div className="template-details template-details__state">{loadError || 'Шаблон не найден'}</div>
  }

  const heroSrc = libraryApi.getImageUrl(template.image)

  return (
    <motion.section
      className="template-details"
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.7 }}
    >
      <motion.div
        className="template-details__hero"
        initial={{ scale: 0.92, borderRadius: 28 }}
        animate={{ scale: 1, borderRadius: 20 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.75 }}
      >
        <motion.img
          src={heroSrc}
          alt={template.title}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
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
        <button type="button" className="template-details__back" onClick={handleBack} aria-label="Назад">
          <ArrowLeft size={20} />
        </button>
      </motion.div>

      <div className="template-details__actions">
        <button type="button" className="template-details__generate" onClick={handleGenerate}>
          Сгенерировать
        </button>
        <button
          type="button"
          className={`template-details__favorite ${isFavorite ? 'template-details__favorite--active' : ''}`}
          onClick={handleToggleFavorite}
          aria-label="Добавить в избранное"
        >
          <Heart size={20} />
        </button>
      </div>

      <div className="template-details__related-wrap">
        <h2 className="template-details__related-title">Похожие</h2>
        <SearchResultsGrid items={related} onTemplateClick={handleOpenRelated} className="template-details__related" />
      </div>
      <GenerateModal
        isOpen={isGenerateModalOpen}
        templateTitle={template.title}
        templateImageUrl={heroSrc}
        quality={quality}
        aspectRatio={aspectRatio}
        userTokenBalance={userTokenBalance}
        onQualityChange={setQuality}
        onAspectRatioChange={setAspectRatio}
        selectedPhotoPreviewUrl={selectedPhotoPreviewUrl}
        onPhotoSelect={handlePhotoSelect}
        isSubmitting={isSubmittingGeneration}
        onClose={handleCloseGenerateModal}
        onSubmit={() => void handleStartGeneration()}
        onRequestTopUp={handleNavigateToTopUpFromGenerate}
        submitError={generationError}
      />
    </motion.section>
  )
}

export default TemplateDetailsPage
