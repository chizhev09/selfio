// Пять карточек-действий: промт, шаблон, свой шаблон, быстро, галерея.

import { Image, LayoutGrid, LayoutTemplate, PenLine, Sparkles } from 'lucide-react'

type CreatePageActionGridProps = {
  onCreateWithPrompt: () => void
  onChooseTemplate: () => void
  onByMyTemplate: () => void
  onQuickGenerate: () => void
  onFromGallery: () => void
}

/** Рендерит сетку кнопок выбора сценария создания контента. */
export function CreatePageActionGrid({
  onCreateWithPrompt,
  onChooseTemplate,
  onByMyTemplate,
  onQuickGenerate,
  onFromGallery,
}: CreatePageActionGridProps) {
  return (
    <div className="create-page__cell create-page__cell--actions">
      <div className="create-page__chaos">
        <button type="button" className="create-card create-card--1" onClick={onCreateWithPrompt}>
          <PenLine size={18} strokeWidth={1.5} aria-hidden />
          <div className="create-card__text">
            <span className="create-card__title">По промту</span>
            <span className="create-card__desc">Опишите словами</span>
          </div>
        </button>

        <button type="button" className="create-card create-card--2" onClick={onChooseTemplate}>
          <LayoutGrid size={18} strokeWidth={1.5} aria-hidden />
          <div className="create-card__text">
            <span className="create-card__title">Шаблон</span>
            <span className="create-card__desc">Готовые стили</span>
          </div>
        </button>

        <button type="button" className="create-card create-card--3" onClick={onByMyTemplate}>
          <LayoutTemplate size={18} strokeWidth={1.5} aria-hidden />
          <div className="create-card__text">
            <span className="create-card__title">По моему шаблону</span>
            <span className="create-card__desc">Сохранённый образ</span>
          </div>
        </button>

        <button type="button" className="create-card create-card--4" onClick={onQuickGenerate}>
          <Sparkles size={18} strokeWidth={1.5} aria-hidden />
          <div className="create-card__text">
            <span className="create-card__title">Быстро</span>
            <span className="create-card__desc">Случайный стиль</span>
          </div>
        </button>

        <button type="button" className="create-card create-card--5" onClick={onFromGallery}>
          <Image size={18} strokeWidth={1.5} aria-hidden />
          <div className="create-card__text">
            <span className="create-card__title">Галерея</span>
            <span className="create-card__desc">Готовое фото</span>
          </div>
        </button>
      </div>
    </div>
  )
}
