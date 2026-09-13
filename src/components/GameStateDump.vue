<script setup lang="ts">
// Debugging surface backed by gameStore.gameState — extracted out of
// GameView so /demo can reuse it per-seat. Not the real board (hand, melds,
// discard pile, foot, red threes) — that's a separate, larger piece of work.
import type { GameStore } from '@/stores/game'

defineProps<{ gameStore: GameStore }>()
</script>

<template>
  <div class="flex flex-col items-center gap-4 w-full">
    <div v-if="gameStore.isGameOver" class="text-2xl font-rs-bold">
      Game over! {{ gameStore.winner === 'tie' ? "It's a tie!" : `${gameStore.winner} wins!` }}
    </div>
    <div v-else class="text-2xl font-rs-bold">
      {{ gameStore.isMyTurn ? 'Your turn' : "Waiting for your partner/opponents" }}
      ({{ gameStore.currentPhase }})
    </div>

    <div class="font-rs text-left w-full max-w-2xl">
      <p>Hand: {{ gameStore.myHand.length }} cards</p>
      <p>Deck: {{ gameStore.deckCount }} cards left</p>
      <p>
        Discard top: {{ gameStore.discardTopCard ? gameStore.discardTopCard.rank : 'empty' }}
        ({{ gameStore.discardCount }} cards)
      </p>
      <p>Our score: {{ gameStore.myTeamScore }} / Their score: {{ gameStore.opponentScore }}</p>
    </div>

    <pre class="font-rs text-xs text-left w-full max-w-2xl overflow-auto bg-black/30 p-4 rounded">{{
      gameStore.gameState
    }}</pre>
  </div>
</template>
