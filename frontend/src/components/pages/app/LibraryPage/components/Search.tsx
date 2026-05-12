// Search input for the library header.
import type { ChangeEvent } from 'react'
import { Search as SearchIcon } from 'lucide-react'

interface SearchProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}

/** Рендерит строку поиска и делегирует состояние родительскому компоненту. */
export function Search({ value, onChange, onClear }: SearchProps) {
  /** Передаёт ввод пользователя в общий поисковый state страницы. */
  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value)
  }

  return (
    <div className="library-search">
      <div className="library-search__input-wrap">
        <SearchIcon size={18} strokeWidth={1.5} />
        <input
          type="search"
          value={value}
          onChange={onInputChange}
          placeholder="Поиск по названию или тегу..."
        />
        {value ? (
          <button type="button" className="library-search__clear" onClick={onClear} aria-label="Очистить поиск">
            x
          </button>
        ) : null}
      </div>
    </div>
  )
}