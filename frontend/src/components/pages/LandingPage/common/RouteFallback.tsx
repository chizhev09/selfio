// Минимальный экран загрузки при ленивой подгрузке маршрута — без тяжёлых зависимостей.
import './RouteFallback.css'

/** Показывает лёгкий индикатор, пока подгружается чанк маршрута. */
function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite" aria-label="Загрузка">
      <span className="route-fallback__spinner" aria-hidden />
    </div>
  )
}

export default RouteFallback
