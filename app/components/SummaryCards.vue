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
    { label: 'Всего оплат', value: s.paymentsCount },
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
