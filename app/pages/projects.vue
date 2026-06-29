<script setup lang="ts">
const api = useApi()
const rows = ref<any[]>([])
rows.value = await api.getProjects()
</script>
<template>
  <div>
    <h2 class="page-title">Проекты и юрлица</h2>
    <ProjectsTable :rows="rows" />
  </div>
</template>
<style scoped>
.page-title {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: clamp(20px, 3vw, 26px);
  letter-spacing: -.01em;
  margin: 2px 0 16px;
}
</style>
