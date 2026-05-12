// Плейсхолдер «Загрузка…» на время запроса профиля.

/** Показывает строку ожидания, пока не пришёл ответ /api/users/me. */
export function ProfileLoadingState() {
  return <div className="profile-loading">Загрузка…</div>
}
