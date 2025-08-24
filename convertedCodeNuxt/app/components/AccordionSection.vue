<template>
  <div>
    <div class="flex items-center cursor-pointer px-4 py-2 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 select-none" @click="toggle">
      <span class="mr-2">
        <svg width="12" height="12" viewBox="0 0 20 20">
          <polyline :points="isOpen ? '6 12 10 8 14 12' : '6 8 10 12 14 8'" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
      </span>
      <slot name="title">{{ title }}</slot>
    </div>
    <div v-show="isOpen" class="px-4 py-2 bg-white">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
const props = defineProps<{ title?: string; open?: boolean }>()
const emit = defineEmits(["toggle"] as const)
const isOpen = ref(!!props.open)
watch(
  () => props.open,
  (val) => {
    isOpen.value = !!val
  }
)
function toggle() {
  // Parent controls open state; inform parent that user wants to toggle this section
  emit("toggle")
}
</script>
