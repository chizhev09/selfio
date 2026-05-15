// WebP из Media лендинга для коллажа входа — подгружаются только при открытии модалки.
const modules = import.meta.glob<{ default: string }>('../Media/**/*.webp')

let cachedPool: string[] | null = null
let loadPromise: Promise<string[]> | null = null

/** Возвращает пул URL для случайного коллажа над формой входа. */
export function loadAuthHeroCollagePool(): Promise<string[]> {
  if (cachedPool) {
    return Promise.resolve(cachedPool)
  }
  if (!loadPromise) {
    loadPromise = (async () => {
      const mods = await Promise.all(Object.values(modules).map((loader) => loader()))
      cachedPool = mods.map((m) => m.default)
      return cachedPool
    })()
  }
  return loadPromise
}
