// Типы только для страницы библиотеки: категории индекса, подборки, слайды героя.

/** Одна категория из index.json для чипов; у «Все» index_path равен null. */
export type LibraryIndexCategory = { id: string; name: string; index_path: string | null }

/** Ответ бэкенда при чтении сырого index.json библиотеки. */
export type LibraryIndexApiResponse = {
  categories?: Array<{ id?: string; name?: string; index_path?: string | null }>
}

/** Строка категории после нормализации: у каждой записи есть непустой index_path. */
export type LibraryIndexCategoryRow = { id: string; name: string; index_path: string }

/** Соотношение сторон для задания генерации в модалке. */
export type GenerationAspectRatio = '9:16' | '1:1' | '4:5' | '16:9'

/** Слайд верхней карусели библиотеки. */
export type LibraryHeroSlide = { id: string; src: string }

/** Одна строка курируемой подборки: id в индексе и точное название для различения дублей id. */
export type LibraryCuratedTemplateRow = { id: string; title: string }

/** Карточка статической подборки на главной библиотеки. */
export type LibraryPickCard = {
  id: string
  title: string
  query: string
  templateIds?: string[]
}
