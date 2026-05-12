// Типы экрана «Мои фото»: элементы списка, статус генерации и навигационный state.

/** Одна запись результата генерации из API «мои фото». */
export type PhotoItem = {
  id: string
  object_key: string
  view_url: string
  original_filename: string | null
  created_at: string
}

/** Ответ списка фото пользователя. */
export type MyPhotosJson = { items: PhotoItem[] }

/** Статус фоновой генерации по requestId. */
export type GenerationStatusJson = { status: 'queued' | 'processing' | 'done' | 'failed'; error?: string | null }

/** Ожидающая генерация с плейсхолдером в сетке. */
export type PendingGenerationItem = { requestId: string; placeholderId: string }

/** State маршрута при переходе с библиотеки/создания с активной генерацией. */
export type PhotosPageNavState = { pendingGeneration?: { requestId: string } } | null
