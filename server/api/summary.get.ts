import { listPayments } from '../repositories/payments'
import { buildSummary } from '../domain/summary'
import { paymentFiltersSchema } from '../utils/query'
import { ok, fail } from '../utils/response'

export default defineEventHandler(async (event) => {
  const parsed = paymentFiltersSchema.safeParse(getQuery(event))
  if (!parsed.success) { setResponseStatus(event, 400); return fail('Invalid filters', 'VALIDATION') }
  // Summary spans both directions (income + expenses), honoring non-direction filters.
  const { direction, ...rest } = parsed.data
  const rows = await listPayments(rest)
  return ok(buildSummary(rows.map((r) => ({
    direction: r.direction, amount: r.amount, projectId: r.projectId,
    status: r.status, isSent: r.act?.isSent ?? false, isSigned: r.act?.isSigned ?? false,
    expenseCategory: (r.expenseCategory ?? undefined) as any,
  }))))
})
