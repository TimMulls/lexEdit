<template>
  <div class="relative flex-1 flex flex-col items-center justify-center bg-white mt-4">
    <div id="canvasContainer" class="w-full h-full flex items-center justify-center">
      <canvas ref="canvasRef" id="e5Canvas" width="1620" height="900" class="border shadow"></canvas>
    </div>
    <!-- Floating multiplier knob -->
    <div class="absolute top-3 right-3 z-50 bg-white/90 p-2 rounded shadow text-sm flex items-center gap-2 hidden">
      <label class="whitespace-nowrap">fontMult</label>
      <input type="range" min="1" max="2" step="0.01" v-model.number="fontMult" class="w-40" />
      <input type="number" v-model.number="fontMult" step="0.01" class="w-16 border rounded px-1" />
      <button @click="applyToSelected" class="px-2 py-1 bg-blue-600 text-white rounded">Apply</button>
      <button @click="resetToDefault" class="px-2 py-1 border rounded">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue"
import { useCanvas } from "../composables/useCanvas"
import { useEditorData } from "../composables/useEditorData"
import { Canvas, Image, Rect } from "fabric"
import { CustomTextbox } from "../composables/CustomTextbox"
import { useZoom } from "../composables/useZoom"
import { createCustomImage } from "../composables/CustomImage"

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { canvas } = useCanvas()
const zoom = useZoom(canvas as { value: Canvas | null }, "canvasContainer")
const editorData = useEditorData()

// Slider state: initialize from URL or default to 2.08 (user preference)
const _urlParamsGlobal = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
const _urlFontMultGlobal = _urlParamsGlobal ? parseFloat(_urlParamsGlobal.get("fontMult") ?? "") : NaN
const initialFontMult = Number.isFinite(_urlFontMultGlobal) ? _urlFontMultGlobal : 2.08
const fontMult = ref<number>(initialFontMult)
// Simple undo/redo history stacks. We store serialized minimal object states.
const undoStack: string[] = []
const redoStack: string[] = []
let lastSnapshot: string = ""
let suppressHistory = false
let currentEditMode = false
let pendingPreState = false

function configureObject(o: any) {
  if (!o) return
  try {
    // keep selectable so user can click to select
    if (typeof o.selectable !== "undefined") o.selectable = true
    o.evented = true
    if (!currentEditMode) {
      o.lockMovementX = true
      o.lockMovementY = true
      o.lockScalingX = true
      o.lockScalingY = true
      o.lockRotation = true
      o.hasControls = false
      o.hasBorders = true
      o.hasRotatingPoint = false
    } else {
      o.lockMovementX = false
      o.lockMovementY = false
      o.lockScalingX = false
      o.lockScalingY = false
      o.lockRotation = false
      o.hasControls = true
      o.hasBorders = true
      o.hasRotatingPoint = true
    }
    if (typeof o.setCoords === "function") o.setCoords()
  } catch (e) {}
}

// Replace an existing image object on the canvas with a new source
function replaceImage(obj: any, imgID: any, imgFull: string) {
  if (!canvas.value || !obj) return
  try {
    const { useLexAppConfig } = require("../composables/useLexAppConfig")
    const appConfig = useLexAppConfig()
    let finalUrl = imgFull
    if (imgFull && !/^https?:\/\//i.test(imgFull) && appConfig?.imgsURL) {
      let url = String(imgFull).replace(/^\/+/, "")
      finalUrl = appConfig.imgsURL + url
    }
    if (typeof obj.setSrc === "function") {
      // attempt to use fabric's setSrc for live replacement
      try {
        obj.setSrc(
          finalUrl,
          () => {
            try {
              obj.set && obj.set({ src: imgFull, ImgID: imgID, dirty: true })
            } catch (e) {}
            try {
              configureObject(obj)
            } catch (e) {}
            try {
              canvas.value!.requestRenderAll()
            } catch (e) {}
          },
          { crossOrigin: "anonymous" }
        )
        return
      } catch (e) {
        // fallthrough to create element
      }
    }
    // fallback: create new element and set as object's element
    const imgEl = new (window as any).Image()
    imgEl.crossOrigin = "anonymous"
    imgEl.onload = function () {
      try {
        obj.setElement(imgEl)
      } catch (e) {}
      try {
        obj.set && obj.set({ src: imgFull, ImgID: imgID, dirty: true })
      } catch (e) {}
      try {
        configureObject(obj)
      } catch (e) {}
      try {
        canvas.value!.requestRenderAll()
      } catch (e) {}
    }
    imgEl.src = finalUrl
  } catch (e) {
    console.error("replaceImage failed", e)
  }
}

function captureSnapshot(): string {
  if (!canvas.value) return JSON.stringify({ objects: [] })
  try {
    // Use full canvas JSON so complex objects (groups, custom textboxes) serialize reliably
    try {
      return JSON.stringify(canvas.value.toJSON())
    } catch (e) {
      return JSON.stringify({ objects: canvas.value.getObjects().map((o: any) => (o.toObject ? o.toObject() : {})) })
    }
  } catch (e) {
    return JSON.stringify({ objects: [] })
  }
}

function pushHistory() {
  if (!canvas.value) return
  if (suppressHistory) return
  try {
    // finalize current state as lastSnapshot
    lastSnapshot = captureSnapshot()
    // Clear redo on new action
    redoStack.splice(0, redoStack.length)
    window.dispatchEvent(new CustomEvent("history-changed", { detail: { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 } }))
    // clear any pending pre-state marker
    pendingPreState = false
  } catch (e) {
    // ignore
  }
}

function recordPreState() {
  if (!canvas.value) return
  if (suppressHistory) return
  try {
    if (pendingPreState) return
    const snap = captureSnapshot()
    const last = undoStack.length > 0 ? undoStack[undoStack.length - 1] : null
    if (last !== snap) undoStack.push(snap)
    if (undoStack.length > 50) undoStack.shift()
    redoStack.splice(0, redoStack.length)
    window.dispatchEvent(new CustomEvent("history-changed", { detail: { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 } }))
    pendingPreState = true
  } catch (e) {}
}

function undo() {
  if (!canvas.value) return
  if (undoStack.length === 0) return
  try {
    const prev = undoStack.pop()!
    const current = captureSnapshot()
    redoStack.push(current)
    applySnapshot(prev)
    lastSnapshot = prev
    window.dispatchEvent(new CustomEvent("history-changed", { detail: { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 } }))
  } catch (e) {
    console.warn("undo failed", e)
  }
}

function redo() {
  if (!canvas.value) return
  if (redoStack.length === 0) return
  try {
    const next = redoStack.pop()!
    const current = captureSnapshot()
    undoStack.push(current)
    applySnapshot(next)
    lastSnapshot = next
    window.dispatchEvent(new CustomEvent("history-changed", { detail: { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 } }))
  } catch (e) {
    console.warn("redo failed", e)
  }
}

function applySnapshot(snapshot: string) {
  if (!canvas.value) return
  try {
    // snapshot is a JSON string of the canvas state
    const json = snapshot
    beginHistorySuppress()
    // loadFromJSON will recreate objects; use reviver to preserve ids if necessary
    // Use non-null assertion because we returned early when canvas.value was falsy
    canvas.value!.loadFromJSON(JSON.parse(json), () => {
      try {
        // ensure objects configured to current edit mode
        canvas.value!.getObjects().forEach((o: any) => {
          try {
            configureObject(o)
          } catch (e) {}
        })
        canvas.value!.requestRenderAll()
      } finally {
        endHistorySuppress()
      }
    })
  } catch (e) {
    console.warn("applySnapshot failed", e)
  }
}

// Allow external callers to suppress history while performing bulk operations
function beginHistorySuppress() {
  suppressHistory = true
}

function endHistorySuppress() {
  suppressHistory = false
}

// Initialize history state after a bulk load: clear stacks and capture baseline
function initHistorySnapshot() {
  if (!canvas.value) return
  try {
    suppressHistory = true
    undoStack.splice(0, undoStack.length)
    redoStack.splice(0, redoStack.length)
    lastSnapshot = captureSnapshot()
    window.dispatchEvent(new CustomEvent("history-changed", { detail: { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 } }))
  } catch (e) {
    // ignore
  } finally {
    suppressHistory = false
  }
}

// Apply current fontMult to the currently selected textboxes
function applyToSelected() {
  try {
    if (!canvas.value) return
    const c: any = canvas.value
    const activeObjects = typeof c.getActiveObjects === "function" ? c.getActiveObjects() : [c.getActiveObject()].filter(Boolean)
    if (!activeObjects || activeObjects.length === 0) return
    activeObjects.forEach((obj: any) => {
      // Only apply to textbox-like objects
      if (!obj) return
      const ctorName = obj.constructor?.name || obj.type
      if (ctorName !== "CustomTextbox" && obj.type !== "textbox") return
      // Determine the original raw font size if available. If not present, try to derive it from
      // the current fontSize and any existing _fontSizeMult on the object. Then store it so
      // subsequent operations use the original API font size.
      let raw: number
      if (typeof obj._rawFontSize === "number") {
        raw = obj._rawFontSize
      } else if (typeof obj.fontSize === "number" && typeof obj._fontSizeMult === "number" && obj._fontSizeMult > 0) {
        raw = Math.max(1, Math.round((obj.fontSize / obj._fontSizeMult) * 100) / 100)
      } else if (typeof obj.fontSize === "number") {
        raw = obj.fontSize
      } else {
        raw = 24
      }
      // Persist raw font and apply multiplier
      obj._rawFontSize = raw
      obj._fontSizeMult = fontMult.value
      const applied = Math.max(1, Math.round(raw * fontMult.value * 100) / 100)
      try {
        obj.set("fontSize", applied)
      } catch (e) {
        try {
          obj.fontSize = applied
        } catch (e2) {}
      }
      // Re-wrap and re-measure
      try {
        if (typeof obj._generateStyleMap === "function") obj._styleMap = obj._generateStyleMap(obj._splitText())
      } catch (e) {}
      try {
        if (typeof obj._clearCache === "function") obj._clearCache()
      } catch (e) {}
      try {
        if (typeof obj.initDimensions === "function") obj.initDimensions()
      } catch (e) {}
      try {
        if (typeof obj.setCoords === "function") obj.setCoords()
      } catch (e) {}
      // Some Fabric/Textbox internals may adjust fontSize during initDimensions (autoFontSize, wrapping, etc.).
      // If the object fontSize after the first pass doesn't match what we computed, reapply once more
      // to ensure the multiplier is enforced (this mirrors the "click twice" behavior users observed).
      try {
        const currentFont = typeof obj.fontSize === "number" ? obj.fontSize : typeof obj.get === "function" ? obj.get("fontSize") : undefined
        if (typeof currentFont === "number") {
          const diff = Math.abs(currentFont - applied)
          if (diff > 0.05) {
            // Reapply computed size and re-run measurement
            try {
              obj.set("fontSize", applied)
            } catch (e) {
              try {
                obj.fontSize = applied
              } catch (e2) {}
            }
            try {
              if (typeof obj._generateStyleMap === "function") obj._styleMap = obj._generateStyleMap(obj._splitText())
            } catch (e) {}
            try {
              if (typeof obj._clearCache === "function") obj._clearCache()
            } catch (e) {}
            try {
              if (typeof obj.initDimensions === "function") obj.initDimensions()
            } catch (e) {}
            try {
              if (typeof obj.setCoords === "function") obj.setCoords()
            } catch (e) {}
          }
        }
      } catch (e) {
        // ignore
      }
    })
    if (canvas.value) canvas.value.requestRenderAll()
    console.debug("[EditorCanvas] applyToSelected applied fontMult", fontMult.value)
    // record history after font multiplier changes
    pushHistory()
  } catch (err) {
    console.warn("applyToSelected failed", err)
  }
}

function resetToDefault() {
  fontMult.value = initialFontMult
}

// --- Canvas Data/Zoom/Expose API for EditorRoot ---
function clearCanvas() {
  if (canvas.value) canvas.value.clear()
}

function resetZoomTo100() {
  if (canvas.value) {
    zoom.setCanvasZoom(1)
  }
}

function loadBackgroundImage(face: string, cb?: () => void) {
  if (!canvas.value) return
  clearCanvas()
  // Use backgroundImageUrl from editorData
  const bgUrl = editorData.backgroundImageUrl.value
  if (bgUrl) {
    Image.fromURL(bgUrl, { crossOrigin: "anonymous" }).then((img: any) => {
      img.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        scaleX: canvas.value!.getWidth() / (img.width || 1),
        scaleY: canvas.value!.getHeight() / (img.height || 1),
      })
      canvas.value!.add(img)
      canvas.value!.requestRenderAll()
      cb && cb()
    })
  } else {
    cb && cb()
    // After loading objects, set initial snapshot and stop suppressing history
    try {
      suppressHistory = true
      lastSnapshot = captureSnapshot()
    } catch (e) {}
    suppressHistory = false
  }
}

function addText(value: string, textObjectId?: string, props?: any) {
  console.log("[EditorCanvas] addText called", { value, textObjectId, props, canvas: !!canvas.value })
  if (!canvas.value) return
  // record state for undo before mutation
  recordPreState()
  // Always add at 100% zoom
  const prevZoom = canvas.value.getZoom()
  if (prevZoom !== 1) canvas.value.setZoom(1)
  // Only allow valid Fabric.js properties
  const allowedProps = [
    "left",
    "top",
    "width",
    "height",
    "fontSize",
    "fontFamily",
    "fontWeight",
    "fontStyle",
    "textAlign",
    "fill",
    "stroke",
    "strokeWidth",
    "backgroundColor",
    "angle",
    "scaleX",
    "scaleY",
    "opacity",
    "shadow",
    "charSpacing",
    "lineHeight",
    "underline",
    "linethrough",
    "overline",
    "fontVariant",
    "textBackgroundColor",
    "editable",
    "selectable",
    "evented",
    "visible",
    "clipPath",
    "padding",
    "borderColor",
    "cornerColor",
    "cornerSize",
    "transparentCorners",
    "lockMovementX",
    "lockMovementY",
    "lockScalingX",
    "lockScalingY",
    "lockRotation",
    "lockUniScaling",
    "minScaleLimit",
    "maxScaleLimit",
    "objectCaching",
    "noScaleCache",
    "globalCompositeOperation",
    "hoverCursor",
    "moveCursor",
    "defaultCursor",
    "cornerStrokeColor",
    "cornerStyle",
    "cornerDashArray",
    "borderDashArray",
    "borderScaleFactor",
    "cornerStrokeWidth",
    "cornerSize",
    "cornerColor",
    "cornerBackgroundColor",
    "cornerStyle",
    "cornerDashArray",
    "borderColor",
    "borderDashArray",
    "borderScaleFactor",
    "borderOpacityWhenMoving",
    "cornerOpacityWhenMoving",
    "cornerSize",
    "cornerColor",
    "cornerBackgroundColor",
    "cornerStyle",
    "cornerDashArray",
    "borderColor",
    "borderDashArray",
    "borderScaleFactor",
    "borderOpacityWhenMoving",
    "cornerOpacityWhenMoving",
    "cornerSize",
    "cornerColor",
    "cornerBackgroundColor",
    "cornerStyle",
    "cornerDashArray",
    "borderColor",
    "borderDashArray",
    "borderScaleFactor",
    "borderOpacityWhenMoving",
    "cornerOpacityWhenMoving",
  ]
  props = props || {}
  // Legacy default text and properties for new textboxes
  // Use legacy default text from old app
  let textboxValue = value
  if (!textboxValue || typeof textboxValue !== "string" || textboxValue.trim() === "") {
    textboxValue = "Click to edit this text."
  }
  // Legacy default properties
  // Legacy default properties (placement, size, etc.)
  const defaultProps = {
    width: 900,
    height: 54,
    minWidth: 10,
    fontFamily: "Arial",
    fontSize: 24,
    fontWeight: "normal",
    fontStyle: "normal",
    left: 80,
    top: 810,
    fill: "#000000",
    autoFontSize: true,
    allowCuttedWords: false,
    editable: true,
    selectable: true,
    evented: true,
    backgroundColor: "",
    textAlign: "center",
    angle: 0,
    opacity: 1,
    visible: true,
    // legacy fabric text sizing multipliers; use live slider value
    _fontSizeMult: typeof fontMult !== "undefined" ? fontMult.value : 1.2,
    _fontSizeFraction: 0.222,
  }
  // Merge props: user > legacy defaults
  props = props || {}
  const filteredProps = { ...defaultProps, ...Object.fromEntries(Object.entries(props).filter(([key]) => allowedProps.includes(key))) }
  // Debug: show what properties will be passed to CustomTextbox
  try {
    console.debug("[EditorCanvas] addText filteredProps", filteredProps)
  } catch (e) {}
  // If a non-default multiplier is active via URL or the slider, and the caller
  // didn't explicitly request autoFontSize, disable autoFontSize so the multiplier
  // is preserved on creation (prevents immediate downscaling).
  try {
    if (typeof fontMult !== "undefined" && fontMult.value > 1.01 && props && props.autoFontSize === undefined) {
      filteredProps.autoFontSize = false
    }
  } catch (e) {}
  // Guarantee required properties are always present
  if (!filteredProps.fill) filteredProps.fill = "#000000"
  if (!filteredProps.fontFamily) filteredProps.fontFamily = "Arial"
  if (!filteredProps.fontSize) filteredProps.fontSize = 24
  if (!filteredProps.fontStyle) filteredProps.fontStyle = "normal"
  if (!textboxValue) textboxValue = "F E E L G R E A T . L O O K G R E A T . B E G R E A T ."
  let textbox
  try {
    textbox = new CustomTextbox(textboxValue, {
      ...filteredProps,
      textObjectId,
    })
  } catch (e) {
    console.warn("Failed to construct CustomTextbox:", e, textboxValue, filteredProps)
    return
  }
  // Enhanced runtime diagnostics for invalid Fabric.js object
  const protoChain = []
  let proto = textbox
  while (proto) {
    protoChain.push(proto.constructor?.name)
    proto = Object.getPrototypeOf(proto)
  }
  // Ensure newly-created textbox instances have a stored _rawFontSize and the
  // current live multiplier applied. This avoids the case where objects loaded
  // during reload use a stale or missing raw size and require the user to click
  // Apply to correct them.
  try {
    // Derive raw font size if not present
    if (typeof (textbox as any)._rawFontSize !== "number") {
      const currentFont = typeof (textbox as any).fontSize === "number" ? (textbox as any).fontSize : undefined
      const existingMult = typeof (textbox as any)._fontSizeMult === "number" && (textbox as any)._fontSizeMult > 0 ? (textbox as any)._fontSizeMult : undefined
      let derivedRaw: number
      if (typeof currentFont === "number" && typeof existingMult === "number") {
        derivedRaw = Math.max(1, Math.round((currentFont / existingMult) * 100) / 100)
      } else if (typeof currentFont === "number") {
        derivedRaw = currentFont
      } else {
        derivedRaw = 24
      }
      ;(textbox as any)._rawFontSize = derivedRaw
    }
    // Overwrite instance multiplier with the live slider/URL value and apply
    ;(textbox as any)._fontSizeMult = typeof fontMult !== "undefined" ? fontMult.value : (textbox as any)._fontSizeMult || 1.2
    const raw = (textbox as any)._rawFontSize
    const applied = Math.max(1, Math.round(raw * (textbox as any)._fontSizeMult * 100) / 100)
    try {
      textbox.set("fontSize", applied)
    } catch (e) {
      try {
        ;(textbox as any).fontSize = applied
      } catch (e2) {}
    }
    try {
      if (typeof (textbox as any)._generateStyleMap === "function") (textbox as any)._styleMap = (textbox as any)._generateStyleMap((textbox as any)._splitText())
    } catch (e) {}
    try {
      if (typeof (textbox as any)._clearCache === "function") (textbox as any)._clearCache()
    } catch (e) {}
    try {
      if (typeof (textbox as any).initDimensions === "function") (textbox as any).initDimensions()
    } catch (e) {}
    try {
      if (typeof (textbox as any).setCoords === "function") (textbox as any).setCoords()
    } catch (e) {}
  } catch (e) {
    // ignore normalization errors
  }
  // Use globalThis to access fabric namespace safely
  const fabricNS = (globalThis as any).fabric
  const isFabricObject = fabricNS && fabricNS.Object && textbox instanceof fabricNS.Object
  const isCustomTextbox = textbox instanceof CustomTextbox
  // Accept if it's a CustomTextbox or has the right methods
  const isAcceptableTextbox =
    (typeof textbox.render === "function" && typeof textbox._set === "function" && (isCustomTextbox || isFabricObject)) ||
    (typeof textbox.render === "function" && typeof textbox._set === "function" && textbox.constructor?.name === "CustomTextbox")
  console.log("[EditorCanvas] addText constructed object:", {
    textbox,
    constructor: textbox?.constructor?.name,
    protoChain,
    hasRender: typeof textbox.render === "function",
    hasSet: typeof textbox._set === "function",
    isFabricObject,
    isCustomTextbox,
  })
  // Use the actual Fabric.js canvas instance
  const fabricCanvas = canvas.value && typeof (canvas.value as any).add === "function" ? (canvas.value as any) : null
  // Do NOT clear or remove any existing objects when adding new text
  if (isAcceptableTextbox && fabricCanvas) {
    fabricCanvas.add(textbox)
    fabricCanvas.setActiveObject(textbox)
    fabricCanvas.requestRenderAll()
    // record history for undo
    pushHistory()
    // Restore previous zoom (keep behavior consistent with addImage/addShape)
    if (prevZoom !== 1 && canvas.value) canvas.value.setZoom(prevZoom)
    if (canvas.value) canvas.value.requestRenderAll()
  } else {
    console.warn("[EditorCanvas] Attempted to add invalid textbox object to canvas:", {
      textbox,
      constructor: textbox?.constructor?.name,
      protoChain,
      hasRender: typeof textbox.render === "function",
      hasSet: typeof textbox._set === "function",
      isFabricObject,
      isCustomTextbox,
      isAcceptableTextbox,
      fabricCanvasExists: !!fabricCanvas,
    })
  }
}

function addImage(url: string, props?: any) {
  console.log("[EditorCanvas] addImage called", { url, props, canvas: !!canvas.value })
  if (!canvas.value) return
  const prevZoom = canvas.value.getZoom()
  if (prevZoom !== 1) canvas.value.setZoom(1)
  // Filter out non-Fabric.js properties
  const { type: _type, __type: __type, ID: _ID, id: _id, ...fabricProps } = props || {}
  const left = fabricProps.left ?? fabricProps.x ?? 100
  const top = fabricProps.top ?? fabricProps.y ?? 100
  const width = fabricProps.width
  const height = fabricProps.height
  // Use CustomImage helper to mimic legacy image behavior (best-fit / fill / cropped)
  createCustomImage(url, {
    left,
    top,
    width,
    height,
    selectable: fabricProps.selectable !== false,
    scale: fabricProps.scale || fabricProps.ImageAlign || "best-fit",
  })
    .then((group: any) => {
      // record pre-state
      recordPreState()
      // copy extra props onto group if provided
      Object.assign(group, fabricProps)
      try {
        // normalize id fields so sidebar matching works
        const normalizedId = fabricProps.ImgID || fabricProps.ID || fabricProps.id || fabricProps.objectId || null
        if (normalizedId && !group.id) group.id = String(normalizedId)
        if (fabricProps.ImgID && !group.ImgID) group.ImgID = fabricProps.ImgID
      } catch (e) {}
      canvas.value!.add(group)
      // apply edit mode locks to newly added object(s)
      try {
        if (typeof setEditMode === "function") setEditMode(editorData.advMode.value)
      } catch (e) {}
      pushHistory()
      if (prevZoom !== 1 && canvas.value) canvas.value.setZoom(prevZoom)
      if (canvas.value) canvas.value.requestRenderAll()
      console.log("[EditorCanvas] addImage added custom image group", group)
    })
    .catch((err) => {
      console.warn("[EditorCanvas] createCustomImage failed, falling back to Image.fromURL", err)
      // fallback to default fabric image loader
      Image.fromURL(url, { crossOrigin: "anonymous" }).then((img: any) => {
        const setProps: any = {
          ...fabricProps,
          left,
          top,
        }
        if (width) setProps.width = width
        if (height) setProps.height = height
        img.set(setProps)
        recordPreState()
        try {
          // normalize id on fallback image too
          const normalizedId = fabricProps.ImgID || fabricProps.ID || fabricProps.id || fabricProps.objectId || null
          if (normalizedId && !img.id) img.id = String(normalizedId)
          if (fabricProps.ImgID && !img.ImgID) img.ImgID = fabricProps.ImgID
        } catch (e) {}
        canvas.value!.add(img)
        try {
          if (typeof setEditMode === "function") setEditMode(editorData.advMode.value)
        } catch (e) {}
        pushHistory()
        if (prevZoom !== 1 && canvas.value) canvas.value.setZoom(prevZoom)
        if (canvas.value) canvas.value.requestRenderAll()
        console.log("[EditorCanvas] addImage fallback added image", img)
      })
    })
}

function addShape(type: string, props?: any) {
  console.log("[EditorCanvas] addShape called", { type, props, canvas: !!canvas.value })
  if (!canvas.value) return
  const prevZoom = canvas.value.getZoom()
  if (prevZoom !== 1) canvas.value.setZoom(1)
  // Filter out non-Fabric.js properties
  const { type: _type, __type: __type, ID: _ID, id: _id, ...fabricProps } = props || {}
  const left = fabricProps.left ?? fabricProps.x ?? 100
  const top = fabricProps.top ?? fabricProps.y ?? 100
  const width = fabricProps.width
  const height = fabricProps.height
  let shape
  if (type === "rect") {
    const rectProps: any = {
      ...fabricProps,
      left,
      top,
      fill: fabricProps.fill ?? "#60a5fa",
    }
    if (width) rectProps.width = width
    if (height) rectProps.height = height
    shape = new Rect(rectProps)
  }
  // Add more shape types as needed
  if (shape) {
    recordPreState()
    // Normalize canonical id fields so sidebar/canvas matching works for shapes
    try {
      const normalizedId = props?.ID || props?.id || props?.objectId || props?.ObjectID || null
      if (normalizedId && !(shape as any).id) (shape as any).id = String(normalizedId)
      if (props?.ID && !(shape as any).ID) (shape as any).ID = props.ID
      if (props?.objectId && !(shape as any).objectId) (shape as any).objectId = props.objectId
      if (props?.ObjectID && !(shape as any).ObjectID) (shape as any).ObjectID = props.ObjectID
      // Set a label for debugging/menus
      if ((props?.label || props?.ObjectName) && !(shape as any).label) (shape as any).label = props.label || props.ObjectName
    } catch (e) {}
    canvas.value.add(shape)
    try {
      if (typeof setEditMode === "function") setEditMode(editorData.advMode.value)
    } catch (e) {}
    pushHistory()
    if (prevZoom !== 1 && canvas.value) canvas.value.setZoom(prevZoom)
    if (canvas.value) canvas.value.requestRenderAll()
    console.log("[EditorCanvas] addShape added", type, {
      left: shape.left,
      top: shape.top,
      width: shape.width,
      height: shape.height,
      fill: shape.fill,
    })
  }
  // Add more shape types as needed
}

function addCoupon(code: string, props?: any) {
  // Placeholder: implement as needed
}

function updateText(id: string, value: string) {
  if (!canvas.value) return
  const obj = canvas.value.getObjects().find((o: any) => {
    try {
      if (o.type !== "textbox") return false
      const candidates = [o.id, o.ID, o.textObjectId, o.textObjectID, o.objectId]
      return candidates.some((c: any) => c !== undefined && c !== null && String(c) === String(id))
    } catch (e) {
      return false
    }
  })
  if (obj) {
    obj.set("text", value)
    canvas.value.requestRenderAll()
  }
}

// Zoom API for toolbar/buttons
function zoomIn() {
  zoom.zoomIn()
}
function zoomOut() {
  zoom.zoomOut()
}
function zoomFit() {
  console.debug("[EditorCanvas] zoomFit wrapper calling composable.zoomFit", { timestamp: Date.now(), caller: "EditorCanvas.zoomFit" })
  zoom.zoomFit()
}
// --- END Canvas Data/Zoom/Expose API ---

onMounted(() => {
  if (canvasRef.value) {
    // Attach the fabric canvas instance to the composable's ref
    const inst = new Canvas(canvasRef.value, {
      backgroundColor: "#fff",
      // Allow single-click selection so UI can respond (sidebar open/highlight) even when not in advanced edit mode
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true,
    })
    canvas.value = inst // ensure composable and local ref are the same
    console.debug("[EditorCanvas] Fabric canvas initialized", { timestamp: Date.now() })
    // Wire selection events to notify parent/UI
    try {
      inst.on("selection:created", (e: any) => {
        const obj = e.selected && e.selected.length === 1 ? e.selected[0] : e.target
        let label = obj && (obj.ObjectName || obj.label || (obj.text && obj.text.substring?.(0, 20)))
        let idCandidate = obj?.id || obj?.ID || obj?.ImgID || obj?.ImgId || obj?.objectId || obj?.ObjectID || obj?.textObjectId || obj?.textObjectID || obj?.name || null
        // Add diagnostic dump of object so we can inspect runtime properties in the browser console
        try {
          console.debug("[EditorCanvas] selection raw object", { obj, ctor: obj?.constructor?.name, type: obj?.type, keys: Object.keys(obj || {}) })
        } catch (e) {}
        // If the clicked element is an inner image inside a group, fallback to the group's id/ImgID
        if (!idCandidate) {
          try {
            const parent = (obj as any).group || (obj as any).parent || null
            if (parent) {
              idCandidate = parent.id || parent.ID || parent.ImgID || parent.ImgId || parent.objectId || parent.ObjectID || null
              console.debug("[EditorCanvas] selection:created parent fallback", { parentId: idCandidate, parentType: parent?.type, parentKeys: Object.keys(parent || {}) })
            }
            // If still no id, search canvas top-level objects to find a group that contains this object
            if (!idCandidate && canvas.value) {
              try {
                const objs = canvas.value.getObjects()
                for (const candidate of objs) {
                  try {
                    const $c: any = candidate
                    const children = $c.getObjects ? $c.getObjects() : $c._objects || null
                    // direct containment
                    if (children && Array.isArray(children) && children.includes(obj)) {
                      idCandidate = $c.id || $c.ID || $c.ImgID || $c.ImgId || $c.objectId || $c.ObjectID || $c.textObjectId || $c.textObjectID || $c.name || null
                      console.debug("[EditorCanvas] selection:created group search fallback", { foundOn: $c, foundId: idCandidate })
                      if (idCandidate) break
                    }
                    // direct reference equality (object itself is top-level)
                    if ($c === obj) {
                      idCandidate = $c.id || $c.ID || $c.ImgID || $c.ImgId || $c.objectId || $c.ObjectID || $c.textObjectId || $c.textObjectID || $c.name || null
                      if (idCandidate) break
                    }
                    // element identity (useful for custom-rendered images)
                    if ($c._element && obj && obj._element && $c._element === obj._element) {
                      idCandidate = $c.id || $c.ID || $c.ImgID || $c.ImgId || $c.objectId || $c.ObjectID || $c.textObjectId || $c.textObjectID || $c.name || null
                      if (idCandidate) break
                    }
                  } catch (ee) {}
                }
              } catch (eee) {}
            }
          } catch (e) {}
        }
        // Extra fallback: if we still don't have an idCandidate, try matching the clicked
        // object against the editor data images by URL or label. This handles custom
        // images that never received an id property when added.
        if (!idCandidate) {
          try {
            const urlCandidate = obj && (obj.url || obj.src || (obj._element && (obj._element.currentSrc || obj._element.src)) || null)
            const labelCandidate = obj && (obj.ObjectName || obj.label || (obj.text && obj.text.substring?.(0, 40)))
            if (urlCandidate || labelCandidate) {
              const imgs = editorData.images.value || []
              for (const f of imgs) {
                try {
                  const fUrl = f.url || f.thumb || f.src || f.imageUrl || null
                  const fLabel = f.label || f.ObjectName || f.name || null
                  if (urlCandidate && fUrl) {
                    const a = fUrl ? String(fUrl).split("?")[0] : ""
                    const b = urlCandidate ? String(urlCandidate).split("?")[0] : ""
                    if (a && b && (a === b || a.endsWith(b) || b.endsWith(a))) {
                      idCandidate = f.id || f.ID || f.ImgID || f.objectId || f.ObjectID || null
                      label = label || f.label || labelCandidate
                      break
                    }
                  }
                  if (!idCandidate && labelCandidate && fLabel && String(fLabel).trim() === String(labelCandidate).trim()) {
                    idCandidate = f.id || f.ID || f.ImgID || f.objectId || f.ObjectID || null
                    label = label || f.label || labelCandidate
                    break
                  }
                } catch (ee) {}
              }
            }
          } catch (ee) {}
        }
        console.debug("[EditorCanvas] selection:created", { id: idCandidate, label })
        window.dispatchEvent(new CustomEvent("canvas-selection-changed", { detail: { id: idCandidate, label } }))
      })
      inst.on("selection:cleared", (e: any) => {
        console.debug("[EditorCanvas] selection:cleared")
        window.dispatchEvent(new CustomEvent("canvas-selection-changed", { detail: null }))
      })
      inst.on("selection:updated", (e: any) => {
        const obj = e.selected && e.selected.length === 1 ? e.selected[0] : e.target
        let label = obj && (obj.ObjectName || obj.label || (obj.text && obj.text.substring?.(0, 20)))
        let idCandidate = obj?.id || obj?.ID || obj?.ImgID || obj?.ImgId || obj?.objectId || obj?.ObjectID || obj?.textObjectId || obj?.textObjectID || obj?.name || null
        if (!idCandidate) {
          try {
            const parent = (obj as any).group || (obj as any).parent || null
            if (parent) {
              idCandidate = parent.id || parent.ID || parent.ImgID || parent.ImgId || parent.objectId || parent.ObjectID || null
              console.debug("[EditorCanvas] selection:updated parent fallback", { parentId: idCandidate, parentType: parent?.type })
            }
            // additional fallback: search top-level objects by reference/element
            if (!idCandidate && canvas.value) {
              try {
                const objs = canvas.value.getObjects()
                for (const candidate of objs) {
                  try {
                    const $c: any = candidate
                    const children = $c.getObjects ? $c.getObjects() : $c._objects || null
                    if (children && Array.isArray(children) && children.includes(obj)) {
                      idCandidate = $c.id || $c.ID || $c.ImgID || $c.ImgId || $c.objectId || $c.ObjectID || $c.textObjectId || $c.textObjectID || $c.name || null
                      if (idCandidate) break
                    }
                    if ($c === obj) {
                      idCandidate = $c.id || $c.ID || $c.ImgID || $c.ImgId || $c.objectId || $c.ObjectID || $c.textObjectId || $c.textObjectID || $c.name || null
                      if (idCandidate) break
                    }
                    if ($c._element && obj && obj._element && $c._element === obj._element) {
                      idCandidate = $c.id || $c.ID || $c.ImgID || $c.ImgId || $c.objectId || $c.ObjectID || $c.textObjectId || $c.textObjectID || $c.name || null
                      if (idCandidate) break
                    }
                  } catch (ee) {}
                }
              } catch (eee) {}
            }
            // Extra fallback: if still no idCandidate, try matching active object against editorData images by URL or label
            if (!idCandidate) {
              try {
                const urlCandidate = obj && (obj.url || obj.src || (obj._element && (obj._element.currentSrc || obj._element.src)) || null)
                const labelCandidate = obj && (obj.ObjectName || obj.label || (obj.text && obj.text.substring?.(0, 40)))
                if (urlCandidate || labelCandidate) {
                  const imgs = editorData.images.value || []
                  for (const f of imgs) {
                    try {
                      const fUrl = f.url || f.thumb || f.src || f.imageUrl || null
                      const fLabel = f.label || f.ObjectName || f.name || null
                      if (urlCandidate && fUrl) {
                        const a = fUrl ? String(fUrl).split("?")[0] : ""
                        const b = urlCandidate ? String(urlCandidate).split("?")[0] : ""
                        if (a && b && (a === b || a.endsWith(b) || b.endsWith(a))) {
                          idCandidate = f.id || f.ID || f.ImgID || f.objectId || f.ObjectID || null
                          label = label || f.label || labelCandidate
                          break
                        }
                      }
                      if (!idCandidate && labelCandidate && fLabel && String(fLabel).trim() === String(labelCandidate).trim()) {
                        idCandidate = f.id || f.ID || f.ImgID || f.objectId || f.ObjectID || null
                        label = label || f.label || labelCandidate
                        break
                      }
                    } catch (ee) {}
                  }
                }
              } catch (ee) {}
            }
          } catch (e) {}
        }
        console.debug("[EditorCanvas] selection:updated", { id: idCandidate, label })
        window.dispatchEvent(new CustomEvent("canvas-selection-changed", { detail: { id: idCandidate, label } }))
      })
      // Track object transform lifecycle so we record history only for real changes
      inst.on("object:scaling", (e: any) => {
        try {
          recordPreState()
        } catch (e) {}
      })
      inst.on("object:rotating", (e: any) => {
        try {
          recordPreState()
        } catch (e) {}
      })
      inst.on("object:moving", (e: any) => {
        try {
          recordPreState()
        } catch (e) {}
      })
      inst.on("object:modified", (e: any) => {
        try {
          // push the post-state into history (pre-state was recorded on start)
          pushHistory()
        } catch (e) {}
      })
      // Configure newly added objects to match current edit mode
      inst.on("object:added", (e: any) => {
        try {
          const o = e.target
          configureObject(o)
          // Propagate canonical id-like fields from container/group to immediate children.
          // This ensures clicks on inner child objects will still yield the parent's ID
          // which the sidebar expects (legacy app used group-level IDs).
          try {
            const propagateKeys = ["id", "ID", "ImgID", "ImgId", "objectId", "ObjectID", "textObjectId", "textObjectID"]
            const getChildren = (obj: any) => (obj && typeof obj.getObjects === "function" ? obj.getObjects() : obj && obj._objects ? obj._objects : null)
            const children = getChildren(o)
            if (children && Array.isArray(children) && children.length > 0) {
              for (const child of children) {
                try {
                  for (const k of propagateKeys) {
                    try {
                      if ((o as any)[k] !== undefined && (o as any)[k] !== null && ((child as any)[k] === undefined || (child as any)[k] === null)) {
                        ;(child as any)[k] = (o as any)[k]
                      }
                    } catch (ee) {}
                  }
                  if (typeof child.setCoords === "function") child.setCoords()
                } catch (ee) {}
              }
            }
          } catch (ee) {}
        } catch (e) {}
      })
    } catch (e) {
      console.warn("failed to attach selection events", e)
    }
    // set initial edit mode state
    currentEditMode = editorData.advMode.value
    try {
      inst.getObjects().forEach(configureObject)
    } catch (e) {}
  }
})

// Allow parent to set object properties on the active object
function setActiveProp(prop: string, value: any) {
  if (!canvas.value) return
  const active = canvas.value.getActiveObject()
  if (!active) return
  try {
    // Check for no-op: if the active object's prop already equals the requested value, skip
    let currentVal: any
    try {
      currentVal = typeof active.get === "function" ? active.get(prop) : (active as any)[prop]
    } catch (e) {
      currentVal = (active as any)[prop]
    }
    const same = JSON.stringify(currentVal) === JSON.stringify(value)
    if (same) return
    // record pre-state only for meaningful changes
    recordPreState()
    // Some fabric/textbox objects may require using set or direct assignment
    try {
      active.set(prop, value)
    } catch (e) {
      try {
        ;(active as any)[prop] = value
      } catch (e2) {}
    }
    if (typeof active.setCoords === "function") active.setCoords()
    canvas.value.requestRenderAll()
    // record history after property change
    pushHistory()
  } catch (e) {
    console.warn("setActiveProp failed", e)
  }
}

function getActiveProp(prop: string) {
  if (!canvas.value) return undefined
  const active = canvas.value.getActiveObject()
  if (!active) return undefined
  try {
    if (typeof active.get === "function") return active.get(prop)
    return (active as any)[prop]
  } catch (e) {
    return undefined
  }
}

function removeActiveObject() {
  if (!canvas.value) return
  try {
    const active = canvas.value.getActiveObject()
    if (!active) return
    canvas.value.remove(active)
    canvas.value.discardActiveObject()
    canvas.value.requestRenderAll()
    // record history for undo after deletion
    pushHistory()
  } catch (e) {
    console.warn("removeActiveObject failed", e)
  }
}

function bringForward() {
  if (!canvas.value) return
  try {
    const active = canvas.value.getActiveObject()
    if (!active) return
    const objs = canvas.value.getObjects()
    const idx = objs.indexOf(active)
    if (idx >= 0 && idx < objs.length - 1) (canvas.value as any).moveTo(active, idx + 1)
    canvas.value.requestRenderAll()
  } catch (e) {
    console.warn("bringForward failed", e)
  }
}

function sendBackward() {
  if (!canvas.value) return
  try {
    const active = canvas.value.getActiveObject()
    if (!active) return
    const objs = canvas.value.getObjects()
    const idx = objs.indexOf(active)
    if (idx > 0) (canvas.value as any).moveTo(active, idx - 1)
    canvas.value.requestRenderAll()
  } catch (e) {
    console.warn("sendBackward failed", e)
  }
}

function bringToFront() {
  if (!canvas.value) return
  try {
    const active = canvas.value.getActiveObject()
    if (!active) return
    const objs = canvas.value.getObjects()
    ;(canvas.value as any).moveTo(active, objs.length - 1)
    canvas.value.requestRenderAll()
  } catch (e) {
    console.warn("bringToFront failed", e)
  }
}

function sendToBack() {
  if (!canvas.value) return
  try {
    const active = canvas.value.getActiveObject()
    if (!active) return
    ;(canvas.value as any).moveTo(active, 0)
    canvas.value.requestRenderAll()
  } catch (e) {
    console.warn("sendToBack failed", e)
  }
}

function setEditMode(mode: boolean) {
  // When edit mode disabled, make objects non-selectable except legacy editable ones
  if (!canvas.value) return
  // Keep objects selectable so clicking still selects and shows bounding box.
  // When mode is false, lock transforms to prevent move/resize/rotation.
  canvas.value.selection = !!mode // group selection only when advanced mode
  currentEditMode = !!mode
  canvas.value.getObjects().forEach((o: any) => {
    try {
      if (typeof o.selectable !== "undefined") o.selectable = true
      o.evented = true
      if (!mode) {
        o.lockMovementX = true
        o.lockMovementY = true
        o.lockScalingX = true
        o.lockScalingY = true
        o.lockRotation = true
        // Hide control handles but keep border for selection
        o.hasControls = false
        o.hasBorders = true
        o.hasRotatingPoint = false
      } else {
        o.lockMovementX = false
        o.lockMovementY = false
        o.lockScalingX = false
        o.lockScalingY = false
        o.lockRotation = false
        // Restore controls
        o.hasControls = true
        o.hasBorders = true
        o.hasRotatingPoint = true
      }
      if (typeof o.setCoords === "function") o.setCoords()
    } catch (e) {
      // ignore per-object errors
    }
  })
  canvas.value.requestRenderAll()
}

function findObjectById(id: string) {
  if (!canvas.value) return null
  const objs = canvas.value.getObjects()
  // Search top-level objects and, if necessary, their children (groups)
  for (const o of objs) {
    if (!o) continue
    const $o: any = o
    const candidates = [$o.id, $o.ID, $o.ImgID, $o.ImgId, $o.textObjectId, $o.textObjectID, $o.objectId, $o.ObjectID, $o.name]
    if (candidates.some((c) => c !== undefined && c !== null && String(c) === String(id))) return o
    // If the object is a group, check its elements
    try {
      const children = $o.getObjects ? $o.getObjects() : null
      if (children && Array.isArray(children)) {
        for (const c of children) {
          const $c: any = c
          const ccands = [$c.id, $c.ID, $c.ImgID, $c.ImgId, $c.textObjectId, $c.textObjectID, $c.objectId, $c.ObjectID, $c.name]
          if (ccands.some((x) => x !== undefined && x !== null && String(x) === String(id))) return o
        }
      }
    } catch (e) {}
  }
  return null
}

function selectObjectByID(id: string) {
  if (!canvas.value) return
  const obj = findObjectById(id)
  if (!obj) return
  try {
    canvas.value.setActiveObject(obj)
    canvas.value.requestRenderAll()
    const label = (obj as any).ObjectName || (obj as any).label || obj.type || ((obj as any).text ? String((obj as any).text).slice(0, 40) : "Object")
    const emittedId = (obj as any).id || (obj as any).ID || (obj as any).ImgID || id
    window.dispatchEvent(new CustomEvent("canvas-selection-changed", { detail: { id: emittedId, label } }))
  } catch (e) {
    console.warn("selectObjectByID failed", e)
  }
}

function setActiveTextEditing(id: string) {
  if (!canvas.value) return
  const obj = findObjectById(id)
  if (!obj) return
  try {
    canvas.value.setActiveObject(obj)
    // Try built-in editing entry points used by Fabric textboxes
    if (typeof (obj as any).enterEditing === "function") {
      ;(obj as any).enterEditing()
    } else if (typeof (obj as any).startEditing === "function") {
      ;(obj as any).startEditing()
    } else if (typeof (obj as any).isEditing !== "undefined") {
      ;(obj as any).isEditing = true
    }
    if (typeof (obj as any).initDimensions === "function") (obj as any).initDimensions()
    if (typeof (obj as any).setCoords === "function") (obj as any).setCoords()
    canvas.value.requestRenderAll()
    const label = (obj as any).ObjectName || (obj as any).label || obj.type || ((obj as any).text ? String((obj as any).text).slice(0, 40) : "Object")
    window.dispatchEvent(new CustomEvent("canvas-selection-changed", { detail: { id: id, label } }))
  } catch (e) {
    console.warn("setActiveTextEditing failed", e)
  }
}

// Expose simple accessors for parent component
function getActiveObject() {
  try {
    return canvas.value?.getActiveObject?.() ?? null
  } catch (e) {
    return null
  }
}

function getActiveObjects() {
  try {
    return typeof canvas.value?.getActiveObjects === "function" ? canvas.value!.getActiveObjects() : []
  } catch (e) {
    return []
  }
}

// Expose methods for parent (EditorRoot) to call

defineExpose({
  clearCanvas,
  loadBackgroundImage,
  resetZoomTo100,
  addText,
  addImage,
  replaceImage,
  addShape,
  addCoupon,
  updateText,
  zoomIn,
  zoomOut,
  zoomFit,
  setActiveProp,
  getActiveProp,
  getActiveObject,
  getActiveObjects,
  removeActiveObject,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  setEditMode,
  selectObjectByID,
  setActiveTextEditing,
  undo,
  redo,
  pushHistory,
  // history control helpers
  beginHistorySuppress,
  endHistorySuppress,
  initHistorySnapshot,
})
</script>
