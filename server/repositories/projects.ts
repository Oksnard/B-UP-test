import { prisma } from '../utils/prisma'
import { computeActStatus } from '../domain/actStatus'
import type { Direction, ServiceStage } from '../domain/types'

/** Projects with aggregates: total paid, payment count, closed/open act counts, overall doc status. */
export async function listProjects(now = new Date()) {
  const projects = await prisma.project.findMany({
    include: { counterparty: true, payments: { include: { act: true } } },
    orderBy: { name: 'asc' },
  })
  return projects.map((proj) => {
    const incoming = proj.payments.filter((p) => p.direction === 'in')
    let total = 0, closed = 0, open = 0
    for (const p of incoming) {
      total += p.amount
      const status = computeActStatus(
        { date: p.date, amount: p.amount, direction: p.direction as Direction, serviceStage: p.serviceStage as ServiceStage, counterpartyId: p.counterpartyId, purpose: p.purpose },
        p.act, now,
      )
      if (status === 'CLOSED') closed++; else open++
    }
    const docStatus = incoming.length === 0 ? 'no_payments' : open === 0 ? 'all_closed' : closed === 0 ? 'none_closed' : 'partial'
    return {
      id: proj.id, name: proj.name, counterpartyName: proj.counterparty.name,
      status: proj.status, totalAmount: total, paymentsCount: incoming.length,
      closedActs: closed, openActs: open, docStatus,
    }
  })
}
