// Чтение и запись очереди генераций в localStorage для вкладки «Мои фото».

import { PENDING_GENERATIONS_STORAGE_KEY } from '../constants/photosPageConstants'
import type { PendingGenerationItem } from '../types/photosPage.types'

/** Читает список незавершённых генераций из localStorage с защитой от битых данных. */
export function readPendingGenerations(): PendingGenerationItem[] {
  try {
    const raw = window.localStorage.getItem(PENDING_GENERATIONS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item): PendingGenerationItem | null => {
        if (!item || typeof item !== 'object') return null
        const requestId = 'requestId' in item && typeof item.requestId === 'string' ? item.requestId : null
        const placeholderId = 'placeholderId' in item && typeof item.placeholderId === 'string' ? item.placeholderId : null
        if (!requestId || !placeholderId) return null
        return { requestId, placeholderId }
      })
      .filter((item): item is PendingGenerationItem => Boolean(item))
  } catch {
    return []
  }
}

/** Сохраняет актуальный список незавершённых генераций для восстановления после перезагрузки. */
export function writePendingGenerations(items: PendingGenerationItem[]): void {
  if (items.length === 0) {
    window.localStorage.removeItem(PENDING_GENERATIONS_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(PENDING_GENERATIONS_STORAGE_KEY, JSON.stringify(items))
}

/** Добавляет генерацию в очередь ожидания и создаёт id временного плейсхолдера. */
export function appendPendingGeneration(items: PendingGenerationItem[], requestId: string): PendingGenerationItem[] {
  if (items.some((item) => item.requestId === requestId)) {
    return items
  }
  return [...items, { requestId, placeholderId: `pending-${requestId}` }]
}
