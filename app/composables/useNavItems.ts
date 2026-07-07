interface NavItem {
  path: string
  icon: string
  label: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', icon: 'home', label: '首页' },
  { path: '/planner', icon: 'calendar', label: '计划' },
  { path: '/recipes', icon: 'book', label: '菜谱' },
  { path: '/cook-logs', icon: 'log', label: '记录' },
  { path: '/graph', icon: 'graph', label: '图谱' },
  { path: '/ingredients', icon: 'ingredients', label: '食材' },
  { path: '/journey', icon: 'journey', label: '足迹' },
  { path: '/posters', icon: 'poster', label: '打卡' },
  { path: '/achievements', icon: 'sparkles', label: '成就' },
  { path: '/admin', icon: 'admin', label: '管理', adminOnly: true },
]

export function useNavItems() {
  const { user } = useAuth()
  const navItems = computed(() => NAV_ITEMS.filter(item => !item.adminOnly || user.value?.role === 'admin'))
  return { navItems }
}
