import { describe, it, expect } from 'vitest'
import { normalize } from '~~/server/import/normalize'
import type { RawOperation } from '~~/server/import/parseStatement'

const incoming: RawOperation = {
  date: '16.07.2026',
  amount: '33 000,00',
  docNumber: '9142',
  payerBlock: '40702810504010067142 ИНН 5408124976 ОГРН 1235400078124 ООО "ЛЕДНИК-СТАРТ"',
  purpose: 'Оплата за техническое сопровождение сайта по сч. № 742 от 09.07.2026 г.',
  sourceRef: 'op-16.07.2026-9142-3300000',
  isCredit: true,
}

const tax: RawOperation = {
  date: '15.07.2026',
  amount: '3 280,00',
  docNumber: '581',
  payerBlock: '40802810937184056213 ИНН 782934761208 ОГРНИП 326784500918273 ИП ГРОМОВ А.В.',
  purpose: 'НДФЛ по расчету авансового платежа. код: ref-73a1-ef20-1101. НДС не облагается.',
  sourceRef: 'ref-73a1-ef20-1101',
  isCredit: false,
}

const incomingKarpov: RawOperation = {
  date: '17.07.2026',
  amount: '8 190,00',
  docNumber: '3186',
  payerBlock: '40702810777020091456 ИНН 7813492063 ОГРН 1237800146287 ООО "ВЕКТОР-ТУР"',
  purpose: 'Оплата по счету № 751 от 16 июля 2026 г. за публикацию новых материалов на сайте.',
  sourceRef: 'op-17.07.2026-3186-819000',
  isCredit: true,
}

describe('normalize', () => {
  it('creates an incoming payment with classified stage, invoice number and an act', () => {
    const n = normalize([incoming])
    expect(n.payments).toHaveLength(1)
    expect(n.payments[0].direction).toBe('in')
    expect(n.payments[0].amount).toBe(3_300_000)
    expect(n.payments[0].serviceStage).toBe('support')
    expect(n.payments[0].invoiceNumber).toBe('742')
    expect(n.acts).toHaveLength(1)
    expect(n.counterparties[0].name).toContain('ЛЕДНИК-СТАРТ')
    expect(n.projects).toHaveLength(1)
  })

  it('classifies a tax debit as outgoing expense with no act and no project', () => {
    const n = normalize([tax])
    expect(n.payments[0].direction).toBe('out')
    expect(n.payments[0].expenseCategory).toBe('tax')
    expect(n.acts).toHaveLength(0)
    expect(n.projects).toHaveLength(0)
  })

  it('detects content stage for publication payment', () => {
    const n = normalize([incomingKarpov])
    expect(n.payments[0].direction).toBe('in')
    expect(n.payments[0].serviceStage).toBe('content')
    expect(n.payments[0].amount).toBe(819_000)
  })

  it('deduplicates counterparties by INN across multiple ops', () => {
    const op2: RawOperation = {
      ...incoming,
      sourceRef: 'op-16.07.2026-9142-3300001',
      amount: '10 000,00',
    }
    const n = normalize([incoming, op2])
    expect(n.counterparties).toHaveLength(1)
    expect(n.payments).toHaveLength(2)
  })

  it('cycles act statuses deterministically across incoming payments', () => {
    // 4 incoming payments cycle: NOT_SENT, AWAITING_SIGNATURE, ?, CLOSED
    const base = (ref: string): RawOperation => ({ ...incoming, sourceRef: ref })
    const n = normalize([
      base('ref-a'), base('ref-b'), base('ref-c'), base('ref-d'),
    ])
    expect(n.acts[0]).toMatchObject({ isSent: false, isSigned: false }) // NOT_SENT
    expect(n.acts[1]).toMatchObject({ isSent: true,  isSigned: false }) // AWAITING_SIGNATURE
    expect(n.acts[2]).toMatchObject({ isSent: true,  isSigned: false }) // sent, not signed
    expect(n.acts[3]).toMatchObject({ isSent: true,  isSigned: true  }) // CLOSED
  })

  it('converts date from dd.mm.yyyy to ISO yyyy-mm-dd', () => {
    const n = normalize([incoming])
    expect(n.payments[0].date).toBe('2026-07-16')
  })
})
