// Модальное окно со списком шаблонов выбранной подборки на главной.

import type { Template } from '../types/library'
import type { LibraryPickCard } from '../types/libraryPage.types'
import { libraryApi } from '../services/libraryApi'
import { CategoryLoadingWave } from './CategoryLoadingWave'

type LibraryPickModalProps = {
  openedPickCard: LibraryPickCard
  allTemplatesLoading: boolean
  openedPickTemplates: Template[]
  openedPickMissingIds: string[]
  onClose: () => void
  onTemplateClick: (template: Template) => void
}

/** Показывает лист подборки поверх ленты с затемнённым фоном. */
export function LibraryPickModal({
  openedPickCard,
  allTemplatesLoading,
  openedPickTemplates,
  openedPickMissingIds,
  onClose,
  onTemplateClick,
}: LibraryPickModalProps) {
  return (
    <section
      className="library-pick-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Подборка ${openedPickCard.title}`}
    >
      <div className="library-pick-modal__backdrop" onClick={onClose} />
      <div className="library-pick-modal__sheet">
        <div className="library-pick-modal__header">
          <h3 className="library-pick-modal__title">{openedPickCard.title}</h3>
          <button type="button" className="library-pick-modal__close" onClick={onClose} aria-label="Закрыть подборку">
            ×
          </button>
        </div>
        {allTemplatesLoading && openedPickTemplates.length === 0 ? <CategoryLoadingWave /> : null}
        {!allTemplatesLoading && openedPickTemplates.length === 0 ? (
          <p className="library-results-panel__state">В этой подборке пока нет доступных фото.</p>
        ) : null}
        {openedPickMissingIds.length > 0 ? (
          <p className="library-results-panel__state">Не найдены id: {openedPickMissingIds.join(', ')}</p>
        ) : null}
        <div className="library-pick-modal__list">
          {openedPickTemplates.map((template) => (
            <button
              key={`pick-item-${openedPickCard.id}-${template.id}`}
              type="button"
              className="library-pick-modal__item"
              onClick={() => onTemplateClick(template)}
            >
              <img src={libraryApi.getImageUrl(template.image)} alt={template.title} loading="lazy" />
              <span className="library-pick-modal__item-title">{template.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
