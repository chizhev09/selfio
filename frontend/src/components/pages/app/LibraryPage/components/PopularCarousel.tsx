// Горизонтальная карусель «Популярное» по шаблонам ленты «Все».

import { useEffect, useMemo, useState } from 'react'
import type { Template } from '../types/library'
import { libraryApi } from '../services/libraryApi'
import { randomPopularTemplates } from '../utils/libraryPageUtils'

type PopularCarouselProps = {
  templates: Template[]
  onTemplateClick: (template: Template) => void
}

/** Минималистичная цикличная карусель "Популярное" из 10 фото; клик открывает генерацию по шаблону. */
export function PopularCarousel({ templates, onTemplateClick }: PopularCarouselProps) {
  const slides = useMemo(() => randomPopularTemplates(templates), [templates])
  const [trackIndex, setTrackIndex] = useState(0)
  const [trackAnimated, setTrackAnimated] = useState(true)
  const loopSlides = useMemo(() => [...slides, ...slides], [slides])
  const activeSlide = slides.length > 0 ? trackIndex % slides.length : 0

  useEffect(() => {
    setTrackIndex(0)
    setTrackAnimated(true)
  }, [slides])

  useEffect(() => {
    if (slides.length < 1) {
      return
    }
    const timer = window.setInterval(() => {
      setTrackAnimated(true)
      setTrackIndex((prev) => prev + 1)
    }, 2600)
    return () => {
      window.clearInterval(timer)
    }
  }, [slides.length])

  useEffect(() => {
    if (slides.length < 1 || trackIndex < slides.length) {
      return
    }
    const resetTimer = window.setTimeout(() => {
      setTrackAnimated(false)
      setTrackIndex((prev) => prev % slides.length)
    }, 470)
    return () => {
      window.clearTimeout(resetTimer)
    }
  }, [trackIndex, slides.length])

  return (
    <section className="library-popular" aria-label="Популярное">
      <h2 className="library-popular__title">Популярное</h2>
      <div className="library-popular__scroller" aria-label="Подборка фото">
        <div
          className="library-popular__track"
          style={{
            transform: `translateX(calc(-${trackIndex} * (var(--popular-item-width) + var(--popular-item-gap))))`,
            transition: trackAnimated ? 'transform 460ms ease' : 'none',
          }}
        >
          {loopSlides.map((slide, index) => {
            const normalized = slides.length > 0 ? index % slides.length : 0
            return (
              <button
                key={`${slide.id}-${index}`}
                type="button"
                className={`library-popular__item ${normalized === activeSlide ? 'is-active' : ''}`}
                onClick={() => {
                  setTrackAnimated(true)
                  setTrackIndex(normalized)
                  onTemplateClick(slides[normalized])
                }}
              >
                <img src={libraryApi.getImageUrl(slide.image)} alt="" loading={index < 10 ? 'eager' : 'lazy'} decoding="async" />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
