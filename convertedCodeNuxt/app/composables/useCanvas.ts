import { ref, onMounted } from "vue"
import { Canvas, Textbox, Circle, Rect, Line } from "fabric"
import { useLexAppConfig } from "./useLexAppConfig"
import { useOrderVars } from "./useOrderVars"

// Core canvas composable for Nuxt 4
export function useCanvas() {
  // Utility to filter out undefined/null properties from an object
  function cleanProps(obj: Record<string, any>) {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null))
  }
  const appConfig = useLexAppConfig()
  const orderVars = useOrderVars()
  const canvas = ref<Canvas | null>(null)
  const canvasId = "e5Canvas"
  const canvasScale = ref(1.0)
  const AdvMode = ref(false)

  // No-op: canvas is initialized in EditorCanvas.vue only
  function initCanvas() {}

  // Expose canvas and methods
  return {
    canvas,
    canvasId,
    canvasScale,
    AdvMode,
    initCanvas,
  }
}
