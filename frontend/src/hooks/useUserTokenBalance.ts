// Хук баланса токенов: читает /api/users/me через общий кеш приложения и умеет принудительно обновлять данные.

import { useCallback, useEffect, useState } from 'react'

import { cachedApiGet, invalidateCachedGet } from '../components/pages/app/AppShell/appBootstrapCache'

type MeBalance = {
  balance: number
}

/** Достаёт числовой баланс из ответа API, если поле пришло числом или строкой. */
function parseBalanceField(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }
  if (typeof raw === 'string') {
    const n = Number(raw)
    if (Number.isFinite(n)) {
      return n
    }
  }
  return null
}

/** Подгружает и при необходимости обновляет balance пользователя с бэкенда. */
export function useUserTokenBalance() {
  const [balance, setBalance] = useState(0)

  const refetch = useCallback(async () => {
    invalidateCachedGet('/api/users/me')
    const res = await cachedApiGet('/api/users/me')
    if (res.status !== 200 || res.data == null) {
      return
    }
    const raw = res.data as Partial<MeBalance>
    const n = parseBalanceField(raw.balance)
    if (n != null) {
      setBalance(n)
    }
  }, [])

  /** При первом монтировании подтягивает баланс из кеша (или сети) без лишнего сброса кеша. */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await cachedApiGet('/api/users/me')
      if (cancelled || res.status !== 200 || res.data == null) {
        return
      }
      const raw = res.data as Partial<MeBalance>
      const n = parseBalanceField(raw.balance)
      if (n != null) {
        setBalance(n)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { balance, refetch }
}
