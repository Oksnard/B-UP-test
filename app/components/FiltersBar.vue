<script setup lang="ts">
import { SERVICE_STAGE_LABELS, ACT_STATUS_LABELS } from '~~/server/domain/types'
const props = defineProps<{
  projects: { id: string; name: string }[]
  counterparties: { id: string; name: string }[]
}>()
const emit = defineEmits<{ change: [Record<string, string>] }>()
const f = reactive<Record<string, string>>({ project: '', counterparty: '', from: '', to: '', stage: '', actStatus: '', q: '' })
const stages = Object.entries(SERVICE_STAGE_LABELS)
const statuses = Object.entries(ACT_STATUS_LABELS)
function apply() {
  emit('change', Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')))
}
function reset() { Object.keys(f).forEach((k) => (f[k] = '')); apply() }
</script>
<template>
  <section class="filters card">
    <input class="field filters__search" v-model="f.q" placeholder="Поиск по назначению или клиенту…" @keyup.enter="apply" />
    <select class="field" v-model="f.counterparty"><option value="">Все юрлица</option>
      <option v-for="c in counterparties" :key="c.id" :value="c.id">{{ c.name }}</option></select>
    <select class="field" v-model="f.project"><option value="">Все проекты</option>
      <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option></select>
    <select class="field" v-model="f.stage"><option value="">Все услуги</option>
      <option v-for="[k, label] in stages" :key="k" :value="k">{{ label }}</option></select>
    <select class="field" v-model="f.actStatus"><option value="">Любой статус</option>
      <option v-for="[k, label] in statuses" :key="k" :value="k">{{ label }}</option></select>
    <label class="filters__date"><span>с</span><input class="field" type="date" v-model="f.from" /></label>
    <label class="filters__date"><span>по</span><input class="field" type="date" v-model="f.to" /></label>
    <div class="filters__actions">
      <button class="btn" @click="apply">Применить</button>
      <button class="btn btn--ghost" @click="reset">Сбросить</button>
    </div>
  </section>
</template>
<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 18px;
}
.filters .field { flex: 1 1 150px; min-width: 0; }
.filters__search { flex: 2 1 230px; }
.filters__date {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1 1 150px;
  color: var(--muted);
  font-size: 13px;
}
.filters__date .field { flex: 1; min-width: 0; }
.filters__actions { display: flex; gap: 8px; flex: 1 1 auto; }
.filters__actions .btn { flex: 1 1 auto; }

@media (max-width: 640px) {
  .filters { flex-direction: column; align-items: stretch; gap: 9px; }
  .filters .field,
  .filters__search,
  .filters__date { flex: 1 1 auto; width: 100%; }
  .filters .field, .btn { height: 44px; }
}
</style>
