import { safeJsonParse } from '../utils/parse-json'

export function serializeCookLog(log: any) {
  return {
    ...log,
    date: log.date instanceof Date ? log.date.toISOString() : log.date,
    photos: safeJsonParse(log.photos, []),
  }
}
