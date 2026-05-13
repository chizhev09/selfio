// Состояние и побочные эффекты страницы библиотеки: категории, поиск, лента «Все», модалки.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../../../../auth/apiClient'
import { useUserTokenBalance } from '../../../../../hooks/useUserTokenBalance'
import { messageFromErrorResponse } from '../../../LandingPage/auth/messageFromErrorResponse'
import {
  ALL_TAB_BATCH_SIZE,
  AT_HOME_CURATED_ROWS,
  BEACH_CURATED_ROWS,
  FLOWERS_PICK_TEMPLATE_IDS,
  MOUNTAINS_CURATED_ROWS,
  IN_CAR_CURATED_ROWS,
  IN_PARK_CURATED_ROWS,
  MIN_CATEGORY_LOADING_MS,
  MOSCOW_PICK_TITLE_BY_ID,
  RED_DARING_CURATED_ROWS,
  SUMMER_VIBE_PICK_TEMPLATE_IDS,
  YEREVAN_PICK_TITLE_BY_ID,
} from '../constants/libraryPageConstants'
import { useSearch } from './useSearch'
import { libraryApi, humanizeGenerationUiError, GEMINI_GENERATION_IMAGE_MODEL } from '../services/libraryApi'
import type { Template } from '../types/library'
import type { GenerationAspectRatio, LibraryIndexApiResponse, LibraryIndexCategory, LibraryPickCard } from '../types/libraryPage.types'
import {
  composeSearchItems,
  flowersTemplatesInOrder,
  normalizeCategories,
  pickTemplatesByCuratedRows,
  pickTemplatesByIdOrder,
  getVariantsForTemplateId,
  resolvePromptForType,
} from '../utils/libraryPageUtils'

/** Собирает state, вычисления и обработчики для экрана библиотеки. */
export function useLibraryPage() {
  const navigate = useNavigate()
  const { balance: userTokenBalance, refetch: refetchUserTokenBalance } = useUserTokenBalance()
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState<LibraryIndexCategory[]>(() =>
    normalizeCategories(libraryApi.getCachedCategories() || undefined),
  )
  const [isLoadingCategories, setIsLoadingCategories] = useState(
    () => normalizeCategories(libraryApi.getCachedCategories() || undefined).length <= 1,
  )
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [categoryItems, setCategoryItems] = useState<Template[]>([])
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [quality, setQuality] = useState<'standard' | 'pro'>('standard')
  const [aspectRatio, setAspectRatio] = useState<GenerationAspectRatio>('9:16')
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState<string | null>(null)
  const [manifestData, setManifestData] = useState<Record<string, unknown> | null>(null)
  const [isSubmittingGeneration, setIsSubmittingGeneration] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [allTemplates, setAllTemplates] = useState<Template[]>([])
  const [allTemplatesLoading, setAllTemplatesLoading] = useState(false)
  const [allTemplatesError, setAllTemplatesError] = useState<string | null>(null)
  const [allVisibleCount, setAllVisibleCount] = useState(ALL_TAB_BATCH_SIZE)
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)
  const initialQueryFromUrl = searchParams.get('q') || ''
  const [showSearch, setShowSearch] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Все')
  const [openedPickCard, setOpenedPickCard] = useState<LibraryPickCard | null>(null)
  const { query, searchResult, loading, error, handleSearch, clearSearch } = useSearch(initialQueryFromUrl)
  const hasSearchQuery = query.trim().length > 0
  const isDefaultAllCategory = activeCategory === 'Все'
  const showAllTabFeed = !hasSearchQuery && isDefaultAllCategory
  const searchItems = useMemo(
    () => composeSearchItems(searchResult.exact, searchResult.similar),
    [searchResult.exact, searchResult.similar],
  )
  const allVisibleItems = useMemo(() => allTemplates.slice(0, allVisibleCount), [allTemplates, allVisibleCount])
  const templatesById = useMemo(() => {
    const out = new Map<string, Template[]>()
    for (const template of allTemplates) {
      const existing = out.get(template.id)
      if (existing) {
        existing.push(template)
      } else {
        out.set(template.id, [template])
      }
    }
    return out
  }, [allTemplates])

  /** Возвращает лучший шаблон по id для конкретной подборки (если есть дубли id). */
  function resolvePickTemplateById(pickCardId: string, templateId: string): Template | null {
    const variants = getVariantsForTemplateId(templatesById, templateId)
    if (!variants || variants.length === 0) return null
    if (variants.length === 1) return variants[0]
    if (pickCardId === 'c1') {
      const expectedTitle = MOSCOW_PICK_TITLE_BY_ID[templateId]
      if (expectedTitle) {
        const matchedByTitle = variants.find((item) => item.title.trim() === expectedTitle)
        if (matchedByTitle) return matchedByTitle
      }
    }
    if (pickCardId === 'c-yerevan') {
      const expectedTitle = YEREVAN_PICK_TITLE_BY_ID[templateId]
      if (expectedTitle) {
        const matchedByTitle = variants.find((item) => item.title.trim() === expectedTitle)
        if (matchedByTitle) return matchedByTitle
      }
    }
    return variants[0]
  }

  /** Возвращает URL превью для карточки подборки с учётом дублей id между категориями. */
  function resolvePickImageById(pickCardId: string, templateId: string): string | null {
    const template = resolvePickTemplateById(pickCardId, templateId)
    if (!template) return null
    return libraryApi.getImageUrl(template.image)
  }

  const openedPickTemplates = useMemo(() => {
    const ids = openedPickCard?.templateIds
    if (!ids?.length) return []
    const uniqueIds = Array.from(new Set(ids))
    const pickCardId = openedPickCard?.id || ''
    return uniqueIds
      .map((id) => resolvePickTemplateById(pickCardId, id))
      .filter((template): template is Template => Boolean(template))
  }, [openedPickCard, templatesById])

  const openedPickMissingIds = useMemo(() => {
    const ids = openedPickCard?.templateIds
    if (!ids?.length) return []
    const uniqueIds = Array.from(new Set(ids))
    const pickCardId = openedPickCard?.id || ''
    return uniqueIds.filter((id) => !resolvePickTemplateById(pickCardId, id))
  }, [openedPickCard, templatesById])

  const hasMoreAllItems = allVisibleCount < allTemplates.length
  const flowersPickTemplates = useMemo(
    () => flowersTemplatesInOrder(templatesById, FLOWERS_PICK_TEMPLATE_IDS),
    [templatesById],
  )
  const summerVibePickTemplates = useMemo(
    () => pickTemplatesByIdOrder(templatesById, SUMMER_VIBE_PICK_TEMPLATE_IDS),
    [templatesById],
  )
  const inParkPickTemplates = useMemo(
    () => pickTemplatesByCuratedRows(templatesById, IN_PARK_CURATED_ROWS),
    [templatesById],
  )
  const inCarPickTemplates = useMemo(
    () => pickTemplatesByCuratedRows(templatesById, IN_CAR_CURATED_ROWS),
    [templatesById],
  )
  const atHomePickTemplates = useMemo(
    () => pickTemplatesByCuratedRows(templatesById, AT_HOME_CURATED_ROWS),
    [templatesById],
  )
  const beachPickTemplates = useMemo(
    () => pickTemplatesByCuratedRows(templatesById, BEACH_CURATED_ROWS),
    [templatesById],
  )
  const mountainsPickTemplates = useMemo(
    () => pickTemplatesByCuratedRows(templatesById, MOUNTAINS_CURATED_ROWS),
    [templatesById],
  )
  const redDaringPickTemplates = useMemo(
    () => pickTemplatesByCuratedRows(templatesById, RED_DARING_CURATED_ROWS),
    [templatesById],
  )
  useEffect(() => {
    let isCancelled = false

    /** Загружает категории библиотеки и сохраняет их для чипов в шапке. */
    async function loadCategories() {
      try {
        setCategoriesError(null)

        try {
          const s3Categories = await libraryApi.getCategories()
          if (!isCancelled) {
            setCategories(normalizeCategories(s3Categories))
            setCategoriesError(null)
            void libraryApi.getAllTemplates().catch(() => {
              /* прогрев кеша ленты «Все» */
            })
          }
          return
        } catch (s3Error) {
          console.warn('Direct S3 categories load failed, fallback to backend API', s3Error)
        }

        const response = await apiFetch('/api/storage/library-index-raw')
        if (response.status !== 200) {
          if (!isCancelled) {
            setCategories([])
            setCategoriesError(messageFromErrorResponse(response))
          }
          return
        }

        const payload = response.data as LibraryIndexApiResponse
        const parsedCategories = normalizeCategories(payload.categories)
        if (!isCancelled) {
          setCategories(parsedCategories)
          void libraryApi.getAllTemplates().catch(() => {
            /* прогрев кеша ленты «Все» */
          })
        }
      } catch (err) {
        console.error('Failed to load library categories', err)
        if (!isCancelled) {
          setCategories([])
          setCategoriesError('Не удалось загрузить категории')
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCategories(false)
        }
      }
    }

    loadCategories()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    const normalizedActiveCategory = activeCategory.trim().toLowerCase()
    if (normalizedActiveCategory === 'все' || normalizedActiveCategory === 'all') {
      setCategoryItems([])
      setCategoryError(null)
      setCategoryLoading(false)
      return
    }
    const categoryMeta = categories.find((c) => c.name === activeCategory)
    if (categoryMeta?.id.trim().toLowerCase() === 'all') {
      setCategoryItems([])
      setCategoryError(null)
      setCategoryLoading(false)
      return
    }
    const indexPath = categoryMeta?.index_path
    if (!indexPath) {
      setCategoryItems([])
      setCategoryError('Для этой категории пока нет index.json')
      setCategoryLoading(false)
      return
    }

    let cancelled = false
    void (async () => {
      const loadStartedAt = Date.now()
      try {
        setCategoryLoading(true)
        setCategoryError(null)
        const data = await libraryApi.getCategoryIndex(indexPath)
        if (cancelled) return
        const items = Array.isArray(data.templates)
          ? data.templates.filter((t) => t?.id && t?.title && t?.image && t?.manifest)
          : []
        setCategoryItems(items)
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load category index', err)
        setCategoryItems([])
        const reason = err instanceof Error && err.message.trim() ? `: ${err.message}` : ''
        setCategoryError(`Не удалось загрузить категорию «${activeCategory}»${reason}`)
      } finally {
        const elapsed = Date.now() - loadStartedAt
        const remain = MIN_CATEGORY_LOADING_MS - elapsed
        if (remain > 0) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, remain)
          })
        }
        if (!cancelled) {
          setCategoryLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeCategory, categories])

  useEffect(() => {
    if (!showAllTabFeed) {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        setAllTemplatesLoading(true)
        setAllTemplatesError(null)
        const items = await libraryApi.getAllTemplates()
        if (cancelled) return
        setAllTemplates(items)
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load all templates feed', err)
        setAllTemplates([])
        setAllTemplatesError('Не удалось загрузить ленту')
      } finally {
        if (!cancelled) {
          setAllTemplatesLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showAllTabFeed])

  useEffect(() => {
    if (!showAllTabFeed) {
      return
    }
    setAllVisibleCount(ALL_TAB_BATCH_SIZE)
  }, [showAllTabFeed])

  useEffect(() => {
    if (!showAllTabFeed || !hasMoreAllItems) {
      return
    }
    const target = loadMoreSentinelRef.current
    if (!target) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (!first?.isIntersecting) return
        setAllVisibleCount((prev) => Math.min(prev + ALL_TAB_BATCH_SIZE, allTemplates.length))
      },
      { rootMargin: '280px 0px' },
    )
    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [showAllTabFeed, hasMoreAllItems, allTemplates.length])

  useEffect(() => {
    let cancelled = false
    /** Подтягивает manifest выбранного шаблона для промта в модалке. */
    async function loadManifest() {
      if (!selectedTemplate?.manifest) {
        if (!cancelled) setManifestData(null)
        return
      }
      try {
        const manifest = await libraryApi.getTemplateManifest(selectedTemplate.manifest)
        if (cancelled) return
        setManifestData(manifest as Record<string, unknown>)
      } catch (err) {
        console.warn('Failed to load template manifest, fallback to default prompt', err)
        if (!cancelled) setManifestData(null)
      }
    }
    void loadManifest()
    return () => {
      cancelled = true
    }
  }, [selectedTemplate?.manifest])

  useEffect(() => {
    return () => {
      if (selectedPhotoPreviewUrl) {
        URL.revokeObjectURL(selectedPhotoPreviewUrl)
      }
    }
  }, [selectedPhotoPreviewUrl])

  useEffect(() => {
    const q = query.trim()
    const current = searchParams.get('q') || ''
    if (q === current) return
    const next = new URLSearchParams(searchParams)
    if (q) {
      next.set('q', q)
    } else {
      next.delete('q')
    }
    setSearchParams(next, { replace: true })
  }, [query, searchParams, setSearchParams])

  useEffect(() => {
    /** Переключает видимость поиска по кастомному событию из навбара. */
    function onToggleSearch() {
      setShowSearch((prev) => !prev)
    }
    window.addEventListener('library-toggle-search', onToggleSearch as EventListener)
    return () => {
      window.removeEventListener('library-toggle-search', onToggleSearch as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!openedPickCard) {
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [openedPickCard])

  /** Обновляет баланс с сервера при открытии модалки генерации. */
  useEffect(() => {
    if (!isGenerateModalOpen) {
      return
    }
    void refetchUserTokenBalance()
  }, [isGenerateModalOpen, refetchUserTokenBalance])

  /** Открывает детальный экран шаблона по его id. */
  function handleTemplateClick(template: Template) {
    setGenerationError(null)
    setSelectedTemplate(template)
    setIsGenerateModalOpen(true)
  }

  /** Открывает экран создания, где пользователь может генерировать по своему промту. */
  function handleGenerateByPrompt() {
    navigate('/app/create-profile')
  }

  /** Открывает подборку: либо модальное окно по списку id, либо старый поиск по query. */
  function handlePickOpen(card: LibraryPickCard) {
    if (card.templateIds?.length) {
      setOpenedPickCard(card)
      return
    }
    handleSearch(card.query)
  }

  /** Закрывает окно открытой подборки на Главной. */
  function handleClosePickModal() {
    setOpenedPickCard(null)
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
    if (!selectedTemplate || !selectedPhotoFile) {
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
      const manifestRecord = await libraryApi.resolveManifestForGenerationSubmit(
        selectedTemplate.manifest,
        manifestData,
      )
      if (manifestRecord) {
        setManifestData(manifestRecord)
      }
      const promptToSend = resolvePromptForType(manifestRecord)
      const generationJob = await libraryApi.generateFromTemplate({
        quality,
        model: GEMINI_GENERATION_IMAGE_MODEL,
        aspect_ratio: aspectRatio,
        template_id: selectedTemplate.id,
        manifest_path: selectedTemplate.manifest,
        selected_prompt: promptToSend,
        user_photo_object_key: completed.object_key,
      })
      setIsGenerateModalOpen(false)
      navigate('/app/photos', {
        state: {
          pendingGeneration: { requestId: generationJob.request_id },
        },
      })
    } catch (err) {
      setGenerationError(humanizeGenerationUiError(err))
    } finally {
      setIsSubmittingGeneration(false)
    }
  }

  return {
    loadMoreSentinelRef,
    categories,
    isLoadingCategories,
    categoriesError,
    categoryItems,
    categoryLoading,
    categoryError,
    generationError,
    allTemplates,
    allTemplatesLoading,
    allTemplatesError,
    allVisibleItems,
    hasMoreAllItems,
    flowersPickTemplates,
    summerVibePickTemplates,
    inParkPickTemplates,
    inCarPickTemplates,
    atHomePickTemplates,
    beachPickTemplates,
    mountainsPickTemplates,
    redDaringPickTemplates,
    query,
    loading,
    error,
    handleSearch,
    clearSearch,
    hasSearchQuery,
    isDefaultAllCategory,
    showAllTabFeed,
    searchItems,
    showSearch,
    activeCategory,
    setActiveCategory,
    openedPickCard,
    openedPickTemplates,
    openedPickMissingIds,
    resolvePickImageById,
    selectedTemplate,
    isGenerateModalOpen,
    quality,
    setQuality,
    aspectRatio,
    setAspectRatio,
    selectedPhotoPreviewUrl,
    isSubmittingGeneration,
    handleTemplateClick,
    handleGenerateByPrompt,
    handlePickOpen,
    handleClosePickModal,
    handleCloseGenerateModal,
    handlePhotoSelect,
    handleStartGeneration,
    userTokenBalance,
    handleNavigateToTopUpFromGenerate,
  }
}
