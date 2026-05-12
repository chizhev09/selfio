// Правила отбора категорий для библиотеки: показываем сценарии с одной девушкой, без пар, семьи и мужчин.
/** id категорий, которые нельзя показывать (пары, семья, мужчины) — плюс типичные англ. slug. */
const EXCLUDED_CATEGORY_IDS = new Set(
  [
    'pairs',
    'pair',
    'couple',
    'couples',
    'lovers',
    'duo',
    'family',
    'families',
    'kids',
    'children',
    'parent',
    'men',
    'man',
    'male',
    'males',
    'guys',
    'boys',
    'fathers',
    'dads',
    'groom',
    'pary',
    'para',
    'semya',
    'semia',
    'muzhchiny',
  ].map((s) => s.toLowerCase()),
)

/**
 * Разделяем id на слова/сегменты: не ловим «men» внутри women и «pair» внутри repair.
 * Разрешает вложенные slug вида `spring/street/…` или `cafe-01`.
 */
const EXCLUDED_ID_TOKEN =
  /(?:^|[-_/])(?:pairs?|couple|couples|families?|groom|guy|guys?|males?|boy|boys?|men|man)(?:$|[-_/])/i

/** Ключевые фрагменты в названии (ru/en), с которыми отсекаем пары, семью и мужские сеты. */
const EXCLUDED_NAME_KEYWORDS = [
  'пары',
  'парные',
  'для пары',
  'влюбл',
  'вдво',
  'двое',
  'супруж',
  'дуэт',
  'семья',
  'семьи',
  'семей',
  'дети',
  'детск',
  'мужчины',
  'мужской',
  'для муж',
  'для сына',
  'для пап',
  'couple',
  'family',
  'families',
  'wedding', // свадьба/пара, если в индексе на англ.
] as const

/**
 * Сообщает, показывать ли категорию в библиотеке: одиночные женские, без пары, семьи и мужчин.
 */
export function isWomensSoloLibraryCategory(id: string, name: string): boolean {
  const idL = id.trim().toLowerCase()
  if (!idL) {
    return false
  }
  if (EXCLUDED_CATEGORY_IDS.has(idL)) {
    return false
  }
  if (EXCLUDED_ID_TOKEN.test(idL)) {
    return false
  }
  const nameL = name.trim().toLowerCase()
  if (!nameL) {
    return true
  }
  for (const kw of EXCLUDED_NAME_KEYWORDS) {
    if (nameL.includes(kw)) {
      return false
    }
  }
  return true
}
