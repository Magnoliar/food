<script setup lang="ts">
const props = defineProps<{
  tags: Record<string, Array<{ id: string; name: string; dimension: string; color: string }>>
  selected: string[]
}>()

const emit = defineEmits<{
  toggle: [tagName: string]
  clear: []
}>()

const dimensionLabels: Record<string, string> = {
  cuisine: '菜系',
  dish_type: '类型',
  complexity: '复杂度',
  cook_method: '烹饪方式',
  taste: '口味',
  scenario: '场景',
  protein: '荤素',
  season: '季节',
  emotion: '情感',
  region: '地区',
  cook_tool: '工具',
  nutrition: '营养',
  ingredient_family: '食材家族',
}

const colorMap: Record<string, string> = {
  coral: 'bg-crayon-coral/15 text-crayon-coral border-crayon-coral/20',
  teal: 'bg-crayon-teal/15 text-crayon-teal border-crayon-teal/20',
  sand: 'bg-crayon-sand/15 text-crayon-sand border-crayon-sand/20',
  grass: 'bg-crayon-grass/15 text-crayon-grass border-crayon-grass/20',
  lavender: 'bg-crayon-lavender/15 text-crayon-lavender border-crayon-lavender/20',
  sky: 'bg-crayon-sky/15 text-crayon-sky border-crayon-sky/20',
  lemon: 'bg-crayon-lemon/15 text-crayon-lemon border-crayon-lemon/20',
  gold: 'bg-morandi-gold/15 text-morandi-gold border-morandi-gold/20',
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span v-if="selected.length" class="font-hand text-base text-[#5A4D3E]">
        {{ selected.length }} 个筛选条件
      </span>
      <button
        v-if="selected.length"
        class="font-hand text-sm text-[#6B5D4D] hover:text-morandi-warm transition-colors"
        @click="emit('clear')"
      >
        清除全部
      </button>
    </div>

    <div v-for="(tags, dimension) in props.tags" :key="dimension" class="flex flex-wrap items-center gap-1.5">
      <span class="font-hand text-sm text-[#6B5D4D] w-14 flex-shrink-0">
        {{ dimensionLabels[dimension as string] || dimension }}
      </span>
      <button
        v-for="tag in tags"
        :key="tag.id"
        class="crayon-tag text-xs border transition-all"
        :class="selected.includes(tag.name)
          ? (colorMap[tag.color] || colorMap.sand) + ' ring-1 ring-current/30'
          : 'bg-gray-100 text-[#7A6B5A] border-transparent hover:bg-gray-100'"
        @click="emit('toggle', tag.name)"
      >
        {{ tag.name }}
      </button>
    </div>
  </div>
</template>
