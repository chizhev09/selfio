// Общие данные для коллажей из папки Media/library: glob картинок, сортировка по номеру в имени, сборка коллажей по таблице.
const libraryImageModules = import.meta.glob<{ default: string }>(
  './Media/library/*.{jpg,jpeg,png,webp}',
  { eager: true }
)

/** Достаёт имя файла из пути (последний сегмент после слэшей). */
function libraryBasename(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  return normalized.split('/').pop() ?? normalized
}

/** Достаёт первое число из имени файла для стабильной сортировки (например p4-… → 4). */
function libraryFileOrder(path: string): number {
  const m = libraryBasename(path).match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

/** Собирает карту «номер в имени файла → URL»; при совпадении номеров побеждает последний путь. */
export function libraryUrlByNumber(): Map<number, string> {
  const map = new Map<number, string>()
  for (const [path, mod] of Object.entries(libraryImageModules)) {
    const n = libraryFileOrder(path)
    if (n > 0) {
      map.set(n, mod.default)
    }
  }
  return map
}

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

/** Собирает только полные коллажи из трёх найденных по номерам URL. */
export function buildLibraryCollagesFromSpecs(
  byNum: Map<number, string>,
  specs: readonly LibraryCollageSpec[]
): { photos: string[]; caption: string }[] {
  const out: { photos: string[]; caption: string }[] = []
  for (const spec of specs) {
    const photos = spec.photoNums.map((n) => byNum.get(n)).filter((u): u is string => u != null)
    if (photos.length === 3) {
      out.push({ photos, caption: spec.caption })
    }
  }
  return out
}
