import { describe, it, expect } from 'vitest'
import { classifyServiceStage, classifyExpenseCategory, deriveProjectName } from '~~/server/domain/classify'

describe('classifyServiceStage', () => {
  it('detects support', () => {
    expect(classifyServiceStage('Оплата за техническое сопровождение сайта по сч. № 742')).toBe('support')
  })
  it('detects ads (Директ / контекстная)', () => {
    expect(classifyServiceStage('настройка и сопровождение Директа с 13.07 по 12.08')).toBe('ads')
    expect(classifyServiceStage('Настройка и ведение кампании контекстной рекламы (этап 1)')).toBe('ads')
  })
  it('detects development', () => {
    expect(classifyServiceStage('Услуги разработки и доработки сайтов по договору № 418')).toBe('development')
  })
  it('detects content', () => {
    expect(classifyServiceStage('за публикацию новых материалов на сайте')).toBe('content')
  })
  it('falls back to other', () => {
    expect(classifyServiceStage('Прочий платеж')).toBe('other')
  })
})

describe('classifyExpenseCategory', () => {
  it('detects tax for НДФЛ/ЕНС', () => {
    expect(classifyExpenseCategory('НДФЛ по расчету авансового платежа')).toBe('tax')
    expect(classifyExpenseCategory('Пополнение ЕНС. Единый налог по спецрежиму')).toBe('tax')
  })
  it('detects subcontractor for ИП payee', () => {
    expect(classifyExpenseCategory('Услуги разработки сайтов по договору № 418', 'ИП КАРПОВ ГЛЕБ')).toBe('subcontractor')
  })
})

describe('deriveProjectName', () => {
  it('extracts explicit project name in quotes', () => {
    expect(deriveProjectName('проект "Складские модули"', 'ИП КАРПОВ')).toBe('Складские модули')
  })
  it('falls back to counterparty-based project name', () => {
    expect(deriveProjectName('Оплата за сопровождение сайта', 'ООО "Ледник-Старт"'))
      .toBe('Проект: ООО "Ледник-Старт"')
  })
})
