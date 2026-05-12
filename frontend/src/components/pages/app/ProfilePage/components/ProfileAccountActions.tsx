// Удаление аккаунта (заглушка) и выход из сессии.

import { LogOut } from 'lucide-react'

type ProfileAccountActionsProps = {
  onLogout: () => void
}

/** Кнопки «Удалить аккаунт» и «Выйти» под блоком настроек. */
export function ProfileAccountActions({ onLogout }: ProfileAccountActionsProps) {
  return (
    <>
      <button type="button" className="profile-delete-account" onClick={() => console.log('Delete account')}>
        Удалить аккаунт
      </button>

      <button type="button" className="profile-logout" onClick={() => void onLogout()}>
        <LogOut size={18} strokeWidth={1.5} />
        <span>Выйти</span>
      </button>
    </>
  )
}
