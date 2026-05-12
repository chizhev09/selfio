// Сетка подборки «Красный дерзкий» после «Летний вайб».

import type { Template } from '../types/library'
import { libraryApi } from '../services/libraryApi'

type LibraryRedDaringGridProps = {
  items: Template[]
  onTemplateClick: (template: Template) => void
}

/** Рендерит сетку превью «Красный дерзкий» в том же ритме, что и соседние подборки. */
export function LibraryRedDaringGrid({ items, onTemplateClick }: LibraryRedDaringGridProps) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="library-red-daring" aria-label="Красный дерзкий">
      <h2 className="library-red-daring__title">Красный дерзкий</h2>
      <div className="library-red-daring__grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="library-red-daring__cell"
            onClick={() => onTemplateClick(item)}
          >
            <img src={libraryApi.getImageUrl(item.image)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  )
}
