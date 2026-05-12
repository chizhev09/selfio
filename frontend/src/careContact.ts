// Общие каналы «службы заботы»: те же URL, что в профиле (соцсети и почта).

/** Почта для связи; при деплое можно переопределить через VITE_CONTACT_EMAIL. */
export const CARE_CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || 'chizhev15@bk.ru'

/** Соцсети с человекочитаемыми подписями для лендинга и экрана профиля. */
export const careSocialChannels = [
  {
    id: 'telegram',
    label: 'Мы в Telegram',
    href: 'https://t.me/odinokov_al',
    ariaLabel: 'Telegram',
  },
  {
    id: 'vk',
    label: 'Мы в ВК',
    href: 'https://vk.com/odinokov11',
    ariaLabel: 'ВКонтакте',
  },
  {
    id: 'max',
    label: 'Мы в MAX',
    href: 'https://max.ru/u/f9LHodD0cOL5YDct7y4B1LUDXiipd73kod16l1Rwvv2QH_FbBbcwda1dHK8',
    ariaLabel: 'MAX',
  },
] as const

export type CareSocialChannelId = (typeof careSocialChannels)[number]['id']
