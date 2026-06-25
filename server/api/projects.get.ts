import { listProjects } from '../repositories/projects'
import { ok } from '../utils/response'
export default defineEventHandler(async () => ok(await listProjects()))
