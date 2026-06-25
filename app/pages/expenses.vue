<script setup lang="ts">
const api = useApi()
const rows = ref<any[]>([])
rows.value = await api.getExpenses({})
</script>
<template><ExpensesTable :rows="rows" /></template>
