import { markStaleRunningJobs } from '../utils/line-art-jobs'

export default defineNitroPlugin(() => {
  // 服务启动时清理上次运行遗留的过期任务
  markStaleRunningJobs().catch((err: any) => {
    console.warn('Failed to mark stale line-art jobs:', err?.message)
  })
})
