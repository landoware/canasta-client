<template>
  <div class="relative w-full overflow-hidden rounded-2xl bg-card-white max-w-sm aspect-769/1065">
    <div class="absolute -inset-1.25 bg-center bg-no-repeat bg-cover pointer-events-none
      bg-[url(../assets/cards/blue.png)]" aria-hidden="true" />

    <div class="relative z-10 h-full w-full p-4 sm:p-6 flex items-center justify-center text-center">
      <slot />
    </div>
  </div>
</template>
