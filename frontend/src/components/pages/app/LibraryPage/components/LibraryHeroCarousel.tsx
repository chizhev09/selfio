// Карусель под шапкой: обложки из API или запасные картинки; тап по кадру открывает категорию по слоту слайда.

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import {
  LIBRARY_HERO_FALLBACK_SLIDES,
  LIBRARY_HERO_SLIDE_CATEGORY_BY_INDEX,
} from '../constants/libraryPageConstants'
import { fetchHeroCarousel, getCachedHeroCarousel } from '../heroCarousel'
import type { LibraryHeroSlide } from '../types/libraryPage.types'
import { mapHeroSlidesFromApi } from '../utils/libraryPageUtils'

type LibraryHeroCarouselProps = {
  /** Переключает чип категории при тапе по видимому слайду (индекс 0 — первое фото в карусели). */
  onOpenCategory?: (categoryName: string) => void
}

/** Карусель под липкой шапкой: при первом заходе — шимер, затем обложки API или Unsplash. */
export function LibraryHeroCarousel({ onOpenCategory }: LibraryHeroCarouselProps) {
  const primedSlides = mapHeroSlidesFromApi(getCachedHeroCarousel())
  const heroPrimedOnMount = primedSlides.length > 0

  const [slides, setSlides] = useState<LibraryHeroSlide[]>(() => (heroPrimedOnMount ? primedSlides : []))
  const [heroReady, setHeroReady] = useState(heroPrimedOnMount)
  const [activeSlide, setActiveSlide] = useState(0)

  const categoryForActiveSlide = LIBRARY_HERO_SLIDE_CATEGORY_BY_INDEX[activeSlide]
  const canOpenCategory = Boolean(onOpenCategory && categoryForActiveSlide)

  /** Открывает категорию, привязанную к текущему видимому слайду. */
  const openCategoryForActiveSlide = useCallback(() => {
    if (!onOpenCategory) return
    const name = LIBRARY_HERO_SLIDE_CATEGORY_BY_INDEX[activeSlide]
    if (name) {
      onOpenCategory(name)
    }
  }, [activeSlide, onOpenCategory])

  /** Обрабатывает клавиши Enter/Space на области героя для доступности. */
  function handleViewportKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!canOpenCategory) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openCategoryForActiveSlide()
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const data = await fetchHeroCarousel()
      if (cancelled) {
        return
      }
      const next = mapHeroSlidesFromApi(data)
      setSlides((prev) => {
        if (next.length > 0) return next
        if (prev.length > 0) return prev
        return LIBRARY_HERO_FALLBACK_SLIDES
      })
      setActiveSlide(0)
      setHeroReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!heroReady || slides.length < 1) {
      return
    }
    const n = slides.length
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % n)
    }, 3000)
    return () => {
      window.clearInterval(timer)
    }
  }, [heroReady, slides.length])

  if (!heroReady) {
    return (
      <section
        className="library-hero library-hero--below-header"
        aria-label="Главная карусель библиотеки"
        aria-busy="true"
      >
        <div className="library-hero__viewport library-hero__viewport--skeleton">
          <div className="library-shimmer library-hero__skeleton-glare" aria-hidden />
        </div>
        <div className="library-hero__dots" aria-hidden>
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={`hero-skeleton-dot-${index}`}
              className="library-hero__skeleton-dot library-shimmer"
              style={{ animationDelay: `${index * 0.08}s` }}
            />
          ))}
        </div>
        <span className="library-visually-hidden">Загрузка карусели</span>
      </section>
    )
  }

  return (
    <section className="library-hero library-hero--below-header" aria-label="Главная карусель библиотеки">
      <div
        className={`library-hero__viewport${canOpenCategory ? ' library-hero__viewport--opens-category' : ''}`}
        role={canOpenCategory ? 'button' : undefined}
        tabIndex={canOpenCategory ? 0 : undefined}
        aria-label={
          canOpenCategory && categoryForActiveSlide
            ? `Открыть категорию «${categoryForActiveSlide}»`
            : undefined
        }
        onClick={canOpenCategory ? openCategoryForActiveSlide : undefined}
        onKeyDown={canOpenCategory ? handleViewportKeyDown : undefined}
      >
        {slides.map((slide, index) => (
          <img
            key={slide.id}
            src={slide.src}
            alt=""
            loading={index === 0 ? 'eager' : 'lazy'}
            className={`library-hero__slide ${index === activeSlide ? 'is-active' : ''}`}
            decoding="async"
          />
        ))}
      </div>
      <div className="library-hero__dots" aria-hidden>
        {slides.map((slide, index) => (
          <span
            key={`hero-dot-${slide.id}`}
            className={`library-hero__dot ${index === activeSlide ? 'is-active' : ''}`}
          />
        ))}
      </div>
    </section>
  )
}
