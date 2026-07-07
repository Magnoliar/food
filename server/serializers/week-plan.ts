const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const mealOrder: Record<string, number> = {
  午餐: 1,
  晚餐: 2,
  次日便当: 3,
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function serializeWeekPlan(plan: any) {
  if (!plan) return null

  const grouped: Record<string, any[]> = {}
  for (const meal of plan.meals || []) {
    const dateStr = meal.date instanceof Date ? formatLocalDate(meal.date) : (String(meal.date).split('T')[0] || '')
    if (!dateStr) continue
    if (!grouped[dateStr]) grouped[dateStr] = []
    grouped[dateStr].push(meal)
  }

  const meals = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, slots]) => {
      const date = new Date(`${dateStr}T00:00:00`)
      const sortedSlots = [...slots].sort((a, b) => (mealOrder[a.mealLabel] || 99) - (mealOrder[b.mealLabel] || 99))
      const mapSlot = (slot: any) => ({
        id: slot.id,
        recipeId: slot.recipeId,
        name: slot.recipe?.name || slot.customName || '',
        label: slot.mealLabel,
        notes: slot.notes,
        status: slot.status,
        skipReason: slot.skipReason,
      })

      return {
        date: dateStr,
        dayLabel: dayNames[date.getDay()],
        meal1: sortedSlots[0] ? mapSlot(sortedSlots[0]) : null,
        meal2: sortedSlots[1] ? mapSlot(sortedSlots[1]) : null,
      }
    })

  return {
    id: plan.id,
    name: plan.name,
    startDate: plan.startDate instanceof Date ? formatLocalDate(plan.startDate) : plan.startDate,
    endDate: plan.endDate instanceof Date ? formatLocalDate(plan.endDate) : plan.endDate,
    status: plan.status,
    weekKey: plan.weekKey,
    meals,
    shoppingList: plan.shoppingLists?.[0] ? serializeShoppingList(plan.shoppingLists[0]) : {},
  }
}

export function serializeShoppingList(list: any) {
  return {
    ...list,
    startDate: list.startDate instanceof Date ? formatLocalDate(list.startDate) : list.startDate,
    endDate: list.endDate instanceof Date ? formatLocalDate(list.endDate) : list.endDate,
    items: list.items || [],
  }
}
