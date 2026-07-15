<script setup lang="ts">
const { recipes, tips, tagsByDimension, apiLoaded, kitchenRefreshing, kitchenErrors, loadFromApi, refresh } = useKitchenData()
const { error: showError } = useToast()
const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const filterExpanded = ref(false)
const filteredSort = ref<'score' | 'cookCount' | ''>('')
const activeCategory = ref('')

await loadFromApi()

const categoryTree = computed(() => {
  const counts = new Map<string, number>()
  for (const recipe of recipes.value) counts.set(recipe.category || '其他', (counts.get(recipe.category || '其他') || 0) + 1)
  return [...counts].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count)
})
const ingredientFamilyMap: Record<string, string[]> = {
  猪肉类: ['猪肉', '五花肉', '排骨', '里脊', '肉末'], 牛肉类: ['牛肉', '牛腩', '肥牛'], 海鲜类: ['虾', '鱼', '蟹', '扇贝'],
  鸡肉类: ['鸡肉', '鸡腿', '鸭'], 蔬菜类: ['番茄', '土豆', '白菜', '青椒', '蘑菇', '豆腐', '黄瓜', '茄子'],
  主食类: ['面条', '米饭', '米线', '意面', '粉丝', '吐司', '面粉'],
}
const filteredRecipes = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('zh-CN')
  let result = recipes.value.filter((recipe) => {
    if (activeCategory.value && recipe.category !== activeCategory.value) return false
    if (query && ![recipe.name, ...recipe.tags, ...recipe.ingredients.map(item => item.name)].some(text => text.toLocaleLowerCase('zh-CN').includes(query))) return false
    return selectedTags.value.every((tag) => recipe.tags.includes(tag) || ingredientFamilyMap[tag]?.some(keyword => recipe.ingredients.some(item => item.name.includes(keyword))))
  })
  if (filteredSort.value === 'score') result = [...result].sort((a, b) => b.score - a.score)
  if (filteredSort.value === 'cookCount') result = [...result].sort((a, b) => b.cookCount - a.cookCount)
  return result
})
const filtersActive = computed(() => !!searchQuery.value || !!activeCategory.value || !!filteredSort.value || selectedTags.value.length > 0)
const toggleTag = (tag: string) => { const index = selectedTags.value.indexOf(tag); if (index >= 0) selectedTags.value.splice(index, 1); else selectedTags.value.push(tag) }
const clearFilters = () => { searchQuery.value = ''; selectedTags.value = []; filteredSort.value = ''; activeCategory.value = '' }
const toggleSort = (sort: 'score' | 'cookCount') => { filteredSort.value = filteredSort.value === sort ? '' : sort }
const randomRecipe = async () => { const pool = filteredRecipes.value.length ? filteredRecipes.value : recipes.value; const item = pool[Math.floor(Math.random() * pool.length)]; if (item) await navigateTo(`/recipes/${item.id}`) }
const libraryStats = computed(() => ({ total: recipes.value.length, cooked: recipes.value.reduce((sum, recipe) => sum + recipe.cookCount, 0), favorite: [...recipes.value].sort((a, b) => b.cookCount - a.cookCount)[0]?.name || '还没有' }))
const retry = async () => { const result = await refresh(); if (!result.ok) showError('菜谱还是没有加载成功，请稍后再试。') }
const tip = computed(() => tips.value[0])
</script>

<template>
  <div class="animate-fade-in">
    <PageHeader title="菜谱" description="想吃什么就搜，常做的菜也可以慢慢整理得更顺手。">
      <template #actions>
        <AppButton variant="secondary" @click="randomRecipe">随机一道</AppButton>
        <AppButton to="/recipes/new">新建菜谱</AppButton>
      </template>
    </PageHeader>

    <section class="mb-6 rounded-[var(--radius-xl)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] sm:p-5" aria-label="搜索与筛选">
      <label class="field-label" for="recipe-search">搜索菜谱</label>
      <div class="flex flex-col gap-2 sm:flex-row">
        <input id="recipe-search" v-model="searchQuery" type="search" class="field-control flex-1" placeholder="菜名、食材或标签" autocomplete="off" />
        <AppButton variant="secondary" :aria-expanded="filterExpanded" @click="filterExpanded = !filterExpanded">{{ filterExpanded ? '收起筛选' : '更多筛选' }}</AppButton>
      </div>
      <div class="mt-3 flex flex-wrap gap-2" aria-label="常用筛选">
        <button class="touch-target rounded-lg px-3 text-sm transition" :class="filteredSort === 'score' ? 'bg-[var(--color-text)] text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'" @click="toggleSort('score')">评分高</button>
        <button class="touch-target rounded-lg px-3 text-sm transition" :class="filteredSort === 'cookCount' ? 'bg-[var(--color-text)] text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'" @click="toggleSort('cookCount')">常做</button>
        <button v-for="tag in ['快手', '便当友好', '下饭菜']" :key="tag" class="touch-target rounded-lg px-3 text-sm transition" :class="selectedTags.includes(tag) ? 'bg-[var(--color-text)] text-white' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'" @click="toggleTag(tag)">{{ tag }}</button>
        <button v-if="filtersActive" class="touch-target rounded-lg px-3 text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]" @click="clearFilters">清除条件</button>
      </div>
      <div v-if="filterExpanded" class="mt-4 border-t border-[var(--color-border)] pt-4">
        <div class="mb-4 flex flex-wrap gap-2">
          <button class="touch-target rounded-lg border px-3 text-sm" :class="!activeCategory ? 'border-[var(--color-text)] bg-[var(--color-text)] text-white' : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)]'" @click="activeCategory = ''">全部分类</button>
          <button v-for="category in categoryTree" :key="category.key" class="touch-target rounded-lg border px-3 text-sm" :class="activeCategory === category.key ? 'border-[var(--color-text)] bg-[var(--color-text)] text-white' : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)]'" @click="activeCategory = activeCategory === category.key ? '' : category.key">{{ category.label }} · {{ category.count }}</button>
        </div>
        <TagFilter :tags="tagsByDimension" :selected="selectedTags" @toggle="toggleTag" @clear="clearFilters" />
      </div>
    </section>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-[var(--color-text-muted)]"><span class="tabular-nums font-semibold text-[var(--color-text)]">{{ filteredRecipes.length }}</span> 道菜谱<span v-if="filtersActive">符合条件</span></p>
      <p class="text-xs text-[var(--color-text-faint)]">共 {{ libraryStats.total }} 道 · 做过 {{ libraryStats.cooked }} 次 · 最常做 {{ libraryStats.favorite }}</p>
    </div>

    <AppNotice v-if="kitchenErrors.recipes" class="mb-5" tone="danger" role="alert" title="菜谱没有加载完整" :message="kitchenErrors.recipes"><AppButton class="mt-3" variant="secondary" size="sm" :loading="kitchenRefreshing" @click="retry">重新加载</AppButton></AppNotice>
    <div v-if="!apiLoaded || kitchenRefreshing && !recipes.length" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="正在加载菜谱" aria-busy="true"><div v-for="n in 8" :key="n" class="aspect-[4/5] animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)]" /></div>
    <EmptyState v-else-if="!filteredRecipes.length" title="没有找到合适的菜谱" :description="filtersActive ? '换个关键词，或清除一些筛选条件。' : '先收下第一道家里的常做菜吧。'" icon="菜"><AppButton v-if="filtersActive" variant="secondary" @click="clearFilters">清除条件</AppButton><AppButton v-else to="/recipes/new">新建菜谱</AppButton></EmptyState>
    <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-stagger><RecipeCard v-for="recipe in filteredRecipes" :key="recipe.id" :recipe="recipe" /></div>

    <aside v-if="tip" class="mt-8 rounded-[var(--radius-lg)] bg-[var(--color-warning-soft)] p-4 text-sm leading-6 text-[var(--color-text-muted)]"><span class="font-semibold text-[var(--color-warning)]">厨房小记：</span>{{ tip.content }}</aside>
  </div>
</template>
