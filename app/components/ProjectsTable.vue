<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'
defineProps<{ rows: any[] }>()
const { money } = useFormat()
const doc: Record<string, { label: string; color: string }> = {
  all_closed: { label: 'Все закрыты', color: 'var(--ok)' },
  partial: { label: 'Частично закрыты', color: 'var(--warn)' },
  none_closed: { label: 'Нет закрытых', color: 'var(--bad)' },
  no_payments: { label: 'Нет оплат', color: 'var(--muted)' },
}
</script>
<template>
  <div class="table-scroll"><div>
    <table>
      <thead><tr>
        <th>Проект</th><th>Юрлицо</th><th>Сумма</th><th>Оплат</th>
        <th>Закрыто</th><th>Открыто</th><th>Документооборот</th>
      </tr></thead>
      <tbody>
        <tr v-if="!rows.length"><td class="empty" colspan="7">Нет проектов</td></tr>
        <tr v-for="r in rows" :key="r.id">
          <td data-label="Проект">{{ r.name }}</td>
          <td data-label="Юрлицо">{{ r.counterpartyName }}</td>
          <td data-label="Сумма" class="amount">{{ money(r.totalAmount) }}</td>
          <td data-label="Оплат" class="num-cell">{{ r.paymentsCount }}</td>
          <td data-label="Закрыто актов" class="num-cell">{{ r.closedActs }}</td>
          <td data-label="Открыто актов" class="num-cell">{{ r.openActs }}</td>
          <td data-label="Документооборот">
            <span class="badge" :style="{ background: doc[r.docStatus].color + '1c', color: doc[r.docStatus].color }">
              {{ doc[r.docStatus].label }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div></div>
</template>
<style scoped>
.empty { text-align: center; color: var(--muted); padding: 28px 16px; }
.empty::before { display: none; }
</style>
