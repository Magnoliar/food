<script setup lang="ts">
defineProps<{
  class?: string
}>()
</script>

<template>
  <div class="glass-card card-lift" :class="$props.class">
    <slot />
  </div>
</template>
