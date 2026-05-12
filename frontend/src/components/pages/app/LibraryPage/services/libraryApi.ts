import axios from 'axios';
import type { RootIndex, CategoryIndex, Template, SearchResult } from '../types/library';
import { apiFetch } from '../../../../../auth/apiClient'

// Сервис чтения индексов и шаблонов библиотеки из S3 с fallback через backend API.
const DEFAULT_S3_ENDPOINT_URL = 'https://flowsee-library.s3.eu-central-1.amazonaws.com'
const CATEGORY_SEARCH_ALIASES: Record<string, string[]> = {
  cafe: ['cafe', 'кафе', 'кофе', 'coffee'],
}

/** Собирает базовый URL библиотеки из переменных окружения с безопасным fallback. */
function resolveLibraryBaseUrl(): string {
  const fromEnv =
    (import.meta.env.VITE_S3_PUBLIC_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_S3_ENDPOINT_URL as string | undefined) ||
    (import.meta.env.S3_ENDPOINT_URL as string | undefined)
  const bucket =
    (import.meta.env.VITE_S3_BUCKET_NAME as string | undefined) ||
    (import.meta.env.S3_BUCKET_NAME as string | undefined)

  let endpoint = (fromEnv || DEFAULT_S3_ENDPOINT_URL).replace(/\/+$/, '')
  if (
    bucket &&
    endpoint.includes('s3.twcstorage.ru') &&
    !endpoint.endsWith(`/${bucket}`) &&
    !endpoint.includes(`://${bucket}.`)
  ) {
    endpoint = `${endpoint}/${bucket}`
  }

  return endpoint.endsWith('/S3_selfio/library') ? endpoint : `${endpoint}/S3_selfio/library`
}

const BASE_URL = resolveLibraryBaseUrl()

/** Таймаут HTTP к индексу одной категории по умолчанию (мс). */
const CATEGORY_INDEX_TIMEOUT_DEFAULT_MS = 10_000
/** Таймаут при сборке полной ленты «Все» — запросов много, даём больше времени. */
const CATEGORY_INDEX_TIMEOUT_BULK_MS = 18_000
/** Сколько индексов категорий запрашивать параллельно (снижает таймауты и нагрузку на API). */
const BULK_CATEGORY_INDEX_CONCURRENCY = 4
/** Пауза перед повторной попыткой подгрузить индекс категории. */
const BULK_CATEGORY_RETRY_DELAY_MS = 400

/** Выполняет асинхронный map с ограничением числа одновременных задач. */
async function mapWithConcurrencyLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []
  const limit = Math.max(1, Math.min(concurrency, items.length))
  const results: R[] = new Array(items.length)
  let cursor = 0

  /** Забирает следующий индекс и обрабатывает элемент, пока массив не кончится. */
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      results[i] = await mapper(items[i]!, i)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}

export interface TemplateManifest {
  one_to_one_prompt?: string
  prompt?: string
  prompts?: string[]
  [key: string]: unknown
}

export interface PresignUploadApiResponse {
  method: 'PUT'
  upload_url: string
  headers: Record<string, string>
  object_key: string
  public_url?: string | null
}

export interface UploadCompleteApiResponse {
  id: string
  object_key: string
  view_url: string
  original_filename: string | null
  created_at: string
}

export interface GenerateFromTemplateRequest {
  generation_type: 'one_to_one' | 'similar'
  quality: 'standard' | 'pro'
  model: 'google/gemini-3-pro-image-preview' | 'flux 2 pro'
  aspect_ratio: '9:16' | '1:1' | '4:5' | '16:9'
  template_id: string
  manifest_path: string
  selected_prompt: string
  user_photo_object_key: string
  template_photo_object_key?: string
}

export interface GenerateFromTemplateResponse {
  request_id: string
  generation_type: 'one_to_one' | 'similar'
  status: 'queued' | 'processing' | 'done' | 'failed'
}

export interface GenerateFromTemplateStatusResponse {
  request_id: string
  generation_type: 'one_to_one' | 'similar'
  status: 'queued' | 'processing' | 'done' | 'failed'
  result_object_key: string | null
  result_view_url: string | null
  error: string | null
}

/** Идентификаторы-заглушки для задач с экрана «Создать» (нет карточки в индексе библиотеки). */
export const CREATE_FLOW_PROMPT_TEMPLATE_ID = '__create_prompt__'
export const CREATE_FLOW_OWN_TEMPLATE_ID = '__create_own_template__'
export const CREATE_FLOW_MANIFEST_PLACEHOLDER = 'create/flow/selfio'

/** Текст сцены по умолчанию, если пользователь не ввёл промт (Nano Banana на бэкенде). */
export const NANO_BANANA_DEFAULT_SCENE_PROMPT =
  'Сохранить естественный вид, аккуратно перенести стиль и пожелания из описания.'

/** Возвращает имя модели для поля запроса генерации в зависимости от качества UI. */
export function resolveGenerationModelForQuality(
  quality: 'standard' | 'pro',
): 'google/gemini-3-pro-image-preview' | 'flux 2 pro' {
  if (quality === 'pro') return 'flux 2 pro'
  return 'google/gemini-3-pro-image-preview'
}

/** Приводит index_path из JSON к строке (в index.json иногда приходит число без кавычек). */
function normalizeCategoryIndexPath(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).trim()
  return String(value).trim()
}

/** Нормализует ответ root index из backend в ожидаемый контракт фронта. */
function mapRootIndex(data: Partial<RootIndex>): RootIndex {
  const rawCategories = Array.isArray(data.categories) ? data.categories : []
  const categories = rawCategories
    .filter((category) => {
      if (!category || typeof category.id !== 'string' || !category.id.trim()) {
        return false
      }
      return true
    })
    .map((category) => {
      const nameRaw =
        typeof category.name === 'string'
          ? category.name.trim()
          : String(category.name ?? '').trim()
      return {
        id: category.id.trim(),
        name: nameRaw || category.id.trim(),
        index_path: normalizeCategoryIndexPath(category.index_path),
      }
    })
  return {
    version: data.version || '1',
    updated_at: data.updated_at || new Date().toISOString(),
    base_url: data.base_url || BASE_URL,
    categories,
  }
}

/** Нормализует шаблон категории, чтобы поиск не падал на неполных данных. */
function normalizeTemplate(raw: Partial<Template>, fallbackCategoryId: string, fallbackCategoryName: string): Template | null {
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  const image = typeof raw.image === 'string' ? raw.image.trim() : ''
  const manifest = typeof raw.manifest === 'string' ? raw.manifest.trim() : ''
  if (!id || !title || !image || !manifest) {
    return null
  }
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : []
  return {
    id,
    title,
    image,
    manifest,
    tags,
    category_id: raw.category_id || fallbackCategoryId,
    category_name: raw.category_name || fallbackCategoryName,
  }
}

/** Проверяет, соответствует ли запрос одному из алиасов категории. */
function queryMatchesCategoryAliases(query: string, categoryId?: string): boolean {
  if (!categoryId) return false
  const aliases = CATEGORY_SEARCH_ALIASES[categoryId.toLowerCase()]
  if (!aliases) return false
  return aliases.some((alias) => query.includes(alias))
}

class LibraryApi {
  private cachedTemplates: Template[] | null = null
  private rootIndex: RootIndex | null = null
  private categoryIndexCache = new Map<string, CategoryIndex>()
  private categoryIndexInflight = new Map<string, Promise<CategoryIndex>>()
  private allTemplatesInflight: Promise<Template[]> | null = null

  /** Загружает корневой индекс библиотеки и кеширует его. */
  async getRootIndex(): Promise<RootIndex> {
    if (this.rootIndex) return this.rootIndex
    try {
      const response = await axios.get<RootIndex>(`${BASE_URL}/index.json`)
      const mapped = mapRootIndex(response.data)
      this.rootIndex = mapped
      return mapped
    } catch (s3Error) {
      // Для приватного бакета fallback на backend endpoint с авторизацией.
      const response = await apiFetch('/api/storage/library-index-raw', { method: 'GET' })
      if (response.status !== 200) {
        throw new Error(`Root index request failed with status ${response.status}`)
      }
      const mapped = mapRootIndex(response.data as Partial<RootIndex>)
      this.rootIndex = mapped
      console.warn('Direct S3 root index request failed, fallback to backend API', s3Error)
      return mapped
    }
  }

  /** Загружает индекс одной категории по пути из root-индекса. */
  async getCategoryIndex(
    indexPath: string | number,
    options?: { timeoutMs?: number },
  ): Promise<CategoryIndex> {
    const normalizedPath = normalizeCategoryIndexPath(indexPath)
    if (!normalizedPath) {
      throw new Error('Пустой путь к index.json категории')
    }
    const timeoutMs = options?.timeoutMs ?? CATEGORY_INDEX_TIMEOUT_DEFAULT_MS
    const cached = this.categoryIndexCache.get(normalizedPath)
    if (cached) {
      return cached
    }
    const inflight = this.categoryIndexInflight.get(normalizedPath)
    if (inflight) {
      return inflight
    }

    // Для приватного бакета читаем category index через backend-прокси.
    const request = (async (): Promise<CategoryIndex> => {
      const response = await apiFetch('/api/storage/library-category-index', {
        method: 'GET',
        params: { index_path: normalizedPath },
        timeout: timeoutMs,
      })
      if (response.status !== 200) {
        const detail =
          typeof response.data === 'object' &&
          response.data !== null &&
          'detail' in (response.data as Record<string, unknown>) &&
          typeof (response.data as Record<string, unknown>).detail === 'string'
            ? (response.data as Record<string, string>).detail
            : ''
        const suffix = detail ? `: ${detail}` : ''
        throw new Error(`Category index request failed with status ${response.status}${suffix}`)
      }
      const parsed = response.data as CategoryIndex
      this.categoryIndexCache.set(normalizedPath, parsed)
      return parsed
    })()

    this.categoryIndexInflight.set(normalizedPath, request)
    try {
      return await request
    } finally {
      this.categoryIndexInflight.delete(normalizedPath)
    }
  }

  /** Возвращает список категорий из корневого индекса. */
  async getCategories(): Promise<RootIndex['categories']> {
    const rootIndex = await this.getRootIndex()
    return rootIndex.categories
  }

  /** Возвращает категории из памяти без запроса в сеть, если кэш уже прогрет. */
  getCachedCategories(): RootIndex['categories'] | null {
    return this.rootIndex?.categories ?? null
  }

  /** Собирает шаблоны всех категорий в единый кешированный массив. */
  async getAllTemplates(): Promise<Template[]> {
    if (this.cachedTemplates) return this.cachedTemplates
    if (this.allTemplatesInflight) return this.allTemplatesInflight

    const inflight = this.loadAllTemplatesFromNetwork()
    this.allTemplatesInflight = inflight
    try {
      return await inflight
    } finally {
      this.allTemplatesInflight = null
    }
  }

  /** Тянет индексы категорий с лимитом параллелизма, повторами и увеличенным таймаутом. */
  private async loadAllTemplatesFromNetwork(): Promise<Template[]> {
    const rootIndex = await this.getRootIndex()

    /** Подгружает шаблоны одной категории с одним повтором при сбое сети. */
    const loadCategoryTemplates = async (category: RootIndex['categories'][number]): Promise<Template[]> => {
      if (!category.index_path) {
        console.warn(`Skip category ${category.id}: empty index_path`)
        return []
      }
      const fetchOnce = async (): Promise<Template[]> => {
        const categoryIndex = await this.getCategoryIndex(category.index_path, {
          timeoutMs: CATEGORY_INDEX_TIMEOUT_BULK_MS,
        })
        return categoryIndex.templates
          .map((t) =>
            normalizeTemplate(
              { ...t, category_id: categoryIndex.category_id, category_name: categoryIndex.category_name },
              category.id,
              category.name,
            ),
          )
          .filter((t): t is Template => Boolean(t))
      }
      try {
        return await fetchOnce()
      } catch {
        await new Promise<void>((r) => {
          window.setTimeout(r, BULK_CATEGORY_RETRY_DELAY_MS)
        })
        try {
          return await fetchOnce()
        } catch (err) {
          console.warn(`Skip category ${category.id}: failed to load index`, err)
          return []
        }
      }
    }

    const settled = await mapWithConcurrencyLimit(
      rootIndex.categories,
      BULK_CATEGORY_INDEX_CONCURRENCY,
      (category) => loadCategoryTemplates(category),
    )
    const allTemplates = settled.flat()
    this.cachedTemplates = allTemplates
    return allTemplates
  }

  /** Выполняет поиск точного и похожих совпадений по шаблонам. */
  async searchTemplates(query: string): Promise<SearchResult> {
    if (!query.trim()) {
      return { exact: null, similar: [] }
    }

    const allTemplates = await this.getAllTemplates()
    const lowerQuery = query.toLowerCase().trim()
    /** Проверяет совпадение только по заголовку шаблона и полям категории. */
    const matchesQuery = (t: Template): boolean => {
      const inTitle = t.title.toLowerCase().includes(lowerQuery)
      const inCategoryName = (t.category_name || '').toLowerCase().includes(lowerQuery)
      const inCategoryId = (t.category_id || '').toLowerCase().includes(lowerQuery)
      const inCategoryAlias = queryMatchesCategoryAliases(lowerQuery, t.category_id)
      return inTitle || inCategoryName || inCategoryId || inCategoryAlias
    }

    const exact = allTemplates.find(matchesQuery) || null

    let similar: Template[] = []

    if (exact) {
      const similarIds = new Set<string>([exact.id])
      
      similar = allTemplates.filter(t => {
        if (similarIds.has(t.id)) return false
        
        const hasCommonTag = t.tags.some(tag => 
          exact.tags.includes(tag)
        )
        
        if (hasCommonTag) {
          similarIds.add(t.id)
          return true
        }
        
        return false
      }).slice(0, 10)
    } else {
      similar = allTemplates.filter(matchesQuery).slice(0, 20)
    }

    return { exact, similar }
  }

  /** Возвращает шаблоны, где тег частично совпадает с запросом. */
  async searchByTag(tag: string): Promise<Template[]> {
    const allTemplates = await this.getAllTemplates()
    const lowerTag = tag.toLowerCase().trim()
    
    return allTemplates.filter(t => 
      t.tags.some(t => t.toLowerCase().includes(lowerTag))
    ).slice(0, 20)
  }

  /** Ищет один шаблон по id в текущем кеше библиотеки. */
  async getTemplateById(templateId: string): Promise<Template | null> {
    const allTemplates = await this.getAllTemplates()
    return allTemplates.find((template) => template.id === templateId) || null
  }

  /** Возвращает похожие шаблоны для детали: сначала по категории, затем по тегам. */
  async getRelatedTemplates(template: Template, limit = 20): Promise<Template[]> {
    const allTemplates = await this.getAllTemplates()
    const sameCategory = allTemplates.filter(
      (candidate) => candidate.id !== template.id && candidate.category_id === template.category_id,
    )
    if (sameCategory.length >= limit) {
      return sameCategory.slice(0, limit)
    }
    const sameTags = allTemplates.filter(
      (candidate) =>
        candidate.id !== template.id &&
        candidate.category_id !== template.category_id &&
        candidate.tags.some((tag) => template.tags.includes(tag)),
    )
    return [...sameCategory, ...sameTags].slice(0, limit)
  }

  /** Формирует абсолютный URL изображения шаблона. */
  getImageUrl(imagePath: string): string {
    return `${BASE_URL}${imagePath}`
  }

  /** Загружает и возвращает manifest.json выбранного шаблона. */
  async getTemplateManifest(manifestPath: string): Promise<TemplateManifest> {
    const response = await axios.get<TemplateManifest>(`${BASE_URL}${manifestPath}`)
    return response.data
  }

  /** Запрашивает presigned PUT URL для загрузки фото пользователя в S3. */
  async presignUserPhotoUpload(filename: string, contentType: string): Promise<PresignUploadApiResponse> {
    const response = await apiFetch('/api/storage/presign-upload', {
      method: 'POST',
      data: { filename, content_type: contentType },
    })
    if (response.status !== 200) {
      throw new Error(`Presign upload failed with status ${response.status}`)
    }
    return response.data as PresignUploadApiResponse
  }

  /** Подтверждает backend'у, что пользовательский файл успешно загружен в S3. */
  async completeUserPhotoUpload(
    objectKey: string,
    contentType: string,
    originalFilename: string,
  ): Promise<UploadCompleteApiResponse> {
    const response = await apiFetch('/api/storage/upload-complete', {
      method: 'POST',
      data: {
        object_key: objectKey,
        content_type: contentType,
        original_filename: originalFilename,
      },
    })
    if (response.status !== 200) {
      throw new Error(`Upload complete failed with status ${response.status}`)
    }
    return response.data as UploadCompleteApiResponse
  }

  /** Полный цикл загрузки файла в папку user_photo: presign, PUT, upload-complete. */
  async uploadUserPhotoFile(file: File): Promise<string> {
    const contentType = file.type || 'image/jpeg'
    const presign = await this.presignUserPhotoUpload(file.name, contentType)
    const putResponse = await fetch(presign.upload_url, {
      method: presign.method || 'PUT',
      headers: presign.headers,
      body: file,
    })
    if (!putResponse.ok) {
      throw new Error(`Upload to S3 failed with status ${putResponse.status}`)
    }
    const completed = await this.completeUserPhotoUpload(presign.object_key, contentType, file.name)
    return completed.object_key
  }

  /** Отправляет запрос генерации по шаблону и возвращает ключ результата в result_generation. */
  async generateFromTemplate(payload: GenerateFromTemplateRequest): Promise<GenerateFromTemplateResponse> {
    const response = await apiFetch('/api/storage/generate-from-template', {
      method: 'POST',
      data: payload,
    })
    if (response.status !== 200) {
      const detail =
        typeof response.data?.detail === 'string'
          ? response.data.detail
          : JSON.stringify(response.data?.detail || response.data || '')
      throw new Error(`Generate request failed with status ${response.status}: ${detail}`)
    }
    return response.data as GenerateFromTemplateResponse
  }

  /** Возвращает статус асинхронной генерации по request_id. */
  async getGenerateFromTemplateStatus(requestId: string): Promise<GenerateFromTemplateStatusResponse> {
    const response = await apiFetch(`/api/storage/generate-from-template/${requestId}`, {
      method: 'GET',
    })
    if (response.status !== 200) {
      throw new Error(`Generate status request failed with status ${response.status}`)
    }
    return response.data as GenerateFromTemplateStatusResponse
  }

  /** Сбрасывает кеш индексов и шаблонов для повторной загрузки. */
  clearCache(): void {
    this.cachedTemplates = null
    this.rootIndex = null
    this.categoryIndexCache.clear()
    this.categoryIndexInflight.clear()
    this.allTemplatesInflight = null
  }
}

export const libraryApi = new LibraryApi()