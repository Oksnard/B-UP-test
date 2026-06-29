<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'
const props = defineProps<{ summary: any | null }>()
const { money } = useFormat()
const cards = computed(() => {
  const s = props.summary
  if (!s) return []
  return [
    { label: 'Всего оплат (приход)', value: money(s.totalIncome), tone: 'accent' },
    { label: 'Проектов', value: s.projectsCount, tone: 'neutral' },
    { label: 'Всего оплат', value: s.paymentsCount, tone: 'neutral' },
    { label: 'Закрыто актами', value: money(s.closedActsAmount), tone: 'ok' },
    { label: 'Не закрыто актами', value: money(s.openActsAmount), tone: 'warn' },
    { label: 'Без отправленного акта', value: s.withoutSentActCount, tone: 'bad' },
    { label: 'Отправлен, не подписан', value: s.sentNotSignedCount, tone: 'warn' },
    { label: 'Расходы (налоги/субподряд)', value: money(s.totalExpenses), tone: 'bad' },
  ]
})
</script>
<template>
  <section class="cards">
    <div
      v-for="(c, i) in cards"
      :key="c.label"
      class="metric rise"
      :class="`metric--${c.tone}`"
      :style="{ animationDelay: `${i * 45}ms` }"
    >
      <div class="metric__label">{{ c.label }}</div>
      <div class="metric__value num">{{ c.value }}</div>
    </div>
  </section>
</template>
<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}
.metric {
  position: relative;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px 16px 17px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.metric::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--tone, var(--muted));
}
.metric--accent  { --tone: var(--accent); }
.metric--ok      { --tone: var(--ok); }
.metric--warn    { --tone: var(--warn); }
.metric--bad     { --tone: var(--bad); }
.metric--neutral { --tone: #aeb6c0; }
.metric__label {
  color: var(--muted);
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .05em;
  margin-bottom: 9px;
  line-height: 1.35;
}
.metric__value {
  font-size: clamp(19px, 2.4vw, 23px);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.1;
}
@media (max-width: 520px) {
  .cards { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .metric { padding: 13px 13px 14px; }
}
</style>
