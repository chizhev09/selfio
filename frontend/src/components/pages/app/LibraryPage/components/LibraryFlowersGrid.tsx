// Сетка «С цветами» над лентой «Популярное».

import type { Template } from '../types/library'
import { libraryApi } from '../services/libraryApi'

type LibraryFlowersGridProps = {
  items: Template[]
  onTemplateClick: (template: Template) => void
}

/** Рисует сетку из четырёх колонок с заголовком «С цветами» и открывает генерацию по клику. */
export function LibraryFlowersGrid({ items, onTemplateClick }: LibraryFlowersGridProps) {
  if (items.length === 0) {
    return null
  }
  return (
    <section className="library-flowers-grid" aria-label="С цветами">
      <h2 className="library-flowers-grid__title">С цветами</h2>
      <div className="library-flowers-grid__grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="library-flowers-grid__cell"
            onClick={() => onTemplateClick(item)}
          >
            <img src={libraryApi.getImageUrl(item.image)} alt="" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  )
}
