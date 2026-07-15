<script setup lang="ts">
const props = defineProps<{
  tags: Record<string, Array<{ id: string; name: string; dimension: string; color?: string }>>
  selected: string[]
}>()

const emit = defineEmits<{ toggle: [tagName: string]; clear: [] }>()
const dimensionLabels: Record<string, string> = {
  cuisine: '菜系', dish_type: '类型', complexity: '复杂度', cook_method: '烹饪方式', taste: '口味',
  scenario: '场景', protein: '荤素', season: '季节', emotion: '情感', region: '地区', cook_tool: '工具',
  nutrition: '营养', ingredient_family: '食材家族',
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="selected.length" class="flex flex-wrap items-center justify-between gap-2">
      <span class="font-hand text-base text-[var(--color-text)]">已选 {{ selected.length }} 个条件</span>
      <button type="button" class="touch-target rounded-[var(--radius-md)] px-3 font-hand text-sm text-[var(--color-accent)] transition hover:bg-[var(--color-accent-soft)]" @click="emit('clear')">清除全部</button>
    </div>

    <div v-for="(dimensionTags, dimension) in props.tags" :key="dimension" class="grid grid-cols-[3.75rem_minmax(0,1fr)] items-start gap-2">
      <span class="pt-3 font-hand text-sm text-[var(--color-text-muted)]">{{ dimensionLabels[dimension as string] || dimension }}</span>
      <div class="flex min-w-0 flex-wrap gap-1.5">
        <button
          v-for="tag in dimensionTags"
          :key="tag.id"
          type="button"
          class="min-h-11 rounded-[var(--radius-md)] border px-3 font-hand text-sm transition"
          :class="selected.includes(tag.name)
            ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)] shadow-[var(--shadow-sm)]'
            : 'border-transparent bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]'"
          :aria-pressed="selected.includes(tag.name)"
          @click="emit('toggle', tag.name)"
        >
          {{ tag.name }}
        </button>
      </div>
    </div>
  </div>
</template>
