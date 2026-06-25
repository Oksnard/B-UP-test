import { writeFile } from 'node:fs/promises'
import { extractStatementText, parseOperations } from './parseStatement'
import { normalize } from './normalize'

const PDF = process.argv[2] ?? 'data/bank_statement.pdf'
const OUT = process.argv[3] ?? 'data/normalized.json'

const text = await extractStatementText(PDF)
const ops = parseOperations(text)
const normalized = normalize(ops)

await writeFile(OUT, JSON.stringify(normalized, null, 2), 'utf8')

const incoming = normalized.payments.filter(p => p.direction === 'in')
const outgoing = normalized.payments.filter(p => p.direction === 'out')

console.log(`Parsed ${ops.length} operations -> ${normalized.payments.length} payments`)
console.log(`  incoming: ${incoming.length}, outgoing: ${outgoing.length}`)
console.log(`  counterparties: ${normalized.counterparties.length}`)
console.log(`  projects: ${normalized.projects.length}`)
console.log(`  acts: ${normalized.acts.length}`)
console.log()
console.log('Counterparties:')
for (const c of normalized.counterparties) {
  console.log(`  [${c.inn}] ${c.name}`)
}
console.log()
console.log('Payments:')
for (const p of normalized.payments) {
  const dir = p.direction === 'in' ? 'IN ' : 'OUT'
  console.log(`  ${dir} ${p.date} ${(p.amount / 100).toFixed(2).padStart(12)} RUB  ${p.serviceStage.padEnd(12)} ${p.purpose.slice(0, 60)}`)
}
console.log()
console.log(`Wrote ${OUT}`)
