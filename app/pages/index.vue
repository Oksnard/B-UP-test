<script setup lang="ts">
const api = useApi()
const filters = ref<Record<string, string>>({})
const projects = ref<{ id: string; name: string }[]>([])
const summary = ref<any>(null)
const payments = ref<any[]>([])

async function load() {
  const [s, p, pr] = await Promise.all([
    api.getSummary(filters.value),
    api.getPayments(filters.value),
    api.getProjects(),
  ])
  summary.value = s; payments.value = p
  projects.value = pr.map((x: any) => ({ id: x.id, name: x.name }))
}
function onFilter(f: Record<string, string>) { filters.value = f; load() }
async function onToggle({ id, patch }: { id: string; patch: Record<string, any> }) {
  await api.patchAct(id, patch); await load()
}
await load()
</script>
<template>
  <div>
    <SummaryCards :summary="summary" />
    <FiltersBar :projects="projects" @change="onFilter" />
    <PaymentsTable :rows="payments" @toggle="onToggle" />
  </div>
</template>
