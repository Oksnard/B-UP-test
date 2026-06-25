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
