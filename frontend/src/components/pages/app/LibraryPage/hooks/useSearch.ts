// Debounced search state for the library page search UI.
import { useState, useCallback, useRef, useEffect } from 'react'
import { libraryApi } from '../services/libraryApi'
import type { SearchResult } from '../types/library'

/** Управляет поиском по библиотеке с debounce и состояниями загрузки/ошибок. */
export function useSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery)
  const [searchResult, setSearchResult] = useState<SearchResult>({ exact: null, similar: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Выполняет запрос поиска и сохраняет результат. */
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResult({ exact: null, similar: [] })
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await libraryApi.searchTemplates(searchQuery)
      setSearchResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setSearchResult({ exact: null, similar: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  /** Обновляет строку поиска и откладывает запрос, чтобы не спамить сетью. */
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value)

      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }

      debounceTimeout.current = setTimeout(() => {
        void performSearch(value)
      }, 300)
    },
    [performSearch],
  )

  /** Очищает поиск и сбрасывает найденные значения. */
  const clearSearch = useCallback(() => {
    setQuery('')
    setSearchResult({ exact: null, similar: [] })
    setError(null)
  }, [])

  useEffect(() => {
    if (initialQuery.trim()) {
      void performSearch(initialQuery)
    }
    // initialQuery читается только при первом маунте, чтобы восстановить состояние поиска.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    /** Очищает таймер debounce при размонтировании компонента. */
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [])

  return {
    query,
    searchResult,
    loading,
    error,
    handleSearch,
    clearSearch,
  }
}