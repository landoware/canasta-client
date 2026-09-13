import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore, DEFAULT_CARD_SCALE, MIN_CARD_SCALE, MAX_CARD_SCALE } from '../settings'
import { SortRankAscending } from '@/utils/handSort'

describe('settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults cardScale to 1', () => {
    const settings = useSettingsStore()
    expect(settings.cardScale).toBe(DEFAULT_CARD_SCALE)
  })

  it('defaults sortMethod to rank ascending', () => {
    const settings = useSettingsStore()
    expect(settings.sortMethod).toBe(SortRankAscending)
  })

  it('bounds are 0.5 to 1.75', () => {
    expect(MIN_CARD_SCALE).toBe(0.5)
    expect(MAX_CARD_SCALE).toBe(1.75)
  })

  it('cardScale can be written directly, e.g. from a v-model binding', () => {
    const settings = useSettingsStore()
    settings.cardScale = 1.5
    expect(settings.cardScale).toBe(1.5)
  })
})
