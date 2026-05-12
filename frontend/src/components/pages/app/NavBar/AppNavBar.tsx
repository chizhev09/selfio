// Верхняя панель приложения: слева меню-иконка, по центру бренд, справа поиск.
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './AppNavBar.css'

const menuItems = [
  { label: 'Библиотека', to: '/app/library' },
  { label: 'Мои фото', to: '/app/photos' },
  { label: 'Создать', to: '/app/create-profile' },
  { label: 'Профиль', to: '/app/profile' },
] as const

type AppNavBarProps = {
  onSearchClick?: () => void
}

/** Рендерит верхнюю шапку: кнопка меню, заголовок Selfio и иконка поиска. */
function AppNavBar({ onSearchClick }: AppNavBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const isLibraryRoute = location.pathname === '/app/library'
  const pageTitleByPath: Record<string, string> = {
    '/app/photos': 'Мои фото',
    '/app/create-profile': 'Создать',
    '/app/profile': 'Профиль',
  }
  const pageTitle = pageTitleByPath[location.pathname] || 'Flowsee'

  useEffect(() => {
    if (!menuOpen) {
      return
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  /** Закрывает меню и открывает выбранный раздел приложения. */
  function openMenuRoute(path: string) {
    setMenuOpen(false)
    navigate(path)
  }

  return (
    <>
      <header
        className={`app-topbar ${isLibraryRoute ? '' : 'app-topbar--menu-only'}`.trim()}
        aria-label="Верхнее меню приложения"
      >
        <button
          type="button"
          className="app-topbar__icon-btn"
          aria-label="Открыть меню"
          onClick={() => setMenuOpen(true)}
        >
          <span className="app-topbar__burger" aria-hidden>
            <span />
            <span />
          </span>
        </button>

        {isLibraryRoute ? (
          <>
            <p className="app-topbar__title">Selfio</p>

            <button
              type="button"
              className="app-topbar__icon-btn"
              aria-label="Перейти к поиску"
              onClick={() => {
                if (onSearchClick) {
                  onSearchClick()
                  return
                }
                if (isLibraryRoute) {
                  window.dispatchEvent(new CustomEvent('library-toggle-search'))
                  return
                }
                navigate('/app/library')
              }}
            >
              <Search size={18} strokeWidth={1.9} aria-hidden />
            </button>
          </>
        ) : (
          <p className="app-topbar__section-title">{pageTitle}</p>
        )}
      </header>

      {menuOpen ? (
        <div className="app-menu-overlay" role="dialog" aria-modal="true" aria-label="Меню">
          <button
            type="button"
            className="app-menu-overlay__backdrop"
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="app-menu-overlay__content" aria-label="Разделы приложения">
            {menuItems.map((item) => (
              <button
                key={item.to}
                type="button"
                className="app-menu-overlay__item"
                onClick={() => openMenuRoute(item.to)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      ) : null}
    </>
  )
}

export default AppNavBar