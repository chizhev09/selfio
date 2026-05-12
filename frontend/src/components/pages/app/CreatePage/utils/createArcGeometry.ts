// Равномерное распределение углов для спиц двойной карусели «Создать».

/** Делит полный круг на count равных секторов (шаг 360°/n). */
export function createArcSpokeAngles(count: number): number[] {
  if (count <= 1) {
    return [0]
  }
  return Array.from({ length: count }, (_, i) => (360 * i) / count)
}
