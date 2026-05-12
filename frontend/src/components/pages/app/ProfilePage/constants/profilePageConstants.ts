// Тарифы пополнения на экране профиля; баланс токенов приходит с бэкенда (/api/users/me).
// Стоимость генерации в копирайте: обычная — 10 токенов, про — 20 токенов за фото.

/** Обычная генерация фото — токенов за кадр. */
export const PROFILE_TOP_UP_TOKENS_PER_REGULAR_GEN = 10
/** Про-генерация фото — токенов за кадр. */
export const PROFILE_TOP_UP_TOKENS_PER_PRO_GEN = 20

export type ProfileTopUpPlan = {
  /** Ключ для POST /api/payments/yoomoney/checkout (start | balance | stream). */
  planKey: 'start' | 'balance' | 'stream'
  rubles: number
  /** Количество токенов на балансе после покупки пакета. */
  tokens: number
  pill: string
  description: string
  features: readonly string[]
  /** Акцентная верхняя зона карточки (как «рекомендуемый» план). */
  featured?: boolean
}

/**
 * Три тарифа: 439 → 890 → 1490 ₽.
 * В модалке — горизонтальный скролл; по умолчанию в кадре первые две карточки.
 */
export const PROFILE_TOP_UP_PLANS: readonly ProfileTopUpPlan[] = [
  {
    planKey: 'start',
    rubles: 439,
    tokens: 70,
    pill: 'Старт',
    description: 'Первый шаг в ИИ-съёмку — быстро, без давления',
    features: [
      '70 токенов на баланс',
      `До 7 обычных генераций (${PROFILE_TOP_UP_TOKENS_PER_REGULAR_GEN} токенов за фото)`,
      `До 3 про-генераций (${PROFILE_TOP_UP_TOKENS_PER_PRO_GEN} токенов за фото)`,
      'Мгновенное зачисление',
    ],
  },
  {
    planKey: 'balance',
    rubles: 890,
    tokens: 180,
    pill: 'Баланс',
    description: 'Тот самый sweet spot: больше кадров, спокойный ритм',
    features: [
      '180 токенов на баланс',
      `До 18 обычных генераций (${PROFILE_TOP_UP_TOKENS_PER_REGULAR_GEN} токенов за фото)`,
      `До 9 про-генераций (${PROFILE_TOP_UP_TOKENS_PER_PRO_GEN} токенов за фото)`,
      'Мгновенное зачисление',
    ],
    featured: true,
  },
  {
    planKey: 'stream',
    rubles: 1490,
    tokens: 330,
    pill: 'Поток',
    description: 'Для серии образов, тестов света и смелых референсов',
    features: [
      '330 токенов на баланс',
      `До 33 обычных генераций (${PROFILE_TOP_UP_TOKENS_PER_REGULAR_GEN} токенов за фото)`,
      `До 16 про-генераций (${PROFILE_TOP_UP_TOKENS_PER_PRO_GEN} токенов за фото)`,
      'Мгновенное зачисление',
    ],
  },
]
