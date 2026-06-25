<script setup lang="ts">
import { SERVICE_STAGE_LABELS, ACT_STATUS_LABELS } from '~~/server/domain/types'
const props = defineProps<{ projects: { id: string; name: string }[] }>()
const emit = defineEmits<{ change: [Record<string, string>] }>()
const f = reactive<Record<string, string>>({ project: '', from: '', to: '', stage: '', actStatus: '', q: '' })
const stages = Object.entries(SERVICE_STAGE_LABELS)
const statuses = Object.entries(ACT_STATUS_LABELS)
function apply() {
  emit('change', Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')))
}
function reset() { Object.keys(f).forEach((k) => (f[k] = '')); apply() }
</script>
<template>
  <section class="filters card">
    <input v-model="f.q" placeholder="Поиск по назначению…" @keyup.enter="apply" />
    <select v-model="f.project"><option value="">Все проекты</option>
      <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option></select>
    <select v-model="f.stage"><option value="">Все услуги</option>
      <option v-for="[k, label] in stages" :key="k" :value="k">{{ label }}</option></select>
    <select v-model="f.actStatus"><option value="">Любой статус</option>
      <option v-for="[k, label] in statuses" :key="k" :value="k">{{ label }}</option></select>
    <label>с <input type="date" v-model="f.from" /></label>
    <label>по <input type="date" v-model="f.to" /></label>
    <button @click="apply">Применить</button>
    <button class="ghost" @click="reset">Сбросить</button>
  </section>
</template>
<style scoped>
.filters { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:16px; }
.filters input, .filters select { padding:7px 9px; border:1px solid var(--line); border-radius:8px; font-size:14px; }
.filters button { padding:7px 14px; border:0; border-radius:8px; background:var(--info); color:#fff; font-weight:600; cursor:pointer; }
.filters button.ghost { background:#eef0f3; color:var(--ink); }
</style>
