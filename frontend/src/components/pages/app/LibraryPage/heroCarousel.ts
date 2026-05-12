// Fetches and caches the hero carousel manifest from /api/storage/hero-carousel for the library screen.
// Публичный манифест hiro_carousel: один fetch для герой-карусели в библиотеке.
export type HeroCarouselApiItem = {
  id: string
  cover_url: string
  cover_object_key: string
  photoIds: string[]
}

export type HeroCarouselApiResponse = {
  version: number
  collections: HeroCarouselApiItem[]
}

let cachedHeroCarousel: HeroCarouselApiResponse | null = null
let heroCarouselInflight: Promise<HeroCarouselApiResponse | null> | null = null

/** Возвращает кэш карусели из памяти, если он уже заполнен. */
export function getCachedHeroCarousel(): HeroCarouselApiResponse | null {
  return cachedHeroCarousel
}

/** Загружает JSON с бэка; при ошибке сети или не-200 возвращает null. */
export async function fetchHeroCarousel(): Promise<HeroCarouselApiResponse | null> {
  if (cachedHeroCarousel) return cachedHeroCarousel
  if (heroCarouselInflight) return heroCarouselInflight

  heroCarouselInflight = (async () => {
    try {
      const res = await fetch('/api/storage/hero-carousel', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        return null
      }
      const parsed = (await res.json()) as HeroCarouselApiResponse
      cachedHeroCarousel = parsed
      return parsed
    } catch {
      return null
    } finally {
      heroCarouselInflight = null
    }
  })()

  return heroCarouselInflight
}
