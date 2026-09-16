<script setup lang="ts">
// Renders every in-flight card from the shared useCardFlight() queue.
// Mounted once in App.vue (not inside GameView) so a demo seat-switch
// remount can't tear this down mid-flight — see useCardFlight.ts.
import { useCardFlight } from '@/composables/useCardFlight'
import CardFlightGhost from './CardFlightGhost.vue'

const { flights, completeFlight } = useCardFlight()
</script>

<template>
  <Teleport to="body">
    <CardFlightGhost
      v-for="flight in flights"
      :key="flight.id"
      :card="flight.card"
      :back="flight.back"
      :from="flight.from"
      :to="flight.to"
      :duration="flight.duration"
      :rotate-from="flight.rotateFrom"
      :rotate-to="flight.rotateTo"
      :delay="flight.delay"
      class="z-[9999]"
      @arrived="completeFlight(flight.id)"
    />
  </Teleport>
</template>
