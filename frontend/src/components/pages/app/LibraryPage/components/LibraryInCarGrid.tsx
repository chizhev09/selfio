// Curated grid «В автомобиле» after «В парке»: four columns, templates matched by id and title.

import type { Template } from '../types/library'
import { libraryApi } from '../services/libraryApi'

type LibraryInCarGridProps = {
  items: Template[]
  onTemplateClick: (template: Template) => void
}

/** Рисует сетку «В автомобиле» (4 колонки); по клику открывается генерация по шаблону. */
export function LibraryInCarGrid({ items, onTemplateClick }: LibraryInCarGridProps) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="library-in-car" aria-label="В автомобиле">
      <h2 className="library-in-car__title">В автомобиле</h2>
      <div className="library-in-car__grid">
        {items.map((item) => (
          <button
            key={`${item.id}-${item.title}`}
            type="button"
            className="library-in-car__cell"
            onClick={() => onTemplateClick(item)}
          >
            <img src={libraryApi.getImageUrl(item.image)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  )
}
