// Шапка библиотеки: поиск и горизонтальный ряд категорий.

import { LIBRARY_CATEGORY_SKELETON_WIDTHS_REM } from '../constants/libraryPageConstants'
import type { LibraryIndexCategory } from '../types/libraryPage.types'
import { Search } from './Search'

type LibraryHeaderProps = {
  categories: LibraryIndexCategory[]
  isLoading: boolean
  query: string
  showSearch: boolean
  activeCategory: string
  onCategoryPick: (categoryName: string) => void
  onSearchChange: (value: string) => void
  onSearchClear: () => void
}

/** Рендерит шапку библиотеки: поиск и категории (два ряда с горизонтальной прокруткой). */
export function LibraryHeader({
  categories,
  isLoading,
  query,
  showSearch,
  activeCategory,
  onCategoryPick,
  onSearchChange,
  onSearchClear,
}: LibraryHeaderProps) {
  const showCategorySkeletons = isLoading && categories.length > 0

  return (
    <header className="library-header">
      {showSearch ? (
        <div className="library-header__search">
          <Search value={query} onChange={onSearchChange} onClear={onSearchClear} />
        </div>
      ) : null}
      <div
        className="library-header__categories"
        aria-label="Категории библиотеки"
        aria-busy={showCategorySkeletons}
      >
        {categories.length === 0 && !isLoading ? (
          <span className="library-header__category library-header__category--empty">Категории недоступны</span>
        ) : (
          <>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={
                  'library-header__category' +
                  (category.name === activeCategory ? ' library-header__category--active' : '')
                }
                onClick={() => onCategoryPick(category.name)}
              >
                {category.name}
              </button>
            ))}
            {showCategorySkeletons
              ? LIBRARY_CATEGORY_SKELETON_WIDTHS_REM.map((widthRem, index) => (
                  <span
                    key={`library-cat-skeleton-${index}`}
                    className="library-header__category library-header__category--skeleton library-shimmer"
                    style={{
                      width: `${widthRem}rem`,
                      animationDelay: `${index * 0.07}s`,
                    }}
                    aria-hidden
                  />
                ))
              : null}
          </>
        )}
      </div>
    </header>
  )
}
