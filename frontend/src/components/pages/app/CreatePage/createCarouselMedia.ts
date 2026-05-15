// Картинки для карусели «Создать»: webp из папки Media.
const carouselImageModules = import.meta.glob<string>('./Media/*.webp', {
  eager: true,
  import: 'default',
})

let cachedCarouselUrls: string[] | null = null

/** Один раз собирает URL из glob и кеширует — без повторного обхода при каждом заходе на вкладку. */
export function getCreateCarouselPhotoUrls(): string[] {
  if (cachedCarouselUrls) {
    return cachedCarouselUrls
  }

  cachedCarouselUrls = Object.entries(carouselImageModules)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map(([, url]) => url)

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
