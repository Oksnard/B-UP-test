<script setup lang="ts">
const api = useApi()
const rows = ref<any[]>([])
rows.value = await api.getProjects()
</script>
<template><ProjectsTable :rows="rows" /></template>
