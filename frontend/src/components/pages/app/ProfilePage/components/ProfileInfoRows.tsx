// Статичная строка e-mail с иконкой.

import { ChevronRight, Mail } from 'lucide-react'
import type { Me } from '../types/profilePage.types'

type ProfileInfoRowsProps = {
  me: Me
}

/** Показывает почту пользователя в строке настроек. */
export function ProfileInfoRows({ me }: ProfileInfoRowsProps) {
  return (
    <button type="button" className="profile-row profile-row--static">
      <Mail size={18} strokeWidth={1.7} />
      <span className="profile-row__label">E-mail</span>
      <span className="profile-row__value">{me.email}</span>
      <ChevronRight size={16} />
    </button>
  )
}
