// Иконки каналов службы заботы (те же SVG, что в шапке профиля).

import type { CareSocialChannelId } from '../../../../../careContact'
import logoTelegram from '../Media/logo_telegram.svg'
import logoVk from '../Media/logo_vk.svg'
import logoMax from '../Media/logo_max.svg'

/** Соответствие id канала и импортированного SVG для кнопок в блоке «Служба заботы». */
export const profileCareLogoById: Record<CareSocialChannelId, string> = {
  telegram: logoTelegram,
  vk: logoVk,
  max: logoMax,
}
