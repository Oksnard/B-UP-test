import { prisma } from '../utils/prisma'

/** Counterparties with incoming totals and payment counts. */
export async function listCounterparties() {
  const rows = await prisma.counterparty.findMany({
    include: { payments: true, projects: true },
    orderBy: { name: 'asc' },
  })
  return rows.map((c) => {
    const incoming = c.payments.filter((p) => p.direction === 'in')
    return {
      id: c.id, name: c.name, inn: c.inn, ogrn: c.ogrn,
      projectsCount: c.projects.length,
      paymentsCount: incoming.length,
      totalAmount: incoming.reduce((s, p) => s + p.amount, 0),
    }
  })
}
