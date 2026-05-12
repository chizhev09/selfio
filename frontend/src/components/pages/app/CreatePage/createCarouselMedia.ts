// Картинки для карусели «Создать»: все файлы из папки Media (jpg/png/webp и т.д.).

let cachedCarouselUrls: string[] | null = null

/** Один раз собирает URL из glob и кеширует — без повторного обхода при каждом заходе на вкладку. */
export function getCreateCarouselPhotoUrls(): string[] {
  if (cachedCarouselUrls) {
    return cachedCarouselUrls
  }
  const modules = import.meta.glob('./Media/**/*.{jpg,jpeg,png,webp,gif}', {
    eager: true,
    import: 'default',
  }) as Record<string, string>

  cachedCarouselUrls = Object.keys(modules)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map((path) => modules[path])
  return cachedCarouselUrls
}

/** Стартует фоновую загрузку картинок в кеш браузера при входе в /app, чтобы карусель не догружалась с нуля. */
export function primeCreateCarouselImages(): void {
  const urls = getCreateCarouselPhotoUrls()
  for (const url of urls) {
    const img = new Image()
    img.src = url
  }
}
