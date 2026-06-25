import { z } from 'zod'

export const paymentFiltersSchema = z.object({
  project: z.string().optional(),
  counterparty: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  stage: z.enum(['development', 'support', 'ads', 'seo', 'content', 'design', 'other']).optional(),
  direction: z.enum(['in', 'out']).optional(),
  actStatus: z.enum(['NOT_SENT', 'AWAITING_SIGNATURE', 'CLOSED', 'NEEDS_ATTENTION']).optional(),
  q: z.string().optional(),
})
export type PaymentFiltersInput = z.infer<typeof paymentFiltersSchema>
