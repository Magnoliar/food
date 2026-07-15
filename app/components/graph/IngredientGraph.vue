<script setup lang="ts">
import type { Ingredient, Recipe } from '~/types'
import type { Selection, ZoomBehavior } from 'd3'

const router = useRouter()
const toast = useToast()
let d3Module: typeof import('d3') | null = null
type GraphLink = { source: string; target: string }

const props = defineProps<{
  ingredients: Ingredient[]
  recipes: Recipe[]
}>()

const svgRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const tooltipData = ref<{ x: number; y: number; name: string; detail: string } | null>(null)
const isFullscreen = ref(false)
const graphLoading = ref(true)
const graphError = ref('')
const hasGraphData = computed(() => props.ingredients.length > 0 && props.recipes.length > 0)
let currentZoom: ZoomBehavior<Element, unknown> | null = null
let currentSvg: Selection<SVGSVGElement, unknown, null, undefined> | null = null

// Category filter
const excludeCategories = ref<Set<string>>(new Set())
const allCategories = computed(() => {
  const cats = new Set(props.ingredients.map(i => i.category))
  return Array.from(cats)
})

const toggleCategory = (cat: string) => {
  if (excludeCategories.value.has(cat)) {
    excludeCategories.value.delete(cat)
  } else {
    excludeCategories.value.add(cat)
  }
  excludeCategories.value = new Set(excludeCategories.value)
  buildGraph()
}

const colorMap: Record<string, string> = {
  coral: '#E8927C',
  teal: '#7FB5B5',
  sand: '#D4A76A',
  grass: '#A8C686',
  lavender: '#C7A0D2',
  sky: '#7BA7C2',
  rose: '#E8A0BF',
  lemon: '#E8D47C',
}

const zoomIn = () => {
  if (currentSvg && currentZoom) {
    ;(currentSvg.transition().duration(300) as any).call(currentZoom.scaleBy, 1.4)
  }
}

const zoomOut = () => {
  if (currentSvg && currentZoom) {
    ;(currentSvg.transition().duration(300) as any).call(currentZoom.scaleBy, 0.7)
  }
}

const zoomReset = () => {
  if (currentSvg && currentZoom) {
    if (!d3Module) return
    ;(currentSvg.transition().duration(500) as any).call(currentZoom.transform, d3Module.zoomIdentity)
  }
}

const toggleFullscreen = async () => {
  if (!containerRef.value) return
  try {
    if (!document.fullscreenElement) {
      await containerRef.value.requestFullscreen()
      isFullscreen.value = true
    } else {
      await document.exitFullscreen()
      isFullscreen.value = false
    }
  } catch (error: unknown) {
    toast.error(getApiErrorMessage(error, '无法切换全屏，请检查浏览器权限。'))
  }
}

let currentSimulation: any = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null

const debouncedResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => buildGraph(), 200)
}

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
  if (isFullscreen.value) {
    nextTick(() => buildGraph())
  }
}

const retryGraph = async () => {
  graphLoading.value = true
  graphError.value = ''
  try {
    d3Module ||= await import('d3')
    await nextTick()
    if (hasGraphData.value) buildGraph()
  } catch (error: unknown) {
    graphError.value = getApiErrorMessage(error, '图谱模块没有加载成功。')
  } finally {
    graphLoading.value = false
  }
}

onMounted(async () => {
  window.addEventListener('resize', debouncedResize)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  await retryGraph()
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  if (currentSimulation) currentSimulation.stop()
})

const buildGraph = () => {
  const d3 = d3Module
  if (!svgRef.value || !d3 || !hasGraphData.value) return

  const container = svgRef.value
  const W = 4000, H = 3000
  const cx = W / 2, cy = H / 2

  // Common spices/seasonings to hide from graph
  const SPICE_BLACKLIST = new Set([
    '姜', '蒜', '葱', '生抽', '老抽', '料酒', '盐', '糖', '淀粉',
    '花椒', '八角', '干辣椒', '白醋', '蚝油', '香油', '胡椒粉',
    '橄榄油', '味醂', '酱油', '鱼露', '咖喱粉', '韩式辣酱',
    '韩式蘸酱', '黄豆酱', '甜面酱', '辣椒油', '酸汤底料',
    '帕玛森芝士', '黑胡椒', '欧芹', '酵母', '粘米粉',
  ])

  const filteredIngredients = props.ingredients.filter(i => !excludeCategories.value.has(i.category))
  const filteredNames = new Set(filteredIngredients.map(i => i.name))

  // Count connections
  const ingConnCount = new Map<string, number>()
  for (const recipe of props.recipes) {
    for (const ing of ((recipe as any).ingredients || [])) {
      if (filteredNames.has(ing.name)) {
        ingConnCount.set(ing.name, (ingConnCount.get(ing.name) || 0) + 1)
      }
    }
  }

  // Decide which ingredients to show: hide spices unless they're a main ingredient
  const visibleNames = new Set<string>()
  for (const ing of filteredIngredients) {
    if (SPICE_BLACKLIST.has(ing.name)) {
      // Only show if used in ≤ 3 recipes AND not a generic seasoning category
      if ((ingConnCount.get(ing.name) || 0) <= 3 && !['香辛料', '调味干货'].includes(ing.category)) {
        visibleNames.add(ing.name)
      }
    } else {
      visibleNames.add(ing.name)
    }
  }

  // Build recipe → visible ingredient mapping
  const recipeIngredientMap = new Map<string, string[]>()
  for (const recipe of props.recipes) {
    const ings = ((recipe as any).ingredients || [])
      .map((ing: any) => ing.name)
      .filter((name: string) => visibleNames.has(name))
    if (ings.length > 0) recipeIngredientMap.set(recipe.id, ings)
  }

  // Recipe nodes — sunflower spiral
  const activeRecipes = props.recipes.filter(r => recipeIngredientMap.has(r.id))
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const recipeNodes = activeRecipes.map((r, i) => {
    const t = i / activeRecipes.length
    const radius = Math.sqrt(t) * Math.min(W, H) * 0.42
    const angle = i * goldenAngle
    return {
      id: `rec:${r.id}`,
      name: r.name,
      type: 'recipe' as const,
      radius: 5,
      color: '#C4B5A5',
      tags: r.tags,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      fx: cx + Math.cos(angle) * radius,
      fy: cy + Math.sin(angle) * radius,
    }
  })

  // Ingredient nodes — centroid of connected recipes
  const recipePosMap = new Map<string, { x: number; y: number }>()
  recipeNodes.forEach(r => recipePosMap.set(r.id.replace('rec:', ''), { x: r.x!, y: r.y! }))

  const visibleIngredients = filteredIngredients.filter(i => visibleNames.has(i.name))
  const ingredientNodes = visibleIngredients.map(i => {
    const connRecipes = activeRecipes.filter(r => recipeIngredientMap.get(r.id)?.includes(i.name))
    let sx = cx, sy = cy
    if (connRecipes.length > 0) {
      sx = connRecipes.reduce((s, r) => s + (recipePosMap.get(r.id)?.x || cx), 0) / connRecipes.length
      sy = connRecipes.reduce((s, r) => s + (recipePosMap.get(r.id)?.y || cy), 0) / connRecipes.length
    }
    return {
      id: `ing:${i.name}`,
      name: i.name,
      type: 'ingredient' as const,
      radius: Math.min(14, 4 + Math.sqrt(ingConnCount.get(i.name) || 1) * 2.5),
      color: colorMap[i.crayonColor] || '#A69080',
      recipeCount: i.recipeCount,
      category: i.category,
      x: sx + (Math.random() - 0.5) * 30,
      y: sy + (Math.random() - 0.5) * 30,
    }
  })

  // Links
  const links: GraphLink[] = []
  const linkSet = new Set<string>()
  for (const [recipeId, ings] of recipeIngredientMap) {
    for (const ingName of ings) {
      const key = `rec:${recipeId}::ing:${ingName}`
      if (!linkSet.has(key)) {
        linkSet.add(key)
        links.push({ source: `rec:${recipeId}`, target: `ing:${ingName}` })
      }
    }
  }

  const nodes = [...recipeNodes, ...ingredientNodes]

  d3.select(container).selectAll('svg').remove()

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')

  currentSvg = svg as any

  const mainGroup = svg.append('g')

  const zoom = d3.zoom()
    .scaleExtent([0.04, 3])
    .on('zoom', (event) => { mainGroup.attr('transform', event.transform) })
  currentZoom = zoom
  ;(svg as any).call(zoom)

  // Start zoomed out to see the whole graph
  const viewW = container.clientWidth
  const viewH = container.clientHeight || 600
  const initScale = Math.min(viewW / W, viewH / H) * 0.85
  ;(svg as any).call(zoom.transform, d3.zoomIdentity
    .translate(viewW / 2 - cx * initScale, viewH / 2 - cy * initScale)
    .scale(initScale))

  // Simulation — recipes are fixed anchors, ingredients float
  const simulation = d3.forceSimulation(nodes as any)
    .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(20).strength(0.25))
    .force('charge', d3.forceManyBody().strength(-30).distanceMax(150))
    .force('collision', d3.forceCollide().radius((d: any) => d.radius + 1.5).strength(0.9).iterations(3))
    .alphaDecay(0.02)
    .velocityDecay(0.4)
    .stop() // we'll start manually after elements are created

  const link = mainGroup.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', '#D4C5B2')
    .attr('stroke-opacity', 0.3)
    .attr('stroke-width', 0.8)

  const node = mainGroup.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .style('cursor', 'pointer')
    .call(d3.drag<any, any>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
    )

  node.append('circle')
    .attr('r', (d: any) => d.radius)
    .attr('fill', (d: any) => d.color)
    .attr('fill-opacity', (d: any) => d.type === 'ingredient' ? 0.7 : 0.4)
    .attr('stroke', (d: any) => d.color)
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.3)

  node.append('text')
    .text((d: any) => d.name)
    .attr('font-family', (d: any) => d.type === 'ingredient' ? 'Caveat, cursive' : 'Noto Serif SC, serif')
    .attr('font-size', (d: any) => {
      if (d.type === 'recipe') return '9px'
      const conn = ingConnCount.get(d.name) || 1
      return Math.min(15, 10 + Math.sqrt(conn) * 1.5) + 'px'
    })
    .attr('font-weight', (d: any) => d.type === 'ingredient' ? '600' : '400')
    .attr('fill', (d: any) => d.type === 'ingredient' ? '#2C2825' : '#8B7D6B')
    .attr('text-anchor', 'middle')
    .attr('dy', (d: any) => d.radius + (d.type === 'ingredient' ? 14 : 8))
    .attr('opacity', (d: any) => d.type === 'recipe' ? 0.6 : 1)
    .style('pointer-events', 'none')

  // Hover
  node.on('mouseover', (event, d: any) => {
    const connectedIds = new Set<string>()
    connectedIds.add(d.id)
    links.forEach(l => {
      const sId = typeof l.source === 'object' ? (l.source as any).id : l.source
      const tId = typeof l.target === 'object' ? (l.target as any).id : l.target
      if (sId === d.id) connectedIds.add(tId)
      if (tId === d.id) connectedIds.add(sId)
    })

    node.select('circle')
      .attr('fill-opacity', (n: any) => connectedIds.has(n.id) ? 0.9 : 0.08)
    node.select('text')
      .attr('opacity', (n: any) => connectedIds.has(n.id) ? 1 : (n.type === 'recipe' ? 0.08 : 0.12))
    link
      .attr('stroke-opacity', (l: any) => {
        const sId = typeof l.source === 'object' ? (l.source as any).id : l.source
        const tId = typeof l.target === 'object' ? (l.target as any).id : l.target
        return (sId === d.id || tId === d.id) ? 0.8 : 0.05
      })

    const rect = container.getBoundingClientRect()
    tooltipData.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top - 50,
      name: d.name,
      detail: d.type === 'ingredient' ? `${d.category} · 用于 ${d.recipeCount} 道菜` : (d.tags?.slice(0, 3).join(' / ') || '菜谱'),
    }
  })

  node.on('mouseout', () => {
    if (searchQuery.value) {
      applySearchHighlight()
    } else {
      node.select('circle').attr('fill-opacity', (d: any) => d.type === 'ingredient' ? 0.7 : 0.4)
      node.select('text').attr('opacity', (d: any) => d.type === 'recipe' ? 0.6 : 1)
    }
    link.attr('stroke-opacity', 0.3)
    tooltipData.value = null
  })

  // Click node to navigate
  node.on('click', (event: MouseEvent, d: any) => {
    if (d.type === 'ingredient') {
      // Find ingredient by name to get its DB id
      const ing = props.ingredients.find(i => i.name === d.name)
      if (ing?.id) router.push(`/ingredients/${ing.id}`)
    } else if (d.type === 'recipe') {
      const recipeId = d.id.replace('rec:', '')
      router.push(`/recipes/${recipeId}`)
    }
  })

  simulation.on('tick', () => {
    // Lock recipe nodes at their spiral positions
    for (const n of recipeNodes) {
      n.x = n.fx
      n.y = n.fy
    }
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)
    node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
  })

  // Run simulation for enough ticks to settle
  simulation.restart()
  for (let i = 0; i < 300; i++) simulation.tick()

  currentSimulation = simulation

  // Re-apply search highlight after rebuild
  nextTick(() => applySearchHighlight())
}

const applySearchHighlight = () => {
  const d3 = d3Module
  if (!svgRef.value || !d3) return
  const svg = d3.select(svgRef.value).select('svg')
  const q = searchQuery.value

  if (!q) {
    svg.selectAll('circle').attr('fill-opacity', (d: any) => d.type === 'ingredient' ? 0.7 : 0.4)
    svg.selectAll('text').attr('opacity', (d: any) => d.type === 'recipe' ? 0.6 : 1)
    return
  }

  const lowerQ = q.toLowerCase()
  svg.selectAll('g g g').each(function (d: any) {
    const match = d.name?.toLowerCase().includes(lowerQ)
    d3.select(this).select('circle').attr('fill-opacity', match ? 0.9 : 0.1)
    d3.select(this).select('text').attr('opacity', match ? 1 : 0.15)
  })
}

watch(searchQuery, () => applySearchHighlight())
watch(() => [props.ingredients.length, props.recipes.length], async () => {
  if (!d3Module || !hasGraphData.value) return
  await nextTick()
  buildGraph()
})
</script>

<template>
  <div ref="containerRef" class="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-bg-soft)]" :class="isFullscreen ? 'h-screen bg-[var(--color-bg)]' : 'min-h-[36rem]'">
    <div v-if="graphLoading" class="flex min-h-[36rem] items-center justify-center" role="status">
      <div class="text-center"><span class="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-accent)]"></span><p class="mt-3 text-sm text-[var(--color-text-muted)]">正在加载图谱引擎…</p></div>
    </div>
    <div v-else-if="graphError" class="flex min-h-[36rem] items-center justify-center p-6"><AppNotice tone="danger" title="图谱没有加载出来" :message="graphError"><AppButton class="mt-3" variant="secondary" @click="retryGraph">重新加载图谱</AppButton></AppNotice></div>
    <EmptyState v-else-if="!hasGraphData" class="m-6" title="还没有足够的数据画图谱" description="添加菜谱和食材后，这里会展示它们之间的关联。" />
    <template v-else>
      <div class="absolute left-3 right-16 top-3 z-10 space-y-2 sm:right-3">
        <div class="max-w-sm"><label for="graph-search" class="sr-only">搜索图谱中的食材或菜谱</label><input id="graph-search" v-model="searchQuery" type="search" placeholder="搜索食材或菜谱" class="field-control bg-white/90 shadow-[var(--shadow-sm)] backdrop-blur" /></div>
        <div class="flex max-w-full gap-2 overflow-x-auto rounded-[var(--radius-md)] bg-white/85 p-2 pr-3 shadow-[var(--shadow-sm)] backdrop-blur sm:w-fit" aria-label="图谱分类筛选">
          <button v-for="category in allCategories" :key="category" class="min-h-11 shrink-0 rounded-full border px-4 text-xs font-semibold transition" :class="excludeCategories.has(category) ? 'border-transparent bg-[var(--color-bg-soft)] text-[var(--color-text-faint)] line-through' : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-[var(--color-accent)]'" :aria-pressed="!excludeCategories.has(category)" @click="toggleCategory(category)">{{ category }}</button>
        </div>
      </div>

      <div class="absolute right-3 top-3 z-20 flex flex-col gap-2">
        <button class="touch-target flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/90 text-xl text-[var(--color-text-muted)] shadow-[var(--shadow-sm)] backdrop-blur" aria-label="放大图谱" @click="zoomIn">+</button>
        <button class="touch-target flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/90 text-xl text-[var(--color-text-muted)] shadow-[var(--shadow-sm)] backdrop-blur" aria-label="缩小图谱" @click="zoomOut">−</button>
        <button class="touch-target flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/90 text-xs font-semibold text-[var(--color-text-muted)] shadow-[var(--shadow-sm)] backdrop-blur" aria-label="重置图谱视图" @click="zoomReset">1:1</button>
        <button class="touch-target flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/90 text-sm text-[var(--color-text-muted)] shadow-[var(--shadow-sm)] backdrop-blur" :aria-label="isFullscreen ? '退出全屏' : '全屏查看图谱'" @click="toggleFullscreen">{{ isFullscreen ? '↙' : '↗' }}</button>
      </div>

      <div class="absolute bottom-3 left-3 z-10 hidden rounded-full border border-[var(--color-border)] bg-white/90 px-4 py-2 text-xs text-[var(--color-text-muted)] shadow-[var(--shadow-sm)] backdrop-blur sm:flex sm:items-center sm:gap-4"><span><i class="mr-1 inline-block h-3 w-3 rounded-full bg-crayon-coral/70"></i>食材</span><span><i class="mr-1 inline-block h-3 w-3 rounded-full bg-[var(--color-border-strong)]"></i>菜谱</span><span>滚轮缩放 · 拖拽节点 · 点击进入详情</span></div>

      <div ref="svgRef" class="w-full overflow-hidden" :class="isFullscreen ? 'h-full' : 'h-[36rem] sm:h-[42rem]'" aria-label="食材与菜谱关系图谱" />

      <div v-if="tooltipData" class="pointer-events-none absolute z-30 max-w-56 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white/95 px-3 py-2 shadow-[var(--shadow-md)]" :style="{ left: tooltipData.x + 'px', top: tooltipData.y + 'px', transform: 'translateX(-50%)' }"><p class="font-serif font-semibold text-[var(--color-text)]">{{ tooltipData.name }}</p><p class="mt-1 text-xs text-[var(--color-text-muted)]">{{ tooltipData.detail }}</p></div>
    </template>
  </div>
</template>
