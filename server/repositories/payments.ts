import { prisma } from '../utils/prisma'
import { computeActStatus } from '../domain/actStatus'
import { matchesPaymentFilters } from '../domain/filters'
import type { PaymentFiltersInput } from '../utils/query'
import type { ServiceStage, Direction, ActStatus } from '../domain/types'

/** Payment row enriched with derived act status and counterparty/project names. */
export async function listPayments(filters: PaymentFiltersInput, now = new Date()) {
  const rows = await prisma.payment.findMany({
    include: { counterparty: true, project: true, act: true },
    orderBy: { date: 'asc' },
  })
  return rows
    .map((p) => ({
      id: p.id,
      date: p.date,
      direction: p.direction as Direction,
      amount: p.amount,
      currency: p.currency,
      purpose: p.purpose,
      serviceStage: p.serviceStage as ServiceStage,
      expenseCategory: p.expenseCategory,
      invoiceNumber: p.invoiceNumber,
      contractNumber: p.contractNumber,
      docNumber: p.docNumber,
      counterpartyId: p.counterpartyId,
      counterpartyName: p.counterparty.name,
      projectId: p.projectId,
      projectName: p.project?.name ?? null,
      act: p.act ? { id: p.act.id, isSent: p.act.isSent, isSigned: p.act.isSigned, managerComment: p.act.managerComment } : null,
      status: computeActStatus(
        { date: p.date, amount: p.amount, direction: p.direction as Direction, serviceStage: p.serviceStage as ServiceStage, counterpartyId: p.counterpartyId, purpose: p.purpose },
        p.act, now,
      ) as ActStatus,
    }))
    .filter((row) => matchesPaymentFilters(row, filters))
}
