<script setup lang="ts">
const { recipes: recipeState, ingredients: ingredientState, loadFromApi } = useMockData()

onMounted(loadFromApi)
onServerPrefetch(loadFromApi)

const allIngredients = computed(() => {
  const map = new Map<string, any>()

  for (const ing of ingredientState.value) {
    map.set(ing.name, {
      id: ing.id,
      name: ing.name,
      category: ing.category || '其他',
      recipeCount: ing.recipeCount || 0,
      crayonColor: ing.crayonColor || 'sand',
      usedIn: ing.usedIn || [],
    })
  }

  for (const recipe of recipeState.value) {
    if (!recipe.ingredients) continue
    for (const ing of recipe.ingredients) {
      const existing = map.get(ing.name)
      if (existing) {
        if (!existing.usedIn.includes(recipe.id)) {
          existing.usedIn.push(recipe.id)
          existing.recipeCount = existing.usedIn.length
        }
      } else {
        map.set(ing.name, {
          id: 'ing-' + ing.name.replace(/\s/g, '-'),
          name: ing.name,
          category: ing.category || '其他',
          recipeCount: 1,
          crayonColor: 'sand',
          usedIn: [recipe.id],
        })
      }
    }
  }

  return Array.from(map.values())
})

const totalIngredients = computed(() => allIngredients.value.length)
</script>

<template>
  <div class="animate-fade-in">
    <div class="flex items-end justify-between mb-6">
      <div>
        <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-1 font-sans">Ingredient Universe</p>
        <h1 class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714]">食材宇宙</h1>
        <p class="text-sm text-[#8B7D6B] mt-1">
          {{ totalIngredients }} 种食材 · {{ recipeState.length }} 道菜谱 · 连线表示同菜共用
        </p>
      </div>
    </div>

    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <ClientOnly>
        <IngredientGraph :ingredients="allIngredients" :recipes="recipeState" />
        <template #fallback>
          <div class="h-[600px] flex items-center justify-center text-[#A69080] text-sm">正在画食材图谱...</div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>
