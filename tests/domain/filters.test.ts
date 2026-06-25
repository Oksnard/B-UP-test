import { describe, it, expect } from 'vitest'
import { matchesPaymentFilters, type PaymentFilters, type FilterableRow } from '~~/server/domain/filters'

const base = {
  direction: 'in' as const, serviceStage: 'ads' as const,
  counterpartyId: 'c1', projectId: 'p1',
}
const row = (over: Partial<FilterableRow> = {}): FilterableRow => ({
  ...base, date: '2026-07-16', purpose: 'Настройка Директа этап 1', status: 'NOT_SENT', ...over,
})

describe('matchesPaymentFilters', () => {
  it('passes with empty filters', () => {
    expect(matchesPaymentFilters(row(), {})).toBe(true)
  })
  it('filters by project', () => {
    expect(matchesPaymentFilters(row(), { project: 'p1' })).toBe(true)
    expect(matchesPaymentFilters(row(), { project: 'p2' })).toBe(false)
  })
  it('filters by date range inclusive', () => {
    expect(matchesPaymentFilters(row({ date: '2026-07-16' }), { from: '2026-07-01', to: '2026-07-31' })).toBe(true)
    expect(matchesPaymentFilters(row({ date: '2026-08-01' }), { from: '2026-07-01', to: '2026-07-31' })).toBe(false)
  })
  it('filters by stage and direction', () => {
    expect(matchesPaymentFilters(row(), { stage: 'ads' })).toBe(true)
    expect(matchesPaymentFilters(row(), { stage: 'seo' })).toBe(false)
    expect(matchesPaymentFilters(row(), { direction: 'out' })).toBe(false)
  })
  it('searches purpose case-insensitively', () => {
    expect(matchesPaymentFilters(row(), { q: 'директ' })).toBe(true)
    expect(matchesPaymentFilters(row(), { q: 'seo' })).toBe(false)
  })
  it('filters by act status', () => {
    expect(matchesPaymentFilters(row({ status: 'CLOSED' }), { actStatus: 'CLOSED' })).toBe(true)
    expect(matchesPaymentFilters(row({ status: 'NOT_SENT' }), { actStatus: 'CLOSED' })).toBe(false)
  })
})
