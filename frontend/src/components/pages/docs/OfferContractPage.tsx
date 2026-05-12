// Договор публичной оферты: платные пакеты токенов и общие условия сервиса Selfio (синхронно с ./dogovor-oferty.md в этой папке).

import { Link, useLocation } from 'react-router-dom'
import { CARE_CONTACT_EMAIL } from '../../../careContact'
import { LEGAL_OPERATOR_FULL_NAME, LEGAL_OPERATOR_INN, LEGAL_PRODUCT_NAME } from '../../../legalOperator'
import { PROFILE_TOP_UP_PLANS } from '../app/ProfilePage/constants/profilePageConstants'
import './DocsArticle.css'
import { useDocsHashScroll } from './useDocsHashScroll'

const OFFER_LAST_UPDATED = '4 мая 2026 г.'

/** Рендерит страницу договора оферты с таблицей актуальных пакетов из констант профиля. */
function OfferContractPage() {
  const { hash } = useLocation()
  useDocsHashScroll(hash)

  return (
    <article className="docs-article">
      <Link className="docs-article__back" to="/app/profile">
        ← Назад
      </Link>
      <h1 className="docs-article__title">Договор публичной оферты на оказание услуг по предоставлению доступа к сервису {LEGAL_PRODUCT_NAME}</h1>
      <div className="docs-article__meta">
        <p className="docs-article__meta-row">Дата публикации: {OFFER_LAST_UPDATED}</p>
        <p className="docs-article__meta-row">Сервис: {LEGAL_PRODUCT_NAME}</p>
      </div>
      <hr className="docs-article__divider" />

      <section className="docs-article__section" id="section-intro">
        <p className="docs-article__p">
          Настоящий документ является офертой в смысле ст. 437 Гражданского кодекса Российской Федерации.
        </p>
      </section>

      <section className="docs-article__section" id="section-1">
        <h2 className="docs-article__h2">1. Термины</h2>
        <ul className="docs-article__list">
          <li>
            <span className="docs-article__strong">Сервис</span> — программный комплекс «{LEGAL_PRODUCT_NAME}», доступный через сеть Интернет.
          </li>
          <li>
            <span className="docs-article__strong">Исполнитель</span> — {LEGAL_OPERATOR_FULL_NAME}, ИНН {LEGAL_OPERATOR_INN}.
          </li>
          <li>
            <span className="docs-article__strong">Заказчик (Пользователь)</span> — дееспособное лицо, совершившее акцепт настоящей оферты.
          </li>
          <li>
            <span className="docs-article__strong">Токены</span> — условные единицы учёта на балансе учётной записи, используемые для оплаты отдельных функций Сервиса (в частности, генерации изображений) в порядке и по тарифам, указанным в интерфейсе Сервиса.
          </li>
          <li>
            <span className="docs-article__strong">Акцепт</span> — полное и безоговорочное принятие условий оферты путём совершения действий: регистрация в Сервисе, оплата пакета пополнения баланса и/или фактическое использование платных функций после ознакомления с условиями.
          </li>
        </ul>
      </section>

      <section className="docs-article__section" id="section-2">
        <h2 className="docs-article__h2">2. Предмет договора</h2>
        <p className="docs-article__p">
          2.1. Исполнитель обязуется предоставить Заказчику доступ к функционалу Сервиса, а Заказчик обязуется оплатить услуги в порядке, предусмотренном настоящей офертой и интерфейсом Сервиса.
        </p>
        <p className="docs-article__p">
          2.2. Услуга включает, в частности: зачисление приобретённого объёма токенов на баланс учётной записи Заказчика после подтверждения оплаты платёжным провайдером; предоставление возможности использовать токены для запуска функций Сервиса при наличии технической возможности.
        </p>
        <p className="docs-article__p">
          2.3. Конкретный перечень функций, расход токенов за операцию, а также актуальные пакеты пополнения и их стоимость в рублях указываются в интерфейсе Сервиса на дату оплаты. Без ограничения общности, на дату публикации настоящей редакции доступны пакеты:
        </p>
        <div className="docs-article__table-wrap">
          <table className="docs-article__table">
            <thead>
              <tr>
                <th>Стоимость, ₽</th>
                <th>Токены на баланс</th>
              </tr>
            </thead>
            <tbody>
              {PROFILE_TOP_UP_PLANS.map((plan) => (
                <tr key={plan.rubles}>
                  <td>{plan.rubles.toLocaleString('ru-RU')}</td>
                  <td>{plan.tokens.toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="docs-article__p">
          Исполнитель вправе изменять номиналы пакетов и соотношение «рубли — токены», публикуя новые условия в Сервисе; оплаченные до изменения условия пакеты подлежат исполнению в редакции, действовавшей на момент оплаты.
        </p>
      </section>

      <section className="docs-article__section" id="section-3">
        <h2 className="docs-article__h2">3. Порядок заключения и срок действия</h2>
        <p className="docs-article__p">3.1. Договор считается заключённым с момента акцепта.</p>
        <p className="docs-article__p">
          3.2. Договор действует до исполнения сторонами обязательств по оплаченным услугам и/или до прекращения использования Сервиса и удаления учётной записи — в части, не противоречащей закону.
        </p>
      </section>

      <section className="docs-article__section" id="section-4">
        <h2 className="docs-article__h2">4. Цена и порядок оплаты</h2>
        <p className="docs-article__p">4.1. Цена услуги по пополнению баланса определяется выбранным пакетом в рублях РФ.</p>
        <p className="docs-article__p">
          4.2. Оплата производится через платёжные сервисы третьих лиц. Обработка платёжных данных может осуществляться платёжным провайдером в соответствии с его правилами.
        </p>
        <p className="docs-article__p">
          4.3. Зачисление токенов производится после получения Исполнителем подтверждения об успешной оплате. Срок зачисления зависит от платёжного провайдера.
        </p>
      </section>

      <section className="docs-article__section" id="section-5">
        <h2 className="docs-article__h2">5. Порядок использования токенов</h2>
        <p className="docs-article__p">
          5.1. Токены списываются при выполнении операций в Сервисе в соответствии с правилами, отображаемыми до подтверждения операции.
        </p>
        <p className="docs-article__p">
          5.2. Безопасность учётной записи и последствия использования токенов с учётной записи Заказчика находятся в зоне ответственности Заказчика, если иное не доказано как вина Исполнителя.
        </p>
      </section>

      <section className="docs-article__section" id="section-6">
        <h2 className="docs-article__h2">6. Права на результаты и контент</h2>
        <p className="docs-article__p">
          6.1. Исключительные права на элементы Сервиса принадлежат Исполнителю и/или третьим лицам на законных основаниях.
        </p>
        <p className="docs-article__p">
          6.2. В отношении результатов генерации, полученных Заказчиком при добросовестном использовании Сервиса, Заказчику предоставляется право использования в объёме, необходимом для целей, заявленных функционалом Сервиса, если иное прямо не указано в интерфейсе.
        </p>
        <p className="docs-article__p">6.3. Заказчик гарантирует наличие прав на загружаемые материалы и законность запросов к генерации.</p>
      </section>

      <section className="docs-article__section" id="section-7">
        <h2 className="docs-article__h2">7. Ограничение ответственности</h2>
        <p className="docs-article__p">
          7.1. Сервис предоставляется на условиях «как есть». Исполнитель не гарантирует абсолютную бесперебойность и соответствие результата генерации субъективным ожиданиям Заказчика.
        </p>
        <p className="docs-article__p">
          7.2. Ответственность Исполнителя ограничивается суммой фактически полученной от Заказчика оплаты по спорной операции, если иное не вытекает из императивных норм права РФ.
        </p>
      </section>

      <section className="docs-article__section" id="section-8">
        <h2 className="docs-article__h2">8. Конфиденциальность и персональные данные</h2>
        <p className="docs-article__p">
          Обработка персональных данных осуществляется в соответствии с{' '}
          <Link className="docs-article__link" to="/docs/personal-data-policy">
            Политикой обработки персональных данных
          </Link>
          .
        </p>
      </section>

      <section className="docs-article__section" id="section-9">
        <h2 className="docs-article__h2">9. Порядок изменения оферты</h2>
        <p className="docs-article__p">
          Исполнитель вправе изменять условия оферты. Новая редакция вступает в силу с момента публикации, если иное не указано в тексте. Оплата после публикации новой редакции означает согласие с ней в части новых условий, не ухудшающих исполнение уже оплаченных обязательств.
        </p>
      </section>

      <section className="docs-article__section" id="section-10">
        <h2 className="docs-article__h2">10. Разрешение споров и контакты</h2>
        <p className="docs-article__p">
          10.1. Споры подлежат урегулированию путём переговоров; при недостижении согласия — в судебном порядке по правилам законодательства РФ.
        </p>
        <p className="docs-article__p">
          10.2. Порядок возврата денежных средств изложен в{' '}
          <Link className="docs-article__link" to="/docs/refund">
            Правилах возврата
          </Link>
          .
        </p>
        <p className="docs-article__p">
          10.3. Связь с Исполнителем:{' '}
          <a className="docs-article__link" href={`mailto:${CARE_CONTACT_EMAIL}`}>
            {CARE_CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <p className="docs-article__note">
        Текст носит информационный характер и не заменяет индивидуальную юридическую консультацию. При необходимости согласуйте редакцию с юристом.
      </p>
    </article>
  )
}

export default OfferContractPage
