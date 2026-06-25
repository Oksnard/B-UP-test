import { z } from 'zod'
import { updateAct } from '../../repositories/acts'
import { ok, fail } from '../../utils/response'

const bodySchema = z.object({
  isSent: z.boolean().optional(),
  isSigned: z.boolean().optional(),
  managerComment: z.string().max(2000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) { setResponseStatus(event, 400); return fail('Invalid body', 'VALIDATION') }
  const updated = await updateAct(id, parsed.data)
  if (!updated) { setResponseStatus(event, 404); return fail('Act not found', 'NOT_FOUND') }
  return ok(updated)
})
