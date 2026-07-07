import { describe, expect, it } from 'vitest'

describe('recommendation contract', () => {
  it('keeps a simple sanity test while service tests get database fixtures', () => {
    expect(['quick', 'light', 'spicy', 'fridge', 'balanced']).toContain('balanced')
  })
})
