import type { ServiceStage, ExpenseCategory } from './types'

const STAGE_RULES: Array<{ stage: ServiceStage; re: RegExp }> = [
  { stage: 'ads', re: /директ|контекстн|реклам|объявлени/i },
  { stage: 'seo', re: /\bseo\b|поисков[а-яёА-ЯЁ]* продвижени/i },
  { stage: 'support', re: /сопровождени|поддержк|обслуживани сайт/i },
  { stage: 'development', re: /разработк|доработк|вёрстк|верстк|модул/i },
  { stage: 'content', re: /публикаци|материал|контент|наполнени|копирайт/i },
  { stage: 'design', re: /дизайн|макет|логотип|брендбук/i },
]

/** Map a payment purpose string to a service stage. Order matters (most specific first). */
export function classifyServiceStage(purpose: string): ServiceStage {
  for (const { stage, re } of STAGE_RULES) if (re.test(purpose)) return stage
  return 'other'
}

const TAX_RE = /ндфл|енс|единый налог|страхов[а-яёА-ЯЁ]* взнос|пени|налог/i

/** Categorize an outgoing payment. */
export function classifyExpenseCategory(purpose: string, payeeName = ''): ExpenseCategory {
  if (TAX_RE.test(purpose)) return 'tax'
  if (/(^|\s)ип(\s|$)|индивидуальн\w* предприниматель/i.test(payeeName)) return 'subcontractor'
  if (/комисси|обслуживание счета|ведение счета/i.test(purpose)) return 'fee'
  return 'other'
}

/** Derive a human project name from purpose; fall back to counterparty-scoped name. */
export function deriveProjectName(purpose: string, counterpartyName: string): string {
  const quoted = purpose.match(/проект\s+["«]([^"»]+)["»]/i)
  if (quoted) return quoted[1].trim()
  return `Проект: ${counterpartyName}`
}
