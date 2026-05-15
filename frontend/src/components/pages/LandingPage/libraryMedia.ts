// Коллажи библиотеки на лендинге: lazy-glob, чтобы не тянуть все превью в первый чанк.
import type { LibraryCollageSpec } from './libraryMediaTypes'

export type { LibraryCollageSpec } from './libraryMediaTypes'
export { libraryCollageSpecs } from './libraryMediaTypes'

const libraryImageModules = import.meta.glob<{ default: string }>('./Media/Library/*.{jpg,jpeg,png,webp}')

let cachedByNum: Map<number, string> | null = null
let loadPromise: Promise<Map<number, string>> | null = null

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

/** Подгружает карту «номер в имени → URL» один раз за сессию. */
export function loadLibraryUrlByNumber(): Promise<Map<number, string>> {
  if (cachedByNum) {
    return Promise.resolve(cachedByNum)
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      const map = new Map<number, string>()
      const entries = await Promise.all(
        Object.entries(libraryImageModules).map(async ([path, loader]) => {
          const mod = await loader()
          return [path, mod.default] as const
        }),
      )
      for (const [path, url] of entries) {
        const n = libraryFileOrder(path)
        if (n > 0) {
          map.set(n, url)
        }
      }
      cachedByNum = map
      return map
    })()
  }
  return loadPromise
}

/** Собирает только полные коллажи из трёх найденных по номерам URL. */
export function buildLibraryCollagesFromSpecs(
  byNum: Map<number, string>,
  specs: readonly LibraryCollageSpec[],
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
