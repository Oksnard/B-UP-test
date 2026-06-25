import { describe, it, expect } from 'vitest'
import { rublesToKopecks, formatRubles } from '~~/server/domain/money'

describe('money', () => {
  it('parses "33 000,00" rubles into kopecks', () => {
    expect(rublesToKopecks('33 000,00')).toBe(3_300_000)
  })
  it('parses "8 190,00" into kopecks', () => {
    expect(rublesToKopecks('8 190,00')).toBe(819_000)
  })
  it('formats kopecks back to a ru rubles string (spaces normalized)', () => {
    expect(formatRubles(3_300_000).replace(/\s/g, ' ')).toBe('33 000,00 ₽')
  })
})
