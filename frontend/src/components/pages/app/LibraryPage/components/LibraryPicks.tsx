// Три горизонтальные рельсы подборок с превью 2×2; общий отступ слева у блока — класс library-picks__shell.

import type { KeyboardEvent } from 'react'
import { LIBRARY_PICKS_RAILS } from '../constants/libraryPageConstants'
import type { LibraryPickCard } from '../types/libraryPage.types'

type LibraryPicksProps = {
  onPickOpen: (card: LibraryPickCard) => void
  resolvePickImageById: (pickCardId: string, templateId: string) => string | null
}

/** Открывает карточку по Enter/Space — интерактив через div+role, не нативная кнопка (иначе Safari ломает свайп рельсы). */
function handlePickCardKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  card: LibraryPickCard,
  onOpen: (c: LibraryPickCard) => void,
): void {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }
  event.preventDefault()
  onOpen(card)
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
      <div className="library-picks__shell">
        {LIBRARY_PICKS_RAILS.map((rail) => (
          <div key={rail.id} className="library-picks__rail">
            <h2 className="library-picks__rail-title">{rail.title}</h2>
            <div className="library-picks__scroller">
              {rail.cards
                .map((card) => ({ card, previewSources: resolveCardPreviewSources(card) }))
                .filter(({ previewSources }) => previewSources.length > 0)
                .map(({ card, previewSources }) => (
                  <div
                    key={card.id}
                    role="button"
                    tabIndex={0}
                    className="library-picks__card"
                    aria-label={card.title}
                    onClick={() => onPickOpen(card)}
                    onKeyDown={(e) => handlePickCardKeyDown(e, card, onPickOpen)}
                  >
                    <div className="library-picks__grid" aria-hidden>
                      {previewSources.map((src, i) => (
                        <img key={`${card.id}-img-${i}`} src={src} alt="" loading="lazy" />
                      ))}
                    </div>
                    <span className="library-picks__card-title">{card.title}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
