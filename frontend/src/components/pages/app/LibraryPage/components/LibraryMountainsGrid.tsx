// Curated grid «Горы» after «Пляж»: four columns, templates matched by id and title.

import type { Template } from '../types/library'
import { libraryApi } from '../services/libraryApi'

type LibraryMountainsGridProps = {
  items: Template[]
  onTemplateClick: (template: Template) => void
}

/** Рисует сетку «Горы» (4 колонки); по клику открывается генерация по шаблону. */
export function LibraryMountainsGrid({ items, onTemplateClick }: LibraryMountainsGridProps) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="library-mountains" aria-label="Горы">
      <h2 className="library-mountains__title">Горы</h2>
      <div className="library-mountains__grid">
        {items.map((item) => (
          <button
            key={`${item.id}-${item.title}`}
            type="button"
            className="library-mountains__cell"
            onClick={() => onTemplateClick(item)}
          >
            <img src={libraryApi.getImageUrl(item.image)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  )
}
