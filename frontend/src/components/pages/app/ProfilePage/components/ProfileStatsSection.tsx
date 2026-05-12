// Одна широкая карточка: баланс токенов с иконкой монет.

import { Coins } from 'lucide-react'

type ProfileStatsSectionProps = {
  balance: number
}

/** Показывает баланс токенов с API на всю ширину с иконкой монет. */
export function ProfileStatsSection({ balance }: ProfileStatsSectionProps) {
  return (
    <section className="profile-stats">
      <article className="profile-stat-card profile-stat-card--balance">
        <p className="profile-stat-card__label">Баланс</p>
        <div className="profile-stat-card__amount-row">
          <p className="profile-stat-card__value">
            {balance.toLocaleString('ru-RU')}{' '}
            <span className="profile-stat-card__unit">токенов</span>
          </p>
          <Coins className="profile-stat-card__coin" size={30} strokeWidth={1.35} aria-hidden />
        </div>
      </article>
    </section>
  )
}
