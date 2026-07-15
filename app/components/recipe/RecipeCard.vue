<script setup lang="ts">
import { colorClasses, statusLabels } from '~/constants/recipe'
import type { Recipe } from '~/types'

const props = defineProps<{ recipe: Pick<Recipe, 'id' | 'name' | 'score' | 'cookCount' | 'tags' | 'coverColor' | 'coverPhotoUrl' | 'estimatedTime' | 'difficulty' | 'status'> }>()
const imageFailed = ref(false)
const statusLabel = computed(() => statusLabels[props.recipe.status] || null)
watch(() => props.recipe.coverPhotoUrl, () => { imageFailed.value = false })
</script>

<template>
  <article class="group h-full">
    <NuxtLink :to="`/recipes/${recipe.id}`" class="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)]" :aria-label="`查看菜谱：${recipe.name}`">
      <div class="relative aspect-[4/3] overflow-hidden" :class="colorClasses[recipe.coverColor] || 'bg-[var(--color-surface-muted)]'">
        <img v-if="recipe.coverPhotoUrl && !imageFailed" :src="recipe.coverPhotoUrl" :alt="`${recipe.name}成品图`" width="640" height="480" loading="lazy" decoding="async" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" @error="imageFailed = true" />
        <HandDrawnPlaceholder v-else :tags="recipe.tags" :alt="`${recipe.name}的手绘封面占位图`" aspect-ratio="4/3" class="h-full w-full transition-transform duration-500 group-hover:scale-[1.025]" />
        <div class="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-2 py-1 text-xs font-semibold text-[var(--color-accent)] shadow-sm"><span aria-hidden="true">★</span><span class="tabular-nums">{{ recipe.score }}</span><span class="sr-only">分</span></div>
        <div v-if="statusLabel" class="absolute left-2.5 top-2.5 rounded-md px-2 py-1 text-xs font-medium" :class="statusLabel.class">{{ statusLabel.text }}</div>
      </div>
      <div class="flex flex-1 flex-col p-4">
        <h2 class="font-serif text-lg font-semibold leading-snug text-[var(--color-text)]">{{ recipe.name }}</h2>
        <div v-if="recipe.tags.length" class="mt-2.5 flex min-h-6 flex-wrap gap-1.5">
          <span v-for="tag in recipe.tags.slice(0, 3)" :key="tag" class="rounded-md bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">{{ tag }}</span>
          <span v-if="recipe.tags.length > 3" class="px-1 text-xs text-[var(--color-text-faint)]">还有 {{ recipe.tags.length - 3 }} 个</span>
        </div>
        <div class="mt-auto flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
          <span><span class="tabular-nums">{{ recipe.estimatedTime }}</span> 分钟</span>
          <span>做过 <span class="tabular-nums">{{ recipe.cookCount }}</span> 次</span>
        </div>
      </div>
    </NuxtLink>
  </article>
</template>
