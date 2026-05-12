// Маршруты: лендинг и авторизация в pages/LandingPage, основное приложение в pages/app (нижняя навигация), юридические страницы в pages/docs.
import { Navigate, Route, Routes } from 'react-router-dom'
import {
  OfferContractPage,
  PersonalDataPolicyPage,
  PrivacyPolicyPage,
  RefundPolicyPage,
  TermsOfServicePage,
} from './components/pages/docs'
import LandingPage from './components/pages/LandingPage/LandingPage'
import AppShell from './components/pages/app/AppShell/AppShell'
import AuthRouteModal from './components/pages/LandingPage/auth/AuthRouteModal'
import EmailLoginPage from './components/pages/LandingPage/auth/email-login/EmailLoginPage'
import EmailRegisterPage from './components/pages/LandingPage/auth/email-register/EmailRegisterPage'
import OAuthCallbackPage from './components/pages/LandingPage/auth/OAuthCallbackPage'
import AdminPage from './components/pages/app/admin/AdminPage'

function App() {
  // Описывает публичные маршруты сайта, маршруты приложения и страницу админки на фронте.
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/login" element={<AuthRouteModal />} />
      <Route path="/login/email" element={<EmailLoginPage />} />
      <Route path="/login/email/register" element={<EmailRegisterPage />} />
      <Route path="/register" element={<Navigate to="/login/email/register" replace />} />
      <Route path="/account" element={<Navigate to="/app/profile" replace />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route path="/app/*" element={<AppShell />} />
      <Route path="/docs/terms" element={<TermsOfServicePage />} />
      <Route path="/docs/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/docs/public-offer" element={<OfferContractPage />} />
      <Route path="/docs/refund" element={<RefundPolicyPage />} />
      <Route path="/docs/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/docs/personal-data-policy" element={<PersonalDataPolicyPage />} />
      <Route path="/terms" element={<Navigate to="/docs/terms" replace />} />
      <Route path="/privacy" element={<Navigate to="/docs/personal-data-policy" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
