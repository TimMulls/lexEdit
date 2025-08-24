<template>
  <div class="w-full overflow-visible" ref="rootRef">
    <div class="flex items-center gap-3 px-4 h-12 bg-white border-b border-gray-200 text-sm relative">
      <div class="flex items-center gap-2">
        <button class="text-xs font-medium px-2 py-1 border rounded bg-white hover:bg-gray-50" @click="openSidebar">Edit</button>
      </div>
      <!-- font family -->
      <div v-if="props.capabilities?.canFont" class="flex items-center gap-2 ml-2">
        <label class="text-xs text-gray-500">Font</label>
        <div class="flex items-center gap-2">
          <input type="text" v-model="fontSearch" placeholder="Search fonts..." class="text-xs border rounded px-2 py-1" />
          <select v-model="fontFamily" class="text-xs border rounded px-2 py-1">
            <option v-for="f in filteredFonts" :key="f" :value="f" :style="{ fontFamily: f, fontSize: '12pt' }">
              {{ f }}
            </option>
          </select>
        </div>
      </div>

      <!-- font size -->
      <div v-if="props.capabilities?.canSize" class="flex items-center gap-2 ml-2">
        <label class="text-xs text-gray-500">Size</label>
        <input type="number" v-model.number="fontSize" class="w-20 text-xs border rounded px-2 py-1" />
      </div>

      <div class="flex-1" />

      <!-- style buttons (centered in toolbar to match legacy placement) -->
      <div
        v-if="
          props.capabilities &&
          (props.capabilities.canStyle || props.capabilities.canAlign || props.capabilities.canFill || props.capabilities.canBg || props.capabilities.canOpacity)
        "
        class="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-0 z-40 overflow-visible">
        <div v-if="props.capabilities?.canStyle" class="inline-flex items-center">
          <button
            title="Bold"
            aria-label="Bold"
            :class="[
              'px-4 py-1 border rounded-l-md text-sm',
              props.capabilities?.canStyle ? (isBold() ? 'bg-black text-white border-black' : 'bg-white text-black') : 'text-gray-300 bg-white cursor-not-allowed',
            ]"
            :disabled="!(props.capabilities?.canStyle && (props.fontVariantAvailability?.bold ?? true))"
            @click="props.capabilities?.canStyle && (props.fontVariantAvailability?.bold ?? true) && toggleStyle('bold')">
            <strong>B</strong>
          </button>
          <button
            title="Italic"
            aria-label="Italic"
            :class="[
              'px-4 py-1 border rounded-none italic text-sm',
              props.capabilities?.canStyle ? (fontStyle === 'italic' ? 'bg-black text-white border-black' : 'bg-white text-black') : 'text-gray-300 bg-white cursor-not-allowed',
            ]"
            :style="{ marginLeft: '-1px' }"
            :disabled="!(props.capabilities?.canStyle && (props.fontVariantAvailability?.italic ?? true))"
            @click="props.capabilities?.canStyle && (props.fontVariantAvailability?.italic ?? true) && toggleStyle('italic')">
            I
          </button>
          <button
            title="Underline"
            aria-label="Underline"
            :class="[
              'px-4 py-1 border rounded-r-md text-sm',
              props.capabilities?.canStyle ? (underline ? 'bg-black text-white border-black' : 'bg-white text-black') : 'text-gray-300 bg-white cursor-not-allowed',
            ]"
            :style="{ marginLeft: '-1px' }"
            @click="props.capabilities?.canStyle && toggleStyle('underline')">
            U
          </button>
        </div>

        <div v-if="props.capabilities?.canStyle && props.capabilities?.canAlign" class="w-px bg-gray-200 h-6 mx-1"></div>

        <div v-if="props.capabilities?.canAlign" class="inline-flex items-center ml-1">
          <button
            title="Align Left"
            aria-label="Align left"
            :class="[
              'px-3 py-1 border rounded-l-md text-sm',
              props.capabilities?.canAlign ? (textAlign === 'left' ? 'bg-black text-white border-black' : 'bg-white text-black') : 'text-gray-300 bg-white cursor-not-allowed',
            ]"
            @click="props.capabilities?.canAlign && setAlign('left')">
            L
          </button>
          <button
            title="Align Center"
            aria-label="Align center"
            :class="[
              'px-3 py-1 border rounded-none text-sm',
              props.capabilities?.canAlign ? (textAlign === 'center' ? 'bg-black text-white border-black' : 'bg-white text-black') : 'text-gray-300 bg-white cursor-not-allowed',
            ]"
            :style="{ marginLeft: '-1px' }"
            @click="props.capabilities?.canAlign && setAlign('center')">
            C
          </button>
          <button
            title="Align Right"
            aria-label="Align right"
            :class="[
              'px-3 py-1 border rounded-r-md text-sm',
              props.capabilities?.canAlign ? (textAlign === 'right' ? 'bg-black text-white border-black' : 'bg-white text-black') : 'text-gray-300 bg-white cursor-not-allowed',
            ]"
            :style="{ marginLeft: '-1px' }"
            @click="props.capabilities?.canAlign && setAlign('right')">
            R
          </button>
        </div>

        <div v-if="props.capabilities?.canAlign && props.capabilities?.canFill" class="w-px bg-gray-200 h-6 mx-1"></div>

        <div v-if="props.capabilities?.canFill" class="relative ml-2">
          <div class="flex items-center gap-1">
            <button class="px-2 py-1 border rounded text-xs" @click="showFill = !showFill">Fill</button>
            <button title="Eyedropper" aria-label="Eyedropper" class="px-2 py-1 border rounded text-xs" @click="startEyeDropper">🩸</button>
          </div>
          <div v-if="showFill" class="absolute left-0 top-10 bg-white border rounded p-2 shadow z-50">
            <input type="color" v-model="fillColor" class="w-12 h-8 p-0 border-0" @input="onFillChange" />
            <div class="mt-2 grid grid-cols-5 gap-1">
              <button v-for="c in presetColors" :key="c + ':fill'" :style="{ backgroundColor: c }" class="w-6 h-6 rounded border" @click="onFillSwatch(c)"></button>
            </div>
          </div>
        </div>

        <!-- preset swatches moved into popovers to avoid expanding header -->
        <div v-if="props.capabilities?.canBg" class="relative ml-2">
          <button class="px-2 py-1 border rounded text-xs" @click="showBg = !showBg">BG</button>
          <div v-if="showBg" class="absolute left-0 top-10 bg-white border rounded p-2 shadow z-50">
            <input type="color" v-model="bgColor" class="w-12 h-8 p-0 border-0" @input="onBgChange" />
            <div class="mt-2 grid grid-cols-5 gap-1">
              <button v-for="c in presetColors" :key="c + ':bg2'" :style="{ backgroundColor: c }" class="w-6 h-6 rounded border" @click="onBgSwatch(c)"></button>
            </div>
          </div>
        </div>

        <div v-if="props.capabilities?.canOpacity && props.capabilities?.canOpacity" class="w-px bg-gray-200 h-6 mx-2"></div>
        <div v-if="props.capabilities?.canOpacity" class="relative ml-2">
          <button class="px-2 py-1 border rounded text-xs flex items-center justify-center" @click="showOpacity = !showOpacity" title="Opacity" aria-label="Opacity">
            <!-- simple droplet icon -->
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 2s-6 5.5-6 9a6 6 0 0012 0c0-3.5-6-9-6-9z" fill="currentColor" />
              <circle cx="12" cy="13" r="2" fill="white" opacity="0.6" />
            </svg>
          </button>
          <div v-if="showOpacity" class="absolute left-0 top-10 bg-white border rounded p-3 shadow z-50">
            <input type="range" min="0" max="100" v-model.number="opacity" class="w-36" @input="onOpacityChange" />
          </div>
        </div>
      </div>
      <!-- arrange / remove (grouped into dropdown to save space) -->
      <div v-if="props.capabilities?.canArrange || props.capabilities?.canRemove" class="flex items-center gap-2 ml-3 relative">
        <div class="relative">
          <button class="px-2 py-1 border rounded text-xs" @click="showArrange = !showArrange">Arrange</button>
          <div v-if="showArrange" class="absolute right-0 top-10 bg-white border rounded p-2 shadow z-50">
            <button class="w-full text-left px-2 py-1 text-xs" @click="bringForward">Bring Forward</button>
            <button class="w-full text-left px-2 py-1 text-xs" @click="sendBackward">Send Back</button>
            <button class="w-full text-left px-2 py-1 text-xs" @click="bringToFront">To Front</button>
            <button class="w-full text-left px-2 py-1 text-xs" @click="sendToBack">To Back</button>
          </div>
        </div>
        <button
          class="ml-2 px-2 py-1 border rounded text-xs"
          :class="props.capabilities?.canRemove ? 'bg-red-50 text-red-700' : 'text-gray-300 bg-white cursor-not-allowed'"
          @click="props.capabilities?.canRemove && remove">
          Remove
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue"
import { useOrderVars } from "../composables/useOrderVars"
import { loadEditorFonts } from "../composables/useFontLoader"
const props = defineProps<{
  label: string
  objectId?: string
  initialFontFamily?: string
  initialFontSize?: number
  initialOpacity?: number
  initialUnderline?: boolean
  initialFontWeight?: string
  initialFontStyle?: string
  initialTextAlign?: string
  initialFill?: string | null
  initialBackgroundColor?: string | null
  capabilities?: any
  fontVariantAvailability?: { italic?: boolean; bold?: boolean }
}>()
const orderVars = useOrderVars()
function getBaseName(raw?: unknown) {
  try {
    const s = raw ?? ""
    const parts = String(s).split(":")
    const first = parts && parts.length > 0 ? parts[0] : ""
    return String(first).trim()
  } catch (e) {
    return ""
  }
}
const availableFonts = computed(() => {
  // Build a list of base family names (strip any ":suffix" variants) and prefer loadedFonts first
  const seen = new Set<string>()
  const list: string[] = []

  function pushBase(f?: string) {
    if (!f || typeof f !== "string") return
    const base = (f.split(":")[0] || "").trim()
    if (!base) return
    if (!seen.has(base)) {
      seen.add(base)
      list.push(base)
    }
  }

  // Prefer the loaded fonts (these are the ones we want available immediately)
  if (Array.isArray(orderVars.loadedFonts) && orderVars.loadedFonts.length > 0) {
    orderVars.loadedFonts.forEach(pushBase)
  }

  // If allFonts is present (server-provided comprehensive list), include any remaining families
  if (Array.isArray(orderVars.allFonts) && orderVars.allFonts.length > 0) {
    orderVars.allFonts.forEach(pushBase)
  }

  // Ensure the initial font is present and at the front
  const initial = getBaseName(props.initialFontFamily)
  if (initial && !seen.has(initial)) list.unshift(initial)

  if (list.length === 0) list.push("Arial")
  return list
})
const fontSearch = ref("")
const filteredFonts = computed(() => {
  const term = (fontSearch.value || "").toLowerCase().trim()
  if (!term) return availableFonts.value
  return availableFonts.value.filter((f) => f.toLowerCase().includes(term))
})
const opacity = ref(props.initialOpacity !== undefined ? Math.round((props.initialOpacity ?? 1) * 100) : 100)
const fontFamily = ref(getBaseName(props.initialFontFamily) || availableFonts.value[0] || "Arial")
const fontSize = ref<number>(props.initialFontSize ?? 24)
const underline = ref<boolean>(!!props.initialUnderline)
const fontWeight = ref<string>(props.initialFontWeight ?? "normal")
const fontStyle = ref<string>(props.initialFontStyle ?? "normal")
const textAlign = ref<string>(props.initialTextAlign ?? "left")
const fillColor = ref<string>(props.initialFill ?? "#000000")
const bgColor = ref<string>(props.initialBackgroundColor ?? "#ffffff")
// Preset palette that mimics legacy editor (common brand colors)
const presetColors = ["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#f59e0b", "#10b981", "#3b82f6", "#6b7280"]
// Prevent emitting change events while we initialize local controls from props
const suppressEmit = ref(true)
const showFill = ref(false)
const showBg = ref(false)
const showArrange = ref(false)
const showOpacity = ref(false)
const rootRef = ref<HTMLElement | null>(null)
// Debounce timers to avoid flooding updates when dragging color pickers
const fillTimer = ref<number | null>(null)
const bgTimer = ref<number | null>(null)
const eyeDropping = ref(false)
let eyeDropperInstance: any = null
let originalCursor: string | null = null
let eyeDropperClickHandler: ((ev: MouseEvent) => void) | null = null
let eyeDropperKeyHandler: ((ev: KeyboardEvent) => void) | null = null

function isBold() {
  // treat both '700' and 'bold' as bold states
  return fontWeight.value === "700" || fontWeight.value === "bold"
}

function openSidebar() {
  window.dispatchEvent(new CustomEvent("open-sidebar", { detail: { id: props.objectId } }))
}

function closeAllPopovers() {
  // flush any pending color updates before closing popovers
  flushColorTimers()
  showFill.value = false
  showBg.value = false
  showArrange.value = false
  showOpacity.value = false
}

function onDocumentClick(e: MouseEvent) {
  const root = rootRef.value
  if (!root) return
  if (!(e.target instanceof Node)) return
  if (!root.contains(e.target)) {
    closeAllPopovers()
  }
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick)
})
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick)
  // clear any pending timers to avoid leaking handles after unmount
  if (fillTimer.value) {
    window.clearTimeout(fillTimer.value)
    fillTimer.value = null
  }
  if (bgTimer.value) {
    window.clearTimeout(bgTimer.value)
    bgTimer.value = null
  }
  // flush opacity timer if present
  if (opacityTimer) {
    window.clearTimeout(opacityTimer)
    opacityTimer = null
  }
})

function flushColorTimers() {
  // If a debounced fill update is pending, fire it immediately
  if (fillTimer.value) {
    window.clearTimeout(fillTimer.value)
    fillTimer.value = null
    window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "fill", value: fillColor.value } }))
  }
  // If a debounced bg update is pending, fire it immediately
  if (bgTimer.value) {
    window.clearTimeout(bgTimer.value)
    bgTimer.value = null
    window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "backgroundColor", value: bgColor.value } }))
  }
}

async function startEyeDropper() {
  if (!props.capabilities?.canFill) return
  // Prefer the native EyeDropper API when available
  if (typeof (window as any).EyeDropper === "function") {
    try {
      eyeDropperInstance = new (window as any).EyeDropper()
      const result = await eyeDropperInstance.open()
      if (result && result.sRGBHex) {
        fillColor.value = result.sRGBHex
        window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "fill", value: fillColor.value } }))
      }
      return
    } catch (e) {
      // fallthrough to canvas sampling
    }
  }
  // Fallback: sample the visible canvas pixel under click
  eyeDropping.value = true
  // change cursor to indicate eyedropper active
  originalCursor = document.body.style.cursor || null
  document.body.style.cursor = "crosshair"
  // Add click listener to capture pixel; compute backing-buffer coords from rect->canvas.width
  const onClick = async (ev: MouseEvent) => {
    try {
      // stop first to cleanup cursor/listeners
      stopEyeDropper()
      const canvasEl = document.querySelector("#e5Canvas") as HTMLCanvasElement | null
      if (!canvasEl) return
      const rect = canvasEl.getBoundingClientRect()
      const clientX = ev.clientX - rect.left
      const clientY = ev.clientY - rect.top
      const canvasBufW = canvasEl.width
      const canvasBufH = canvasEl.height
      const scaleX = rect.width > 0 ? canvasBufW / rect.width : 1
      const scaleY = rect.height > 0 ? canvasBufH / rect.height : 1
      const xBuf = Math.floor(clientX * scaleX)
      const yBuf = Math.floor(clientY * scaleY)
      if (xBuf < 0 || yBuf < 0 || xBuf >= canvasBufW || yBuf >= canvasBufH) return
      const ctx = canvasEl.getContext("2d")
      if (!ctx) return
      let data: Uint8ClampedArray
      try {
        data = ctx.getImageData(xBuf, yBuf, 1, 1).data
      } catch (err) {
        console.warn("[ElementPropBar] eyedropper getImageData failed (possibly tainted canvas)", err)
        return
      }
      const hex = "#" + [data[0], data[1], data[2]].map((v) => (v ?? 0).toString(16).padStart(2, "0")).join("")
      fillColor.value = hex
      window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "fill", value: fillColor.value } }))
    } catch (e) {
      // ignore
    }
  }
  // store handlers to allow clean removal
  eyeDropperClickHandler = onClick
  document.addEventListener("click", eyeDropperClickHandler, { capture: true })
  // allow cancel via Escape
  eyeDropperKeyHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape" || ev.key === "Esc") {
      stopEyeDropper()
    }
  }
  document.addEventListener("keydown", eyeDropperKeyHandler)
}

function stopEyeDropper() {
  eyeDropping.value = false
  try {
    if (eyeDropperInstance && typeof eyeDropperInstance.abort === "function") eyeDropperInstance.abort()
  } catch (e) {}
  try {
    document.body.style.cursor = originalCursor || ""
  } catch (e) {}
  // remove listeners if present
  try {
    if (eyeDropperClickHandler) {
      document.removeEventListener("click", eyeDropperClickHandler, true)
      document.removeEventListener("click", eyeDropperClickHandler, false)
      eyeDropperClickHandler = null
    }
  } catch (e) {}
  try {
    if (eyeDropperKeyHandler) {
      document.removeEventListener("keydown", eyeDropperKeyHandler)
      eyeDropperKeyHandler = null
    }
  } catch (e) {}
}

// Debounced opacity updates while sliding
let opacityTimer: number | null = null
function onOpacityChange() {
  if (!props.capabilities?.canOpacity) return
  if (opacityTimer) window.clearTimeout(opacityTimer)
  opacityTimer = window.setTimeout(() => {
    opacityTimer = null
    window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "opacity", value: opacity.value / 100 } }))
  }, 120) as unknown as number
}

// Auto-apply font family and size on change
watch(
  () => fontFamily.value,
  (v) => {
    if (suppressEmit.value) return
    if (!props.capabilities?.canFont) return
    // Ensure font is loaded before emitting change so preview shows correctly
    // Trigger loader for the single family (use raw family without variants)
    try {
      loadEditorFonts({
        onFontActive: (family) => {
          // after font active, emit change so canvas can render with correct family
          window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "fontFamily", value: v } }))
          // check available variants from orderVars.allFonts and disable style buttons if needed
          updateStyleAvailability(family)
        },
        onFontInactive: (family) => {
          // still emit so selection changes, but style buttons will fall back
          window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "fontFamily", value: v } }))
          updateStyleAvailability(family)
        },
      })
    } catch (err) {
      window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "fontFamily", value: v } }))
    }
  }
)

function updateStyleAvailability(family: string) {
  try {
    const raw = ((family || "").split(":")[0] || "").toUpperCase()
    // orderVars.allFonts contains entries like 'FontName:i4' etc. Find matches
    const found = (orderVars.allFonts || []).filter((ff: string) => {
      if (!ff) return false
      return ff.toUpperCase().startsWith(raw + ":")
    })

    let hasItalic = false
    let hasBold = false
    found.forEach((f: string) => {
      const suffix = f.split(":")[1] || ""
      if (suffix.indexOf("i4") !== -1 || suffix.indexOf("i7") !== -1) hasItalic = true
      if (suffix.indexOf("n7") !== -1 || suffix.indexOf("i7") !== -1) hasBold = true
    })

    // Broadcast availability so parent can enable/disable UI
    window.dispatchEvent(new CustomEvent("font-variant-availability", { detail: { id: props.objectId, italic: hasItalic, bold: hasBold } }))
  } catch (e) {
    // ignore
  }
}
watch(
  () => fontSize.value,
  (v) => {
    if (suppressEmit.value) return
    if (!props.capabilities?.canSize) return
    window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "fontSize", value: v } }))
  }
)

function toggleStyle(kind: string) {
  if (!props.capabilities?.canStyle) return
  // update local state immediately for instant UI feedback
  if (kind === "bold") {
    fontWeight.value = fontWeight.value === "700" || fontWeight.value === "bold" ? "normal" : "700"
  } else if (kind === "italic") {
    fontStyle.value = fontStyle.value === "italic" ? "normal" : "italic"
  } else if (kind === "underline") {
    underline.value = !underline.value
  }
  // For toggles, fire an event with prop kind; EditorRoot will interpret and toggle state on canvas
  const ev = new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: kind, value: true } })
  window.dispatchEvent(ev)
}

function setAlign(value: string) {
  if (!props.capabilities?.canAlign) return
  textAlign.value = value
  const ev = new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "textAlign", value } })
  window.dispatchEvent(ev)
}

function onFillChange() {
  // debounce rapid input events when user drags the color picker thumb
  if (fillTimer.value) window.clearTimeout(fillTimer.value)
  // schedule emit after short delay; resets while dragging
  fillTimer.value = window.setTimeout(() => {
    fillTimer.value = null
    window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "fill", value: fillColor.value } }))
  }, 100) as unknown as number
}

function onFillSwatch(col: string) {
  fillColor.value = col
  const ev = new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "fill", value: col } })
  window.dispatchEvent(ev)
  // close popover
  showFill.value = false
}

function onBgChange() {
  // debounce rapid bg color changes from dragging the native color input
  if (bgTimer.value) window.clearTimeout(bgTimer.value)
  bgTimer.value = window.setTimeout(() => {
    bgTimer.value = null
    window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "backgroundColor", value: bgColor.value } }))
  }, 100) as unknown as number
}

function onBgSwatch(col: string) {
  bgColor.value = col
  const ev = new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "backgroundColor", value: col } })
  window.dispatchEvent(ev)
  // close popover
  showBg.value = false
}

function remove() {
  window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "remove", value: true } }))
}

function bringForward() {
  window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "bringForward", value: true } }))
  showArrange.value = false
}

function sendBackward() {
  window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "sendBackward", value: true } }))
  showArrange.value = false
}

function bringToFront() {
  window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "bringToFront", value: true } }))
  showArrange.value = false
}

function sendToBack() {
  window.dispatchEvent(new CustomEvent("element-prop-change", { detail: { id: props.objectId, prop: "sendToBack", value: true } }))
  showArrange.value = false
}

// Keep local controls in sync when parent updates selected object's props
watch(
  () => ({
    f: props.initialFontFamily,
    s: props.initialFontSize,
    o: props.initialOpacity,
    u: props.initialUnderline,
    w: props.initialFontWeight,
    i: props.initialFontStyle,
    a: props.initialTextAlign,
    fill: props.initialFill,
    backgroundColor: props.initialBackgroundColor,
  }),
  (val) => {
    // Suppress local emits while syncing values coming from parent selection
    suppressEmit.value = true
    if (val.f !== undefined) fontFamily.value = val.f || fontFamily.value
    if (val.s !== undefined) fontSize.value = val.s || fontSize.value
    if (val.o !== undefined) opacity.value = Math.round((val.o ?? 1) * 100)
    if (val.u !== undefined) underline.value = !!val.u
    if (val.w !== undefined) fontWeight.value = val.w || fontWeight.value
    if (val.i !== undefined) fontStyle.value = val.i || fontStyle.value
    if (val.a !== undefined) textAlign.value = val.a || textAlign.value
    if (val.fill !== undefined) fillColor.value = val.fill || fillColor.value
    if (val.backgroundColor !== undefined) bgColor.value = val.backgroundColor || bgColor.value
    // re-enable emits next tick so user interactions trigger changes
    nextTick(() => {
      suppressEmit.value = false
    })
  },
  { immediate: true }
)
</script>

<style scoped></style>
