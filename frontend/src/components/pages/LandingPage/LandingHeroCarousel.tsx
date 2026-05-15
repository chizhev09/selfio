// Карусель примеров под героем — отдельный чанк с кадрами karusel.
import { useEffect, useState } from 'react'

/** Бегущая лента снимков; кадры подгружаются динамическим импортом. */
function LandingHeroCarousel() {
  const [track, setTrack] = useState<readonly string[]>([])

  useEffect(() => {
    let cancelled = false
    void import('./landingKaruselMedia').then((mod) => {
      if (!cancelled) {
        setTrack(mod.karuselTrack)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (track.length === 0) {
    return <div className="landing-page__carousel-outer landing-page__carousel-outer--placeholder" aria-hidden />
  }

  const doubled = [...track, ...track]

  return (
    <div className="landing-page__carousel-outer">
      <div className="landing-page__carousel-track landing-page__carousel-track--scroll">
        {doubled.map((photo, index) => (
          <img
            key={`karusel-${index}-${String(photo).slice(0, 48)}`}
            src={photo}
            alt={`Пример работы ${(index % track.length) + 1}`}
            className="landing-page__carousel-img"
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>
    </div>
  )
}

export default LandingHeroCarousel

