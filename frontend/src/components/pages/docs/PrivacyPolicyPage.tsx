// Страница политики конфиденциальности в разделе /docs (структура близка к facee.ru/privacy-policy).
import { Link, useLocation } from 'react-router-dom'
import { CARE_CONTACT_EMAIL } from '../../../careContact'
import { LEGAL_OPERATOR_FULL_NAME, LEGAL_OPERATOR_INN, LEGAL_PRODUCT_NAME } from '../../../legalOperator'
import './DocsArticle.css'
import { useDocsHashScroll } from './useDocsHashScroll'

const PRIVACY_LAST_UPDATED = '1 мая 2026 г.'

/** Рендерит политику конфиденциальности сервиса Selfio с разделами и ссылкой на политику обработки ПДн. */
function PrivacyPolicyPage() {
  const { hash } = useLocation()
  useDocsHashScroll(hash)

  return (
    <article className="docs-article">
      <Link className="docs-article__back" to="/">
        ← На главную
      </Link>
      <h1 className="docs-article__title">Политика конфиденциальности {LEGAL_PRODUCT_NAME}</h1>
      <div className="docs-article__meta">
        <p className="docs-article__meta-row">Дата обновления: {PRIVACY_LAST_UPDATED}</p>
        <p className="docs-article__meta-row">Сервис: {LEGAL_PRODUCT_NAME}</p>
      </div>
      <hr className="docs-article__divider" />

      <section className="docs-article__section" id="section-1">
        <h2 className="docs-article__h2">1. Общие положения</h2>
        <p className="docs-article__p">
          Мы уважаем вашу конфиденциальность и обрабатываем персональные данные в соответствии с
          законодательством Российской Федерации, в том числе Федеральным законом № 152-ФЗ «О
          персональных данных». Подробные условия обработки персональных данных изложены в нашей{' '}
          <Link className="docs-article__link" to="/docs/personal-data-policy">
            Политике обработки персональных данных
          </Link>
          .
        </p>
      </section>

      <section className="docs-article__section" id="section-2">
        <h2 className="docs-article__h2">2. Какие данные мы собираем</h2>
        <p className="docs-article__p">
          При использовании {LEGAL_PRODUCT_NAME} мы можем получать:
        </p>
        <ul className="docs-article__list">
          <li>
            данные учётной записи, в том числе переданные через OAuth-провайдеров (например,
            адрес электронной почты, имя, изображение профиля в сервисе авторизации);
          </li>
          <li>
            фотографии и иные изображения, которые вы загружаете, а также сгенерированные
            сервисом материалы (результаты работы нейросетевых моделей);
          </li>
          <li>
            технические данные, автоматически передаваемые при обращении к сайту и API (в том
            числе IP-адрес, сведения о браузере и устройстве — в объёме, необходимом для работы
            сервиса и обеспечения безопасности);
          </li>
          <li>
            данные сеанса авторизации, хранимые локально в браузере (например, в{' '}
            <span className="docs-article__strong">sessionStorage</span>), для поддержания входа в
            аккаунт;
          </li>
          <li>
            при оплате услуг — сведения о платежах и идентификаторах транзакций, получаемые от
            платёжных провайдеров (без хранения полных реквизитов банковских карт на наших серверах,
            если иное прямо не предусмотрено интеграцией);
          </li>
          <li>обращения в службу поддержки и содержание переписки по вопросам сервиса.</li>
        </ul>
      </section>

      <section className="docs-article__section" id="section-3">
        <h2 className="docs-article__h2">3. Как мы используем данные</h2>
        <p className="docs-article__p">Мы используем данные, чтобы:</p>
        <ul className="docs-article__list">
          <li>зарегистрировать и поддерживать ваш аккаунт;</li>
          <li>
            оказывать услуги {LEGAL_PRODUCT_NAME}, включая генерацию и обработку изображений по
            вашим запросам;
          </li>
          <li>учитывать баланс, токены и платежи, если такие функции доступны в сервисе;</li>
          <li>обеспечивать безопасность, предотвращать злоупотребления и улучшать качество сервиса;</li>
          <li>связываться с вами по вопросам работы сервиса и поддержки пользователей.</li>
        </ul>
      </section>

      <section className="docs-article__section" id="section-4">
        <h2 className="docs-article__h2">4. Ваши права</h2>
        <p className="docs-article__p">Вы можете:</p>
        <ul className="docs-article__list">
          <li>запросить информацию об обрабатываемых персональных данных;</li>
          <li>потребовать уточнения, блокирования или удаления данных — в случаях, предусмотренных законом;</li>
          <li>отозвать согласие на обработку персональных данных, если обработка основана на согласии;</li>
          <li>удалить аккаунт и прекратить использование сервиса (в порядке, описанном в интерфейсе или поддержке);</li>
          <li>
            обратиться к оператору по электронной почте:{' '}
            <a className="docs-article__link" href={`mailto:${CARE_CONTACT_EMAIL}`}>
              {CARE_CONTACT_EMAIL}
            </a>
            .
          </li>
        </ul>
      </section>

      <section className="docs-article__section" id="section-5">
        <h2 className="docs-article__h2">5. Контакты оператора</h2>
        <p className="docs-article__p">
          <span className="docs-article__strong">Оператор:</span> {LEGAL_OPERATOR_FULL_NAME}
        </p>
        <p className="docs-article__p">
          <span className="docs-article__strong">ИНН:</span> {LEGAL_OPERATOR_INN}
        </p>
        <p className="docs-article__p">
          <span className="docs-article__strong">E-mail:</span>{' '}
          <a className="docs-article__link" href={`mailto:${CARE_CONTACT_EMAIL}`}>
            {CARE_CONTACT_EMAIL}
          </a>
        </p>
      </section>

      <section className="docs-article__section" id="section-6">
        <h2 className="docs-article__h2">6. Заключение</h2>
        <p className="docs-article__p">
          Используя сервис {LEGAL_PRODUCT_NAME}, вы подтверждаете, что ознакомились с настоящей
          Политикой конфиденциальности и{' '}
          <Link className="docs-article__link" to="/docs/personal-data-policy">
            Политикой обработки персональных данных
          </Link>
          . Актуальные версии документов размещаются на сайте сервиса в разделе документации (
          <span className="docs-article__strong">/docs</span>).
        </p>
      </section>
    </article>
  )
}

export default PrivacyPolicyPage
