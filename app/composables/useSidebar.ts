export function useSidebar() {
  const collapsed = useState('sidebar-collapsed', () => false)
  return {
    collapsed: readonly(collapsed),
    toggle: () => { collapsed.value = !collapsed.value },
  }
}
