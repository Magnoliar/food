export function useDarkMode() {
  const isDark = useState('dark-mode', () => false)

  const toggle = () => {
    isDark.value = !isDark.value
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', isDark.value)
      localStorage.setItem('dark-mode', isDark.value ? '1' : '0')
    }
  }

  const init = () => {
    if (import.meta.client) {
      const saved = localStorage.getItem('dark-mode')
      if (saved === '1') {
        isDark.value = true
        document.documentElement.classList.add('dark')
      } else if (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDark.value = true
        document.documentElement.classList.add('dark')
      }
    }
  }

  return { isDark, toggle, init }
}
