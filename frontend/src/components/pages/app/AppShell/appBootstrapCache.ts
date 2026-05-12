// Кеш стартовых API-данных приложения: уменьшает повторные загрузки при переключении вкладок.
import type { AxiosResponse } from 'axios'
import { apiFetch, type ApiFetchConfig } from '../../../../auth/apiClient'
import { primeCreateCarouselImages } from '../CreatePage/createCarouselMedia'

const getCache = new Map<string, Promise<AxiosResponse> | AxiosResponse>()

/** Формирует стабильный ключ кеша для GET-запроса с учётом path, params и responseType. */
function buildGetKey(path: string, config: ApiFetchConfig): string {
  const params = config.params ? JSON.stringify(config.params) : ''
  const responseType = config.responseType ? String(config.responseType) : ''
  return `${path}|${params}|${responseType}`
}

/** Возвращает кешированный GET-ответ или выполняет запрос и сохраняет его в памяти сессии. */
export async function cachedApiGet(path: string, config: ApiFetchConfig = {}): Promise<AxiosResponse> {
  const key = buildGetKey(path, config)
  const existing = getCache.get(key)
  if (existing) {
    return existing instanceof Promise ? await existing : existing
  }

  const requestPromise = apiFetch(path, { ...config, method: 'GET' })
  getCache.set(key, requestPromise)
  try {
    const response = await requestPromise
    /* Ошибки и 401 не кешируем — иначе после входа снова отдаётся старый 401 и профиль чистит токены. */
    if (response.status >= 400) {
      getCache.delete(key)
    } else {
      getCache.set(key, response)
    }
    return response
  } catch (error) {
    getCache.delete(key)
    throw error
  }
}

/** Сбрасывает кеш GET-запросов по path, когда данные были изменены (удаление/обновление). */
export function invalidateCachedGet(path: string): void {
  for (const key of getCache.keys()) {
    if (key.startsWith(`${path}|`)) {
      getCache.delete(key)
    }
  }
}

/** Прогревает основные данные приложения один раз при входе, чтобы вкладки открывались мгновенно. */
export function primeAppBootstrapData(): void {
  void cachedApiGet('/api/users/me')
  void cachedApiGet('/api/storage/profile-photos')
  void cachedApiGet('/api/storage/my-photos')
  primeCreateCarouselImages()
}
