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
