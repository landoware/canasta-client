<script setup lang="ts">
// Placeholder game view: the real board (hand, melds, discard pile, foot,
// red threes) is a separate, larger piece of work — this just proves the
// lobby -> game transition works and gives a debugging surface in the
// meantime, backed by the same gameStore.gameState the real board will use.
import { useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'

const route = useRoute()
const gameStore = useGameStore()
</script>

<template>
  <div class="min-h-screen flex flex-col items-center gap-4 p-8 text-card-white">
    <div class="text-[clamp(2rem,10vw,4rem)] font-quill text-shadow-lg">
      Room {{ route.params.roomCode }}
    </div>

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
      <p>Discard top: {{ gameStore.discardTopCard ? gameStore.discardTopCard.rank : 'empty' }}</p>
      <p>Our score: {{ gameStore.myTeamScore }} / Their score: {{ gameStore.opponentScore }}</p>
    </div>

    <pre class="font-rs text-xs text-left w-full max-w-2xl overflow-auto bg-black/30 p-4 rounded">{{
      gameStore.gameState
    }}</pre>
  </div>
</template>
