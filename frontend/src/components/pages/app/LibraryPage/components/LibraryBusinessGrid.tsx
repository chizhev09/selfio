// Сетка 3×3 категории «Бизнес» под «Популярное».

import { useMemo } from 'react'
import type { Template } from '../types/library'
import { libraryApi } from '../services/libraryApi'
import { businessTemplatesForGrid } from '../utils/libraryPageUtils'

type LibraryBusinessGridProps = {
  templates: Template[]
  onTemplateClick: (template: Template) => void
}

/** Сетка 3×3 под «Популярное»: превью категории «Бизнес», клик открывает генерацию как у остальных карточек. */
export function LibraryBusinessGrid({ templates, onTemplateClick }: LibraryBusinessGridProps) {
  const items = useMemo(() => businessTemplatesForGrid(templates), [templates])
  if (items.length === 0) {
    return null
  }
  return (
    <section className="library-business-grid" aria-label="Бизнес">
      <h2 className="library-business-grid__title">Бизнес</h2>
      <div className="library-business-grid__grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="library-business-grid__cell"
            onClick={() => onTemplateClick(item)}
          >
            <img src={libraryApi.getImageUrl(item.image)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  )
}
