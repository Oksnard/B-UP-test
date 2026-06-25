export type Direction = 'in' | 'out'
export type ServiceStage = 'development' | 'support' | 'ads' | 'seo' | 'content' | 'design' | 'other'
export type ExpenseCategory = 'tax' | 'subcontractor' | 'fee' | 'other'
export type ActStatus = 'NOT_SENT' | 'AWAITING_SIGNATURE' | 'CLOSED' | 'NEEDS_ATTENTION'

/** Minimal shape the domain needs from a payment (decoupled from Prisma). */
export interface PaymentLike {
  date: Date | string
  amount: number // kopecks
  direction: Direction
  serviceStage: ServiceStage
  projectId?: string | null
  counterpartyId: string
  purpose: string
}

/** Minimal shape the domain needs from an act. */
export interface ActLike {
  isSent: boolean
  isSigned: boolean
}

export const ACT_STATUS_LABELS: Record<ActStatus, string> = {
  NOT_SENT: 'Не отправлен',
  AWAITING_SIGNATURE: 'Ожидает подписи',
  CLOSED: 'Закрыт',
  NEEDS_ATTENTION: 'Требует внимания',
}

export const SERVICE_STAGE_LABELS: Record<ServiceStage, string> = {
  development: 'Разработка',
  support: 'Сопровождение',
  ads: 'Реклама',
  seo: 'SEO',
  content: 'Контент',
  design: 'Дизайн',
  other: 'Прочее',
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  tax: 'Налоги / ЕНС / НДФЛ',
  subcontractor: 'Субподряд',
  fee: 'Комиссии',
  other: 'Прочее',
}
