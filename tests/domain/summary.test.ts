import { describe, it, expect } from 'vitest'
import { buildSummary, type SummaryRow } from '~~/server/domain/summary'

const rows: SummaryRow[] = [
  { direction: 'in', amount: 3_300_000, projectId: 'p1', status: 'CLOSED', isSent: true },
  { direction: 'in', amount: 5_600_000, projectId: 'p1', status: 'AWAITING_SIGNATURE', isSent: true },
  { direction: 'in', amount: 819_000,   projectId: 'p2', status: 'NOT_SENT', isSent: false },
  { direction: 'out', amount: 2_080_000, projectId: null, status: undefined, isSent: false, expenseCategory: 'tax' },
]

describe('buildSummary', () => {
  it('aggregates incoming totals and act buckets', () => {
    const s = buildSummary(rows)
    expect(s.totalIncome).toBe(3_300_000 + 5_600_000 + 819_000)
    expect(s.paymentsCount).toBe(3)        // incoming only
    expect(s.projectsCount).toBe(2)        // p1, p2
    expect(s.closedActsAmount).toBe(3_300_000)
    expect(s.openActsAmount).toBe(5_600_000 + 819_000)
    expect(s.withoutSentActCount).toBe(1)  // the NOT_SENT one
    expect(s.sentNotSignedCount).toBe(1)   // the AWAITING_SIGNATURE one
  })
  it('aggregates expenses by category', () => {
    const s = buildSummary(rows)
    expect(s.totalExpenses).toBe(2_080_000)
    expect(s.expensesByCategory.tax).toBe(2_080_000)
  })
})
