// Аватар-заглушка и имя пользователя в шапке профиля.

import { User as UserIcon } from 'lucide-react'
import type { Me } from '../types/profilePage.types'

type ProfileHeroSectionProps = {
  me: Me
}

/** Рендерит блок с иконкой и именем в стиле мессенджера. */
export function ProfileHeroSection({ me }: ProfileHeroSectionProps) {
  return (
    <section className="profile-hero">
      <div className="profile-hero__avatar">
        <UserIcon size={34} strokeWidth={1.7} />
      </div>
      <div className="profile-hero__info">
        <p className="profile-hero__name">{me.username}</p>
        <p className="profile-hero__meta">@{me.username.toLowerCase()}</p>
      </div>
    </section>
  )
}
