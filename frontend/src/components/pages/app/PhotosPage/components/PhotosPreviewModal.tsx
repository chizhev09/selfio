// Полноэкранный предпросмотр одного фото с затемнением фона.

import { X } from 'lucide-react'
import type { PhotoItem } from '../types/photosPage.types'

type PhotosPreviewModalProps = {
  photo: PhotoItem
  onClose: () => void
}

/** Показывает выбранное фото в модальном слое поверх списка. */
export function PhotosPreviewModal({ photo, onClose }: PhotosPreviewModalProps) {
  return (
    <div className="photos-preview" role="dialog" aria-modal="true" aria-label="Просмотр фото" onClick={onClose}>
      <div className="photos-preview__card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="photos-preview__close" aria-label="Закрыть просмотр" onClick={onClose}>
          <X size={18} />
        </button>
        <img className="photos-preview__img" src={photo.view_url} alt={photo.original_filename ?? photo.object_key} />
      </div>
    </div>
  )
}
