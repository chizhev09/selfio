// Вкладка «Мои фото»: подзаголовок, сетка результатов и модалка предпросмотра.
import '../AppShell/appTab.css'
import { PhotosGrid } from './components/PhotosGrid'
import { PhotosPreviewModal } from './components/PhotosPreviewModal'
import { usePhotosPage } from './hooks/usePhotosPage'
import './AppPhotosPage.css'

/** Собирает экран «Мои фото» из хука и презентационных компонентов. */
function PhotosPage() {
  const p = usePhotosPage()
  const showGrid = p.pendingGenerations.length > 0 || (p.items?.length ?? 0) > 0

  return (
    <>
      <p className="app-screen-subtitle">Здесь хранятся ваши генерации, готовые к скачиванию и редактированию.</p>

      {p.errText ? <p className="photos-page__err">{p.errText}</p> : null}

      {p.items === null ? <p className="app-tab__p">Загрузка…</p> : null}

      {p.items && p.items.length === 0 && !p.errText ? <p className="app-tab__p">Пока нет загруженных фото.</p> : null}

      {showGrid ? (
        <PhotosGrid
          items={p.items ?? []}
          pendingGenerations={p.pendingGenerations}
          pendingDownloadId={p.pendingDownloadId}
          pendingDeleteId={p.pendingDeleteId}
          onOpenPreview={p.handleOpenPreview}
          onDownload={p.handleDownloadPhoto}
          onDelete={p.handleDeletePhoto}
        />
      ) : null}

      {p.previewPhoto ? <PhotosPreviewModal photo={p.previewPhoto} onClose={p.handleClosePreview} /> : null}
    </>
  )
}

export default PhotosPage
