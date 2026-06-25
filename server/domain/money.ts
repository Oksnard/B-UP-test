/** Money is stored and computed in integer kopecks to avoid float drift. */
export function rublesToKopecks(raw: string): number {
  // "33 000,00" -> 3300000 ; tolerate NBSP, thin space, regular space as thousands sep
  const cleaned = raw.replace(/[\s  ]/g, '').replace(',', '.')
  const value = Number.parseFloat(cleaned)
  if (Number.isNaN(value)) throw new Error(`Invalid money value: ${raw}`)
  return Math.round(value * 100)
}

export function formatRubles(kopecks: number): string {
  const rubles = kopecks / 100
  const s = rubles.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${s} ₽`
}
