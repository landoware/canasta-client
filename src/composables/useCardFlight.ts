// Generic "fly a card from A to B" engine, shared by every move animation
// (discard, meld/canasta today; draw/pickup-pile later). Deliberately has no
// DOM or lifecycle code of its own — CardFlightGhost.vue owns the actual
// FLIP mechanics — so this stays reusable as a plain queue of in-flight
// requests.
//
// Module-scoped singleton: there's only ever one active GameView at a time
// (DemoView.vue keys it with :key, tearing the old one down fully on a seat
// switch), so a single shared list is safe and lets any component/composable
// trigger a flight without needing the renderer as a prop.
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { Card } from '@/types/canasta'

export interface FlightRect {
  left: number
  top: number
  width: number
  height: number
}

export interface FlightRequest {
  card?: Card
  back?: 'red' | 'blue'
  from: FlightRect
  to: FlightRect
  duration?: number
  // Degrees the ghost is rotated at liftoff/landing — e.g. an opponent
  // seated left/right rests their hand rotated, and OpponentMelds.vue
  // rotates its rows too. Both default 0 (no rotation, the common case).
  rotateFrom?: number
  rotateTo?: number
  // Milliseconds to hold the ghost at `from` before it starts flying —
  // lets a multi-card batch leave in a staggered cascade instead of all at
  // once. Default 0.
  delay?: number
}

export interface Flight {
  id: number
  card?: Card
  back?: 'red' | 'blue'
  from: FlightRect
  to: FlightRect
  duration: number
  rotateFrom: number
  rotateTo: number
  delay: number
}

const DEFAULT_DURATION_MS = 300

const flights: Ref<Flight[]> = ref([])
let nextId = 0
const resolvers = new Map<number, () => void>()

export function useCardFlight() {
  // Resolves once the ghost has arrived at `to` and been removed — callers
  // await this to know when it's safe to reveal whatever the ghost was
  // standing in for (e.g. the discard pile's real top card).
  function flyCard(req: FlightRequest): Promise<void> {
    const id = nextId++
    return new Promise((resolve) => {
      resolvers.set(id, resolve)
      flights.value = [
        ...flights.value,
        {
          id,
          card: req.card,
          back: req.back,
          from: req.from,
          to: req.to,
          duration: req.duration ?? DEFAULT_DURATION_MS,
          rotateFrom: req.rotateFrom ?? 0,
          rotateTo: req.rotateTo ?? 0,
          delay: req.delay ?? 0,
        },
      ]
    })
  }

  function completeFlight(id: number): void {
    flights.value = flights.value.filter((f) => f.id !== id)
    resolvers.get(id)?.()
    resolvers.delete(id)
  }

  return { flights, flyCard, completeFlight }
}

// CSS transforms (rotate, scale, translate) never affect offsetWidth/Height —
// those stay the element's true, unrotated layout size — and a rotation
// pivots around the element's own center by default, so the bounding box's
// center point is still the right visual anchor. Building the rect from
// those two pieces (rather than the bounding box's own width/height
// directly) means this works correctly for a rotated element (e.g. an
// opponent's hand card) *and* for one additionally shrunk by an ancestor's
// CSS scale() (e.g. FitToArea compacting a meld row): the true visual scale
// is recovered as sqrt(bboxArea / offsetArea) — invariant to any
// 90°-multiple rotation (which preserves area) and exactly right for a pure
// scale (which multiplies area by scale²) — then applied to the
// (unrotated, unscaled) offset dimensions.
export function rectOf(el: Element | null | undefined): FlightRect | null {
  if (!(el instanceof HTMLElement)) return null
  const box = el.getBoundingClientRect()
  const offsetWidth = el.offsetWidth
  const offsetHeight = el.offsetHeight
  if (offsetWidth === 0 || offsetHeight === 0) return null

  const visualScale = Math.sqrt((box.width * box.height) / (offsetWidth * offsetHeight))
  const width = offsetWidth * visualScale
  const height = offsetHeight * visualScale
  return {
    left: box.left + box.width / 2 - width / 2,
    top: box.top + box.height / 2 - height / 2,
    width,
    height,
  }
}
