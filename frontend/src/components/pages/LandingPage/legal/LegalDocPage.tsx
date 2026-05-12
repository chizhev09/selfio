// Юридические экраны с лендинга: условия и политика (пока заглушки).
import { Link } from 'react-router-dom'
import './LegalDocPage.css'

type LegalDocPageProps = {
  title: string
  description: string
}

/** Рендерит страницу документа с заголовком, текстом и ссылкой на главную. */
function LegalDocPage({ title, description }: LegalDocPageProps) {
  return (
    <div className="legal-doc">
      <Link className="legal-doc__back" to="/">
        ← На главную
      </Link>
      <h1 className="legal-doc__title">{title}</h1>
      <p className="legal-doc__text">{description}</p>
    </div>
  )
}

export default LegalDocPage
