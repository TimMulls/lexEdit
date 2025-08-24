import { ref } from "vue"
import { useLexAppConfig } from "./useLexAppConfig"
import { useOrderVars } from "./useOrderVars"
import { useCanvas } from "./useCanvas"

// Core editor composable for Nuxt 4
export function useEditor() {
  const appConfig = useLexAppConfig()
  const orderVars = useOrderVars()
  const canvas = useCanvas()

  // Example: track copied object, timer, and active accordion
  const copiedObject = ref<any>(null)
  const copiedObjects = ref<any[]>([])
  const timer = ref(0)
  const activeAccordion = ref(-1)

  // Example: initialization logic
  function initEditor() {
    // Set up version label, hide coupon buttons, etc.
    // (UI-specific code should be ported to Vue components)
    // canvas.initCanvas() is already called in useCanvas
    // Add more initialization as needed
    console.log("Editor initialized, version:", appConfig.appVersion)
  }

  return {
    appConfig,
    orderVars,
    canvas,
    copiedObject,
    copiedObjects,
    timer,
    activeAccordion,
    initEditor,
    // undo, redo, printPreview can be added here if implemented
  }
}
