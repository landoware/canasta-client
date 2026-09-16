import { defineStore } from 'pinia'
import { ref } from 'vue'
import { SortRankAscending, type SortMethod } from '@/utils/handSort'

// App-wide display settings — unlike game.ts/websocket.ts, this is a plain
// singleton: there's one card scale/sort method for the whole tab, not one
// per seat.
export const MIN_CARD_SCALE = 0.5
export const MAX_CARD_SCALE = 1.75
export const DEFAULT_CARD_SCALE = 1

export const MeldsPositionBottom = 'bottom'
export const MeldsPositionTop = 'top'
export type MeldsPosition = typeof MeldsPositionBottom | typeof MeldsPositionTop

export const useSettingsStore = defineStore('settings', () => {
  const cardScale = ref(DEFAULT_CARD_SCALE)
  const sortMethod = ref<SortMethod>(SortRankAscending)
  // In-progress melds default to the half of the screen nearer the
  // player's own hand; completed canastas take the other half (nearer the
  // partner's hand). This just swaps which is which.
  const meldsPosition = ref<MeldsPosition>(MeldsPositionBottom)

  return { cardScale, sortMethod, meldsPosition }
})
