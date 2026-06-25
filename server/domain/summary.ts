import type { Direction, ActStatus, ExpenseCategory } from './types'

export interface SummaryRow {
  direction: Direction
  amount: number // kopecks
  projectId?: string | null
  status?: ActStatus | string
  isSent: boolean
  isSigned: boolean
  expenseCategory?: ExpenseCategory | null
}

export interface Summary {
  totalIncome: number
  totalExpenses: number
  paymentsCount: number
  projectsCount: number
  closedActsAmount: number
  openActsAmount: number
  withoutSentActCount: number
  sentNotSignedCount: number
  expensesByCategory: Record<string, number>
}

/** Build dashboard summary from already-filtered rows. All money in kopecks. */
export function buildSummary(rows: SummaryRow[]): Summary {
  const s: Summary = {
    totalIncome: 0, totalExpenses: 0, paymentsCount: 0, projectsCount: 0,
    closedActsAmount: 0, openActsAmount: 0, withoutSentActCount: 0,
    sentNotSignedCount: 0, expensesByCategory: {},
  }
  const projects = new Set<string>()

  for (const r of rows) {
    if (r.direction === 'out') {
      s.totalExpenses += r.amount
      const key = r.expenseCategory ?? 'other'
      s.expensesByCategory[key] = (s.expensesByCategory[key] ?? 0) + r.amount
      continue
    }
    // incoming
    s.totalIncome += r.amount
    s.paymentsCount += 1
    if (r.projectId) projects.add(r.projectId)
    if (r.isSent && r.isSigned) s.closedActsAmount += r.amount
    else s.openActsAmount += r.amount
    if (!r.isSent) s.withoutSentActCount += 1
    if (r.isSent && !r.isSigned) s.sentNotSignedCount += 1
  }
  s.projectsCount = projects.size
  return s
}
