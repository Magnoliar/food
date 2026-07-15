<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'info' | 'success' | 'warning' | 'danger'; title?: string; message?: string; role?: 'status' | 'alert' }>(), { tone: 'info', title: '', message: '', role: 'status' })
</script>

<template>
  <div class="notice" :class="'notice--' + tone" :role="role" :aria-live="role === 'alert' ? 'assertive' : 'polite'">
    <span class="notice__dot" aria-hidden="true" />
    <div class="min-w-0"><p v-if="title" class="font-semibold">{{ title }}</p><p v-if="message" class="text-sm leading-6" :class="title ? 'mt-0.5' : ''">{{ message }}</p><slot /></div>
  </div>
</template>

<style scoped>
.notice { display:flex; gap:.75rem; border:1px solid var(--color-border); border-radius:var(--radius-md); padding:.8rem .9rem; color:var(--color-text); background:var(--color-bg-soft); }
.notice__dot { width:.55rem; height:.55rem; flex:none; margin-top:.45rem; border-radius:999px; background:var(--color-text-muted); }
.notice--success { border-color:var(--color-success-border); background:var(--color-success-soft); }.notice--success .notice__dot{background:var(--color-success)}
.notice--warning { border-color:var(--color-warning-border); background:var(--color-warning-soft); }.notice--warning .notice__dot{background:var(--color-warning)}
.notice--danger { border-color:var(--color-danger-border); background:var(--color-danger-soft); }.notice--danger .notice__dot{background:var(--color-danger)}
.notice--info .notice__dot{background:var(--color-accent)}
</style>
