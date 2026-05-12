// Шимер подборок, пока не загружена лента «Все» для превью.

import { LIBRARY_PICKS_RAILS, LIBRARY_PICK_SKELETON_CELL_KEYS } from '../constants/libraryPageConstants'

/** Показывает рельсы «Локации», «Город», «Свежие идеи» с шимером, пока не готова лента «Все». */
export function LibraryPicksSkeleton() {
  return (
    <section className="library-picks" aria-label="Подборки" aria-busy="true">
      {LIBRARY_PICKS_RAILS.map((rail) => (
        <div key={rail.id} className="library-picks__rail">
          <div className="library-picks__rail-title library-picks__rail-title--skeleton library-shimmer" aria-hidden />
          <div className="library-picks__scroller">
            {rail.cards.map((card, cardIndex) => (
              <div key={card.id} className="library-picks__card library-picks__card--skeleton" aria-hidden>
                <div className="library-picks__grid library-picks__grid--skeleton">
                  {LIBRARY_PICK_SKELETON_CELL_KEYS.map((cell) => (
                    <div
                      key={cell}
                      className="library-picks__skeleton-cell library-shimmer"
                      style={{ animationDelay: `${(cardIndex * 4 + cell) * 0.05}s` }}
                    />
                  ))}
                </div>
                <div className="library-picks__card-title library-picks__card-title--skeleton">
                  <span
                    className="library-picks__skeleton-caption library-shimmer"
                    style={{ animationDelay: `${cardIndex * 0.09}s` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <span className="library-visually-hidden">Загрузка подборок</span>
    </section>
  )
}
