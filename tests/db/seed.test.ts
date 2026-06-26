import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

// Throwaway DB; Prisma resolves file: paths relative to prisma/schema.prisma.
const DB = 'file:./seedtest.db'
let prisma: PrismaClient

function runSeed() {
  execSync('npx tsx prisma/seed.ts', {
    env: { ...process.env, DATABASE_URL: DB },
    stdio: 'ignore',
  })
}

async function counts() {
  return {
    counterparty: await prisma.counterparty.count(),
    project: await prisma.project.count(),
    payment: await prisma.payment.count(),
    act: await prisma.act.count(),
  }
}

beforeAll(() => {
  rmSync('prisma/seedtest.db', { force: true })
  rmSync('prisma/seedtest.db-journal', { force: true })
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: DB },
    stdio: 'ignore',
  })
  prisma = new PrismaClient({ datasources: { db: { url: DB } } })
})

afterAll(async () => {
  await prisma.$disconnect()
  rmSync('prisma/seedtest.db', { force: true })
  rmSync('prisma/seedtest.db-journal', { force: true })
})

describe('seed idempotency', () => {
  it('running the seed twice does not duplicate any rows', async () => {
    runSeed()
    const first = await counts()
    runSeed()
    const second = await counts()
    expect(second).toEqual(first)
  })
})
