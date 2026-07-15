<script setup lang="ts">
import type { Ingredient } from '~/types'

const { recipes, ingredients, apiLoaded, kitchenRefreshing, kitchenErrors, loadFromApi, refresh } = useKitchenData()

const allIngredients = computed<Ingredient[]>(() => {
  const map = new Map<string, Ingredient>()
  for (const ingredient of ingredients.value) {
    map.set(ingredient.name, { ...ingredient, category: ingredient.category || '其他', recipeCount: ingredient.recipeCount || 0, crayonColor: ingredient.crayonColor || 'sand', usedIn: [...(ingredient.usedIn || [])], family: ingredient.family || null })
  }
  for (const recipe of recipes.value) {
    for (const recipeIngredient of recipe.ingredients || []) {
      const existing = map.get(recipeIngredient.name)
      if (existing) {
        if (!existing.usedIn.includes(recipe.id)) existing.usedIn.push(recipe.id)
        existing.recipeCount = existing.usedIn.length
      } else {
        map.set(recipeIngredient.name, { id: 'ing-' + recipeIngredient.name.replace(/\s/g, '-'), name: recipeIngredient.name, category: recipeIngredient.category || '其他', family: null, recipeCount: 1, crayonColor: 'sand', usedIn: [recipe.id], tags: [] })
      }
    }
  }
  return [...map.values()]
})
const pageError = computed(() => kitchenErrors.value.ingredients || kitchenErrors.value.recipes || '')

onMounted(() => { if (!apiLoaded.value) void loadFromApi() })
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="食材图谱" eyebrow="厨房里的关系" :description="allIngredients.length + ' 种食材 · ' + recipes.length + ' 道菜谱 · 连线表示同一道菜里会相遇'">
      <template #actions><AppButton variant="secondary" :loading="kitchenRefreshing" @click="refresh">刷新图谱数据</AppButton></template>
    </PageHeader>
    <AppNotice v-if="pageError && (!allIngredients.length || !recipes.length)" class="mb-5" tone="danger" title="图谱数据没有加载完整" :message="pageError"><AppButton class="mt-3" variant="secondary" @click="refresh">重新加载</AppButton></AppNotice>
    <div class="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <ClientOnly>
        <IngredientGraph :ingredients="allIngredients" :recipes="recipes" />
        <template #fallback><div class="flex h-[36rem] items-center justify-center text-sm text-[var(--color-text-muted)]">正在准备图谱画布…</div></template>
      </ClientOnly>
    </div>
  </div>
</template>
