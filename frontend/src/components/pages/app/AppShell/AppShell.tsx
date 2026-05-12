// Оболочка приложения: маршруты вкладок, верхний бар и основной контент.
import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getAccessToken } from '../../../../auth/authStorage'
import CreatePage from '../CreatePage/CreatePage'
import LibraryPage from '../LibraryPage/LibraryPage'
import TemplateDetailsPage from '../LibraryPage/TemplateDetailsPage'
import PhotosPage from '../PhotosPage/PhotosPage'
import ProfilePage from '../ProfilePage/ProfilePage'
import AppNavBar from '../NavBar/AppNavBar'
import { primeAppBootstrapData } from './appBootstrapCache'
import './AppShell.css'

/**
 * Нужен ли у main нулевой горизонтальный padding: без этого у ленты остаётся внешняя полоса,
 * и горизонтальные рельсы (чипы, подборки) не доезжают до края экрана при свайпе.
 */
function shouldBleedMainHorizontal(pathname: string): boolean {
  return pathname.includes('create-profile') || pathname.includes('/library')
}

/** Проверяет токен и показывает макет с верхним баром; при bleed убирает боковые поля main. Холст приложения — #000. */
function AppShell() {
  const location = useLocation()

  useEffect(() => {
    /** Прогревает базовые данные после входа, чтобы вкладки не дергали API повторно. */
    primeAppBootstrapData()
  }, [])

  if (!getAccessToken()) {
    return <Navigate to="/login" replace />
  }

  const pathname = location.pathname
  const mainClassName = ['app-shell__main', shouldBleedMainHorizontal(pathname) ? 'app-shell__main--bleed-x' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className="app-shell">
      <main className={mainClassName}>
        <AppNavBar />
        <Routes>
          <Route index element={<Navigate to="library" replace />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="library/template/:templateId" element={<TemplateDetailsPage />} />
          <Route path="photos" element={<PhotosPage />} />
          <Route path="create-profile" element={<CreatePage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}

export default AppShell
