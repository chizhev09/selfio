// Три точки-волна для состояния загрузки категории или ленты.

/** Показывает анимированную загрузку из трёх точек для ожидания категории. */
export function CategoryLoadingWave() {
  return (
    <div className="library-loading-wave" aria-label="Загрузка категории" role="status">
      <span className="library-loading-wave__dot" />
      <span className="library-loading-wave__dot" />
      <span className="library-loading-wave__dot" />
    </div>
  )
}
