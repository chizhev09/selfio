// Два вращающихся кольца превью из локальных URL карусели.

import { useMemo } from 'react'
import { CREATE_ARC_INNER_COUNT, CREATE_ARC_OUTER_COUNT } from '../constants/createPageConstants'
import { createArcSpokeAngles } from '../utils/createArcGeometry'

type CreatePageArcCarouselProps = {
  carouselUrls: string[]
}

/** Рисует двойную дугу с фото из Media (или пустые заглушки, если список пуст). */
export function CreatePageArcCarousel({ carouselUrls }: CreatePageArcCarouselProps) {
  /** URL фото для внутреннего слота (по кругу из папки Media). */
  function innerPhotoSrc(i: number): string | null {
    if (carouselUrls.length === 0) {
      return null
    }
    return carouselUrls[i % carouselUrls.length]
  }

  /** URL фото для внешнего слота со смещением относительно внутреннего ряда. */
  function outerPhotoSrc(i: number): string | null {
    if (carouselUrls.length === 0) {
      return null
    }
    return carouselUrls[(i + Math.floor(carouselUrls.length / 2)) % carouselUrls.length]
  }

  const innerAngles = useMemo(() => createArcSpokeAngles(CREATE_ARC_INNER_COUNT), [])

  /** Внешнее кольцо со сдвигом на полшага, чтобы лучи не совпадали с внутренними. */
  const outerAngles = useMemo(
    () => createArcSpokeAngles(CREATE_ARC_OUTER_COUNT).map((deg) => deg + 360 / (2 * CREATE_ARC_OUTER_COUNT)),
    [],
  )

  return (
    <div className="create-page__cell create-page__cell--carousel">
      <div className="create-arc" aria-label="Карусель фото, два кольца" role="presentation">
        <div className="create-arc__clip">
          <div className="create-arc__spin">
            {innerAngles.map((deg, i) => {
              const src = innerPhotoSrc(i)
              return (
                <div
                  key={`arc-in-${i}`}
                  className="create-arc__spoke create-arc__spoke--inner"
                  style={{ ['--spoke-deg' as string]: `${deg}deg` }}
                >
                  <div className={`create-arc__plug${src ? ' create-arc__plug--photo' : ''}`}>
                    {src ? (
                      <img
                        className="create-arc__plug-img"
                        src={src}
                        alt=""
                        draggable={false}
                        loading="eager"
                        decoding="async"
                      />
                    ) : null}
                  </div>
                </div>
              )
            })}
            {outerAngles.map((deg, i) => {
              const src = outerPhotoSrc(i)
              return (
                <div
                  key={`arc-out-${i}`}
                  className="create-arc__spoke create-arc__spoke--outer"
                  style={{ ['--spoke-deg' as string]: `${deg}deg` }}
                >
                  <div className={`create-arc__plug${src ? ' create-arc__plug--photo' : ''}`}>
                    {src ? (
                      <img
                        className="create-arc__plug-img"
                        src={src}
                        alt=""
                        draggable={false}
                        loading="eager"
                        decoding="async"
                      />
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
