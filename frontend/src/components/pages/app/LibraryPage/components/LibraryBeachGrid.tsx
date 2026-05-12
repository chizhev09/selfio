// Curated grid «Пляж» after «Дома»: four columns, templates matched by id and title.

import type { Template } from '../types/library'
import { libraryApi } from '../services/libraryApi'

type LibraryBeachGridProps = {
  items: Template[]
  onTemplateClick: (template: Template) => void
}

/** Рисует сетку «Пляж» (4 колонки); по клику открывается генерация по шаблону. */
export function LibraryBeachGrid({ items, onTemplateClick }: LibraryBeachGridProps) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="library-beach" aria-label="Пляж">
      <h2 className="library-beach__title">Пляж</h2>
      <div className="library-beach__grid">
        {items.map((item) => (
          <button
            key={`${item.id}-${item.title}`}
            type="button"
            className="library-beach__cell"
            onClick={() => onTemplateClick(item)}
          >
            <img src={libraryApi.getImageUrl(item.image)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  )
}
