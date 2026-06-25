import type { PaymentLike, ActLike, ActStatus } from './types'

/** A non-closed act older than this many days needs manager attention. */
export const STALE_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY)
}

/**
 * Derive act status from booleans + payment age. Status is never stored.
 * Order: CLOSED -> NEEDS_ATTENTION (stale & not closed) -> AWAITING_SIGNATURE -> NOT_SENT.
 */
export function computeActStatus(
  payment: PaymentLike,
  act: ActLike | null | undefined,
  now: Date = new Date(),
): ActStatus {
  const isSent = act?.isSent ?? false
  const isSigned = act?.isSigned ?? false
  if (isSent && isSigned) return 'CLOSED'

  const date = payment.date instanceof Date ? payment.date : new Date(payment.date)
  if (daysBetween(date, now) > STALE_DAYS) return 'NEEDS_ATTENTION'

  if (isSent && !isSigned) return 'AWAITING_SIGNATURE'
  return 'NOT_SENT'
}
