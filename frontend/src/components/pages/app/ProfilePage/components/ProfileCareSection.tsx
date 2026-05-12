// Раскрывающийся блок «Служба заботы» с логотипами каналов и почтой.

import { ChevronDown, ChevronUp, Shield } from 'lucide-react'
import { CARE_CONTACT_EMAIL, careSocialChannels } from '../../../../../careContact'
import { profileCareLogoById } from '../constants/profileCareLogos'
import logoMailru from '../Media/logo_mailru.svg'

type ProfileCareSectionProps = {
  careOpen: boolean
  onToggle: () => void
  onOpenCareLink: (url: string) => void
}

/** Рендерит кнопку-аккордеон и сетку ссылок на каналы поддержки. */
export function ProfileCareSection({ careOpen, onToggle, onOpenCareLink }: ProfileCareSectionProps) {
  return (
    <>
      <button type="button" className="profile-row" onClick={onToggle} aria-expanded={careOpen}>
        <Shield size={18} strokeWidth={1.7} />
        <span className="profile-row__label">Служба заботы</span>
        {careOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {careOpen && (
        <div className="profile-care__content">
          <p className="profile-care__text">Если нужна помощь, напишите нам в любой удобный канал.</p>
          <div className="profile-care__logos">
            {careSocialChannels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                className="profile-care__logo"
                onClick={() => onOpenCareLink(ch.href)}
                aria-label={ch.ariaLabel}
              >
                <img src={profileCareLogoById[ch.id]} alt="" />
              </button>
            ))}
            <button
              type="button"
              className="profile-care__logo"
              onClick={() => onOpenCareLink(`mailto:${CARE_CONTACT_EMAIL}`)}
              aria-label="Электронная почта"
            >
              <img src={logoMailru} alt="" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
