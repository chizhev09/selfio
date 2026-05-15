// Поэтапная фоновая подгрузка лендинга: сначала hero, затем авторизация, затем блок библиотеки.

export type LandingPrefetchHandlers = {
  /** Карусель под героем готова к показу. */
  onCarouselReady?: () => void
  /** Чанк модалки входа и коллаж прогреты. */
  onAuthReady?: () => void
  /** Чанк нижней части лендинга и превью коллажей прогреты. */
  onLibraryReady?: () => void
}

/** Откладывает задачу до простоя main thread (с запасным таймаутом). */
function runWhenIdle(task: () => void | Promise<void>, timeoutMs = 3500): void {
  const run = () => {
    void task()
  }
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: timeoutMs })
  } else {
    window.setTimeout(run, 1200)
  }
}

/** Пауза между этапами фоновой загрузки. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** Прогревает в браузере список URL картинок. */
function preloadImages(urls: readonly string[], limit: number): void {
  for (const url of urls.slice(0, limit)) {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
  }
}

/** Подгружает чанк карусели героя. */
export async function prefetchHeroCarousel(): Promise<void> {
  await import('./LandingHeroCarousel')
}

/** Подгружает модалку входа и webp для коллажа над формой. */
export async function prefetchAuthModal(): Promise<void> {
  const [, authMedia] = await Promise.all([
    import('./auth/AuthFullscreenModal'),
    import('./auth/authHeroCollageMedia'),
  ])
  const pool = await authMedia.loadAuthHeroCollagePool()
  preloadImages(pool, 10)
}

/** Подгружает секцию библиотеки на лендинге и её webp-коллажи. */
export async function prefetchLandingLibrarySection(): Promise<void> {
  const [, libraryMedia] = await Promise.all([
    import('./LandingPageBelowFold'),
    import('./libraryMedia'),
  ])
  const byNum = await libraryMedia.loadLibraryUrlByNumber()
  preloadImages([...byNum.values()], 14)
}

/**
 * Цепочка после первого кадра: карусель → авторизация → библиотека.
 * Возвращает отмену, если пользователь ушёл со страницы.
 */
export function scheduleLandingBackgroundLoads(
  handlers: LandingPrefetchHandlers = {},
): () => void {
  let cancelled = false

  runWhenIdle(async () => {
    await delay(400)
    if (cancelled) return
    await prefetchHeroCarousel()
    if (cancelled) return
    handlers.onCarouselReady?.()

    await delay(500)
    if (cancelled) return
    await prefetchAuthModal()
    if (cancelled) return
    handlers.onAuthReady?.()

    await delay(500)
    if (cancelled) return
    await prefetchLandingLibrarySection()
    if (cancelled) return
    handlers.onLibraryReady?.()
  })

  return () => {
    cancelled = true
  }
}
