<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'
const props = defineProps<{ status: string }>()
const { statusLabel } = useFormat()
const color: Record<string, string> = {
  CLOSED: 'var(--ok)', AWAITING_SIGNATURE: 'var(--info)',
  NOT_SENT: 'var(--muted)', NEEDS_ATTENTION: 'var(--bad)',
}
</script>
<template>
  <span class="badge" :style="{ background: color[status] + '22', color: color[status] }">
    {{ statusLabel(status as any) }}
  </span>
</template>
