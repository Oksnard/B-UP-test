import { listPayments } from '../repositories/payments'
import { paymentFiltersSchema } from '../utils/query'
import { ok, fail } from '../utils/response'

export default defineEventHandler(async (event) => {
  const parsed = paymentFiltersSchema.safeParse(getQuery(event))
  if (!parsed.success) { setResponseStatus(event, 400); return fail('Invalid filters', 'VALIDATION') }
  return ok(await listPayments({ ...parsed.data, direction: 'out' }))
})
