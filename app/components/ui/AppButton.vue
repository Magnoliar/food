<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  to?: RouteLocationRaw
  block?: boolean
}>(), { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false, block: false, to: undefined })

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="app-button"
    :class="[
      'app-button--' + variant,
      'app-button--' + size,
      { 'w-full': block, 'pointer-events-none opacity-55': disabled || loading },
    ]"
    :aria-disabled="disabled || loading"
    :tabindex="disabled || loading ? -1 : undefined"
    @click="handleClick"
  >
    <span v-if="loading" class="app-button__spinner" aria-hidden="true" />
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    class="app-button"
    :class="['app-button--' + variant, 'app-button--' + size, { 'w-full': block }]"
    :disabled="disabled || loading"
    :aria-busy="loading"
    @click="handleClick"
  >
    <span v-if="loading" class="app-button__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.app-button { display:inline-flex; min-height:2.75rem; align-items:center; justify-content:center; gap:.5rem; border:1px solid transparent; border-radius:var(--radius-md); padding:.625rem 1rem; font-weight:600; line-height:1.2; text-align:center; transition:background-color var(--motion-fast) ease,border-color var(--motion-fast) ease,color var(--motion-fast) ease,transform var(--motion-fast) ease,box-shadow var(--motion-fast) ease; }
.app-button:hover { box-shadow:var(--shadow-sm); }
.app-button:active { transform:translateY(1px); }
.app-button:disabled { cursor:not-allowed; opacity:.55; transform:none; box-shadow:none; }
.app-button--primary { background:var(--color-accent); color:white; }
.app-button--primary:hover { background:var(--color-accent-hover); }
.app-button--secondary { border-color:var(--color-border-strong); background:var(--color-surface); color:var(--color-text); }
.app-button--secondary:hover { border-color:var(--color-accent); background:var(--color-bg-soft); }
.app-button--ghost { background:transparent; color:var(--color-text-muted); }
.app-button--ghost:hover { background:var(--color-surface-muted); color:var(--color-text); }
.app-button--danger { background:var(--color-danger); color:white; }
.app-button--danger:hover { background:var(--color-danger-hover); }
.app-button--sm { min-height:2.75rem; padding:.5rem .75rem; font-size:.875rem; }
.app-button--lg { min-height:3rem; padding:.75rem 1.25rem; }
.app-button__spinner { width:1rem; height:1rem; flex:none; border:2px solid currentColor; border-right-color:transparent; border-radius:999px; animation:spin .7s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
</style>
