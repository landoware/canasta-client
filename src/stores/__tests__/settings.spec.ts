import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  useSettingsStore,
  DEFAULT_CARD_SCALE,
  MIN_CARD_SCALE,
  MAX_CARD_SCALE,
  MeldsPositionBottom,
} from '../settings'
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

  it('defaults meldsPosition to bottom', () => {
    const settings = useSettingsStore()
    expect(settings.meldsPosition).toBe(MeldsPositionBottom)
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

  it('defaults autoPlayRedThrees to off', () => {
    const settings = useSettingsStore()
    expect(settings.autoPlayRedThrees).toBe(false)
  })

  it('autoPlayRedThrees can be toggled', () => {
    const settings = useSettingsStore()
    settings.autoPlayRedThrees = true
    expect(settings.autoPlayRedThrees).toBe(true)
  })
})
