import { defineStore } from 'pinia'
import { ref } from 'vue'
import { SortRankAscending, type SortMethod } from '@/utils/handSort'

// App-wide display settings — unlike game.ts/websocket.ts, this is a plain
// singleton: there's one card scale/sort method for the whole tab, not one
// per seat.
export const MIN_CARD_SCALE = 0.5
export const MAX_CARD_SCALE = 1.75
export const DEFAULT_CARD_SCALE = 1

export const useSettingsStore = defineStore('settings', () => {
  const cardScale = ref(DEFAULT_CARD_SCALE)
  const sortMethod = ref<SortMethod>(SortRankAscending)

  return { cardScale, sortMethod }
})
