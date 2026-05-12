// Константы UI библиотеки: промт по умолчанию, id подборок, рельсы, заглушки карусели (баланс — с API).

import type { LibraryCuratedTemplateRow, LibraryHeroSlide, LibraryPickCard } from '../types/libraryPage.types'

export const DEFAULT_PROMPT = 'Сохранить естественный вид, аккуратно перенести стиль шаблона.'
export const MIN_CATEGORY_LOADING_MS = 400
export const ALL_TAB_BATCH_SIZE = 20

/** Ширины плейсхолдеров (rem), чтобы сетка чипов не прыгала при появлении реальных названий. */
export const LIBRARY_CATEGORY_SKELETON_WIDTHS_REM = [3.9, 4.6, 3.4, 5.0, 3.7, 4.3, 4.1, 3.5] as const

/** Заглушки для Pinterest-сетки и героя. */
export const PIN_PHOTOS = [
  { id: 1, src: 'https://images.unsplash.com/photo-1515023115689-589c33041d3c?w=400&h=600&fit=crop', height: 1.4 },
  { id: 2, src: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop', height: 1.2 },
  { id: 3, src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=700&fit=crop', height: 1.6 },
  { id: 4, src: 'https://images.unsplash.com/photo-1494790108755-2612896a9833?w=400&h=450&fit=crop', height: 1.1 },
  { id: 5, src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=650&fit=crop', height: 1.5 },
  { id: 6, src: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=550&fit=crop', height: 1.3 },
  { id: 7, src: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=480&fit=crop', height: 1.15 },
  { id: 8, src: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=620&fit=crop', height: 1.45 },
  { id: 9, src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=580&fit=crop', height: 1.35 },
  { id: 10, src: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop', height: 1.2 },
] as const

export const LIBRARY_HERO_SLIDES = PIN_PHOTOS.slice(0, 6)

export const LIBRARY_HERO_FALLBACK_SLIDES: LibraryHeroSlide[] = LIBRARY_HERO_SLIDES.map((s) => ({
  id: `fallback-${s.id}`,
  src: s.src,
}))

/**
 * Категория чипа при тапе по герою: индекс совпадает с порядком слайдов (0 — первое фото, …).
 * Шестой и далее слайды в карусели без привязки (индекс вне массива).
 */
export const LIBRARY_HERO_SLIDE_CATEGORY_BY_INDEX: readonly string[] = [
  'Уличные',
  'Бизнес',
  'Лайфстайл',
  'Зима',
  'Студия',
]

export const MOSCOW_PICK_TEMPLATE_IDS = [
  '47281965',
  '81927354',
  '36472819',
  '92736481',
  '58372914',
  '19283765',
  '73629185',
  '47382917',
  '82917465',
  '56473820',
]
export const SAINT_PETERSBURG_PICK_TEMPLATE_IDS = [
  '58392017',
  '10485729',
  '72910455',
  '88219473',
  '66492018',
  '39581726',
  '77190534',
  '21837465',
  '90217463',
  '41720958',
]
export const GEORGIA_PICK_TEMPLATE_IDS = [
  '18472971',
  '57291853',
  '83927422',
  '46182944',
  '29583753',
  '67392025',
  '48192763',
  '39284726',
  '91736489',
  '56391834',
]
export const TURKEY_PICK_TEMPLATE_IDS = [
  '18472969',
  '57291851',
  '83927420',
  '46182942',
  '29583751',
  '67392023',
  '48192761',
  '39284724',
  '91736487',
  '56391832',
]
export const KAZAKHSTAN_PICK_TEMPLATE_IDS = [
  '48291537',
  '73916284',
  '91574026',
  '62830491',
  '10485739',
  '86753091',
  '55012984',
  '33472816',
]
export const THAILAND_PICK_TEMPLATE_IDS = [
  '47281904',
  '81937463',
  '29384757',
  '67492019',
  '38572915',
  '57103830',
  '92047584',
  '74629106',
  '63849272',
  '18473921',
]
export const SUN_PICK_TEMPLATE_IDS = [
  '31749285',
  '95837421',
  '68492057',
  '23918476',
  '57103928',
  '84629103',
  '19384756',
  '62847391',
  '70518492',
]
export const COMO_PICK_TEMPLATE_IDS = [
  '47281903',
  '81937462',
  '29384756',
  '67492018',
  '38572914',
  '57103829',
  '92047583',
  '74629105',
  '63849271',
  '18473920',
]
export const SUNSET_PICK_TEMPLATE_IDS = [
  '58392017',
  '19485726',
  '72649513',
  '83920175',
  '46291857',
  '91827465',
  '30581729',
  '77192834',
  '66019283',
  '49281736',
]
export const FLOWERS_PICK_TEMPLATE_IDS = [
  '58392014',
  '84719302',
  '29475018',
  '66109237',
  '71820495',
  '39284716',
  '92017463',
  '51720389',
  '84029375',
  '61029384',
  '48392017',
  '75019462',
  '91827534',
  '56293810',
  '30758149',
  '64920873',
  '82045719',
  '19374628',
  '38472051',
]

/** Подборка «Летний вайб» между «С цветами» и «Популярное». */
export const SUMMER_VIBE_PICK_TEMPLATE_IDS = [
  '47281937',
  '58392048',
  '69403159',
  '70514270',
  '81625371',
  '92736482',
  '03847593',
  '14958604',
  '25069715',
  '36170826',
] as const

/** Подборка «В парке» сразу после «Летний вайб»: id + точный title. */
export const IN_PARK_CURATED_ROWS = [
  { id: '48291573', title: 'Солнечный парк стиль' },
  { id: '93716284', title: 'Закат в городе парк' },
  { id: '61582947', title: 'Весенние цветы парк' },
  { id: '28476195', title: 'Поле и солнце' },
  { id: '75391826', title: 'Солнечный пикник стиль' },
  { id: '16938475', title: 'Парк городской свет' },
  { id: '84729163', title: 'Цветочная арка стиль' },
  { id: '59273841', title: 'Сад качели утро' },
  { id: '30485729', title: 'Тень дерева портрет' },
  { id: '91827456', title: 'Зелёный парк платье' },
] as const satisfies readonly LibraryCuratedTemplateRow[]

/** Подборка «В автомобиле» сразу после «В парке»: id + точный title. */
export const IN_CAR_CURATED_ROWS = [
  { id: '84720195', title: 'Цветы в машине' },
  { id: '29471658', title: 'Серый уют в авто' },
  { id: '67190234', title: 'Светлый день в машине' },
  { id: '18274659', title: 'Чистый портрет в авто' },
  { id: '90517364', title: 'Солнечный селфи в машине' },
  { id: '47621905', title: 'Ночная поездка в авто' },
  { id: '35092841', title: 'Черный стиль в авто' },
  { id: '71936482', title: 'Селфи с аксессуарами' },
  { id: '26480173', title: 'Расслабленный момент в авто' },
] as const satisfies readonly LibraryCuratedTemplateRow[]

/** Подборка «Дома» сразу после «В автомобиле»: id + точный title. */
export const AT_HOME_CURATED_ROWS = [
  { id: '58392017', title: 'Утро в постели' },
  { id: '10485739', title: 'Зеркало в спальне' },
  { id: '72649105', title: 'Минималистичный интерьер портрет' },
  { id: '93847261', title: 'Домашний кэжуал стиль' },
  { id: '31572948', title: 'Зеркало и образ' },
  { id: '68294710', title: 'Домашний уют вечер' },
  { id: '54719283', title: 'Лифт селфи стиль' },
  { id: '90472618', title: 'Солнечный домашний портрет' },
  { id: '29174605', title: 'Зеркало и джинсы' },
  { id: '76829134', title: 'Кухня уютный момент' },
] as const satisfies readonly LibraryCuratedTemplateRow[]

/**
 * Подборка «Пляж» после «Дома»: id + точный title.
 * Из исходного списка из 10 позиций намеренно не включены 7-я и 9-я («Закат на берегу», «Вечер на пляже»).
 */
export const BEACH_CURATED_ROWS = [
  { id: '47281936', title: 'Отдых на террасе' },
  { id: '58392047', title: 'У пальмы на пляже' },
  { id: '69403158', title: 'В портовом кафе' },
  { id: '70514269', title: 'Ужин на закате' },
  { id: '81625370', title: 'Закатный ужин' },
  { id: '92736481', title: 'У infinity pool' },
  { id: '14958603', title: 'На скале у моря' },
  { id: '36170825', title: 'На скалах у моря' },
] as const satisfies readonly LibraryCuratedTemplateRow[]

/** Подборка «Горы» сразу после «Пляж»: id + точный title. */
export const MOUNTAINS_CURATED_ROWS = [
  { id: '59318472', title: 'Озеро среди скал' },
  { id: '74102958', title: 'Горный панорамный вид' },
  { id: '86240519', title: 'Цветочное поле горы' },
  { id: '27495031', title: 'Озеро и сосны' },
  { id: '91826475', title: 'Скалы у воды' },
  { id: '30591862', title: 'Горный пик вдали' },
  { id: '76103984', title: 'Горная дорога обзор' },
  { id: '64920183', title: 'Горная долина весна' },
  { id: '52039481', title: 'Горы и лес' },
  { id: '84372016', title: 'Закат в горах' },
] as const satisfies readonly LibraryCuratedTemplateRow[]

/**
 * Подборка «Красный дерзкий»: id + точный title — при одинаковых id в разных категориях
 * показывается только нужная карточка, без «левых» вариантов.
 */
export const RED_DARING_CURATED_ROWS = [
  { id: '58392050', title: 'Красное платье среди пальм' },
  { id: '69403161', title: 'Селфи в красном худи' },
  { id: '70514272', title: 'Красный топ в кафе' },
  { id: '81625373', title: 'Закат на балконе в красном' },
  { id: '92736484', title: 'Красное платье на пляже' },
  { id: '03847595', title: 'Красный на яхте' },
  { id: '14958606', title: 'Дерзкий красный в парке' },
  { id: '25069716', title: 'Красный свитер в кафе' },
  { id: '36170827', title: 'Дерзкий красный образ' },
] as const satisfies readonly LibraryCuratedTemplateRow[]

/**
 * «Город и улица» — Ереван: id + точный title, чтобы не подставлялись дубликаты id из других категорий.
 */
export const YEREVAN_CURATED_ROWS = [
  { id: '48291573', title: 'Панорама с Каскада' },
  { id: '73915482', title: 'Ужин на террасе' },
  { id: '61528493', title: 'Площадь Республики день' },
  { id: '90817264', title: 'Церковь ночью' },
  { id: '31478592', title: 'Республика ночью' },
  { id: '75618204', title: 'Городская прогулка' },
  { id: '90217465', title: 'Арт пространство' },
  { id: '64192857', title: 'Летний парк' },
  { id: '52819467', title: 'Горы и монастырь' },
  { id: '81726395', title: 'Старый храм' },
] as const satisfies readonly LibraryCuratedTemplateRow[]

/** Id шаблонов Еревана для карточки в рельсе «Город и улица» (порядок как в курируемом списке). */
export const YEREVAN_PICK_TEMPLATE_IDS: string[] = YEREVAN_CURATED_ROWS.map((row) => row.id)

/** Соответствие id → title для превью и модалки при дублях id. */
export const YEREVAN_PICK_TITLE_BY_ID: Record<string, string> = YEREVAN_CURATED_ROWS.reduce(
  (acc, row) => {
    acc[row.id] = row.title
    return acc
  },
  {} as Record<string, string>,
)

export const FLOWERS_EXCLUDE_MALE_RU_SUBSTRINGS = [
  'парень',
  'парни',
  'парня',
  'парням',
  'парнями',
  'мужчина',
  'мужчины',
  'мужчин',
  'мужской',
  'мужские',
  'жених',
  'жениха',
  'юноша',
  'юноши',
  'отец',
  'отца',
  'для мужчин',
] as const

export const FLOWERS_EXCLUDE_MALE_EN_TOKENS = new Set([
  'man',
  'men',
  'male',
  'males',
  'guy',
  'guys',
  'groom',
  'grooms',
  'boyfriend',
  'boyfriends',
  'husband',
  'husbands',
  'father',
  'dad',
  'daddy',
  'son',
  'sons',
  'gentleman',
  'gentlemen',
  'boy',
  'boys',
  'masculine',
])

export const FLOWERS_EXCLUDE_TITLE_SNIPPETS = ['бар у стойки вечер'] as const

export const MOSCOW_PICK_TITLE_BY_ID: Record<string, string> = {
  '47281965': 'Ночь у собора',
  '81927354': 'Взгляд на собор',
  '36472819': 'День у Василия',
  '92736481': 'Зима на Красной площади',
  '58372914': 'У Спасской башни',
  '19283765': 'У Казанского собора',
  '73629185': 'Улица в центре',
  '47382917': 'Новогодняя ярмарка',
  '82917465': 'Карусель зимой',
  '56473820': 'Ёлка в ГУМе',
}

export const LIBRARY_PICKS_RAILS: {
  id: string
  title: string
  cards: LibraryPickCard[]
}[] = [
  {
    id: 'locations',
    title: 'Локации',
    cards: [
      {
        id: 'loc1',
        title: 'Грузия',
        query: 'грузия',
        templateIds: GEORGIA_PICK_TEMPLATE_IDS,
      },
      {
        id: 'loc2',
        title: 'Турция',
        query: 'турция',
        templateIds: TURKEY_PICK_TEMPLATE_IDS,
      },
      {
        id: 'loc3',
        title: 'Казахстан',
        query: 'казахстан',
        templateIds: KAZAKHSTAN_PICK_TEMPLATE_IDS,
      },
      {
        id: 'loc4',
        title: 'Таиланд',
        query: 'таиланд',
        templateIds: THAILAND_PICK_TEMPLATE_IDS,
      },
    ],
  },
  {
    id: 'city',
    title: 'Город и улица',
    cards: [
      {
        id: 'c1',
        title: 'Москва',
        query: 'город',
        templateIds: MOSCOW_PICK_TEMPLATE_IDS,
      },
      {
        id: 'c4',
        title: 'Санкт-Петербург',
        query: 'санкт-петербург',
        templateIds: SAINT_PETERSBURG_PICK_TEMPLATE_IDS,
      },
      {
        id: 'c-yerevan',
        title: 'Ереван',
        query: 'ереван',
        templateIds: YEREVAN_PICK_TEMPLATE_IDS,
      },
    ],
  },
  {
    id: 'fresh',
    title: 'Свежие идеи',
    cards: [
      {
        id: 'f5',
        title: 'Солнце',
        query: 'солнце',
        templateIds: SUN_PICK_TEMPLATE_IDS,
      },
      {
        id: 'f6',
        title: 'Озеро Комо',
        query: 'озеро комо',
        templateIds: COMO_PICK_TEMPLATE_IDS,
      },
      {
        id: 'f-zakat',
        title: 'Закат',
        query: 'закат',
        templateIds: SUNSET_PICK_TEMPLATE_IDS,
      },
    ],
  },
]

export const LIBRARY_PICK_SKELETON_CELL_KEYS = [0, 1, 2, 3] as const
