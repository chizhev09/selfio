// Чистые функции для библиотеки: нормализация категорий, промты, фильтры подборок и герой.

import type { Template } from '../types/library'
import {
  DEFAULT_PROMPT,
  FLOWERS_EXCLUDE_MALE_EN_TOKENS,
  FLOWERS_EXCLUDE_MALE_RU_SUBSTRINGS,
  FLOWERS_EXCLUDE_TITLE_SNIPPETS,
} from '../constants/libraryPageConstants'
import type {
  LibraryCuratedTemplateRow,
  LibraryHeroSlide,
  LibraryIndexCategory,
  LibraryIndexCategoryRow,
} from '../types/libraryPage.types'

/** Приводит строку категории к нижнему регистру без лишних пробелов. */
export function normalizeCategoryToken(value: string): string {
  return value.trim().toLowerCase()
}

/** Нормализует список категорий из index.json в безопасный формат для UI. */
export function normalizeCategories(
  categories: Array<{ id?: string; name?: string; index_path?: string | null }> | undefined,
): LibraryIndexCategory[] {
  const dynamic = Array.isArray(categories) ? categories : []
  const normalizedDynamic = dynamic
    .map((item): LibraryIndexCategoryRow | null => {
      const id = typeof item.id === 'string' ? item.id.trim() : ''
      const nameRaw = typeof item.name === 'string' ? item.name.trim() : ''
      const indexPathRaw = typeof item.index_path === 'string' ? item.index_path.trim() : ''
      if (!id || !indexPathRaw) {
        return null
      }
      return {
        id,
        name: nameRaw || id,
        index_path: indexPathRaw,
      }
    })
    .filter((item): item is LibraryIndexCategoryRow => item !== null)

  const seen = new Set<string>()
  const deduped = normalizedDynamic.filter((item) => {
    const key = normalizeCategoryToken(item.id)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return [{ id: 'All', name: 'Все', index_path: null }, ...deduped]
}

/** Собирает плоский список карточек для сетки результатов без дублей. */
export function composeSearchItems(exact: Template | null, similar: Template[]): Template[] {
  const out: Template[] = []
  if (exact) {
    out.push(exact)
  }
  for (const item of similar) {
    if (!out.some((existing) => existing.id === item.id)) {
      out.push(item)
    }
  }
  return out
}

/** Возвращает ключ S3 для шаблонной картинки на основе относительного пути из индекса. */
export function toLibraryObjectKey(imagePath: string): string {
  const normalized = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
  return normalized.startsWith('S3_selfio/library/') ? normalized : `S3_selfio/library/${normalized}`
}

/** Возвращает текст сцены из manifest для генерации (prompt / prompts). */
export function resolvePromptForType(manifest: Record<string, unknown> | null): string {
  if (!manifest) return DEFAULT_PROMPT
  const basePrompt = manifest['prompt']
  if (typeof basePrompt === 'string' && basePrompt.trim()) {
    return basePrompt.trim()
  }
  const prompts = manifest['prompts']
  if (Array.isArray(prompts)) {
    const first = prompts.find((item): item is string => typeof item === 'string' && item.trim().length > 0)
    if (first) return first.trim()
  }
  return DEFAULT_PROMPT
}

/** Выбирает до 10 случайных шаблонов библиотеки для карусели «Популярное». */
export function randomPopularTemplates(templates: Template[]): Template[] {
  const valid = templates.filter(
    (item) => typeof item.id === 'string' && item.id.trim() && typeof item.image === 'string' && item.image.trim(),
  )
  if (valid.length === 0) {
    return []
  }
  const shuffled = [...valid]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = tmp
  }
  return shuffled.slice(0, 10)
}

/** Преобразует API-ответ карусели в безопасный список слайдов для UI. */
export function mapHeroSlidesFromApi(data: { collections?: Array<{ id?: string; cover_url?: string }> } | null): LibraryHeroSlide[] {
  if (!data?.collections?.length) {
    return []
  }
  return data.collections
    .map((c) => ({ id: c.id || '', src: c.cover_url || '' }))
    .filter((slide) => slide.id.length > 0 && slide.src.length > 0)
}

/** Проверяет, относится ли шаблон к категории «бизнес» (id или имя из индекса). */
export function isBusinessCategoryTemplate(template: Template): boolean {
  const id = normalizeCategoryToken(template.category_id || '')
  const name = normalizeCategoryToken(template.category_name || '')
  return id === 'business' || name === 'бизнес' || name === 'business'
}

/** Берёт до 9 шаблонов бизнес-категории в стабильном порядке для сетки 3×3. */
export function businessTemplatesForGrid(templates: Template[]): Template[] {
  return templates
    .filter(
      (item) =>
        isBusinessCategoryTemplate(item) &&
        typeof item.id === 'string' &&
        item.id.trim() &&
        typeof item.image === 'string' &&
        item.image.trim(),
    )
    .slice(0, 9)
}

/** Эвристика: по тексту карточки отсекаем шаблоны с мужским портретом для подборки «С цветами». */
export function templateLooksLikeMalePortraitForFlowers(template: Template): boolean {
  const tags = Array.isArray(template.tags) ? template.tags : []
  const hay = `${template.title} ${tags.join(' ')}`.toLowerCase()
  for (const needle of FLOWERS_EXCLUDE_MALE_RU_SUBSTRINGS) {
    if (hay.includes(needle)) return true
  }
  const latinSlug = hay.replace(/[^a-z]+/g, ' ').trim()
  if (!latinSlug) return false
  for (const tok of latinSlug.split(/\s+/)) {
    if (FLOWERS_EXCLUDE_MALE_EN_TOKENS.has(tok)) return true
  }
  return false
}

/** Проверяет название по ручному списку фрагментов для подборки «С цветами». */
export function templateTitleBlocklistedForFlowers(template: Template): boolean {
  const t = template.title.trim().toLowerCase()
  return FLOWERS_EXCLUDE_TITLE_SNIPPETS.some((snippet) => t.includes(snippet))
}

/** Собирает шаблоны «С цветами» в порядке списка id с фильтрами. */
export function flowersTemplatesInOrder(
  templatesById: Map<string, Template[]>,
  ids: readonly string[],
): Template[] {
  const out: Template[] = []
  for (const templateId of ids) {
    const variants = templatesById.get(templateId)
    const first = variants?.[0]
    if (!first) continue
    if (templateLooksLikeMalePortraitForFlowers(first)) continue
    if (templateTitleBlocklistedForFlowers(first)) continue
    out.push(first)
  }
  return out
}

/** Собирает шаблоны подборки по списку id: первый вариант на id, без текстовых фильтров. */
export function pickTemplatesByIdOrder(
  templatesById: Map<string, Template[]>,
  ids: readonly string[],
): Template[] {
  const out: Template[] = []
  for (const rawId of ids) {
    const templateId = rawId.trim()
    const variants = templatesById.get(templateId)
    const first = variants?.[0]
    if (first) {
      out.push(first)
      continue
    }
    const noLeadingZeros = templateId.replace(/^0+/, '') || '0'
    if (noLeadingZeros !== templateId) {
      const alt = templatesById.get(noLeadingZeros)?.[0]
      if (alt) out.push(alt)
    }
  }
  return out
}

/** Возвращает все варианты шаблона по id, с запасным ключом без ведущих нулей. */
export function getVariantsForTemplateId(templatesById: Map<string, Template[]>, rawId: string): Template[] | undefined {
  const templateId = rawId.trim()
  const direct = templatesById.get(templateId)
  if (direct?.length) return direct
  const noLeadingZeros = templateId.replace(/^0+/, '') || '0'
  if (noLeadingZeros !== templateId) {
    return templatesById.get(noLeadingZeros)
  }
  return undefined
}

/**
 * Собирает шаблоны по строкам id + ожидаемый title: при нескольких шаблонах с одним id
 * берётся только вариант с совпадающим названием (иначе слот пропускается).
 */
export function pickTemplatesByCuratedRows(
  templatesById: Map<string, Template[]>,
  rows: readonly LibraryCuratedTemplateRow[],
): Template[] {
  const out: Template[] = []
  for (const row of rows) {
    const variants = getVariantsForTemplateId(templatesById, row.id)
    if (!variants?.length) continue
    const expected = row.title.trim()
    const match = variants.find((t) => t.title.trim() === expected)
    if (match) out.push(match)
  }
  return out
}
