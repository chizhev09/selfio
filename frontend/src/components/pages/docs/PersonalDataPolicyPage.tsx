// Политика обработки персональных данных (152-ФЗ): детализация для раздела /docs (исходный текст рядом: ./politika-personalnyh-dannyh.md).
import { Link, useLocation } from 'react-router-dom'
import { CARE_CONTACT_EMAIL } from '../../../careContact'
import { LEGAL_OPERATOR_FULL_NAME, LEGAL_OPERATOR_INN, LEGAL_PRODUCT_NAME } from '../../../legalOperator'
import './DocsArticle.css'
import { useDocsHashScroll } from './useDocsHashScroll'

const PD_POLICY_LAST_UPDATED = '4 мая 2026 г.'

/** Рендерит политику обработки персональных данных оператора сервиса Selfio. */
function PersonalDataPolicyPage() {
  const { hash } = useLocation()
  useDocsHashScroll(hash)

  return (
    <article className="docs-article">
      <Link className="docs-article__back" to="/">
        ← На главную
      </Link>
      <h1 className="docs-article__title">Политика обработки персональных данных</h1>
      <div className="docs-article__meta">
        <p className="docs-article__meta-row">Дата обновления: {PD_POLICY_LAST_UPDATED}</p>
        <p className="docs-article__meta-row">
          Сервис: {LEGAL_PRODUCT_NAME} (
          <Link className="docs-article__link" to="/docs/privacy-policy">
            Политика конфиденциальности
          </Link>
          )
        </p>
      </div>
      <hr className="docs-article__divider" />

      <section className="docs-article__section">
        <h2 className="docs-article__h2">1. Общие положения</h2>
        <p className="docs-article__p">
          Настоящая Политика определяет порядок и условия обработки персональных данных
          пользователей сервиса {LEGAL_PRODUCT_NAME} (далее — Сервис) оператором:{' '}
          {LEGAL_OPERATOR_FULL_NAME} (далее — Оператор), ИНН {LEGAL_OPERATOR_INN}.
        </p>
        <p className="docs-article__p">
          Обработка персональных данных осуществляется в соответствии с Конституцией РФ,
          Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» и иными нормами
          применимого законодательства РФ.
        </p>
      </section>

      <section className="docs-article__section">
        <h2 className="docs-article__h2">2. Цели обработки</h2>
        <p className="docs-article__p">Персональные данные обрабатываются в целях:</p>
        <ul className="docs-article__list">
          <li>регистрации и идентификации пользователя в Сервисе;</li>
          <li>исполнения соглашения об оказании услуг (предоставление функций генерации и обработки изображений);</li>
          <li>взаимодействия с пользователем, в том числе направления уведомлений по работе Сервиса;</li>
          <li>обеспечения безопасности, предотвращения мошенничества и нарушений правил использования;</li>
          <li>ведения учёта обращений в поддержку;</li>
          <li>исполнения требований законодательства РФ.</li>
        </ul>
      </section>

      <section className="docs-article__section">
        <h2 className="docs-article__h2">3. Категории персональных данных</h2>
        <p className="docs-article__p">
          В зависимости от используемых функций Сервиса могут обрабатываться, в частности:
        </p>
        <ul className="docs-article__list">
          <li>идентификационные и контактные данные (адрес электронной почты, имя учётной записи);</li>
          <li>изображения и иные файлы, которые пользователь загружает в Сервис;</li>
          <li>технические данные (IP-адрес, данные user-agent, сведения о сессии);</li>
          <li>данные, необходимые для проведения платежей (в объёме, передаваемом платёжным провайдером).</li>
        </ul>
      </section>

      <section className="docs-article__section">
        <h2 className="docs-article__h2">4. Правовые основания и действия</h2>
        <p className="docs-article__p">
          Обработка может осуществляться на основании согласия субъекта персональных данных,
          а также иных оснований, предусмотренных ст. 6 и ст. 10 152-ФЗ (исполнение договора,
          обязанность по закону и др.).
        </p>
        <p className="docs-article__p">
          Оператор осуществляет сбор, запись, систематизацию, накопление, хранение, уточнение,
          извлечение, использование, передачу (предоставление, доступ), обезличивание, блокирование,
          удаление и уничтожение персональных данных — в объёме, необходимом для заявленных целей.
        </p>
      </section>

      <section className="docs-article__section">
        <h2 className="docs-article__h2">5. Передача третьим лицам</h2>
        <p className="docs-article__p">
          Персональные данные могут передаваться третьим лицам, если это необходимо для работы
          Сервиса (например, хостинг, облачные и платёжные провайдеры, сервисы авторизации) — при
          условии соблюдения требований законодательства и наличия соответствующих договоров или
          согласия субъекта, где это требуется.
        </p>
      </section>

      <section className="docs-article__section">
        <h2 className="docs-article__h2">6. Сроки обработки и хранения</h2>
        <p className="docs-article__p">
          Персональные данные хранятся не дольше, чем этого требуют цели обработки, если иной срок
          не установлен законом или договором с пользователем. По достижении целей обработки или при
          отзыве согласия (где обработка основана на согласии) данные подлежат удалению или
          обезличиванию, если иное не предусмотрено законом.
        </p>
      </section>

      <section className="docs-article__section">
        <h2 className="docs-article__h2">7. Меры по защите данных</h2>
        <p className="docs-article__p">
          Оператор принимает необходимые организационные и технические меры для защиты
          персональных данных от неправомерного доступа, уничтожения, изменения, блокирования,
          копирования, распространения и иных неправомерных действий.
        </p>
      </section>

      <section className="docs-article__section">
        <h2 className="docs-article__h2">8. Права субъекта персональных данных</h2>
        <p className="docs-article__p">
          Субъект персональных данных вправе получать сведения об обработке, требовать уточнения,
          блокирования или уничтожения данных в случаях, предусмотренных 152-ФЗ, отозвать согласие
          на обработку (если применимо) и обжаловать действия Оператора в уполномоченный орган по
          защите прав субъектов персональных данных или в судебном порядке.
        </p>
      </section>

      <section className="docs-article__section">
        <h2 className="docs-article__h2">9. Обращения и контакты Оператора</h2>
        <p className="docs-article__p">
          По вопросам обработки персональных данных обращайтесь:{' '}
          <a className="docs-article__link" href={`mailto:${CARE_CONTACT_EMAIL}`}>
            {CARE_CONTACT_EMAIL}
          </a>
          . Оператор: {LEGAL_OPERATOR_FULL_NAME}, ИНН {LEGAL_OPERATOR_INN}.
        </p>
      </section>

      <section className="docs-article__section">
        <h2 className="docs-article__h2">10. Изменение Политики</h2>
        <p className="docs-article__p">
          Оператор вправе обновлять настоящую Политику. Новая редакция вступает в силу с момента
          размещения в Сервисе, если иное не указано в тексте Политики. Рекомендуем периодически
          знакомиться с актуальной версией в разделе <span className="docs-article__strong">/docs</span>.
        </p>
      </section>
    </article>
  )
}

export default PersonalDataPolicyPage
