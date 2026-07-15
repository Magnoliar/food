export type ToastTone = 'success' | 'warning' | 'danger' | 'info'
export interface AppToast { id: number; message: string; title?: string; tone: ToastTone; duration: number }
let nextToastId = 1
export function useToast() {
  const toasts = useState<AppToast[]>('app-toasts', () => [])
  const dismiss = (id: number) => { toasts.value = toasts.value.filter(toast => toast.id !== id) }
  const show = (message: string, options: Partial<Omit<AppToast, 'id' | 'message'>> = {}) => {
    const toast: AppToast = { id: nextToastId++, message, title: options.title, tone: options.tone || 'info', duration: options.duration ?? 3600 }
    toasts.value = [...toasts.value, toast]
    if (import.meta.client && toast.duration > 0) window.setTimeout(() => dismiss(toast.id), toast.duration)
    return toast.id
  }
  return { toasts, show, dismiss, success: (message: string, title?: string) => show(message, { tone: 'success', title }), warning: (message: string, title?: string) => show(message, { tone: 'warning', title }), error: (message: string, title?: string) => show(message, { tone: 'danger', title }) }
}
