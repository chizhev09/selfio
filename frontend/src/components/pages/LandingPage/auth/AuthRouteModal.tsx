// Маршрут /login: полноэкранное окно входа; закрытие ведёт на главную.
import { useNavigate } from 'react-router-dom'
import AuthFullscreenModal from './AuthFullscreenModal'

function AuthRouteModal() {
  const navigate = useNavigate()
  return <AuthFullscreenModal onClose={() => navigate('/', { replace: true })} />
}

export default AuthRouteModal
