// Curated grid "В парке" after summer vibe: four columns, id+title resolved templates.

import type { Template } from '../types/library'
import { libraryApi } from '../services/libraryApi'

type LibraryInParkGridProps = {
  items: Template[]
  onTemplateClick: (template: Template) => void
}

/** Рендерит сетку «В парке» (4 колонки), клик открывает генерацию по шаблону. */
export function LibraryInParkGrid({ items, onTemplateClick }: LibraryInParkGridProps) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="library-in-park" aria-label="В парке">
      <h2 className="library-in-park__title">В парке</h2>
      <div className="library-in-park__grid">
        {items.map((item) => (
          <button
            key={`${item.id}-${item.title}`}
            type="button"
            className="library-in-park__cell"
            onClick={() => onTemplateClick(item)}
          >
            <img src={libraryApi.getImageUrl(item.image)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  )
}
