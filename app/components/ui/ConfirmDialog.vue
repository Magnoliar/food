<script setup lang="ts">
const props = withDefaults(defineProps<{ open: boolean; title: string; description?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean; busy?: boolean }>(), { description: '', confirmLabel: '确认', cancelLabel: '取消', danger: false, busy: false })
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLDivElement | null>(null)
const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !props.busy) emit('cancel') }
watch(() => props.open, async (open) => { if (open) { await nextTick(); dialog.value?.focus() } })
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="fixed inset-0 z-[var(--z-dialog)] grid place-items-end bg-[var(--color-overlay)] p-0 backdrop-blur-[2px] sm:place-items-center sm:p-5" @click.self="!busy && emit('cancel')" @keydown="onKeydown">
        <div ref="dialog" class="w-full rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] outline-none sm:max-w-md sm:rounded-[var(--radius-xl)] sm:p-6" role="alertdialog" aria-modal="true" :aria-labelledby="'confirm-title'" :aria-describedby="description ? 'confirm-description' : undefined" tabindex="-1">
          <h2 id="confirm-title" class="font-serif text-xl font-semibold text-[var(--color-text)]">{{ title }}</h2>
          <p v-if="description" id="confirm-description" class="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{{ description }}</p>
          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AppButton variant="secondary" :disabled="busy" @click="emit('cancel')">{{ cancelLabel }}</AppButton>
            <AppButton :variant="danger ? 'danger' : 'primary'" :loading="busy" @click="emit('confirm')">{{ confirmLabel }}</AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,.dialog-leave-active{transition:opacity var(--motion-base) ease}.dialog-enter-active>div,.dialog-leave-active>div{transition:transform var(--motion-base) ease}.dialog-enter-from,.dialog-leave-to{opacity:0}.dialog-enter-from>div,.dialog-leave-to>div{transform:translateY(1rem)}
</style>
