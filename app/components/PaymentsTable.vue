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
