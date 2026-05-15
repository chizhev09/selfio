// Типы и константы коллажей библиотеки на лендинге (без импорта картинок).
export type LibraryCollageSpec = {
  readonly caption: string
  readonly photoNums: readonly [number, number, number]
}

/**
 * Шесть коллажей для лендинга: подпись и три номера снимка.
 * Меняйте photoNums, если файлы не совпадают с темой.
 */
export const libraryCollageSpecs: readonly LibraryCollageSpec[] = [
  { caption: 'Фото на документы', photoNums: [1, 2, 3] },
  { caption: 'Семейная фотосессия', photoNums: [4, 5, 6] },
  { caption: 'Деловой портрет', photoNums: [7, 8, 9] },
  { caption: 'Романтика и пара', photoNums: [10, 11, 12] },
  { caption: 'Образ для соцсетей', photoNums: [13, 14, 15] },
  { caption: 'Художественный портрет', photoNums: [16, 17, 18] },
] as const
