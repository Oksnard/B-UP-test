import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

// Prisma resolves file: paths relative to prisma/schema.prisma, so this lands at prisma/test.db.
const DB = 'file:./test.db'
let prisma: PrismaClient

beforeAll(() => {
  // Start from a clean throwaway DB. We delete the file instead of using
  // `db push --force-reset`, which Prisma 6 blocks for AI agents.
  rmSync('prisma/test.db', { force: true })
  rmSync('prisma/test.db-journal', { force: true })
  execSync('npx prisma db push --skip-generate', { env: { ...process.env, DATABASE_URL: DB }, stdio: 'ignore' })
  process.env.DATABASE_URL = DB
  prisma = new PrismaClient({ datasources: { db: { url: DB } } })
})
afterAll(async () => { await prisma.$disconnect() })

describe('act update transitions', () => {
  it('stamps sentAt when marking sent, signedAt when signing', async () => {
    const cp = await prisma.counterparty.create({ data: { name: 'ООО Тест', inn: '7700000000' } })
    const pay = await prisma.payment.create({ data: {
      date: new Date('2026-08-10'), direction: 'in', amount: 100000, purpose: 'x',
      serviceStage: 'support', sourceRef: 'test-1', counterpartyId: cp.id,
    } })
    const act = await prisma.act.create({ data: { paymentId: pay.id } })

    const { updateAct } = await import('~~/server/repositories/acts')
    const sent = await updateAct(act.id, { isSent: true })
    expect(sent?.isSent).toBe(true)
    expect(sent?.sentAt).toBeInstanceOf(Date)

    const signed = await updateAct(act.id, { isSigned: true })
    expect(signed?.isSigned).toBe(true)
    expect(signed?.signedAt).toBeInstanceOf(Date)
  })
})
