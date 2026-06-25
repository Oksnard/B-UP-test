import { listCounterparties } from '../repositories/counterparties'
import { ok } from '../utils/response'
export default defineEventHandler(async () => ok(await listCounterparties()))
