<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'
defineProps<{ rows: any[] }>()
const { money, date, expenseLabel } = useFormat()
</script>
<template>
  <div class="table-scroll"><div>
    <table>
      <thead><tr><th>Дата</th><th>Получатель</th><th>Категория</th><th>Сумма</th><th>Назначение</th></tr></thead>
      <tbody>
        <tr v-if="!rows.length"><td class="empty" colspan="5">Нет расходов</td></tr>
        <tr v-for="r in rows" :key="r.id">
          <td data-label="Дата" class="num-cell">{{ date(r.date) }}</td>
          <td data-label="Получатель">{{ r.counterpartyName }}</td>
          <td data-label="Категория">{{ expenseLabel(r.expenseCategory) }}</td>
          <td data-label="Сумма" class="amount">{{ money(r.amount) }}</td>
          <td data-label="Назначение" class="purpose">{{ r.purpose }}</td>
        </tr>
      </tbody>
    </table>
  </div></div>
</template>
<style scoped>
.purpose { max-width: 380px; }
.empty { text-align: center; color: var(--muted); padding: 28px 16px; }
.empty::before { display: none; }
</style>
