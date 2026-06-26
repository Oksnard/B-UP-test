import { readFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import type { Normalized } from '../server/import/normalize'

const prisma = new PrismaClient()

async function main() {
  const raw = await readFile('data/normalized.json', 'utf8')
  const data = JSON.parse(raw) as Normalized

  // Anchor payment dates so the newest payment is ~10 days before today.
  // This ensures all four act states (NOT_SENT, AWAITING_SIGNATURE, CLOSED,
  // NEEDS_ATTENTION) appear in the demo regardless of when the seed is run.
  const maxDate = Math.max(...data.payments.map((p) => new Date(p.date).getTime()))
  const shiftMs = (Date.now() - 10 * 86_400_000) - maxDate
  const shiftDate = (iso: string) => new Date(new Date(iso).getTime() + shiftMs)

  const cpIdByKey = new Map<string, string>()
  for (const c of data.counterparties) {
    const row = await prisma.counterparty.upsert({
      where: { inn_name: { inn: c.inn, name: c.name } },
      update: { ogrn: c.ogrn ?? null, bankAccount: c.bankAccount ?? null },
      create: {
        name: c.name,
        inn: c.inn,
        ogrn: c.ogrn ?? null,
        bankAccount: c.bankAccount ?? null,
      },
    })
    cpIdByKey.set(c.key, row.id)
  }

  const projIdByKey = new Map<string, string>()
  for (const p of data.projects) {
    const cpId = cpIdByKey.get(p.counterpartyKey)
    if (!cpId) continue
    const row = await prisma.project.upsert({
      where: { sourceKey: p.key },
      update: { name: p.name, counterpartyId: cpId },
      create: { sourceKey: p.key, name: p.name, counterpartyId: cpId },
    })
    projIdByKey.set(p.key, row.id)
  }

  for (const pay of data.payments) {
    const cpId = cpIdByKey.get(pay.counterpartyKey)
    if (!cpId) continue
    await prisma.payment.upsert({
      where: { sourceRef: pay.sourceRef },
      update: {},
      create: {
        date: shiftDate(pay.date),
        direction: pay.direction,
        amount: pay.amount,
        currency: pay.currency,
        purpose: pay.purpose,
        serviceStage: pay.serviceStage,
        expenseCategory: pay.expenseCategory ?? null,
        invoiceNumber: pay.invoiceNumber ?? null,
        contractNumber: pay.contractNumber ?? null,
        docNumber: pay.docNumber ?? null,
        sourceRef: pay.sourceRef,
        counterpartyId: cpId,
        projectId: pay.projectKey ? (projIdByKey.get(pay.projectKey) ?? null) : null,
      },
    })
  }

  for (const a of data.acts) {
    const payment = await prisma.payment.findUnique({ where: { sourceRef: a.sourceRef } })
    if (!payment) continue
    await prisma.act.upsert({
      where: { paymentId: payment.id },
      update: {},
      create: {
        paymentId: payment.id,
        isSent: a.isSent,
        isSigned: a.isSigned,
        sentAt: a.isSent ? payment.date : null,   // payment.date is already the shifted date
        signedAt: a.isSigned ? payment.date : null,
        managerComment: a.managerComment ?? null,
      },
    })
  }

  const counts = {
    counterparties: data.counterparties.length,
    projects: data.projects.length,
    payments: data.payments.length,
    acts: data.acts.length,
  }
  console.log('Seed complete:', counts)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
