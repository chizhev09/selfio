// Curated grid «Дома» after «В автомобиле»: four columns, templates matched by id and title.

import type { Template } from '../types/library'
import { libraryApi } from '../services/libraryApi'

type LibraryAtHomeGridProps = {
  items: Template[]
  onTemplateClick: (template: Template) => void
}

/** Рисует сетку «Дома» (4 колонки); по клику открывается генерация по шаблону. */
export function LibraryAtHomeGrid({ items, onTemplateClick }: LibraryAtHomeGridProps) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="library-at-home" aria-label="Дома">
      <h2 className="library-at-home__title">Дома</h2>
      <div className="library-at-home__grid">
        {items.map((item) => (
          <button
            key={`${item.id}-${item.title}`}
            type="button"
            className="library-at-home__cell"
            onClick={() => onTemplateClick(item)}
          >
            <img src={libraryApi.getImageUrl(item.image)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  )
}
