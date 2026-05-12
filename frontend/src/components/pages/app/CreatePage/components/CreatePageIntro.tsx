// Левая колонка с подзаголовком «Выберите способ».

/** Показывает вводный текст над сеткой действий на экране «Создать». */
export function CreatePageIntro() {
  return (
    <div className="create-page__cell create-page__cell--text">
      <header className="create-page__intro">
        <p className="create-page__subtitle">Выберите способ</p>
      </header>
    </div>
  )
}
