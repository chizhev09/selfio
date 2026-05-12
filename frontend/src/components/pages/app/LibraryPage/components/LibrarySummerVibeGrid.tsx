// Сетка подборки «Летний вайб» между «С цветами» и «Популярное».

import type { Template } from '../types/library'
import { libraryApi } from '../services/libraryApi'

type LibrarySummerVibeGridProps = {
  items: Template[]
  onTemplateClick: (template: Template) => void
}

/** Рендерит сетку превью «Летний вайб» в том же ритме, что и «С цветами». */
export function LibrarySummerVibeGrid({ items, onTemplateClick }: LibrarySummerVibeGridProps) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="library-summer-vibe" aria-label="Летний вайб">
      <h2 className="library-summer-vibe__title">Летний вайб</h2>
      <div className="library-summer-vibe__grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="library-summer-vibe__cell"
            onClick={() => onTemplateClick(item)}
          >
            <img src={libraryApi.getImageUrl(item.image)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  )
}
