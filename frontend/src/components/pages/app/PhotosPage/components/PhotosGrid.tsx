// Сетка карточек: плейсхолдеры генераций и готовые фото с действиями.

import { Download, Pencil, Trash2 } from 'lucide-react'
import type { PendingGenerationItem, PhotoItem } from '../types/photosPage.types'

type PhotosGridProps = {
  items: PhotoItem[]
  pendingGenerations: PendingGenerationItem[]
  pendingDownloadId: string | null
  pendingDeleteId: string | null
  onOpenPreview: (photo: PhotoItem) => void
  onDownload: (photo: PhotoItem) => void
  onDelete: (photo: PhotoItem) => void
}

/** Рендерит сетку превью с плейсхолдерами ожидания и кнопками скачать/удалить. */
export function PhotosGrid({
  items,
  pendingGenerations,
  pendingDownloadId,
  pendingDeleteId,
  onOpenPreview,
  onDownload,
  onDelete,
}: PhotosGridProps) {
  return (
    <ul className="photos-grid">
      {pendingGenerations.map((pending) => (
        <li key={pending.placeholderId} className="photos-grid__cell photos-grid__cell--placeholder">
          <div className="photos-grid__placeholder-photo" aria-label="Генерация в процессе">
            <div className="photos-grid__wave" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </li>
      ))}
      {items.map((p) => (
        <li key={p.id} className="photos-grid__cell">
          <button
            type="button"
            className="photos-grid__preview-btn"
            aria-label="Открыть фото"
            onClick={() => onOpenPreview(p)}
          >
            <img className="photos-grid__img" src={p.view_url} alt={p.original_filename ?? p.object_key} loading="lazy" />
          </button>
          <div className="photos-grid__actions">
            <button
              type="button"
              className="photos-grid__action photos-grid__action--download"
              aria-label="Скачать фото"
              title="Скачать"
              onClick={() => void onDownload(p)}
              disabled={pendingDownloadId === p.id}
            >
              <Download className="photos-grid__icon" aria-hidden="true" />
            </button>
            <button type="button" className="photos-grid__action photos-grid__action--effects" aria-label="Карандаш" title="Карандаш">
              <Pencil className="photos-grid__icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="photos-grid__action photos-grid__action--delete"
              aria-label="Удалить фото"
              title="Удалить"
              onClick={() => void onDelete(p)}
              disabled={pendingDeleteId === p.id}
            >
              <Trash2 className="photos-grid__icon" aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
