// Загрузка /api/users/me, выход и вспомогательные действия экрана профиля.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../../../auth/apiClient'
import { clearTokens, getRefreshToken } from '../../../../../auth/authStorage'
import { cachedApiGet, invalidateCachedGet } from '../../AppShell/appBootstrapCache'
import type { Me } from '../types/profilePage.types'

/** Состояние профиля: данные с API, баланс из me.balance, выход и ссылки. */
export function useProfilePage() {
  const navigate = useNavigate()
  const [me, setMe] = useState<Me | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [careOpen, setCareOpen] = useState(false)
  const [isTopUpOpen, setIsTopUpOpen] = useState(false)

  const balance = me?.balance ?? 0

  useEffect(() => {
    let ok = true
    void (async () => {
      const res = await cachedApiGet('/api/users/me')
      if (!ok) return
      if (res.status === 401) {
        clearTokens()
        navigate('/login', { replace: true })
        return
      }
      if (res.status !== 200) {
        setErr('Не удалось загрузить профиль.')
        setLoading(false)
        return
      }
      setMe(res.data as Me)
      setLoading(false)
    })()
    return () => {
      ok = false
    }
  }, [navigate])

  /** Сбрасывает кеш и снова подгружает /api/users/me (например после возврата с оплаты). */
  const reloadProfile = useCallback(async () => {
    invalidateCachedGet('/api/users/me')
    const res = await cachedApiGet('/api/users/me')
    if (res.status === 401) {
      clearTokens()
      navigate('/login', { replace: true })
      return
    }
    if (res.status === 200 && res.data != null) {
      setMe(res.data as Me)
    }
  }, [navigate])

  /** Выполняет выход пользователя и очищает локальные токены. */
  async function logout() {
    const r = getRefreshToken()
    if (r) {
      await api.post('/api/auth/logout', { refresh_token: r })
    }
    clearTokens()
    navigate('/', { replace: true })
  }

  /** Открывает ссылку службы заботы в новой вкладке или почтовом клиенте. */
  function openCareLink(url: string) {
    if (url.startsWith('mailto:')) {
      window.location.href = url
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return {
    me,
    err,
    loading,
    careOpen,
    setCareOpen,
    isTopUpOpen,
    setIsTopUpOpen,
    balance,
    logout,
    openCareLink,
    reloadProfile,
  }
}
