// HTTP-клиент axios к /api: Bearer, при 401 — один refresh и повтор запроса.
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './authStorage'

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
  validateStatus: () => true,
})

/** Запрашивает новую пару токенов по refresh; при ошибке чистит хранилище. */
async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) {
    clearTokens()
    return false
  }
  const res = await api.post('/api/auth/refresh', { refresh_token: refresh })
  if (res.status !== 200) {
    clearTokens()
    return false
  }
  const data = res.data as { access_token: string; refresh_token: string }
  setTokens(data.access_token, data.refresh_token)
  return true
}

export type ApiFetchConfig = AxiosRequestConfig & { skipRefresh?: boolean }

/** Обёртка над axios: Authorization, при 401 — refresh и повтор. */
export async function apiFetch(path: string, config: ApiFetchConfig = {}): Promise<AxiosResponse> {
  const { skipRefresh, ...axiosConfig } = config
  const access = getAccessToken()
  const headers: Record<string, string> = {
    ...(axiosConfig.headers as Record<string, string> | undefined),
  }
  if (access) {
    headers.Authorization = `Bearer ${access}`
  }

  let res = await api.request({ url: path, ...axiosConfig, headers })

  if (res.status === 401 && !skipRefresh && path !== '/api/auth/refresh') {
    const ok = await tryRefresh()
    if (ok) {
      const h2: Record<string, string> = {
        ...(axiosConfig.headers as Record<string, string> | undefined),
      }
      const a = getAccessToken()
      if (a) {
        h2.Authorization = `Bearer ${a}`
      }
      res = await api.request({ url: path, ...axiosConfig, headers: h2 })
    }
  }

  return res
}

export { api }
