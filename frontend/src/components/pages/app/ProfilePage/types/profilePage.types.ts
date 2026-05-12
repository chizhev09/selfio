// Тип данных профиля с бэкенда для экрана аккаунта.

/** Краткая карточка пользователя из /api/users/me. */
export type Me = {
  username: string
  email: string
  is_verified: boolean
  /** Баланс токенов с бэкенда (поле users.balance). */
  balance: number
}
