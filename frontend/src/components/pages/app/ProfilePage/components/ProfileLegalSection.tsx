// Ссылки внизу профиля на страницы раздела /docs (оферта, политики, правила).

import { Link } from 'react-router-dom'

/** Нижний блок ссылок на политики и условия: те же маршруты, что и в репозитории docs. */
export function ProfileLegalSection() {
  return (
    <section className="profile-legal">
      <Link className="profile-legal__link profile-legal__link--bold" to="/docs/public-offer">
        Юридическая информация
      </Link>
      <Link className="profile-legal__link profile-legal__link--underlined" to="/docs/privacy-policy">
        Условия конфиденциальности
      </Link>
      <Link className="profile-legal__link profile-legal__link--underlined" to="/docs/terms">
        Правила использования
      </Link>
      <Link className="profile-legal__link profile-legal__link--underlined" to="/docs/personal-data-policy">
        Политика обработки персональных данных
      </Link>
    </section>
  )
}
