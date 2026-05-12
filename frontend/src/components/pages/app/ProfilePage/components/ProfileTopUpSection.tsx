// Кнопка открытия модалки пополнения баланса.

type ProfileTopUpSectionProps = {
  onOpen: () => void
}

/** Рендерит кнопку «Пополнить баланс» над списком настроек. */
export function ProfileTopUpSection({ onOpen }: ProfileTopUpSectionProps) {
  return (
    <section className="profile-topup">
      <button type="button" className="profile-topup__button" onClick={onOpen}>
        Пополнить баланс
      </button>
    </section>
  )
}
