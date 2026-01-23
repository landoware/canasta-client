import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'

const RATE_LIMIT = 10 // messages per second
const WARNING_THRESHOLD = 8 // warn at 80% of limit
const WINDOW_MS = 1000 // 1 second sliding window

export const useRateLimiter = () => {
  const messageTimestamps: Ref<number[]> = ref([])

  const cleanOldTimestamps = (): void => {
    const now = Date.now()
    messageTimestamps.value = messageTimestamps.value.filter((ts) => now - ts < WINDOW_MS)
  }

  const messageCount: ComputedRef<number> = computed(() => {
    cleanOldTimestamps()
    return messageTimestamps.value.length
  })

  const isNearLimit: ComputedRef<boolean> = computed(() => messageCount.value >= WARNING_THRESHOLD)

  const canSend = (): boolean => {
    cleanOldTimestamps()
    return messageTimestamps.value.length < RATE_LIMIT
  }

  const recordMessage = (): void => {
    messageTimestamps.value.push(Date.now())
  }

  return {
    canSend,
    recordMessage,
    isNearLimit,
    messageCount,
  }
}
