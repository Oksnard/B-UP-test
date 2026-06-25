# Payments / Projects / Acts Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Nuxt 3 dashboard that links projects/legal-entities → payments → work stages → closing-document (act) status, seeded from a real parsed bank statement PDF.

**Architecture:** Layered TypeScript. Pure domain logic (`server/domain`) holds act-status/summary/filter/classify rules with full unit tests and no framework deps. Repositories wrap Prisma. Thin Nitro REST endpoints validate with zod and return a `{data,error,meta}` envelope. An import layer parses the PDF into normalized rows for the seed. Vue 3 pages only render and call the API.

**Tech Stack:** Nuxt 3, Nitro, Vue 3 (`<script setup>`), Prisma, SQLite (local) / Postgres (Neon prod), zod, Vitest, unpdf.

**Conventions:** Code & comments in English; UI strings & README in Russian. Money as integer **kopecks** in DB and domain to avoid float drift; format to rubles only in the view. Dates stored as ISO `DateTime`.

---

## File Structure

```
nuxt.config.ts                       — Nuxt config (nitro preset, runtimeConfig)
vitest.config.ts                     — Vitest config
tsconfig.json                        — extends .nuxt tsconfig
package.json                         — scripts & deps
.gitignore .env.example vercel.json
prisma/schema.prisma                 — models + enums
prisma/seed.ts                       — seed from data/normalized.json
server/domain/
   money.ts                          — kopeck helpers + ruble formatting (shared)
   types.ts                          — domain TS types/enums (framework-free)
   actStatus.ts                      — computeActStatus (4 states)
   summary.ts                        — buildSummary aggregates
   filters.ts                        — applyPaymentFilters predicates
   classify.ts                       — purpose → direction/stage/expenseCategory/project name
server/import/
   parseStatement.ts                 — PDF text → raw operation rows
   normalize.ts                      — raw rows → normalized entities (counterparties/projects/payments/acts)
   run-import.ts                     — CLI: PDF → data/normalized.json
server/repositories/
   payments.ts projects.ts counterparties.ts acts.ts
server/utils/
   response.ts                       — ok()/fail() envelope helpers
   prisma.ts                         — PrismaClient singleton
   query.ts                          — parse/validate list query (zod)
server/api/
   summary.get.ts payments.get.ts projects.get.ts
   counterparties.get.ts expenses.get.ts acts/[id].patch.ts
app/
   app.vue
   pages/index.vue                   — dashboard (summary + filters + payments tab)
   pages/projects.vue                — projects tab
   pages/expenses.vue                — expenses tab
   components/SummaryCards.vue FiltersBar.vue PaymentsTable.vue
   components/ActStatusBadge.vue ProjectsTable.vue ExpensesTable.vue
   composables/useApi.ts useFormat.ts
   assets/main.css
tests/
   domain/actStatus.test.ts summary.test.ts filters.test.ts classify.test.ts money.test.ts
   import/normalize.test.ts
   api/acts.test.ts
data/
   bank_statement.pdf                — committed real source PDF
   normalized.json                   — committed normalized seed (reproducible)
```

---

## Task 1: Scaffold project, configs, tooling

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`, `app/app.vue`, `app/assets/main.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "b-up-payments-dashboard",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare && prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma db push --force-reset && npm run db:seed",
    "import:pdf": "tsx server/import/run-import.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@prisma/client": "^6.1.0",
    "nuxt": "^3.14.0",
    "unpdf": "^0.12.1",
    "vue": "^3.5.0",
    "vue-router": "^4.4.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "prisma": "^6.1.0",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```

- [ ] **Step 2: Create `nuxt.config.ts`**

```ts
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  },
  nitro: { preset: process.env.NITRO_PRESET || undefined },
})
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{ "extends": "./.nuxt/tsconfig.json" }
```

- [ ] **Step 4: Create `vitest.config.ts`** (domain tests need no Nuxt env)

```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('./', import.meta.url)),
      '@@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
```

- [ ] **Step 5: Create `.gitignore`**

```gitignore
node_modules
.nuxt
.output
.data
dist
*.log
.env
.env.*
!.env.example
prisma/*.db
prisma/*.db-journal
.scratch
.DS_Store
.vercel
coverage
```

- [ ] **Step 6: Create `.env.example`**

```dotenv
# Local: SQLite. Production (Vercel): Neon Postgres connection string.
DATABASE_URL="file:./prisma/dev.db"
# On Vercel set: DATABASE_URL="postgresql://USER:PASSWORD@HOST/db?sslmode=require"
# and NITRO_PRESET="vercel"
```

- [ ] **Step 7: Create `app/app.vue`**

```vue
<template>
  <div class="app">
    <header class="app__header">
      <h1>Учёт оплат и закрывающих документов</h1>
      <nav class="app__nav">
        <NuxtLink to="/">Оплаты</NuxtLink>
        <NuxtLink to="/projects">Проекты</NuxtLink>
        <NuxtLink to="/expenses">Расходы</NuxtLink>
      </nav>
    </header>
    <main class="app__main"><NuxtPage /></main>
  </div>
</template>
```

- [ ] **Step 8: Create `app/assets/main.css`** (minimal, clean, responsive)

```css
:root { --bg:#f6f7f9; --card:#fff; --line:#e4e7eb; --ink:#1f2733; --muted:#6b7280;
  --ok:#16a34a; --warn:#d97706; --bad:#dc2626; --info:#2563eb; }
* { box-sizing: border-box; }
body { margin:0; font-family: ui-sans-serif,system-ui,'Segoe UI',Roboto,Arial; color:var(--ink); background:var(--bg); }
.app__header { padding:16px 24px; background:var(--card); border-bottom:1px solid var(--line);
  display:flex; flex-wrap:wrap; gap:12px 24px; align-items:center; justify-content:space-between; }
.app__header h1 { font-size:18px; margin:0; }
.app__nav { display:flex; gap:16px; }
.app__nav a { color:var(--muted); text-decoration:none; font-weight:600; }
.app__nav a.router-link-active { color:var(--info); }
.app__main { padding:24px; max-width:1200px; margin:0 auto; }
.card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:16px; }
table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
th,td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); font-size:14px; vertical-align:top; }
th { background:#fafbfc; color:var(--muted); font-weight:600; }
.badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:600; }
@media (max-width:720px){ .app__main{padding:12px} th,td{padding:8px} }
```

- [ ] **Step 9: Commit**

```bash
git add package.json nuxt.config.ts tsconfig.json vitest.config.ts .gitignore .env.example app/
git commit -m "chore: scaffold Nuxt 3 project, tooling and base layout"
```

---

## Task 2: Prisma schema and enums

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Write `prisma/schema.prisma`** (provider switch via env; money as Int kopecks)

```prisma
generator client { provider = "prisma-client-js" }

datasource db {
  // Local default SQLite. On Vercel set provider to postgresql via env on the prod branch.
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Counterparty {
  id            String    @id @default(cuid())
  name          String
  inn           String
  kpp           String?
  ogrn          String?
  bankAccount   String?
  bankName      String?
  contactPerson String?
  projects      Project[]
  payments      Payment[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@unique([inn, name])
}

model Project {
  id             String       @id @default(cuid())
  name           String
  description    String?
  status         String       @default("active") // active | closed
  counterpartyId String
  counterparty   Counterparty @relation(fields: [counterpartyId], references: [id])
  payments       Payment[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model Payment {
  id              String       @id @default(cuid())
  date            DateTime
  direction       String       // in | out
  amount          Int          // kopecks
  currency        String       @default("RUB")
  purpose         String
  serviceStage    String       @default("other") // development|support|ads|seo|content|design|other
  expenseCategory String?      // tax|subcontractor|fee|other (only when direction=out)
  invoiceNumber   String?
  contractNumber  String?
  docNumber       String?
  sourceRef       String       @unique
  counterpartyId  String
  counterparty    Counterparty @relation(fields: [counterpartyId], references: [id])
  projectId       String?
  project         Project?     @relation(fields: [projectId], references: [id])
  act             Act?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model Act {
  id             String   @id @default(cuid())
  paymentId      String   @unique
  payment        Payment  @relation(fields: [paymentId], references: [id])
  isSent         Boolean  @default(false)
  sentAt         DateTime?
  isSigned       Boolean  @default(false)
  signedAt       DateTime?
  managerComment String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

- [ ] **Step 2: Generate client & push schema to local SQLite**

Run: `DATABASE_URL="file:./prisma/dev.db" npx prisma db push`
Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Prisma schema for counterparties, projects, payments, acts"
```

---

## Task 3: Money helpers (TDD)

**Files:**
- Create: `server/domain/money.ts`, `tests/domain/money.test.ts`

- [ ] **Step 1: Write failing test `tests/domain/money.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { rublesToKopecks, formatRubles } from '~~/server/domain/money'

describe('money', () => {
  it('parses "33 000,00" rubles into kopecks', () => {
    expect(rublesToKopecks('33 000,00')).toBe(3_300_000)
  })
  it('parses "8 190,00" into kopecks', () => {
    expect(rublesToKopecks('8 190,00')).toBe(819_000)
  })
  it('formats kopecks back to a ru rubles string (spaces normalized)', () => {
    expect(formatRubles(3_300_000).replace(/\s/g, ' ')).toBe('33 000,00 ₽')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npx vitest run tests/domain/money.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `server/domain/money.ts`**

```ts
/** Money is stored and computed in integer kopecks to avoid float drift. */
export function rublesToKopecks(raw: string): number {
  // "33 000,00" -> 3300000 ; tolerate NBSP, thin space, regular space as thousands sep
  const cleaned = raw.replace(/[\s   ]/g, '').replace(',', '.')
  const value = Number.parseFloat(cleaned)
  if (Number.isNaN(value)) throw new Error(`Invalid money value: ${raw}`)
  return Math.round(value * 100)
}

export function formatRubles(kopecks: number): string {
  const rubles = kopecks / 100
  const s = rubles.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${s} ₽`
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npx vitest run tests/domain/money.test.ts`
Expected: PASS (3 tests). The format test normalizes whitespace because `toLocaleString('ru-RU')` uses NBSP as the thousands separator.

- [ ] **Step 5: Commit**

```bash
git add server/domain/money.ts tests/domain/money.test.ts
git commit -m "feat: add kopeck money helpers with tests"
```

---

## Task 4: Domain types

**Files:**
- Create: `server/domain/types.ts`

- [ ] **Step 1: Write `server/domain/types.ts`** (framework-free types reused across layers)

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add server/domain/types.ts
git commit -m "feat: add framework-free domain types and ru labels"
```

---

## Task 5: Act status logic (TDD — core)

**Files:**
- Create: `server/domain/actStatus.ts`, `tests/domain/actStatus.test.ts`

- [ ] **Step 1: Write failing test `tests/domain/actStatus.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { computeActStatus, STALE_DAYS } from '~~/server/domain/actStatus'
import type { PaymentLike, ActLike } from '~~/server/domain/types'

const now = new Date('2026-08-14T00:00:00Z')
const recent = (): PaymentLike => ({
  date: '2026-08-10', amount: 1000, direction: 'in', serviceStage: 'other',
  counterpartyId: 'c1', purpose: 'x',
})
const old = (): PaymentLike => ({
  date: '2026-06-01', amount: 1000, direction: 'in', serviceStage: 'other',
  counterpartyId: 'c1', purpose: 'x',
})
const act = (isSent: boolean, isSigned: boolean): ActLike => ({ isSent, isSigned })

describe('computeActStatus', () => {
  it('CLOSED when sent and signed', () => {
    expect(computeActStatus(recent(), act(true, true), now)).toBe('CLOSED')
  })
  it('CLOSED even if old (signed wins over stale)', () => {
    expect(computeActStatus(old(), act(true, true), now)).toBe('CLOSED')
  })
  it('AWAITING_SIGNATURE when sent, not signed, recent', () => {
    expect(computeActStatus(recent(), act(true, false), now)).toBe('AWAITING_SIGNATURE')
  })
  it('NOT_SENT when neither, recent', () => {
    expect(computeActStatus(recent(), act(false, false), now)).toBe('NOT_SENT')
  })
  it('NEEDS_ATTENTION when not closed and older than STALE_DAYS', () => {
    expect(computeActStatus(old(), act(false, false), now)).toBe('NEEDS_ATTENTION')
    expect(computeActStatus(old(), act(true, false), now)).toBe('NEEDS_ATTENTION')
  })
  it('boundary: exactly STALE_DAYS old is NOT stale yet', () => {
    const d = new Date(now); d.setDate(d.getDate() - STALE_DAYS)
    const p: PaymentLike = { ...recent(), date: d }
    expect(computeActStatus(p, act(false, false), now)).toBe('NOT_SENT')
  })
  it('treats missing act as not sent / not signed', () => {
    expect(computeActStatus(recent(), null, now)).toBe('NOT_SENT')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npx vitest run tests/domain/actStatus.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `server/domain/actStatus.ts`**

```ts
import type { PaymentLike, ActLike, ActStatus } from './types'

/** A non-closed act older than this many days needs manager attention. */
export const STALE_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY)
}

/**
 * Derive act status from booleans + payment age. Status is never stored.
 * Order: CLOSED -> NEEDS_ATTENTION (stale & not closed) -> AWAITING_SIGNATURE -> NOT_SENT.
 */
export function computeActStatus(
  payment: PaymentLike,
  act: ActLike | null | undefined,
  now: Date = new Date(),
): ActStatus {
  const isSent = act?.isSent ?? false
  const isSigned = act?.isSigned ?? false
  if (isSent && isSigned) return 'CLOSED'

  const date = payment.date instanceof Date ? payment.date : new Date(payment.date)
  if (daysBetween(date, now) > STALE_DAYS) return 'NEEDS_ATTENTION'

  if (isSent && !isSigned) return 'AWAITING_SIGNATURE'
  return 'NOT_SENT'
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npx vitest run tests/domain/actStatus.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add server/domain/actStatus.ts tests/domain/actStatus.test.ts
git commit -m "feat: add act status computation with full state tests"
```

---

## Task 6: Purpose classification (TDD)

**Files:**
- Create: `server/domain/classify.ts`, `tests/domain/classify.test.ts`

- [ ] **Step 1: Write failing test `tests/domain/classify.test.ts`**

```ts
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
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npx vitest run tests/domain/classify.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `server/domain/classify.ts`**

```ts
import type { ServiceStage, ExpenseCategory } from './types'

const STAGE_RULES: Array<{ stage: ServiceStage; re: RegExp }> = [
  { stage: 'ads', re: /директ|контекстн|реклам|объявлени/i },
  { stage: 'seo', re: /\bseo\b|поисков\w* продвижени/i },
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

const TAX_RE = /ндфл|енс|единый налог|страхов\w* взнос|пени|налог/i

/** Categorize an outgoing payment. */
export function classifyExpenseCategory(purpose: string, payeeName = ''): ExpenseCategory {
  if (TAX_RE.test(purpose)) return 'tax'
  if (/\bип\b|индивидуальн\w* предприниматель/i.test(payeeName)) return 'subcontractor'
  if (/комисси|обслуживание счета|ведение счета/i.test(purpose)) return 'fee'
  return 'other'
}

/** Derive a human project name from purpose; fall back to counterparty-scoped name. */
export function deriveProjectName(purpose: string, counterpartyName: string): string {
  const quoted = purpose.match(/проект\s+["«]([^"»]+)["»]/i)
  if (quoted) return quoted[1].trim()
  return `Проект: ${counterpartyName}`
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npx vitest run tests/domain/classify.test.ts`
Expected: PASS. `classifyExpenseCategory` keys off the payee being an ИП independently of stage, so the subcontractor case passes.

- [ ] **Step 5: Commit**

```bash
git add server/domain/classify.ts tests/domain/classify.test.ts
git commit -m "feat: add purpose classification (stage/expense/project) with tests"
```

---

## Task 7: Filters (TDD)

**Files:**
- Create: `server/domain/filters.ts`, `tests/domain/filters.test.ts`

- [ ] **Step 1: Write failing test `tests/domain/filters.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { matchesPaymentFilters, type PaymentFilters, type FilterableRow } from '~~/server/domain/filters'

const base = {
  direction: 'in' as const, serviceStage: 'ads' as const,
  counterpartyId: 'c1', projectId: 'p1',
}
const row = (over: Partial<FilterableRow> = {}): FilterableRow => ({
  ...base, date: '2026-07-16', purpose: 'Настройка Директа этап 1', status: 'NOT_SENT', ...over,
})

describe('matchesPaymentFilters', () => {
  it('passes with empty filters', () => {
    expect(matchesPaymentFilters(row(), {})).toBe(true)
  })
  it('filters by project', () => {
    expect(matchesPaymentFilters(row(), { project: 'p1' })).toBe(true)
    expect(matchesPaymentFilters(row(), { project: 'p2' })).toBe(false)
  })
  it('filters by date range inclusive', () => {
    expect(matchesPaymentFilters(row({ date: '2026-07-16' }), { from: '2026-07-01', to: '2026-07-31' })).toBe(true)
    expect(matchesPaymentFilters(row({ date: '2026-08-01' }), { from: '2026-07-01', to: '2026-07-31' })).toBe(false)
  })
  it('filters by stage and direction', () => {
    expect(matchesPaymentFilters(row(), { stage: 'ads' })).toBe(true)
    expect(matchesPaymentFilters(row(), { stage: 'seo' })).toBe(false)
    expect(matchesPaymentFilters(row(), { direction: 'out' })).toBe(false)
  })
  it('searches purpose case-insensitively', () => {
    expect(matchesPaymentFilters(row(), { q: 'директ' })).toBe(true)
    expect(matchesPaymentFilters(row(), { q: 'seo' })).toBe(false)
  })
  it('filters by act status', () => {
    expect(matchesPaymentFilters(row({ status: 'CLOSED' }), { actStatus: 'CLOSED' })).toBe(true)
    expect(matchesPaymentFilters(row({ status: 'NOT_SENT' }), { actStatus: 'CLOSED' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npx vitest run tests/domain/filters.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `server/domain/filters.ts`**

```ts
import type { Direction, ServiceStage, ActStatus } from './types'

export interface PaymentFilters {
  project?: string
  counterparty?: string
  from?: string // ISO date (inclusive)
  to?: string   // ISO date (inclusive)
  stage?: ServiceStage
  direction?: Direction
  actStatus?: ActStatus
  q?: string
}

/** A payment row enriched with its derived act status, for filtering. */
export interface FilterableRow {
  date: Date | string
  direction: Direction
  serviceStage: ServiceStage
  counterpartyId?: string | null
  projectId?: string | null
  purpose: string
  status?: ActStatus | string
}

function toTime(d: Date | string): number {
  return (d instanceof Date ? d : new Date(d)).getTime()
}

export function matchesPaymentFilters(row: FilterableRow, f: PaymentFilters): boolean {
  if (f.project && row.projectId !== f.project) return false
  if (f.counterparty && row.counterpartyId !== f.counterparty) return false
  if (f.stage && row.serviceStage !== f.stage) return false
  if (f.direction && row.direction !== f.direction) return false
  if (f.actStatus && row.status !== f.actStatus) return false
  if (f.from && toTime(row.date) < toTime(f.from)) return false
  if (f.to && toTime(row.date) > toTime(`${f.to}T23:59:59`)) return false
  if (f.q && !row.purpose.toLowerCase().includes(f.q.toLowerCase())) return false
  return true
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npx vitest run tests/domain/filters.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add server/domain/filters.ts tests/domain/filters.test.ts
git commit -m "feat: add payment filter predicates with tests"
```

---

## Task 8: Summary aggregation (TDD)

**Files:**
- Create: `server/domain/summary.ts`, `tests/domain/summary.test.ts`

- [ ] **Step 1: Write failing test `tests/domain/summary.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildSummary, type SummaryRow } from '~~/server/domain/summary'

const rows: SummaryRow[] = [
  { direction: 'in', amount: 3_300_000, projectId: 'p1', status: 'CLOSED', isSent: true },
  { direction: 'in', amount: 5_600_000, projectId: 'p1', status: 'AWAITING_SIGNATURE', isSent: true },
  { direction: 'in', amount: 819_000,   projectId: 'p2', status: 'NOT_SENT', isSent: false },
  { direction: 'out', amount: 2_080_000, projectId: null, status: undefined, isSent: false, expenseCategory: 'tax' },
]

describe('buildSummary', () => {
  it('aggregates incoming totals and act buckets', () => {
    const s = buildSummary(rows)
    expect(s.totalIncome).toBe(3_300_000 + 5_600_000 + 819_000)
    expect(s.paymentsCount).toBe(3)        // incoming only
    expect(s.projectsCount).toBe(2)        // p1, p2
    expect(s.closedActsAmount).toBe(3_300_000)
    expect(s.openActsAmount).toBe(5_600_000 + 819_000)
    expect(s.withoutSentActCount).toBe(1)  // the NOT_SENT one
    expect(s.sentNotSignedCount).toBe(1)   // the AWAITING_SIGNATURE one
  })
  it('aggregates expenses by category', () => {
    const s = buildSummary(rows)
    expect(s.totalExpenses).toBe(2_080_000)
    expect(s.expensesByCategory.tax).toBe(2_080_000)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npx vitest run tests/domain/summary.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `server/domain/summary.ts`**

```ts
import type { Direction, ActStatus, ExpenseCategory } from './types'

export interface SummaryRow {
  direction: Direction
  amount: number // kopecks
  projectId?: string | null
  status?: ActStatus | string
  isSent: boolean
  expenseCategory?: ExpenseCategory | null
}

export interface Summary {
  totalIncome: number
  totalExpenses: number
  paymentsCount: number
  projectsCount: number
  closedActsAmount: number
  openActsAmount: number
  withoutSentActCount: number
  sentNotSignedCount: number
  expensesByCategory: Record<string, number>
}

/** Build dashboard summary from already-filtered rows. All money in kopecks. */
export function buildSummary(rows: SummaryRow[]): Summary {
  const s: Summary = {
    totalIncome: 0, totalExpenses: 0, paymentsCount: 0, projectsCount: 0,
    closedActsAmount: 0, openActsAmount: 0, withoutSentActCount: 0,
    sentNotSignedCount: 0, expensesByCategory: {},
  }
  const projects = new Set<string>()

  for (const r of rows) {
    if (r.direction === 'out') {
      s.totalExpenses += r.amount
      const key = r.expenseCategory ?? 'other'
      s.expensesByCategory[key] = (s.expensesByCategory[key] ?? 0) + r.amount
      continue
    }
    // incoming
    s.totalIncome += r.amount
    s.paymentsCount += 1
    if (r.projectId) projects.add(r.projectId)
    if (r.status === 'CLOSED') s.closedActsAmount += r.amount
    else s.openActsAmount += r.amount
    if (!r.isSent) s.withoutSentActCount += 1
    if (r.status === 'AWAITING_SIGNATURE') s.sentNotSignedCount += 1
  }
  s.projectsCount = projects.size
  return s
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npx vitest run tests/domain/summary.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/domain/summary.ts tests/domain/summary.test.ts
git commit -m "feat: add summary aggregation with tests"
```

---

## Task 9: PDF parser + normalizer (real data)

**Files:**
- Create: `server/import/parseStatement.ts`, `server/import/normalize.ts`, `server/import/run-import.ts`, `tests/import/normalize.test.ts`
- Use: `data/bank_statement.pdf` (already downloaded to `.scratch/bank_statement.pdf` — copy into `data/`)

- [ ] **Step 1: Copy the real PDF into the repo data dir**

```bash
mkdir -p data && cp .scratch/bank_statement.pdf data/bank_statement.pdf
```

- [ ] **Step 2: Implement `server/import/parseStatement.ts`** (text → raw operation rows)

```ts
import { readFile } from 'node:fs/promises'
import { extractText, getDocumentProxy } from 'unpdf'

/** One raw operation extracted from the statement before normalization. */
export interface RawOperation {
  date: string            // dd.mm.yyyy as printed
  amount: string          // ru money string, e.g. "33 000,00"
  docNumber?: string
  payerBlock: string      // counterparty side text (name/inn/ogrn/account)
  purpose: string
  sourceRef: string       // ref-code from purpose or synthetic hash
  isCredit: boolean       // true when money credited TO the agency account (incoming)
}

const AGENCY_ACCOUNT = '40802810937184056213'

export async function extractStatementText(pdfPath: string): Promise<string> {
  const buf = new Uint8Array(await readFile(pdfPath))
  const pdf = await getDocumentProxy(buf)
  const { text } = await extractText(pdf, { mergePages: true })
  return text
}

/**
 * Split merged statement text into operations and extract fields.
 * Strategy: operations start at a `dd.mm.yyyy ACCOUNT` boundary. We slice between
 * consecutive date+account anchors, then pull amount, doc number, purpose, ref.
 */
export function parseOperations(text: string): RawOperation[] {
  const anchor = /(\d{2}\.\d{2}\.\d{4})\s+(\d{20})/g
  const indices: Array<{ start: number; date: string; firstAccount: string }> = []
  let m: RegExpExecArray | null
  while ((m = anchor.exec(text)) !== null) {
    indices.push({ start: m.index, date: m[1], firstAccount: m[2] })
  }
  const ops: RawOperation[] = []
  for (let i = 0; i < indices.length; i++) {
    const seg = text.slice(indices[i].start, indices[i + 1]?.start ?? text.length)
    // Skip page-header repeats that carry no amount.
    const amount = seg.match(/(\d[\d\s   ]*,\d{2})/)
    if (!amount) continue
    const ref = seg.match(/код:\s*(ref-[\w-]+)/i)?.[1]
    const docNumber = seg.match(/,\d{2}\s+(\d{2,5})\s+\d{2}\s+БИК/)?.[1]
    const purpose = extractPurpose(seg)
    // Incoming when the FIRST account in the segment is NOT the agency account
    // (statement lists payer account first for credits to the agency).
    const isCredit = indices[i].firstAccount !== AGENCY_ACCOUNT
    ops.push({
      date: indices[i].date,
      amount: amount[1],
      docNumber,
      payerBlock: seg.slice(0, 400),
      purpose,
      sourceRef: ref ?? `op-${indices[i].date}-${docNumber ?? i}-${amount[1].replace(/\D/g, '')}`,
      isCredit,
    })
  }
  return ops
}

/** Purpose text sits after the bank name block; capture the human sentence. */
function extractPurpose(seg: string): string {
  // Heuristic: take text after the last "БИК ..." up to the next date or end.
  const afterBik = seg.split(/БИК\s+\d{9}/).pop() ?? seg
  // Drop the leading bank name fragment up to the first capital sentence start.
  const cleaned = afterBik.replace(/^[^А-ЯA-Z]*/, '').trim()
  return cleaned.replace(/\s+/g, ' ').slice(0, 400)
}
```

- [ ] **Step 3: Implement `server/import/normalize.ts`** (raw → normalized entities)

```ts
import { rublesToKopecks } from '../domain/money'
import { classifyServiceStage, classifyExpenseCategory, deriveProjectName } from '../domain/classify'
import type { RawOperation } from './parseStatement'

export interface NormCounterparty { key: string; name: string; inn: string; ogrn?: string; bankAccount?: string }
export interface NormProject { key: string; name: string; counterpartyKey: string }
export interface NormPayment {
  sourceRef: string; date: string; direction: 'in' | 'out'; amount: number; currency: 'RUB'
  purpose: string; serviceStage: string; expenseCategory?: string
  invoiceNumber?: string; contractNumber?: string; docNumber?: string
  counterpartyKey: string; projectKey?: string
}
export interface NormAct { sourceRef: string; isSent: boolean; isSigned: boolean; managerComment?: string }
export interface Normalized {
  counterparties: NormCounterparty[]; projects: NormProject[]
  payments: NormPayment[]; acts: NormAct[]
}

function isoDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split('.')
  return `${y}-${m}-${d}`
}

function pickName(block: string): { name: string; inn: string; ogrn?: string; account?: string } {
  const inn = block.match(/ИНН\s*(\d{10,12})/)?.[1] ?? '0000000000'
  const ogrn = block.match(/ОГРН\w*\s*(\d{13,15})/)?.[1]
  const account = block.match(/\b(\d{20})\b/)?.[1]
  const name = block.match(/(ООО|АО|ПАО)\s+["«][^"»]+["»]|ИП\s+[А-ЯЁ][А-ЯЁ\s.]+/)?.[0]?.trim()
    ?? 'Неизвестный плательщик'
  return { name: name.replace(/\s+/g, ' '), inn, ogrn, account }
}

/**
 * Build normalized entities from raw operations.
 * Acts get deterministic demo statuses (seeded by index) so the dashboard shows
 * every state; real statements carry no act status.
 */
export function normalize(ops: RawOperation[]): Normalized {
  const counterparties = new Map<string, NormCounterparty>()
  const projects = new Map<string, NormProject>()
  const payments: NormPayment[] = []
  const acts: NormAct[] = []

  let incomingIndex = 0
  for (const op of ops) {
    const who = pickName(op.payerBlock)
    const cpKey = who.inn
    if (!counterparties.has(cpKey)) {
      counterparties.set(cpKey, { key: cpKey, name: who.name, inn: who.inn, ogrn: who.ogrn, bankAccount: who.account })
    }
    const direction = op.isCredit ? 'in' : 'out'
    const invoiceNumber = op.purpose.match(/сч\w*\.?\s*№\s*(\d+)/i)?.[1]
    const contractNumber = op.purpose.match(/договор\w*\s*№\s*([\d/-]+)/i)?.[1]

    let projectKey: string | undefined
    let serviceStage = 'other'
    let expenseCategory: string | undefined

    if (direction === 'in') {
      serviceStage = classifyServiceStage(op.purpose)
      const projectName = deriveProjectName(op.purpose, who.name)
      projectKey = `${cpKey}::${projectName}`
      if (!projects.has(projectKey)) projects.set(projectKey, { key: projectKey, name: projectName, counterpartyKey: cpKey })
    } else {
      expenseCategory = classifyExpenseCategory(op.purpose, who.name)
    }

    payments.push({
      sourceRef: op.sourceRef, date: isoDate(op.date), direction,
      amount: rublesToKopecks(op.amount), currency: 'RUB', purpose: op.purpose,
      serviceStage, expenseCategory, invoiceNumber, contractNumber, docNumber: op.docNumber,
      counterpartyKey: cpKey, projectKey,
    })

    if (direction === 'in') {
      // Deterministic demo statuses across the four states.
      const mod = incomingIndex % 4
      const isSent = mod !== 0
      const isSigned = mod === 3
      acts.push({
        sourceRef: op.sourceRef, isSent, isSigned,
        managerComment: mod === 1 ? 'Акт отправлен, ждём подписанный скан' : undefined,
      })
      incomingIndex++
    }
  }

  return {
    counterparties: [...counterparties.values()],
    projects: [...projects.values()],
    payments, acts,
  }
}
```

- [ ] **Step 4: Implement `server/import/run-import.ts`** (CLI → writes `data/normalized.json`)

```ts
import { writeFile } from 'node:fs/promises'
import { extractStatementText, parseOperations } from './parseStatement'
import { normalize } from './normalize'

const PDF = process.argv[2] ?? 'data/bank_statement.pdf'
const OUT = process.argv[3] ?? 'data/normalized.json'

const text = await extractStatementText(PDF)
const ops = parseOperations(text)
const normalized = normalize(ops)
await writeFile(OUT, JSON.stringify(normalized, null, 2), 'utf8')
console.log(
  `Parsed ${ops.length} operations -> ${normalized.payments.length} payments`,
  `(${normalized.payments.filter(p => p.direction === 'in').length} incoming),`,
  `${normalized.counterparties.length} counterparties,`,
  `${normalized.projects.length} projects. Wrote ${OUT}.`,
)
```

- [ ] **Step 5: Write failing test `tests/import/normalize.test.ts`** (uses synthetic ops, no PDF)

```ts
import { describe, it, expect } from 'vitest'
import { normalize } from '~~/server/import/normalize'
import type { RawOperation } from '~~/server/import/parseStatement'

const incoming: RawOperation = {
  date: '16.07.2026', amount: '33 000,00', docNumber: '9142',
  payerBlock: 'ИНН 5408124976 ОГРН 1235400078124 ООО "ЛЕДНИК-СТАРТ" 40702810504010067142',
  purpose: 'Оплата за техническое сопровождение сайта по сч. № 742 от 09.07.2026 г.',
  sourceRef: 'op-16.07.2026-9142-3300000', isCredit: true,
}
const tax: RawOperation = {
  date: '15.07.2026', amount: '3 280,00', docNumber: '581',
  payerBlock: 'ИП ГРОМОВ А.В. ИНН 782934761208 ОГРНИП 326784500918273',
  purpose: 'НДФЛ по расчету авансового платежа', sourceRef: 'ref-73a1-ef20-1101', isCredit: false,
}

describe('normalize', () => {
  it('creates an incoming payment with classified stage, invoice and an act', () => {
    const n = normalize([incoming])
    expect(n.payments).toHaveLength(1)
    expect(n.payments[0].direction).toBe('in')
    expect(n.payments[0].amount).toBe(3_300_000)
    expect(n.payments[0].serviceStage).toBe('support')
    expect(n.payments[0].invoiceNumber).toBe('742')
    expect(n.acts).toHaveLength(1)
    expect(n.counterparties[0].name).toContain('ЛЕДНИК-СТАРТ')
  })
  it('classifies a tax debit as outgoing expense with no act/project', () => {
    const n = normalize([tax])
    expect(n.payments[0].direction).toBe('out')
    expect(n.payments[0].expenseCategory).toBe('tax')
    expect(n.acts).toHaveLength(0)
    expect(n.projects).toHaveLength(0)
  })
})
```

- [ ] **Step 6: Run, expect PASS once files exist**

Run: `npx vitest run tests/import/normalize.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Generate `data/normalized.json` from the real PDF**

Run: `npx tsx server/import/run-import.ts`
Expected: console line reporting parsed operations (incoming > 0, counterparties > 1). Inspect `data/normalized.json` to confirm real client names (ЛЕДНИК-СТАРТ, ОРБИТА-ПРОМО, ВЕКТОР-ТУР, СИГМА-МАРКЕТ) appear as incoming and УФК/ЕНС/НДФЛ as outgoing.

> If parsing yields too few incoming rows, refine `extractPurpose`/`pickName`/anchor regex against the printed text until incoming client payments are captured. The committed `data/normalized.json` is the seed source of truth, so correctness here matters. Cross-check against the text already extracted in `.scratch` during planning.

- [ ] **Step 8: Commit**

```bash
git add server/import/ tests/import/ data/bank_statement.pdf data/normalized.json
git commit -m "feat: parse bank statement PDF into normalized seed data"
```

---

## Task 10: Prisma utils + seed

**Files:**
- Create: `server/utils/prisma.ts`, `prisma/seed.ts`

- [ ] **Step 1: Implement `server/utils/prisma.ts`** (singleton)

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Implement `prisma/seed.ts`** (idempotent upserts from normalized.json)

```ts
import { readFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import type { Normalized } from '../server/import/normalize'

const prisma = new PrismaClient()

async function main() {
  const raw = await readFile('data/normalized.json', 'utf8')
  const data = JSON.parse(raw) as Normalized

  const cpIdByKey = new Map<string, string>()
  for (const c of data.counterparties) {
    const row = await prisma.counterparty.upsert({
      where: { inn_name: { inn: c.inn, name: c.name } },
      update: { ogrn: c.ogrn, bankAccount: c.bankAccount },
      create: { name: c.name, inn: c.inn, ogrn: c.ogrn, bankAccount: c.bankAccount },
    })
    cpIdByKey.set(c.key, row.id)
  }

  const projIdByKey = new Map<string, string>()
  for (const p of data.projects) {
    const row = await prisma.project.create({
      data: { name: p.name, counterpartyId: cpIdByKey.get(p.counterpartyKey)! },
    })
    projIdByKey.set(p.key, row.id)
  }

  for (const pay of data.payments) {
    await prisma.payment.upsert({
      where: { sourceRef: pay.sourceRef },
      update: {},
      create: {
        date: new Date(pay.date), direction: pay.direction, amount: pay.amount,
        currency: pay.currency, purpose: pay.purpose, serviceStage: pay.serviceStage,
        expenseCategory: pay.expenseCategory, invoiceNumber: pay.invoiceNumber,
        contractNumber: pay.contractNumber, docNumber: pay.docNumber, sourceRef: pay.sourceRef,
        counterpartyId: cpIdByKey.get(pay.counterpartyKey)!,
        projectId: pay.projectKey ? projIdByKey.get(pay.projectKey) : undefined,
      },
    })
  }

  for (const a of data.acts) {
    const payment = await prisma.payment.findUnique({ where: { sourceRef: a.sourceRef } })
    if (!payment) continue
    await prisma.act.upsert({
      where: { paymentId: payment.id },
      update: {},
      create: {
        paymentId: payment.id, isSent: a.isSent, isSigned: a.isSigned,
        sentAt: a.isSent ? payment.date : null,
        signedAt: a.isSigned ? payment.date : null,
        managerComment: a.managerComment,
      },
    })
  }
  console.log('Seed complete:', {
    counterparties: data.counterparties.length, projects: data.projects.length,
    payments: data.payments.length, acts: data.acts.length,
  })
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
```

- [ ] **Step 3: Push schema and seed local DB**

Run: `DATABASE_URL="file:./prisma/dev.db" npx prisma db push && DATABASE_URL="file:./prisma/dev.db" npx tsx prisma/seed.ts`
Expected: "Seed complete:" with non-zero counts.

> Keep the DB path consistent everywhere: `DATABASE_URL="file:./prisma/dev.db"` run from the project root (Prisma resolves `file:` relative to `prisma/schema.prisma`, so this yields `prisma/dev.db`). Use the same value for `db push`, seed, dev server, and tests. Document the working command in the README.

- [ ] **Step 4: Commit**

```bash
git add server/utils/prisma.ts prisma/seed.ts
git commit -m "feat: add Prisma singleton and seed from normalized data"
```

---

## Task 11: API response utils + query parsing

**Files:**
- Create: `server/utils/response.ts`, `server/utils/query.ts`

- [ ] **Step 1: Implement `server/utils/response.ts`**

```ts
/** Standard API envelope: { data, error, meta }. */
export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return { data, error: null, meta: meta ?? null }
}
export function fail(message: string, code = 'ERROR') {
  return { data: null, error: { code, message }, meta: null }
}
```

- [ ] **Step 2: Implement `server/utils/query.ts`** (zod-validated list filters)

```ts
import { z } from 'zod'

export const paymentFiltersSchema = z.object({
  project: z.string().optional(),
  counterparty: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  stage: z.enum(['development', 'support', 'ads', 'seo', 'content', 'design', 'other']).optional(),
  direction: z.enum(['in', 'out']).optional(),
  actStatus: z.enum(['NOT_SENT', 'AWAITING_SIGNATURE', 'CLOSED', 'NEEDS_ATTENTION']).optional(),
  q: z.string().optional(),
})
export type PaymentFiltersInput = z.infer<typeof paymentFiltersSchema>
```

- [ ] **Step 3: Commit**

```bash
git add server/utils/response.ts server/utils/query.ts
git commit -m "feat: add API envelope and zod query validation"
```

---

## Task 12: Repositories

**Files:**
- Create: `server/repositories/payments.ts`, `projects.ts`, `counterparties.ts`, `acts.ts`

- [ ] **Step 1: Implement `server/repositories/payments.ts`**

```ts
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
```

- [ ] **Step 2: Implement `server/repositories/acts.ts`**

```ts
import { prisma } from '../utils/prisma'

export interface ActUpdate {
  isSent?: boolean
  isSigned?: boolean
  managerComment?: string | null
}

/** Update act flags; stamp sentAt/signedAt when transitioning to true, clear when set false. */
export async function updateAct(id: string, patch: ActUpdate, now = new Date()) {
  const current = await prisma.act.findUnique({ where: { id } })
  if (!current) return null
  return prisma.act.update({
    where: { id },
    data: {
      isSent: patch.isSent ?? current.isSent,
      isSigned: patch.isSigned ?? current.isSigned,
      sentAt: patch.isSent === true && !current.isSent ? now : patch.isSent === false ? null : current.sentAt,
      signedAt: patch.isSigned === true && !current.isSigned ? now : patch.isSigned === false ? null : current.signedAt,
      managerComment: patch.managerComment === undefined ? current.managerComment : patch.managerComment,
    },
  })
}
```

- [ ] **Step 3: Implement `server/repositories/projects.ts`**

```ts
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
```

- [ ] **Step 4: Implement `server/repositories/counterparties.ts`**

```ts
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
```

- [ ] **Step 5: Commit**

```bash
git add server/repositories/
git commit -m "feat: add repositories with derived status and aggregates"
```

---

## Task 13: API endpoints

**Files:**
- Create: `server/api/summary.get.ts`, `payments.get.ts`, `projects.get.ts`, `counterparties.get.ts`, `expenses.get.ts`, `acts/[id].patch.ts`

- [ ] **Step 1: `server/api/payments.get.ts`**

```ts
import { listPayments } from '../repositories/payments'
import { paymentFiltersSchema } from '../utils/query'
import { ok, fail } from '../utils/response'

export default defineEventHandler(async (event) => {
  const parsed = paymentFiltersSchema.safeParse(getQuery(event))
  if (!parsed.success) { setResponseStatus(event, 400); return fail('Invalid filters', 'VALIDATION') }
  // Default to incoming for the payments table unless a direction is given.
  const filters = { direction: 'in' as const, ...parsed.data }
  return ok(await listPayments(filters))
})
```

- [ ] **Step 2: `server/api/expenses.get.ts`**

```ts
import { listPayments } from '../repositories/payments'
import { paymentFiltersSchema } from '../utils/query'
import { ok, fail } from '../utils/response'

export default defineEventHandler(async (event) => {
  const parsed = paymentFiltersSchema.safeParse(getQuery(event))
  if (!parsed.success) { setResponseStatus(event, 400); return fail('Invalid filters', 'VALIDATION') }
  return ok(await listPayments({ ...parsed.data, direction: 'out' }))
})
```

- [ ] **Step 3: `server/api/summary.get.ts`**

```ts
import { listPayments } from '../repositories/payments'
import { buildSummary } from '../domain/summary'
import { paymentFiltersSchema } from '../utils/query'
import { ok, fail } from '../utils/response'

export default defineEventHandler(async (event) => {
  const parsed = paymentFiltersSchema.safeParse(getQuery(event))
  if (!parsed.success) { setResponseStatus(event, 400); return fail('Invalid filters', 'VALIDATION') }
  // Summary spans both directions (income + expenses), honoring non-direction filters.
  const { direction, ...rest } = parsed.data
  const rows = await listPayments(rest)
  return ok(buildSummary(rows.map((r) => ({
    direction: r.direction, amount: r.amount, projectId: r.projectId,
    status: r.status, isSent: r.act?.isSent ?? false,
    expenseCategory: (r.expenseCategory ?? undefined) as any,
  }))))
})
```

- [ ] **Step 4: `server/api/projects.get.ts`**

```ts
import { listProjects } from '../repositories/projects'
import { ok } from '../utils/response'
export default defineEventHandler(async () => ok(await listProjects()))
```

- [ ] **Step 5: `server/api/counterparties.get.ts`**

```ts
import { listCounterparties } from '../repositories/counterparties'
import { ok } from '../utils/response'
export default defineEventHandler(async () => ok(await listCounterparties()))
```

- [ ] **Step 6: `server/api/acts/[id].patch.ts`**

```ts
import { z } from 'zod'
import { updateAct } from '../../repositories/acts'
import { ok, fail } from '../../utils/response'

const bodySchema = z.object({
  isSent: z.boolean().optional(),
  isSigned: z.boolean().optional(),
  managerComment: z.string().max(2000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) { setResponseStatus(event, 400); return fail('Invalid body', 'VALIDATION') }
  const updated = await updateAct(id, parsed.data)
  if (!updated) { setResponseStatus(event, 404); return fail('Act not found', 'NOT_FOUND') }
  return ok(updated)
})
```

- [ ] **Step 7: Smoke-test endpoints**

Run: `DATABASE_URL="file:./prisma/dev.db" npm run dev` then in another shell:
`curl -s 'http://localhost:3000/api/summary' | head -c 300` and `curl -s 'http://localhost:3000/api/payments?stage=ads' | head -c 300`
Expected: JSON envelopes with `data` populated. Stop dev server after.

- [ ] **Step 8: Commit**

```bash
git add server/api/
git commit -m "feat: add REST endpoints for summary, payments, projects, counterparties, expenses, acts"
```

---

## Task 14: Act transition integration test

**Files:**
- Create: `tests/api/acts.test.ts`

> Tests the repository layer against a throwaway SQLite DB (fast, no HTTP server), covering the act PATCH state transition end-to-end through Prisma.

- [ ] **Step 1: Write `tests/api/acts.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

const DB = 'file:./prisma/test.db'
let prisma: PrismaClient

beforeAll(() => {
  execSync('npx prisma db push --force-reset --skip-generate', { env: { ...process.env, DATABASE_URL: DB }, stdio: 'ignore' })
  process.env.DATABASE_URL = DB
  prisma = new PrismaClient({ datasources: { db: { url: DB } } })
})
afterAll(async () => { await prisma.$disconnect() })

describe('act update transitions', () => {
  it('stamps sentAt when marking sent, signedAt when signing', async () => {
    const cp = await prisma.counterparty.create({ data: { name: 'ООО Тест', inn: '7700000000' } })
    const pay = await prisma.payment.create({ data: {
      date: new Date('2026-08-10'), direction: 'in', amount: 100000, purpose: 'x',
      serviceStage: 'support', sourceRef: 'test-1', counterpartyId: cp.id,
    } })
    const act = await prisma.act.create({ data: { paymentId: pay.id } })

    const { updateAct } = await import('~~/server/repositories/acts')
    const sent = await updateAct(act.id, { isSent: true })
    expect(sent?.isSent).toBe(true)
    expect(sent?.sentAt).toBeInstanceOf(Date)

    const signed = await updateAct(act.id, { isSigned: true })
    expect(signed?.isSigned).toBe(true)
    expect(signed?.signedAt).toBeInstanceOf(Date)
  })
})
```

> The prisma singleton reads `DATABASE_URL` at construction. This test sets `process.env.DATABASE_URL` in `beforeAll` before the dynamic `import()` of the repository, so the singleton binds to `test.db`. Runs in its own file to avoid cross-test singleton reuse.

- [ ] **Step 2: Run, expect PASS**

Run: `npx vitest run tests/api/acts.test.ts`
Expected: PASS (1 test). `prisma/test.db` is git-ignored via `prisma/*.db`.

- [ ] **Step 3: Commit**

```bash
git add tests/api/acts.test.ts
git commit -m "test: add act transition integration test"
```

---

## Task 15: Frontend composables + format

**Files:**
- Create: `app/composables/useApi.ts`, `app/composables/useFormat.ts`

- [ ] **Step 1: `app/composables/useFormat.ts`**

```ts
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
```

- [ ] **Step 2: `app/composables/useApi.ts`** (thin wrapper unwrapping the envelope)

```ts
/** Unwrap the { data, error, meta } envelope; throw on error. */
async function unwrap<T>(promise: Promise<any>): Promise<T> {
  const res = await promise
  if (res?.error) throw new Error(res.error.message)
  return res.data as T
}

export function useApi() {
  const getSummary = (params: Record<string, any>) => unwrap<any>($fetch('/api/summary', { params }))
  const getPayments = (params: Record<string, any>) => unwrap<any[]>($fetch('/api/payments', { params }))
  const getExpenses = (params: Record<string, any>) => unwrap<any[]>($fetch('/api/expenses', { params }))
  const getProjects = () => unwrap<any[]>($fetch('/api/projects'))
  const patchAct = (id: string, body: Record<string, any>) =>
    unwrap<any>($fetch(`/api/acts/${id}`, { method: 'PATCH', body }))
  return { getSummary, getPayments, getExpenses, getProjects, patchAct }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/composables/
git commit -m "feat: add API and formatting composables"
```

---

## Task 16: Presentational components

**Files:**
- Create: `app/components/ActStatusBadge.vue`, `SummaryCards.vue`, `FiltersBar.vue`, `PaymentsTable.vue`, `ProjectsTable.vue`, `ExpensesTable.vue`

- [ ] **Step 1: `app/components/ActStatusBadge.vue`**

```vue
<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'
const props = defineProps<{ status: string }>()
const { statusLabel } = useFormat()
const color: Record<string, string> = {
  CLOSED: 'var(--ok)', AWAITING_SIGNATURE: 'var(--info)',
  NOT_SENT: 'var(--muted)', NEEDS_ATTENTION: 'var(--bad)',
}
</script>
<template>
  <span class="badge" :style="{ background: color[status] + '22', color: color[status] }">
    {{ statusLabel(status as any) }}
  </span>
</template>
```

- [ ] **Step 2: `app/components/SummaryCards.vue`**

```vue
<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'
const props = defineProps<{ summary: any | null }>()
const { money } = useFormat()
const cards = computed(() => {
  const s = props.summary
  if (!s) return []
  return [
    { label: 'Всего оплат (приход)', value: money(s.totalIncome) },
    { label: 'Проектов', value: s.projectsCount },
    { label: 'Оплат', value: s.paymentsCount },
    { label: 'Сумма по закрытым актам', value: money(s.closedActsAmount) },
    { label: 'Сумма по незакрытым актам', value: money(s.openActsAmount) },
    { label: 'Без отправленного акта', value: s.withoutSentActCount },
    { label: 'Отправлен, не подписан', value: s.sentNotSignedCount },
    { label: 'Расходы (налоги/субподряд)', value: money(s.totalExpenses) },
  ]
})
</script>
<template>
  <section class="cards">
    <div v-for="c in cards" :key="c.label" class="card cards__item">
      <div class="cards__label">{{ c.label }}</div>
      <div class="cards__value">{{ c.value }}</div>
    </div>
  </section>
</template>
<style scoped>
.cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; margin-bottom:20px; }
.cards__label { color:var(--muted); font-size:13px; margin-bottom:6px; }
.cards__value { font-size:20px; font-weight:700; }
</style>
```

- [ ] **Step 3: `app/components/FiltersBar.vue`** (emits filter object)

```vue
<script setup lang="ts">
import { SERVICE_STAGE_LABELS, ACT_STATUS_LABELS } from '~~/server/domain/types'
const props = defineProps<{ projects: { id: string; name: string }[] }>()
const emit = defineEmits<{ change: [Record<string, string>] }>()
const f = reactive<Record<string, string>>({ project: '', from: '', to: '', stage: '', actStatus: '', q: '' })
const stages = Object.entries(SERVICE_STAGE_LABELS)
const statuses = Object.entries(ACT_STATUS_LABELS)
function apply() {
  emit('change', Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')))
}
function reset() { Object.keys(f).forEach((k) => (f[k] = '')); apply() }
</script>
<template>
  <section class="filters card">
    <input v-model="f.q" placeholder="Поиск по назначению…" @keyup.enter="apply" />
    <select v-model="f.project"><option value="">Все проекты</option>
      <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option></select>
    <select v-model="f.stage"><option value="">Все услуги</option>
      <option v-for="[k, label] in stages" :key="k" :value="k">{{ label }}</option></select>
    <select v-model="f.actStatus"><option value="">Любой статус</option>
      <option v-for="[k, label] in statuses" :key="k" :value="k">{{ label }}</option></select>
    <label>с <input type="date" v-model="f.from" /></label>
    <label>по <input type="date" v-model="f.to" /></label>
    <button @click="apply">Применить</button>
    <button class="ghost" @click="reset">Сбросить</button>
  </section>
</template>
<style scoped>
.filters { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:16px; }
.filters input, .filters select { padding:7px 9px; border:1px solid var(--line); border-radius:8px; font-size:14px; }
.filters button { padding:7px 14px; border:0; border-radius:8px; background:var(--info); color:#fff; font-weight:600; cursor:pointer; }
.filters button.ghost { background:#eef0f3; color:var(--ink); }
</style>
```

- [ ] **Step 4: `app/components/PaymentsTable.vue`** (toggles call PATCH)

```vue
<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'
const props = defineProps<{ rows: any[] }>()
const emit = defineEmits<{ toggle: [{ id: string; patch: Record<string, any> }] }>()
const { money, date, stageLabel } = useFormat()
</script>
<template>
  <table>
    <thead><tr>
      <th>Дата</th><th>Плательщик</th><th>Проект</th><th>Сумма</th><th>Назначение</th>
      <th>Этап</th><th>Отправлен</th><th>Подписан</th><th>Статус</th><th>Комментарий</th>
    </tr></thead>
    <tbody>
      <tr v-for="r in rows" :key="r.id">
        <td>{{ date(r.date) }}</td>
        <td>{{ r.counterpartyName }}</td>
        <td>{{ r.projectName || '—' }}</td>
        <td>{{ money(r.amount) }}</td>
        <td class="purpose">{{ r.purpose }}</td>
        <td>{{ stageLabel(r.serviceStage) }}</td>
        <td><input type="checkbox" :checked="r.act?.isSent"
          @change="emit('toggle', { id: r.act.id, patch: { isSent: ($event.target as HTMLInputElement).checked } })"
          :disabled="!r.act" /></td>
        <td><input type="checkbox" :checked="r.act?.isSigned"
          @change="emit('toggle', { id: r.act.id, patch: { isSigned: ($event.target as HTMLInputElement).checked } })"
          :disabled="!r.act" /></td>
        <td><ActStatusBadge :status="r.status" /></td>
        <td>{{ r.act?.managerComment || '—' }}</td>
      </tr>
    </tbody>
  </table>
</template>
<style scoped>.purpose{max-width:280px;color:var(--muted);font-size:13px}</style>
```

- [ ] **Step 5: `app/components/ProjectsTable.vue`**

```vue
<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'
defineProps<{ rows: any[] }>()
const { money } = useFormat()
const docLabel: Record<string, string> = {
  all_closed: 'Все закрыты', none_closed: 'Нет закрытых', partial: 'Частично закрыты', no_payments: 'Нет оплат',
}
</script>
<template>
  <table>
    <thead><tr><th>Проект</th><th>Юрлицо</th><th>Сумма</th><th>Оплат</th><th>Закрыто актов</th><th>Открыто актов</th><th>Документооборот</th></tr></thead>
    <tbody>
      <tr v-for="r in rows" :key="r.id">
        <td>{{ r.name }}</td><td>{{ r.counterpartyName }}</td><td>{{ money(r.totalAmount) }}</td>
        <td>{{ r.paymentsCount }}</td><td>{{ r.closedActs }}</td><td>{{ r.openActs }}</td>
        <td>{{ docLabel[r.docStatus] }}</td>
      </tr>
    </tbody>
  </table>
</template>
```

- [ ] **Step 6: `app/components/ExpensesTable.vue`**

```vue
<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'
defineProps<{ rows: any[] }>()
const { money, date, expenseLabel } = useFormat()
</script>
<template>
  <table>
    <thead><tr><th>Дата</th><th>Получатель</th><th>Категория</th><th>Сумма</th><th>Назначение</th></tr></thead>
    <tbody>
      <tr v-for="r in rows" :key="r.id">
        <td>{{ date(r.date) }}</td><td>{{ r.counterpartyName }}</td>
        <td>{{ expenseLabel(r.expenseCategory) }}</td><td>{{ money(r.amount) }}</td>
        <td class="purpose">{{ r.purpose }}</td>
      </tr>
    </tbody>
  </table>
</template>
<style scoped>.purpose{max-width:360px;color:var(--muted);font-size:13px}</style>
```

- [ ] **Step 7: Commit**

```bash
git add app/components/
git commit -m "feat: add presentational components (summary, filters, tables, badge)"
```

---

## Task 17: Pages wiring

**Files:**
- Create: `app/pages/index.vue`, `app/pages/projects.vue`, `app/pages/expenses.vue`

- [ ] **Step 1: `app/pages/index.vue`** (summary + filters + payments)

```vue
<script setup lang="ts">
const api = useApi()
const filters = ref<Record<string, string>>({})
const projects = ref<{ id: string; name: string }[]>([])
const summary = ref<any>(null)
const payments = ref<any[]>([])

async function load() {
  const [s, p, pr] = await Promise.all([
    api.getSummary(filters.value),
    api.getPayments(filters.value),
    api.getProjects(),
  ])
  summary.value = s; payments.value = p
  projects.value = pr.map((x: any) => ({ id: x.id, name: x.name }))
}
function onFilter(f: Record<string, string>) { filters.value = f; load() }
async function onToggle({ id, patch }: { id: string; patch: Record<string, any> }) {
  await api.patchAct(id, patch); await load()
}
await load()
</script>
<template>
  <div>
    <SummaryCards :summary="summary" />
    <FiltersBar :projects="projects" @change="onFilter" />
    <PaymentsTable :rows="payments" @toggle="onToggle" />
  </div>
</template>
```

- [ ] **Step 2: `app/pages/projects.vue`**

```vue
<script setup lang="ts">
const api = useApi()
const rows = ref<any[]>([])
rows.value = await api.getProjects()
</script>
<template><ProjectsTable :rows="rows" /></template>
```

- [ ] **Step 3: `app/pages/expenses.vue`**

```vue
<script setup lang="ts">
const api = useApi()
const rows = ref<any[]>([])
rows.value = await api.getExpenses({})
</script>
<template><ExpensesTable :rows="rows" /></template>
```

- [ ] **Step 4: Manual verification with running app**

Run: `DATABASE_URL="file:./prisma/dev.db" npm run dev`, open `http://localhost:3000`.
Expected: summary cards populated; payments table shows real client names; toggling «Отправлен»/«Подписан» updates the status badge and persists across reload; «Проекты» and «Расходы» tabs render. Stop server.

- [ ] **Step 5: Commit**

```bash
git add app/pages/
git commit -m "feat: wire dashboard, projects and expenses pages"
```

---

## Task 18: Full test run + README + deploy config + push

**Files:**
- Create: `README.md`, `vercel.json`

- [ ] **Step 1: Run the whole suite**

Run: `npx vitest run`
Expected: all tests pass (money, actStatus, classify, filters, summary, normalize, acts).

- [ ] **Step 2: Create `vercel.json`**

```json
{ "build": { "env": { "NITRO_PRESET": "vercel" } } }
```

- [ ] **Step 3: Write `README.md`** (Russian). Must include these sections:
  - Краткое описание дашборда и что он показывает.
  - **Стек и обоснование**: почему Nuxt 3 вместо Laravel — сохраняем Vue во фронте (как в задании) и получаем нативный деплой на Vercel, который Laravel не даёт; единый TS-стек данные/логика/отображение.
  - **Архитектура**: список сущностей; где живёт бизнес-логика (`server/domain`, чистые функции без фреймворка); слои (`domain` → `repositories` → `api` → `app`); связи проектов/оплат/юрлиц/актов.
  - ER-диаграмма (mermaid, блок ниже).
  - **Логика статусов актов**: таблица 4 состояний + порог `STALE_DAYS = 30`; статус вычисляется, не хранится.
  - **Импорт PDF**: как устроен `server/import` (parseStatement → normalize → run-import), идемпотентность по `sourceRef`, fallback на закоммиченный `data/normalized.json`, отсечение исходящих/налогов.
  - **Допущения** (перечислить 5 пунктов из спеки §10).
  - **API**: таблица эндпоинтов (`GET /api/summary|payments|projects|counterparties|expenses`, `PATCH /api/acts/:id`).
  - **Локальный запуск** (точные команды):
    ```
    npm install
    cp .env.example .env
    DATABASE_URL="file:./prisma/dev.db" npx prisma db push
    npm run import:pdf            # опционально: перегенерировать data/normalized.json из PDF
    DATABASE_URL="file:./prisma/dev.db" npm run db:seed
    DATABASE_URL="file:./prisma/dev.db" npm run dev
    ```
  - **Тесты**: `npm test`.
  - **Деплой на Vercel + Neon**: создать БД в Neon; в Vercel задать `DATABASE_URL` (Postgres) и `NITRO_PRESET=vercel`; на прод-ветке выставить `provider = "postgresql"` в `schema.prisma`; выполнить `prisma db push`/`migrate deploy` и сид.
  - **Развитие**: сущность `WorkStage`, авторизация/роли, генерация и хранение актов, история изменений статусов.

  ER block to embed:

```mermaid
erDiagram
  Counterparty ||--o{ Project : has
  Counterparty ||--o{ Payment : pays
  Project ||--o{ Payment : receives
  Payment ||--o| Act : closes
```

- [ ] **Step 4: Commit**

```bash
git add README.md vercel.json
git commit -m "docs: add README and Vercel deploy config"
```

- [ ] **Step 5: Push to origin**

```bash
git push -u origin main
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** entities (Task 2); domain logic — act status/summary/filters/classify/money (Tasks 3-8); real PDF import + outgoing classification (Task 9); seed (Task 10); REST incl. expenses + act PATCH persistence (Tasks 11-13); backend filtering (Task 7 + repos); frontend summary/filters/tables/tabs (Tasks 15-17); tests for core + integration (Tasks 3-9, 14); README + Vercel/Neon deploy + .gitignore + .env.example (Tasks 1, 18). All §6 endpoints present; all 7 summary metrics in `buildSummary` + SummaryCards; status persistence via PATCH.
- **Placeholder scan:** no TBD/placeholder steps; every code step contains complete code. README content is enumerated as concrete required sections, not "write docs".
- **Type consistency:** `computeActStatus(payment, act, now)`, `buildSummary(rows: SummaryRow[])`, `matchesPaymentFilters(row: FilterableRow, f)`, `classifyServiceStage/classifyExpenseCategory/deriveProjectName`, `listPayments/listProjects/listCounterparties/updateAct`, envelope `ok/fail` — names consistent across tasks. Money is integer kopecks end-to-end; rubles only in `formatRubles`. `FilterableRow` exported and reused in the filters test.
- **Known risk:** PDF regex extraction (Task 9) is the one place needing iteration against real text; the plan calls this out, references the text already extracted during planning, and commits `data/normalized.json` as the authoritative, reproducible seed so downstream layers are deterministic regardless.
