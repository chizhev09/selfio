// Two-column responsive grid of template cards for library search, categories, and related blocks.
import { motion } from 'framer-motion'
import { libraryApi } from '../services/libraryApi'
import type { Template } from '../types/library'

interface SearchResultsGridProps {
  items: Template[]
  onTemplateClick?: (template: Template) => void
  className?: string
}

/** Собирает стабильный ключ React даже при дублях id в выдаче. */
function getTemplateRenderKey(template: Template, index: number): string {
  return [template.id, template.image, template.manifest, template.category_id || '', String(index)].join('|')
}

/** Рендерит шаблоны простой сеткой из двух колонок (без masonry). */
export function SearchResultsGrid({ items, onTemplateClick, className }: SearchResultsGridProps) {
  return (
    <div className={`library-results library-results-grid ${className ?? ''}`.trim()}>
      {items.map((template, index) => (
        <TemplateTile
          key={getTemplateRenderKey(template, index)}
          template={template}
          onClick={onTemplateClick}
        />
      ))}
    </div>
  )
}

interface TemplateTileProps {
  template: Template
  onClick?: (template: Template) => void
}

/** Возвращает запасной URL при несовпадении регистра расширения файла в S3. */
function withSwappedImageExtensionCase(url: string): string | null {
  if (url.endsWith('.jpg')) return `${url.slice(0, -4)}.JPG`
  if (url.endsWith('.JPG')) return `${url.slice(0, -4)}.jpg`
  if (url.endsWith('.jpeg')) return `${url.slice(0, -5)}.JPEG`
  if (url.endsWith('.JPEG')) return `${url.slice(0, -5)}.jpeg`
  if (url.endsWith('.png')) return `${url.slice(0, -4)}.PNG`
  if (url.endsWith('.PNG')) return `${url.slice(0, -4)}.png`
  if (url.endsWith('.webp')) return `${url.slice(0, -5)}.WEBP`
  if (url.endsWith('.WEBP')) return `${url.slice(0, -5)}.webp`
  return null
}

/** Одна карточка шаблона в сетке результатов. */
function TemplateTile({ template, onClick }: TemplateTileProps) {
  const src = libraryApi.getImageUrl(template.image)
  return (
    <motion.article
      className="library-results__tile"
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.6 }}
      onClick={() => onClick?.(template)}
    >
      <div className="library-results__media">
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(event) => {
            const img = event.currentTarget
            const triedFallback = img.dataset.fallbackTried === '1'
            if (triedFallback) return
            const alt = withSwappedImageExtensionCase(img.src)
            if (!alt) return
            img.dataset.fallbackTried = '1'
            img.src = alt
          }}
        />
      </div>
      <p className="library-results__title">{template.title}</p>
    </motion.article>
  )
}
