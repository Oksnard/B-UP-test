import { rublesToKopecks } from '../domain/money'
import { classifyServiceStage, classifyExpenseCategory, deriveProjectName } from '../domain/classify'
import type { RawOperation } from './parseStatement'

// Agency INN — payments where counterparty INN matches this are internal transfers
// (deposit returns, own-account moves) and should not generate client projects.
const AGENCY_INN = '782934761208'

export interface NormCounterparty {
  key: string
  name: string
  inn: string
  ogrn?: string
  bankAccount?: string
}

export interface NormProject {
  key: string
  name: string
  counterpartyKey: string
}

export interface NormPayment {
  sourceRef: string
  date: string          // ISO yyyy-mm-dd
  direction: 'in' | 'out'
  amount: number        // kopecks
  currency: 'RUB'
  purpose: string
  serviceStage: string
  expenseCategory?: string
  invoiceNumber?: string
  contractNumber?: string
  docNumber?: string
  counterpartyKey: string
  projectKey?: string
}

export interface NormAct {
  sourceRef: string
  isSent: boolean
  isSigned: boolean
  managerComment?: string
}

export interface Normalized {
  counterparties: NormCounterparty[]
  projects: NormProject[]
  payments: NormPayment[]
  acts: NormAct[]
}

function isoDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split('.')
  return `${y}-${m}-${d}`
}

function pickCounterparty(block: string): {
  name: string
  inn: string
  ogrn?: string
  account?: string
} {
  const inn = block.match(/ИНН\s*(\d{10,12})/)?.[1] ?? '0000000000'
  const ogrn = block.match(/ОГРН[ИП]?\s*(\d{13,15})/)?.[1]
  // First 20-digit account in the block.
  const account = block.match(/\b(\d{20})\b/)?.[1]

  // Name patterns in priority order:
  // 1. Legal entity in quotes: ООО/АО/ПАО/АНО "Name"
  // 2. FILIAL "X" АО "Y" (bank branch)
  // 3. ИП LASTNAME FIRSTNAME PATRONYMIC
  // 4. УФК (government treasury)
  // 5. Bare all-caps personal name (e.g. КИСЕЛЕВ ПАВЕЛ ДМИТРИЕВИЧ, МАЛЬЦЕВА ЮЛИЯ СЕРГЕЕВНА)
  //    — present in salary / personal-account transfers where no ИП/ООО prefix exists
  const nameMatch =
    block.match(/((?:ООО|АО|ПАО|АНО)\s+["«][^"»\n]+["»])/)?.[1] ??
    block.match(/(ФИЛИАЛ\s+["«][^"»\n]+["»]\s+(?:АО|ООО)\s+["«][^"»\n]+["»])/)?.[1] ??
    block.match(/(ИП\s+[А-ЯЁ][А-ЯЁа-яё.]+(?:\s+[А-ЯЁ][А-ЯЁа-яё.]+){1,3})/)?.[1] ??
    block.match(/(УФК\s+ПО\s+[А-ЯЁа-яё\s-]+)/)?.[1]?.trim() ??
    // All-caps person name: 2-3 space-separated all-caps Cyrillic words, no legal prefix
    block.match(/\b([А-ЯЁ]{2,}\s+[А-ЯЁ]{2,}\s+[А-ЯЁ]{2,})\b/)?.[1] ??
    null

  const name = nameMatch ? nameMatch.replace(/\s+/g, ' ').trim() : 'Неизвестный контрагент'
  return { name, inn, ogrn, account }
}

/**
 * Build normalized entities from raw operations.
 * Acts get deterministic demo statuses cycling across all four states so the
 * dashboard shows every act state from the start.
 */
export function normalize(ops: RawOperation[]): Normalized {
  const counterparties = new Map<string, NormCounterparty>()
  const projects = new Map<string, NormProject>()
  const payments: NormPayment[] = []
  const acts: NormAct[] = []

  let incomingIndex = 0

  for (const op of ops) {
    const who = pickCounterparty(op.payerBlock)
    const cpKey = who.inn

    if (!counterparties.has(cpKey)) {
      counterparties.set(cpKey, {
        key: cpKey,
        name: who.name,
        inn: who.inn,
        ogrn: who.ogrn,
        bankAccount: who.account,
      })
    }

    const direction: 'in' | 'out' = op.isCredit ? 'in' : 'out'

    const invoiceNumber =
      op.purpose.match(/(?:сч(?:ет)?|сч)\w*\.?\s*№\s*(\d+)/i)?.[1] ??
      op.purpose.match(/счету\s+№\s*(\d+)/i)?.[1]

    const contractNumber = op.purpose.match(/договор\w*\s*№\s*([\d/-]+)/i)?.[1]

    let projectKey: string | undefined
    let serviceStage = 'other'
    let expenseCategory: string | undefined

    // Self-transfers (deposit returns, own-account moves) where counterparty INN
    // equals the agency INN are treated as internal: keep as-is but no client project.
    const isSelfTransfer = cpKey === AGENCY_INN

    if (direction === 'in' && !isSelfTransfer) {
      serviceStage = classifyServiceStage(op.purpose)
      const projectName = deriveProjectName(op.purpose, who.name)
      projectKey = `${cpKey}::${projectName}`
      if (!projects.has(projectKey)) {
        projects.set(projectKey, {
          key: projectKey,
          name: projectName,
          counterpartyKey: cpKey,
        })
      }
    } else {
      expenseCategory = classifyExpenseCategory(op.purpose, who.name)
    }

    payments.push({
      sourceRef: op.sourceRef,
      date: isoDate(op.date),
      direction,
      amount: rublesToKopecks(op.amount),
      currency: 'RUB',
      purpose: op.purpose,
      serviceStage,
      expenseCategory,
      invoiceNumber,
      contractNumber,
      docNumber: op.docNumber,
      counterpartyKey: cpKey,
      projectKey,
    })

    // Acts are only created for genuine incoming client payments (not self-transfers).
    if (direction === 'in' && !isSelfTransfer) {
      // Cycle deterministically: NOT_SENT → AWAITING_SIGNATURE → sent-not-signed → CLOSED
      const mod = incomingIndex % 4
      const isSent = mod !== 0          // 0=NOT_SENT, 1,2,3=sent
      const isSigned = mod === 3        // 3=CLOSED
      acts.push({
        sourceRef: op.sourceRef,
        isSent,
        isSigned,
        managerComment: mod === 1 ? 'Акт отправлен, ждём подписанный скан' : undefined,
      })
      incomingIndex++
    }
  }

  return {
    counterparties: [...counterparties.values()],
    projects: [...projects.values()],
    payments,
    acts,
  }
}
