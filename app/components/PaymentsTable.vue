<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'
const props = defineProps<{ rows: any[] }>()
const emit = defineEmits<{ toggle: [{ id: string; patch: Record<string, any> }] }>()
const { money, date, stageLabel } = useFormat()
</script>
<template>
  <div class="table-scroll"><div>
    <table>
      <thead><tr>
        <th>Дата</th><th>Плательщик</th><th>Проект</th><th>Сумма</th><th>Назначение</th>
        <th>Этап</th><th>Отпр.</th><th>Подп.</th><th>Статус</th><th>Комментарий</th>
      </tr></thead>
      <tbody>
        <tr v-if="!rows.length"><td class="empty" colspan="10">Нет оплат по заданным фильтрам</td></tr>
        <tr v-for="r in rows" :key="r.id">
          <td data-label="Дата" class="num-cell">{{ date(r.date) }}</td>
          <td data-label="Плательщик">{{ r.counterpartyName }}</td>
          <td data-label="Проект">{{ r.projectName || '—' }}</td>
          <td data-label="Сумма" class="amount">{{ money(r.amount) }}</td>
          <td data-label="Назначение" class="purpose">{{ r.purpose }}</td>
          <td data-label="Этап">{{ stageLabel(r.serviceStage) }}</td>
          <td data-label="Акт отправлен">
            <input class="cbx" type="checkbox" :checked="r.act?.isSent" :disabled="!r.act"
              @change="emit('toggle', { id: r.act.id, patch: { isSent: ($event.target as HTMLInputElement).checked } })" />
          </td>
          <td data-label="Акт подписан">
            <input class="cbx" type="checkbox" :checked="r.act?.isSigned" :disabled="!r.act"
              @change="emit('toggle', { id: r.act.id, patch: { isSigned: ($event.target as HTMLInputElement).checked } })" />
          </td>
          <td data-label="Статус"><ActStatusBadge :status="r.status" /></td>
          <td data-label="Комментарий" class="comment">{{ r.act?.managerComment || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div></div>
</template>
<style scoped>
.comment { color: var(--muted); font-size: 13px; }
.empty { text-align: center; color: var(--muted); padding: 28px 16px; }
.empty::before { display: none; }
</style>
