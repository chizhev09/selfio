// Все JPEG из папки Media лендинга: случайная подборка для декоративного коллажа над формой входа.
const modules = import.meta.glob<{ default: string }>('../Media/**/*.jpg', { eager: true })

export const authHeroCollagePool: string[] = Object.values(modules).map((m) => m.default)
