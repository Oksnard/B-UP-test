import type { Direction, ServiceStage, ActStatus } from './types'

export interface PaymentFilters {
  project?: string
  counterparty?: string
  from?: string // ISO date (inclusive)
  to?: string   // ISO date (inclusive)
  stage?: ServiceStage
  direction?: Direction
  actStatus?: ActStatus
  q?: string
}

/** A payment row enriched with its derived act status, for filtering. */
export interface FilterableRow {
  date: Date | string
  direction: Direction
  serviceStage: ServiceStage
  counterpartyId?: string | null
  projectId?: string | null
  purpose: string
  status?: ActStatus | string
}

function toTime(d: Date | string): number {
  return (d instanceof Date ? d : new Date(d)).getTime()
}

export function matchesPaymentFilters(row: FilterableRow, f: PaymentFilters): boolean {
  if (f.project && row.projectId !== f.project) return false
  if (f.counterparty && row.counterpartyId !== f.counterparty) return false
  if (f.stage && row.serviceStage !== f.stage) return false
  if (f.direction && row.direction !== f.direction) return false
  if (f.actStatus && row.status !== f.actStatus) return false
  if (f.from && toTime(row.date) < toTime(f.from)) return false
  if (f.to && toTime(row.date) > toTime(`${f.to}T23:59:59`)) return false
  if (f.q && !row.purpose.toLowerCase().includes(f.q.toLowerCase())) return false
  return true
}
