<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { Ref } from 'vue'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()

const draft: Ref<string> = ref('')
const messageList: Ref<HTMLDivElement | null> = ref(null)

function submit(): void {
  if (!draft.value.trim()) return
  chatStore.sendChatMessage(draft.value)
  draft.value = ''
}

// Keep the log scrolled to the newest message, whether it arrived locally
// (optimistic echo) or from another seat.
watch(
  () => chatStore.messages.length,
  () => {
    nextTick(() => {
      if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
    })
  },
)
</script>

<template>
  <button
    type="button"
    class="fixed bottom-4 right-4 z-50 rounded-full bg-black/40 p-3 hover:bg-black/60"
    aria-label="Toggle Table Talk"
    @click="chatStore.togglePanel()"
  >
    <span class="block h-6 w-6 text-card-white">💬</span>
    <span
      v-if="chatStore.unreadCount > 0 && !chatStore.isOpen"
      class="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-card-red px-1 text-xs text-card-white font-rs-bold"
    >
      {{ chatStore.unreadCount > 9 ? '9+' : chatStore.unreadCount }}
    </span>
  </button>

  <div
    v-if="chatStore.isOpen"
    class="fixed bottom-20 right-4 z-50 flex h-96 w-80 flex-col rounded-md bg-card-table font-rs text-card-white shadow-xl"
  >
    <div class="flex items-center justify-between p-3">
      <h2 class="font-rs-bold text-lg">Table Talk</h2>
      <button type="button" aria-label="Close Table Talk" @click="chatStore.closePanel()">✕</button>
    </div>

    <div ref="messageList" class="flex-1 overflow-y-auto px-3">
      <p v-if="chatStore.messages.length === 0" class="text-card-white/60">
        No messages yet — say hi!
      </p>
      <div
        v-for="(message, index) in chatStore.messages"
        :key="index"
        class="mb-2"
        :class="message.self ? 'text-right' : 'text-left'"
      >
        <div class="text-xs text-card-white/60">{{ message.self ? 'You' : message.name }}</div>
        <div
          class="inline-block max-w-[85%] rounded-md px-2 py-1 break-words"
          :class="message.self ? 'bg-card-blue' : 'bg-black/30'"
        >
          {{ message.text }}
        </div>
      </div>
    </div>

    <form class="flex gap-2 p-3" @submit.prevent="submit()">
      <input
        v-model="draft"
        type="text"
        maxlength="500"
        placeholder="Type a message..."
        class="min-w-0 flex-1 rounded-md p-2 text-black"
      />
      <button
        type="submit"
        class="rounded-md bg-card-blue px-3 py-1 font-rs-bold disabled:opacity-50"
        :disabled="!draft.trim()"
      >
        Send
      </button>
    </form>
  </div>
</template>
