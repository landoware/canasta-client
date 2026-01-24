<script setup>
import FormCard from '@/components/FormCard.vue';
import Button from '../components/Button.vue'
</script>

<template>
  <div class="text-center">
    <div v-show="true" class="flex flex-col items-center">
      <FormCard imageUrl="../assets/cards/blue.png">
        <div class="">
          <div class="text-black font-quill text-9xl text-shadow-md text-shadow-white">
            Canasta
          </div>
          <Button label="New Game" />
          <Button label="Join Game" />
        </div>
      </FormCard>
      <!-- <img src="../assets/cards/red.png" class="scale-25"> -->
    </div>
  </div>
</template>
