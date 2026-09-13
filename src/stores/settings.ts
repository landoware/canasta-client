import { defineStore } from 'pinia'
import { ref } from 'vue'

// App-wide display settings — unlike game.ts/websocket.ts, this is a plain
// singleton: there's one card scale for the whole tab, not one per seat.
export const MIN_CARD_SCALE = 0.25
export const MAX_CARD_SCALE = 1.75
export const DEFAULT_CARD_SCALE = 1

export const useSettingsStore = defineStore('settings', () => {
  const cardScale = ref(DEFAULT_CARD_SCALE)

  return { cardScale }
})
