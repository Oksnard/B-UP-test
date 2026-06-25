import { describe, it, expect } from 'vitest'
import { computeActStatus, STALE_DAYS } from '~~/server/domain/actStatus'
import type { PaymentLike, ActLike } from '~~/server/domain/types'

const now = new Date('2026-08-14T00:00:00Z')
const recent = (): PaymentLike => ({
  date: '2026-08-10', amount: 1000, direction: 'in', serviceStage: 'other',
  counterpartyId: 'c1', purpose: 'x',
})
const old = (): PaymentLike => ({
  date: '2026-06-01', amount: 1000, direction: 'in', serviceStage: 'other',
  counterpartyId: 'c1', purpose: 'x',
})
const act = (isSent: boolean, isSigned: boolean): ActLike => ({ isSent, isSigned })

describe('computeActStatus', () => {
  it('CLOSED when sent and signed', () => {
    expect(computeActStatus(recent(), act(true, true), now)).toBe('CLOSED')
  })
  it('CLOSED even if old (signed wins over stale)', () => {
    expect(computeActStatus(old(), act(true, true), now)).toBe('CLOSED')
  })
  it('AWAITING_SIGNATURE when sent, not signed, recent', () => {
    expect(computeActStatus(recent(), act(true, false), now)).toBe('AWAITING_SIGNATURE')
  })
  it('NOT_SENT when neither, recent', () => {
    expect(computeActStatus(recent(), act(false, false), now)).toBe('NOT_SENT')
  })
  it('NEEDS_ATTENTION when not closed and older than STALE_DAYS', () => {
    expect(computeActStatus(old(), act(false, false), now)).toBe('NEEDS_ATTENTION')
    expect(computeActStatus(old(), act(true, false), now)).toBe('NEEDS_ATTENTION')
  })
  it('boundary: exactly STALE_DAYS old is NOT stale yet', () => {
    const d = new Date(now); d.setDate(d.getDate() - STALE_DAYS)
    const p: PaymentLike = { ...recent(), date: d }
    expect(computeActStatus(p, act(false, false), now)).toBe('NOT_SENT')
  })
  it('treats missing act as not sent / not signed', () => {
    expect(computeActStatus(recent(), null, now)).toBe('NOT_SENT')
  })
})
