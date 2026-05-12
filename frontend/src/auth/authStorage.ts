// Хранение access/refresh в sessionStorage на время вкладки браузера.
const ACCESS = 'flowsee_access_token'
const REFRESH = 'flowsee_refresh_token'

/** Сохраняет пару JWT после входа или обновления. */
export function setTokens(access: string, refresh: string): void {
  sessionStorage.setItem(ACCESS, access)
  sessionStorage.setItem(REFRESH, refresh)
}

/** Удаляет токены (выход или ошибка refresh). */
export function clearTokens(): void {
  sessionStorage.removeItem(ACCESS)
  sessionStorage.removeItem(REFRESH)
}

/** Возвращает access-токен или null. */
export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS)
}

/** Возвращает refresh-токен или null. */
export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH)
}
