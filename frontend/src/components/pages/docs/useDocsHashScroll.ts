// Прокрутка к якорю на страницах документации при переходе с hash в URL.
import { useEffect } from 'react'

/** Плавно прокручивает к элементу с id из location.hash после отрисовки. */
export function useDocsHashScroll(hash: string) {
  useEffect(() => {
    if (!hash || hash === '#') {
      return
    }
    const id = hash.startsWith('#') ? hash.slice(1) : hash
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [hash])
}
