<template>
  <div class="relative inline-block text-left">
    <button @click="toggle" class="circular tiny ui icon top right pointing dropdown button inline-flex items-center justify-center mr-1" tabindex="0" ref="btn">
      <Icon name="material-symbols:settings" size="20" />
    </button>
    <div v-if="open" class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30" ref="menu">
      <div class="py-1">
        <button class="dropdown-item" @click="$emit('toggle-adv-edit')">Goto Advanced Editing</button>
        <button class="dropdown-item" @click="$emit('toggle-fullscreen')">Toggle Fullscreen</button>
        <button class="dropdown-item" @click="$emit('toggle-cutlines')">Toggle Cutlines</button>
        <button class="dropdown-item" @click="$emit('toggle-grid')">Toggle Grid</button>
        <div class="border-t my-1"></div>
        <button class="dropdown-item" @click="$emit('print-preview')">Show Print Preview</button>
        <div class="border-t my-1"></div>
        <button class="dropdown-item" @click="$emit('save-template')">Save Design Changes</button>
        <div class="border-t my-1"></div>
        <button class="dropdown-item hidden" @click="$emit('help-keys')">Shortcut Keys</button>
        <button class="dropdown-item hidden" @click="$emit('allow-notification')">Allow Notifications</button>
        <div class="dropdown-item text-xs text-gray-400">{{ lexAppConfig.appVersion }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue"
import { useLexAppConfig } from "../composables/useLexAppConfig"

const open = ref(false)
const btn = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function onDocClick(e: MouseEvent) {
  const t = e.target as Node
  if (!open.value) return
  if (btn.value && btn.value.contains(t)) return
  if (menu.value && menu.value.contains(t)) return
  open.value = false
}

function onEsc(e: KeyboardEvent) {
  if (e.key === "Escape") open.value = false
}

onMounted(() => {
  document.addEventListener("click", onDocClick)
  document.addEventListener("keydown", onEsc)
})

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick)
  document.removeEventListener("keydown", onEsc)
})

const lexAppConfig = useLexAppConfig()
</script>

<style scoped>
.dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}
.dropdown-item:hover {
  background: #f3f4f6;
}
</style>
