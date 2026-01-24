<template>
  <div
    class="relative w-full overflow-hidden rounded-2xl bg-card-white max-w-sm sm:max-w-md md:max-w-lg aspect-769/1065">
    <div class="absolute -inset-1.25 bg-center bg-no-repeat bg-cover pointer-events-none
      bg-[url(../assets/cards/blue.png)] opacity-60" aria-hidden="true" />

    <div class="relative z-10 h-full w-full p-4 sm:p-6">
      <slot />
    </div>
  </div>
</template>
