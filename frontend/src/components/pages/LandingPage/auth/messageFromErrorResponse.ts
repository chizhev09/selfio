// Parses FastAPI error `detail` from axios responses for auth and other API screens.
// Разбор текста ошибки из ответа FastAPI (detail) для axios и экранов auth.

/** Достаёт detail из уже распарсенного JSON-тела ответа. */
function detailFromData(data: unknown, status: number): string {
  if (data === null || data === undefined) {
    return `Сервер ответил ${status}. Убедитесь, что API запущен из папки backend и PostgreSQL работает.`
  }
  if (typeof data === 'string') {
    const t = data.trim()
    if (!t) {
      return `Сервер ответил ${status}.`
    }
    const short = t.length > 320 ? `${t.slice(0, 320)}…` : t
    return short || `Ошибка ${status}`
  }
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    const d = (data as { detail: unknown }).detail
    if (typeof d === 'string') {
      return d
    }
    if (Array.isArray(d)) {
      const msgs = d
        .map((x) => {
          if (typeof x === 'string') {
            return x
          }
          if (x && typeof x === 'object' && 'msg' in x) {
            return String((x as { msg: unknown }).msg)
          }
          return null
        })
        .filter((s): s is string => Boolean(s))
      if (msgs.length) {
        return msgs.join(' ')
      }
    }
  }
  try {
    const raw = JSON.stringify(data)
    const short = raw.length > 320 ? `${raw.slice(0, 320)}…` : raw
    return short || `Ошибка ${status}`
  } catch {
    return `Ошибка ${status}`
  }
}

/** Возвращает человекочитаемое сообщение об ошибке из ответа axios. */
export function messageFromErrorResponse(res: { status: number; data: unknown }): string {
  return detailFromData(res.data, res.status)
}
