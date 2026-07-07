import { stringRule } from './validate'

export function parseMediaDelete(body: unknown) {
  return {
    id: stringRule({ min: 1 })((body as any)?.id, 'id'),
  }
}
