// Generic "fly a card from A to B" engine, shared by every move animation
// (discard today, draw/meld/pickup-pile later). Deliberately has no DOM or
// lifecycle code of its own — CardFlightGhost.vue owns the actual FLIP
// mechanics — so this stays reusable as a plain queue of in-flight requests.
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
  // Degrees the ghost should start rotated at (matching the real card's rest
  // orientation, e.g. an opponent seated left/right) and animate to 0 as it
  // flies — see CardFlightGhost.vue. Default 0 (no rotation).
  rotate?: number
}

export interface Flight {
  id: number
  card?: Card
  back?: 'red' | 'blue'
  from: FlightRect
  to: FlightRect
  duration: number
  rotate: number
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
          rotate: req.rotate ?? 0,
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
