// Маршруты: лендинг грузится первым; приложение, авторизация и документы — отдельными чанками.
import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import RouteFallback from './components/pages/LandingPage/common/RouteFallback'
import LandingPage from './components/pages/LandingPage/LandingPage'

const AppShell = lazy(() => import('./components/pages/app/AppShell/AppShell'))
const AdminPage = lazy(() => import('./components/pages/app/admin/AdminPage'))
const AuthRouteModal = lazy(() => import('./components/pages/LandingPage/auth/AuthRouteModal'))
const EmailLoginPage = lazy(() => import('./components/pages/LandingPage/auth/email-login/EmailLoginPage'))
const EmailRegisterPage = lazy(() => import('./components/pages/LandingPage/auth/email-register/EmailRegisterPage'))
const OAuthCallbackPage = lazy(() => import('./components/pages/LandingPage/auth/OAuthCallbackPage'))
const TermsOfServicePage = lazy(() => import('./components/pages/docs/TermsOfServicePage'))
const OfferContractPage = lazy(() => import('./components/pages/docs/OfferContractPage'))
const RefundPolicyPage = lazy(() => import('./components/pages/docs/RefundPolicyPage'))
const PrivacyPolicyPage = lazy(() => import('./components/pages/docs/PrivacyPolicyPage'))
const PersonalDataPolicyPage = lazy(() => import('./components/pages/docs/PersonalDataPolicyPage'))

/** Оборачивает ленивый маршрут в Suspense с лёгким fallback. */
function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}

function App() {
  // Описывает публичные маршруты сайта, маршруты приложения и страницу админки на фронте.
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/admin"
        element={
          <LazyRoute>
            <AdminPage />
          </LazyRoute>
        }
      />
      <Route
        path="/login"
        element={
          <LazyRoute>
            <AuthRouteModal />
          </LazyRoute>
        }
      />
      <Route
        path="/login/email"
        element={
          <LazyRoute>
            <EmailLoginPage />
          </LazyRoute>
        }
      />
      <Route
        path="/login/email/register"
        element={
          <LazyRoute>
            <EmailRegisterPage />
          </LazyRoute>
        }
      />
      <Route path="/register" element={<Navigate to="/login/email/register" replace />} />
      <Route path="/account" element={<Navigate to="/app/profile" replace />} />
      <Route
        path="/oauth/callback"
        element={
          <LazyRoute>
            <OAuthCallbackPage />
          </LazyRoute>
        }
      />
      <Route
        path="/app/*"
        element={
          <LazyRoute>
            <AppShell />
          </LazyRoute>
        }
      />
      <Route
        path="/docs/terms"
        element={
          <LazyRoute>
            <TermsOfServicePage />
          </LazyRoute>
        }
      />
      <Route
        path="/docs/terms-of-service"
        element={
          <LazyRoute>
            <TermsOfServicePage />
          </LazyRoute>
        }
      />
      <Route
        path="/docs/public-offer"
        element={
          <LazyRoute>
            <OfferContractPage />
          </LazyRoute>
        }
      />
      <Route
        path="/docs/refund"
        element={
          <LazyRoute>
            <RefundPolicyPage />
          </LazyRoute>
        }
      />
      <Route
        path="/docs/privacy-policy"
        element={
          <LazyRoute>
            <PrivacyPolicyPage />
          </LazyRoute>
        }
      />
      <Route
        path="/docs/personal-data-policy"
        element={
          <LazyRoute>
            <PersonalDataPolicyPage />
          </LazyRoute>
        }
      />
      <Route path="/terms" element={<Navigate to="/docs/terms" replace />} />
      <Route path="/privacy" element={<Navigate to="/docs/personal-data-policy" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
