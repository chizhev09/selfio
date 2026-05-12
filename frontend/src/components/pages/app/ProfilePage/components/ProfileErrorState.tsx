// Ошибка загрузки профиля со ссылкой на вход.

import { Link } from 'react-router-dom'

type ProfileErrorStateProps = {
  message: string
}

/** Показывает текст ошибки и ссылку на экран входа. */
export function ProfileErrorState({ message }: ProfileErrorStateProps) {
  return (
    <div className="profile-error">
      <p className="profile-error__text">{message}</p>
      <Link className="profile-link" to="/login">
        Ко входу
      </Link>
    </div>
  )
}
