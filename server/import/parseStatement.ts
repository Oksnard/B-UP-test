import { readFile } from 'node:fs/promises'
import { extractText, getDocumentProxy } from 'unpdf'

/** One raw operation extracted from the statement before normalization. */
export interface RawOperation {
  date: string       // dd.mm.yyyy as printed
  amount: string     // ru money string, e.g. "33 000,00"
  docNumber?: string
  payerBlock: string // counterparty-side text (name/inn/ogrn/account)
  purpose: string
  sourceRef: string  // ref-code from purpose or synthetic key
  isCredit: boolean  // true when money credited TO the agency account (incoming)
}

// The agency's own current account — always present in every operation.
const AGENCY_ACCOUNT = '40802810937184056213'

export async function extractStatementText(pdfPath: string): Promise<string> {
  const buf = new Uint8Array(await readFile(pdfPath))
  const pdf = await getDocumentProxy(buf)
  const { text } = await extractText(pdf, { mergePages: true })
  return text
}

/**
 * Split the merged statement text into individual operations.
 *
 * Layout (one operation, both directions share this structure):
 *   dd.mm.yyyy  ACCOUNT_A  INN ... NAME_A  ACCOUNT_B  INN ... NAME_B
 *   AMOUNT  DOCNUM  VO  BIK BANKNAME  PURPOSE. ref-XXXX. НДС ...
 *
 * For CREDIT (incoming): ACCOUNT_A is the payer (client), ACCOUNT_B is agency.
 * For DEBIT (outgoing):  ACCOUNT_A is the agency, ACCOUNT_B is the payee.
 *
 * Strategy: anchor on `dd.mm.yyyy <20-digit-account>` boundaries, slice between
 * them, then extract fields from each segment.
 */
export function parseOperations(text: string): RawOperation[] {
  // Anchor: date followed by a 20-digit account number.
  const anchorRe = /(\d{2}\.\d{2}\.\d{4})\s+(\d{20})/g
  const anchors: Array<{ start: number; date: string; firstAccount: string }> = []

  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(text)) !== null) {
    anchors.push({ start: m.index, date: m[1], firstAccount: m[2] })
  }

  const ops: RawOperation[] = []

  for (let i = 0; i < anchors.length; i++) {
    const segEnd = anchors[i + 1]?.start ?? text.length
    const seg = text.slice(anchors[i].start, segEnd)

    // A valid operation segment must contain an amount (digits with comma+2 decimals).
    // Page header repeats contain no amount — skip them.
    const amountMatch = seg.match(/\b(\d[\d\s  ]*,\d{2})\b/)
    if (!amountMatch) continue

    // Skip segments that ARE page headers (column-label repeats with no real data).
    // Must check at segment start only — real op segments can contain page-break header
    // text at their tail when the page break falls mid-operation.
    const trimmedSeg = seg.trimStart()
    if (
      trimmedSeg.startsWith('Назначение платежа Дебет') ||
      trimmedSeg.startsWith('Дата проводки Счет')
    ) continue

    const amount = amountMatch[1].trim()
    const ref = seg.match(/код:\s*(ref-[\w-]+)/i)?.[1]
    const docNumber = extractDocNumber(seg)
    const purpose = extractPurpose(seg)

    // Credit (incoming) when the FIRST account in the segment is NOT the agency account.
    const isCredit = anchors[i].firstAccount !== AGENCY_ACCOUNT

    // payerBlock: the counterparty entity block (client for credits, payee for debits).
    const payerBlock = extractCounterpartyBlock(seg, isCredit)

    const sourceRef = ref
      ?? `op-${anchors[i].date}-${docNumber ?? String(i)}-${amount.replace(/\D/g, '')}`

    ops.push({ date: anchors[i].date, amount, docNumber, payerBlock, purpose, sourceRef, isCredit })
  }

  return ops
}

/**
 * Extract the document number.
 * In the statement it appears right after the amount: `AMOUNT  DOCNUM  VO  БИК`.
 */
function extractDocNumber(seg: string): string | undefined {
  const m = seg.match(/\d[\d\s  ]*,\d{2}\s+(\d{2,6})\s+\d{2}\s+БИК/)
  return m?.[1]
}

/**
 * Extract the purpose text from a segment.
 *
 * After the last `БИК <9digits>` the text is: `<BankEntityName> <PurposeText>`.
 * Bank entity name formats observed:
 *   - `ООО "Речбанк"`                              — quoted, ends at first `"`
 *   - `АО "Фин-Мост Банк"`                         — quoted
 *   - `ФИЛИАЛ "СЕВЕРНЫЙ" АО "НАВИГАТОР БАНК"`      — TWO quoted segments; ends at second `"`
 *   - `ОКЦ № 7 Банка России//УФК по Арктическому краю` — unquoted plain text
 *
 * Strategy: match the bank entity name explicitly, then take the remainder.
 */
function extractPurpose(seg: string): string {
  const parts = seg.split(/БИК\s+\d{9}/)
  if (parts.length < 2) return seg.replace(/\s+/g, ' ').trim().slice(0, 400)

  const afterBik = parts[parts.length - 1].trimStart()

  // Try to match known bank-entity patterns at the start of afterBik.
  // Pattern A: FILIAL + quoted name + legal-form + quoted name (e.g. `ФИЛИАЛ "СЕВЕРНЫЙ" АО "НАВИГАТОР БАНК"`)
  const filialMatch = afterBik.match(/^ФИЛИАЛ\s+"[^"]+"\s+(?:АО|ООО|ПАО)\s+"[^"]+"/)
  if (filialMatch) {
    return stripPageBreak(afterBik.slice(filialMatch[0].length).trimStart())
  }

  // Pattern B: legal-form (ООО/АО/ПАО/АНО) + quoted name
  const legalMatch = afterBik.match(/^(?:ООО|АО|ПАО|АНО)\s+"[^"]+"/)
  if (legalMatch) {
    return stripPageBreak(afterBik.slice(legalMatch[0].length).trimStart())
  }

  // Pattern C: no quotes — plain bank name ending before a recognizable purpose keyword.
  const purposeStart = afterBik.search(
    /(?:Оплата|Услуги|НДФЛ|Пополнение|Перевод|Комисси|Начисление|Возврат|Ежемесячный|Счет\s|Для\s|Прото|Заработн)/,
  )
  const raw = purposeStart >= 0 ? afterBik.slice(purposeStart) : afterBik
  return stripPageBreak(raw)
}

/** Remove page-break header text appended to a purpose string and normalise whitespace. */
function stripPageBreak(s: string): string {
  // Page break marker: `<N> / <M>` followed by date and bank header text.
  return s.split(/\s+\d+\s*\/\s*\d+\s+\d{2}\.\d{2}\.\d{4}/)[0]
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
}

/**
 * Extract the counterparty block (name, INN, OGRN, account).
 * For credit (incoming): counterparty is the FIRST account block (before agency block).
 * For debit (outgoing): counterparty is the SECOND account block (after agency block).
 */
function extractCounterpartyBlock(seg: string, isCredit: boolean): string {
  const accounts: Array<{ index: number; account: string }> = []
  const re = /\b(\d{20})\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(seg)) !== null) {
    accounts.push({ index: m.index, account: m[1] })
  }

  if (accounts.length < 2) return seg.slice(0, 300)

  const agencyIdx = accounts.findIndex(a => a.account === AGENCY_ACCOUNT)
  if (agencyIdx < 0) return seg.slice(0, 300)

  if (isCredit) {
    // Counterparty block ends where the agency account starts.
    return seg.slice(0, accounts[agencyIdx].index).trim()
  } else {
    // Counterparty block starts after the agency account + INN/OGRN/name fragment.
    // Find the next 20-digit account after the agency one.
    const cpAccountEntry = accounts.find((a, idx) => idx > agencyIdx && a.account !== AGENCY_ACCOUNT)
    if (!cpAccountEntry) return seg.slice(accounts[agencyIdx].index + AGENCY_ACCOUNT.length, 400).trim()

    // Include the block from the CP account start up to the amount pattern.
    const cpStart = cpAccountEntry.index
    const afterCp = seg.slice(cpStart)
    const amountIdx = afterCp.search(/\b\d[\d\s  ]*,\d{2}\b/)
    return (amountIdx > 0 ? afterCp.slice(0, amountIdx) : afterCp).trim()
  }
}
