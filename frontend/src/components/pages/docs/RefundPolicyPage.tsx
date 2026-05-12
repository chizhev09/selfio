// Правила возврата денежных средств за платежи в Сервисе (синхронно с ./pravila-vozvrata.md в этой папке).

import { Link, useLocation } from 'react-router-dom'
import { CARE_CONTACT_EMAIL } from '../../../careContact'
import { LEGAL_PRODUCT_NAME } from '../../../legalOperator'
import './DocsArticle.css'
import { useDocsHashScroll } from './useDocsHashScroll'

const REFUND_LAST_UPDATED = '4 мая 2026 г.'

/** Рендерит страницу правил возврата денежных средств за платёжи в Сервисе. */
function RefundPolicyPage() {
  const { hash } = useLocation()
  useDocsHashScroll(hash)

  return (
    <article className="docs-article">
      <Link className="docs-article__back" to="/app/profile">
        ← Назад
      </Link>
      <h1 className="docs-article__title">Правила возврата денежных средств</h1>
      <div className="docs-article__meta">
        <p className="docs-article__meta-row">Дата публикации: {REFUND_LAST_UPDATED}</p>
        <p className="docs-article__meta-row">Сервис: {LEGAL_PRODUCT_NAME}</p>
      </div>
      <hr className="docs-article__divider" />

      <section className="docs-article__section" id="section-intro">
        <p className="docs-article__p">
          Настоящие Правила дополняют{' '}
          <Link className="docs-article__link" to="/docs/public-offer">
            Договор публичной оферты
          </Link>{' '}
          и применяются к платным операциям пополнения баланса токенов в Сервисе.
        </p>
      </section>

      <section className="docs-article__section" id="section-1">
        <h2 className="docs-article__h2">1. Общие положения</h2>
        <p className="docs-article__p">
          1.1. Заказчик вправе требовать возврата уплаченных денежных средств в случаях, предусмотренных законодательством Российской Федерации, в том числе Законом РФ «О защите прав потребителей».
        </p>
        <p className="docs-article__p">
          1.2. Сервис оказывает услуги дистанционно; часть услуг связана с немедленным или краткосрочным зачислением токенов и/или запуском вычислительных операций, что может ограничивать право на отказ от договора в порядке, установленном ст. 26.1 ЗоЗПП. Конкретные сценарии см. в разделе 4 настоящих Правил.
        </p>
      </section>

      <section className="docs-article__section" id="section-2">
        <h2 className="docs-article__h2">2. Возврат при ошибочной или двойной оплате</h2>
        <p className="docs-article__p">
          2.1. При двойном списании, техническом сбое платёжного шлюза или ошибочном переводе на стороне платёжного провайдера Заказчик вправе обратиться в поддержку с чеком или идентификатором транзакции. Исполнитель рассматривает обращение в разумный срок и при подтверждении факта ошибки инициирует возврат или зачёт в соответствии с техническими возможностями и правилами банка или эквайера.
        </p>
        <p className="docs-article__p">
          2.2. Если оплата прошла, но токены не были зачислены по вине Исполнителя или интеграции Сервиса, Исполнитель производит дозачисление токенов либо возврат денежных средств по выбору Заказчика, если дозачисление невозможно.
        </p>
      </section>

      <section className="docs-article__section" id="section-3">
        <h2 className="docs-article__h2">3. Возврат после зачисления токенов</h2>
        <p className="docs-article__p">
          3.1. После успешного зачисления токенов на баланс учётной записи денежные средства считаются направленными на исполнение обязательств по предоставлению возможности использования Сервиса.
        </p>
        <p className="docs-article__p">
          3.2. Возврат денежных средств за уже зачисленные токены возможен в случаях, прямо предусмотренных законом, либо по отдельному решению Исполнителя в добровольном порядке (например, при подтверждённой невозможности использования Сервиса по техническим причинам на стороне Исполнителя длительное время).
        </p>
        <p className="docs-article__p">
          3.3. Если Заказчик использовал часть токенов, возврат за неиспользованный остаток рассматривается индивидуально; Исполнитель вправе предложить эквивалент в виде дозачисления бонусных токенов вместо денежного возврата, если это согласовано с Заказчиком.
        </p>
      </section>

      <section className="docs-article__section" id="section-4">
        <h2 className="docs-article__h2">4. Отказ от договора потребителем (ЗоЗПП)</h2>
        <p className="docs-article__p">
          4.1. При дистанционном способе заключения договора потребитель вправе отказаться от услуги в течение 14 дней, если иное не установлено законом с учётом характера услуги.
        </p>
        <p className="docs-article__p">
          4.2. Если Заказчик при оплате прямо выразил согласие на начало оказания услуги до истечения 14 дней и осознаёт, что после начала исполнения теряет право на отказ, применяются правила ст. 32 ЗоЗПП. Зачисление токенов и/или начало платной генерации может квалифицироваться как начало исполнения; при споре оценка производится с учётом фактических обстоятельств и закона.
        </p>
      </section>

      <section className="docs-article__section" id="section-5">
        <h2 className="docs-article__h2">5. Порядок обращения</h2>
        <p className="docs-article__p">
          5.1. Обращения направляются на e-mail поддержки:{' '}
          <a className="docs-article__link" href={`mailto:${CARE_CONTACT_EMAIL}`}>
            {CARE_CONTACT_EMAIL}
          </a>{' '}
          с темой «Возврат», указанием аккаунта (e-mail), даты платежа и приложением подтверждения оплаты.
        </p>
        <p className="docs-article__p">
          5.2. Срок рассмотрения — до 10 рабочих дней, если иной срок не согласован или не предписан законом. Возврат на карту или счёт зависит от регламента банка и может занять дополнительное время.
        </p>
      </section>

      <section className="docs-article__section" id="section-6">
        <h2 className="docs-article__h2">6. Изменение Правил</h2>
        <p className="docs-article__p">
          Исполнитель вправе изменять настоящие Правила; актуальная версия публикуется в Сервисе по адресу{' '}
          <Link className="docs-article__link" to="/docs/refund">
            /docs/refund
          </Link>
          .
        </p>
      </section>

      <p className="docs-article__note">
        Документ носит информационный характер; при противоречии императивным нормам РФ применяются нормы закона.
      </p>
    </article>
  )
}

export default RefundPolicyPage
