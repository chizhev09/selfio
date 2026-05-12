// Три горизонтальные рельсы подборок с превью 2×2.

import { LIBRARY_PICKS_RAILS } from '../constants/libraryPageConstants'
import type { LibraryPickCard } from '../types/libraryPage.types'

type LibraryPicksProps = {
  onPickOpen: (card: LibraryPickCard) => void
  resolvePickImageById: (pickCardId: string, templateId: string) => string | null
}

/** Рендерит горизонтальные подборки с превью 2×2 и поисковой подсказкой по клику. */
export function LibraryPicks({ onPickOpen, resolvePickImageById }: LibraryPicksProps) {
  /** Собирает до четырёх URL превью для одной карточки подборки. */
  function resolveCardPreviewSources(card: LibraryPickCard): string[] {
    const resolved =
      card.templateIds
        ?.map((templateId) => resolvePickImageById(card.id, templateId))
        .filter((src): src is string => Boolean(src)) || []
    return resolved.slice(0, 4)
  }

  return (
    <section className="library-picks" aria-label="Подборки">
      {LIBRARY_PICKS_RAILS.map((rail) => (
        <div key={rail.id} className="library-picks__rail">
          <h2 className="library-picks__rail-title">{rail.title}</h2>
          <div className="library-picks__scroller">
            {rail.cards
              .map((card) => ({ card, previewSources: resolveCardPreviewSources(card) }))
              .filter(({ previewSources }) => previewSources.length > 0)
              .map(({ card, previewSources }) => (
                <button
                  key={card.id}
                  type="button"
                  className="library-picks__card"
                  onClick={() => onPickOpen(card)}
                >
                  <div className="library-picks__grid" aria-hidden>
                    {previewSources.map((src, i) => (
                      <img key={`${card.id}-img-${i}`} src={src} alt="" loading="lazy" />
                    ))}
                  </div>
                  <span className="library-picks__card-title">{card.title}</span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </section>
  )
}
