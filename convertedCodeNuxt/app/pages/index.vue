<template>
  <EditorRoot :ready="ready" v-if="ready" />
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { fetchOrderVars, useOrderVars } from "../composables/useOrderVars"
import { useEditorData } from "../composables/useEditorData"
import { loadEditorFonts } from "../composables/useFontLoader"
console.log("[index.vue] script setup executing")

const ready = ref(false)
const editorData = useEditorData()

async function initEditorApp() {
  // Load all required data before rendering editor
  const orderVars = await fetchOrderVars()
  console.log("[index.vue] initEditorApp starting")
  // Wait for template/editor data to load, which updates orderVars.loadedFonts
  await editorData.loadFromApi()

  try {
    //  console.log("[index.vue] All data loaded, orderVars:", JSON.parse(JSON.stringify(orderVars)))
    //  console.log("[index.vue] All data loaded, editorData:", JSON.parse(JSON.stringify(editorData)))
  } catch (e) {}
  // Debug: log loadedFonts after all data loads
  console.log("[index.vue] About to load fonts, loadedFonts:", JSON.parse(JSON.stringify(orderVars.loadedFonts)))
  loadEditorFonts({
    // onLoading: (families) => console.log("[WebFontLoader] Loading fonts:", families),
    // onFontLoading: (font, desc) => console.log(`[WebFontLoader] Loading font: ${font} : ${desc}`),
    // onFontActive: (font, desc) => console.log(`[WebFontLoader] Font loaded: ${font} : ${desc}`),
    onFontInactive: (font, desc) => console.warn(`[WebFontLoader] Could not load font: ${font} : ${desc}`),
    onInactive: () => console.error("[WebFontLoader] All fonts failed loading. Please contact support."),
    onActive: () => {
      console.log("[WebFontLoader] All fonts loaded and active.")
      ready.value = true
    },
  })
  // Do not set ready until fonts are loaded
}

console.log("[index.vue] ready set to true")
onMounted(() => {
  initEditorApp()
})
console.log("[index.vue] onMounted called")
</script>
