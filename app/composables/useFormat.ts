import { formatRubles } from '~~/server/domain/money'
import { ACT_STATUS_LABELS, SERVICE_STAGE_LABELS, EXPENSE_CATEGORY_LABELS } from '~~/server/domain/types'

export function useFormat() {
  const money = (kopecks: number) => formatRubles(kopecks)
  const date = (iso: string | Date) => new Date(iso).toLocaleDateString('ru-RU')
  const statusLabel = (s: keyof typeof ACT_STATUS_LABELS) => ACT_STATUS_LABELS[s] ?? s
  const stageLabel = (s: keyof typeof SERVICE_STAGE_LABELS) => SERVICE_STAGE_LABELS[s] ?? s
  const expenseLabel = (s: keyof typeof EXPENSE_CATEGORY_LABELS) => EXPENSE_CATEGORY_LABELS[s] ?? s
  return { money, date, statusLabel, stageLabel, expenseLabel }
}
