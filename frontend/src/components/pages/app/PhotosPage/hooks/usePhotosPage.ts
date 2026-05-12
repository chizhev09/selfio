// Логика вкладки «Мои фото»: загрузка списка, плейсхолдеры генераций, скачивание и удаление.

import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../../../../auth/apiClient'
import { messageFromErrorResponse } from '../../../LandingPage/auth/messageFromErrorResponse'
import { cachedApiGet, invalidateCachedGet } from '../../AppShell/appBootstrapCache'
import type {
  GenerationStatusJson,
  MyPhotosJson,
  PhotoItem,
  PhotosPageNavState,
  PendingGenerationItem,
} from '../types/photosPage.types'
import { appendPendingGeneration, readPendingGenerations, writePendingGenerations } from '../utils/pendingGenerationsStorage'

/** Состояние и обработчики экрана «Мои фото». */
export function usePhotosPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState<PhotoItem[] | null>(null)
  const [errText, setErrText] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingDownloadId, setPendingDownloadId] = useState<string | null>(null)
  const [pendingGenerations, setPendingGenerations] = useState<PendingGenerationItem[]>(() => readPendingGenerations())
  const [previewPhoto, setPreviewPhoto] = useState<PhotoItem | null>(null)

  /** Загружает и раскладывает список «мои фото» из кеша bootstrap-запросов. */
  const loadPhotos = useCallback(async (cancelledRef: { cancelled: boolean }) => {
    setErrText(null)
    const res = await cachedApiGet('/api/storage/my-photos')
    if (cancelledRef.cancelled) {
      return
    }
    if (res.status !== 200) {
      setErrText(messageFromErrorResponse(res))
      setItems([])
      return
    }
    const data = res.data as MyPhotosJson
    setItems(Array.isArray(data.items) ? data.items : [])
  }, [])

  useEffect(() => {
    const cancelledRef = { cancelled: false }
    void loadPhotos(cancelledRef)
    return () => {
      cancelledRef.cancelled = true
    }
  }, [loadPhotos])

  useEffect(() => {
    /** Подмешивает новую генерацию из навигации и очищает transient state маршрута. */
    const navState = (location.state ?? null) as PhotosPageNavState
    const requestId = navState?.pendingGeneration?.requestId
    if (!requestId) return
    setPendingGenerations((prev) => {
      const next = appendPendingGeneration(prev, requestId)
      writePendingGenerations(next)
      return next
    })
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    /** Периодически проверяет статусы генераций и заменяет плейсхолдеры готовыми фото. */
    if (pendingGenerations.length === 0) {
      return
    }
    let disposed = false
    const timer = window.setInterval(() => {
      void (async () => {
        const snapshot = [...pendingGenerations]
        let next = snapshot
        let shouldRefreshPhotos = false
        for (const pending of snapshot) {
          const statusRes = await apiFetch(`/api/storage/generate-from-template/${pending.requestId}`, { method: 'GET' })
          if (statusRes.status !== 200) {
            continue
          }
          const data = statusRes.data as GenerationStatusJson
          if (data.status === 'done') {
            shouldRefreshPhotos = true
            next = next.filter((item) => item.requestId !== pending.requestId)
          }
          if (data.status === 'failed') {
            next = next.filter((item) => item.requestId !== pending.requestId)
            setErrText(data.error || 'Одна из генераций завершилась с ошибкой.')
          }
        }
        if (disposed) return
        if (next.length !== snapshot.length) {
          setPendingGenerations(next)
          writePendingGenerations(next)
        }
        if (shouldRefreshPhotos) {
          invalidateCachedGet('/api/storage/my-photos')
          await loadPhotos({ cancelled: false })
        }
      })()
    }, 2000)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [loadPhotos, pendingGenerations])

  /** Скачивает фото через backend, чтобы избежать CORS ограничений S3. */
  async function handleDownloadPhoto(photo: PhotoItem) {
    if (pendingDownloadId !== null) {
      return
    }
    setErrText(null)
    setPendingDownloadId(photo.id)
    try {
      const res = await apiFetch('/api/storage/my-photos/download', {
        method: 'GET',
        params: { object_key: photo.object_key },
        responseType: 'blob',
      })
      if (res.status !== 200) {
        setErrText(messageFromErrorResponse(res))
        return
      }
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data])
      const objectUrl = URL.createObjectURL(blob)
      const fileName = photo.original_filename ?? photo.object_key.split('/').pop() ?? 'photo.jpg'
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setErrText('Не удалось скачать фото.')
    } finally {
      setPendingDownloadId(null)
    }
  }

  /** Удаляет фото из S3 и убирает элемент из списка после успешного ответа API. */
  async function handleDeletePhoto(photo: PhotoItem) {
    if (pendingDeleteId !== null) {
      return
    }
    setErrText(null)
    setPendingDeleteId(photo.id)
    const res = await apiFetch('/api/storage/my-photos', {
      method: 'DELETE',
      data: { object_key: photo.object_key },
    })
    if (res.status !== 200) {
      setErrText(messageFromErrorResponse(res))
      setPendingDeleteId(null)
      return
    }
    invalidateCachedGet('/api/storage/my-photos')
    setItems((prev) => (prev ? prev.filter((item) => item.id !== photo.id) : prev))
    setPendingDeleteId(null)
  }

  /** Открывает фото в компактном модальном окне поверх затемнённого фона. */
  function handleOpenPreview(photo: PhotoItem) {
    setPreviewPhoto(photo)
  }

  /** Закрывает модальное окно предпросмотра фото. */
  function handleClosePreview() {
    setPreviewPhoto(null)
  }

  return {
    items,
    errText,
    pendingDeleteId,
    pendingDownloadId,
    pendingGenerations,
    previewPhoto,
    handleDownloadPhoto,
    handleDeletePhoto,
    handleOpenPreview,
    handleClosePreview,
  }
}
