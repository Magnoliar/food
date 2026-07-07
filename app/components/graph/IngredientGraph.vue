<script setup lang="ts">
import * as d3 from 'd3'

const router = useRouter()

interface Ingredient {
  id: string
  name: string
  family: string | null
  category: string
  recipeCount: number
  crayonColor: string
  usedIn: string[]
}

interface Recipe {
  id: string
  name: string
  tags: string[]
  coverColor: string
}

interface Link {
  source: string
  target: string
}

const props = defineProps<{
  ingredients: Ingredient[]
  recipes: Recipe[]
}>()

const svgRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const tooltipData = ref<{ x: number; y: number; name: string; detail: string } | null>(null)
const isFullscreen = ref(false)
let currentZoom: d3.ZoomBehavior<Element, unknown> | null = null
let currentSvg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null

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
    ;(currentSvg.transition().duration(500) as any).call(currentZoom.transform, d3.zoomIdentity)
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
  } catch (e) {
    console.warn('Fullscreen toggle failed:', e)
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

onMounted(() => {
  buildGraph()
  window.addEventListener('resize', debouncedResize)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  if (currentSimulation) currentSimulation.stop()
})

const buildGraph = () => {
  if (!svgRef.value) return

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
  const links: Link[] = []
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
  if (!svgRef.value) return
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
</script>

<template>
  <div ref="containerRef" class="relative" :class="isFullscreen ? 'bg-[#F5F0E8]' : ''">
    <!-- Top controls -->
    <div class="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-start gap-2">
      <div class="relative max-w-xs flex-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4 text-[#A69080] absolute left-3 top-1/2 -translate-y-1/2">
          <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索食材..."
          class="w-full pl-9 pr-4 py-2 bg-white/85 backdrop-blur-md border border-[#C4B5A5]/40 rounded-xl font-serif text-base text-[#1a1714] placeholder:text-[#A69080]/50 focus:outline-none focus:ring-2 focus:ring-[#A69080]/20"
        />
      </div>

      <!-- Category filters -->
      <div class="glass-card px-3 py-2 flex flex-wrap items-center gap-1.5">
        <span class="font-hand text-sm text-[#6B5D4D] mr-1">显示:</span>
        <button
          v-for="cat in allCategories"
          :key="cat"
          class="px-2.5 py-1 rounded-full font-hand text-xs transition-all border"
          :class="excludeCategories.has(cat)
            ? 'bg-white/40 text-[#A69080]/40 border-transparent line-through'
            : 'bg-[#8B7D6B]/10 text-[#5A4D3E] border-[#C4B5A5]/30 hover:bg-[#8B7D6B]/20'"
          @click="toggleCategory(cat)"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- Zoom & fullscreen controls -->
    <div class="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
      <button
        class="w-8 h-8 glass-card flex items-center justify-center text-[#8B7D6B] hover:text-[#1a1714] transition-colors"
        title="放大"
        @click="zoomIn"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
          <path d="M12 4.5v15m7.5-7.5h-15" stroke-linecap="round" />
        </svg>
      </button>
      <button
        class="w-8 h-8 glass-card flex items-center justify-center text-[#8B7D6B] hover:text-[#1a1714] transition-colors"
        title="缩小"
        @click="zoomOut"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
          <path d="M19.5 12h-15" stroke-linecap="round" />
        </svg>
      </button>
      <button
        class="w-8 h-8 glass-card flex items-center justify-center text-[#8B7D6B] hover:text-[#1a1714] transition-colors"
        title="重置视图"
        @click="zoomReset"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
          <path d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div class="w-8 h-px bg-[#C4B5A5]/30"></div>
      <button
        class="w-8 h-8 glass-card flex items-center justify-center text-[#8B7D6B] hover:text-[#1a1714] transition-colors"
        :title="isFullscreen ? '退出全屏' : '全屏'"
        @click="toggleFullscreen"
      >
        <svg v-if="!isFullscreen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
          <path d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-4 h-4">
          <path d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <!-- Legend -->
    <div class="absolute bottom-3 left-3 z-10 glass-card px-3 py-2">
      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-full bg-crayon-coral/70"></div>
          <span class="font-hand text-[#8B7D6B]">食材</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-full bg-[#C4B5A5]"></div>
          <span class="font-hand text-[#8B7D6B]">菜谱</span>
        </div>
        <span class="text-[#A69080]/50">|</span>
        <span class="font-hand text-[#A69080]">滚轮缩放 · 拖拽节点</span>
      </div>
    </div>

    <!-- Graph -->
    <div ref="svgRef" class="w-full rounded-xl overflow-hidden" :class="isFullscreen ? 'h-full' : 'h-[600px]'" />

    <!-- Tooltip -->
    <div
      v-if="tooltipData"
      class="absolute pointer-events-none z-20 glass-card px-3 py-2"
      :style="{ left: tooltipData.x + 'px', top: tooltipData.y + 'px', transform: 'translateX(-50%)' }"
    >
      <p class="font-serif text-base font-medium text-[#1a1714]">{{ tooltipData.name }}</p>
      <p class="font-hand text-base text-[#6B5D4D]">{{ tooltipData.detail }}</p>
    </div>
  </div>
</template>
