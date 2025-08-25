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
import { useLexAppConfig } from "../composables/useLexAppConfig"
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

// Create a persistent debug button so users can always trigger a diagnostic
// dump manually. This is a temporary aid for troubleshooting and can be
// removed after the issue is resolved.
function ensureDebugButton() {
  if (typeof window === "undefined" || typeof document === "undefined") return
  try {
    if (document.getElementById("editorcanvas-debug-dump-btn")) return
    const btn = document.createElement("button")
    btn.id = "editorcanvas-debug-dump-btn"
    btn.textContent = "Canvas Diag"
    btn.title = "Click to download canvas diagnostic (temporary)"
    btn.style.position = "fixed"
    btn.style.right = "220px"
    btn.style.bottom = "12px"
    btn.style.zIndex = "2147483646"
    btn.style.background = "#111827"
    btn.style.color = "#fff"
    btn.style.padding = "8px 10px"
    btn.style.borderRadius = "6px"
    btn.style.border = "none"
    btn.style.cursor = "pointer"
    btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)"
    btn.style.fontSize = "12px"
    btn.addEventListener("click", (ev) => {
      ev.preventDefault()
      try {
        const bad = (window as any).__badCanvasObjects || []
        const snap = captureSnapshot()
        const payload = { when: Date.now(), badObjects: bad, snapshot: snap }
        const j = JSON.stringify(payload, null, 2)
        try {
          const blob = new Blob([j], { type: "application/json" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `editor-canvas-diag-${Date.now()}.json`
          document.body.appendChild(a)
          a.click()
          try {
            document.body.removeChild(a)
          } catch (e) {}
          try {
            URL.revokeObjectURL(url)
          } catch (e) {}
          return
        } catch (e) {}
        // fallback: open in new window for manual copy
        try {
          const w = window.open("", "_blank")
          if (w) {
            w.document.open()
            w.document.write(`<pre>${j.replace(/</g, "&lt;")}</pre>`)
            w.document.close()
          }
        } catch (ee) {}
      } catch (e) {
        try {
          alert("Failed to create diagnostic dump")
        } catch (ee) {}
      }
    })
    document.body.appendChild(btn)
  } catch (e) {}
}

// Ensure debug button is available immediately (script setup runs on mount)
try {
  if (typeof window !== "undefined") {
    // Defer slightly to avoid interfering with other onMounted work
    setTimeout(() => {
      try {
        ensureDebugButton()
      } catch (e) {}
    }, 500)
  }
} catch (e) {}

// Ensure all objects on the canvas are valid Fabric objects. If an object
// appears to be invalid (missing render), attempt to repair it by creating
// a Fabric.Image from its underlying element (_element) or remove it.
function ensureValidFabricObjects() {
  if (!canvas.value) return
  try {
    const objs = canvas.value.getObjects().slice()
    for (let i = 0; i < objs.length; i++) {
      const o: any = objs[i]
      try {
        if (!o || typeof o.render !== "function") {
          // try to repair via element backing
          const el = o && (o._element || o.element || null)
          if (el) {
            try {
              const opts: any = {
                left: typeof o.left === "number" ? o.left : 0,
                top: typeof o.top === "number" ? o.top : 0,
                originX: o.originX || "left",
                originY: o.originY || "top",
                selectable: typeof o.selectable === "boolean" ? o.selectable : true,
                objectCaching: false,
              }
              if (typeof o.width === "number") opts.width = o.width
              if (typeof o.height === "number") opts.height = o.height
              const imgObj: any = new Image(el, opts)
              // copy canonical ids/metadata
              try {
                const keys = ["id", "ID", "ImgID", "ImgId", "objectId", "ObjectID", "label", "ObjectName", "name"]
                for (const k of keys) {
                  if ((o as any)[k] !== undefined && (imgObj as any)[k] === undefined) (imgObj as any)[k] = (o as any)[k]
                }
              } catch (ee) {}
              // swap in place
              try {
                const idx = canvas.value.getObjects().indexOf(o)
                if (idx >= 0) {
                  canvas.value.remove(o)
                  ;(canvas.value as any).insertAt(imgObj, idx)
                } else {
                  canvas.value.remove(o)
                  canvas.value.add(imgObj)
                }
                configureObject(imgObj)
                continue
              } catch (ee) {
                // failed to insert, fallthrough to remove
              }
            } catch (ee) {}
          }
          // If we couldn't repair, remove the invalid object
          try {
            canvas.value.remove(o)
          } catch (ee) {}
        }
      } catch (e) {}
    }
  } catch (e) {}
}

// Aggressively remove any canvas objects that clearly aren't Fabric objects
// (lack a render function). This is used immediately before replace/remove
// operations to avoid Fabric attempting to render invalid entries.
function removeInvalidObjectsNow() {
  if (!canvas.value) return
  try {
    // Temporarily disable Fabric's automatic render-on-add/remove so we can
    // remove multiple invalid objects without triggering an internal render
    // while the canvas is in an inconsistent state.
    let prevRenderOnAddRemove: any = true
    try {
      prevRenderOnAddRemove = (canvas.value as any).renderOnAddRemove
    } catch (e) {}
    try {
      ;(canvas.value as any).renderOnAddRemove = false
    } catch (e) {}
    const objs = canvas.value.getObjects().slice()
    for (const o of objs) {
      try {
        if (!o || typeof (o as any).render !== "function") {
          try {
            // Build a small diagnostic snapshot of the offending object
            const diag: any = {}
            try {
              diag.ctor = o && o.constructor ? o.constructor.name || String(o.constructor) : null
            } catch (e) {}
            try {
              diag.keys = Object.keys(o || {}).slice(0, 200)
            } catch (e) {
              diag.keys = []
            }
            try {
              diag.id = (o && ((o as any).id || (o as any).ID || (o as any).ImgID || (o as any).objectId || (o as any).ObjectID)) || null
            } catch (e) {}
            try {
              diag.url = (o && ((o as any).url || (o as any).src || ((o as any)._element && (o as any)._element?.src))) || null
            } catch (e) {}
            try {
              diag.type = (o && ((o as any).type || (o as any).ObjectType)) || null
            } catch (e) {}
            try {
              diag.dim = {
                w: (o && ((o as any).width || ((o as any).getScaledWidth && (o as any).getScaledWidth && (o as any).getScaledWidth()) || (o as any).width)) || null,
                h: (o && ((o as any).height || ((o as any).getScaledHeight && (o as any).getScaledHeight && (o as any).getScaledHeight()) || (o as any).height)) || null,
              }
            } catch (e) {}
            try {
              diag.pos = { left: (o && (o as any).left) || null, top: (o && (o as any).top) || null }
            } catch (e) {}
            try {
              // store shallow snapshot for later inspection in console
              if (typeof window !== "undefined") {
                ;(window as any).__badCanvasObjects = (window as any).__badCanvasObjects || []
                ;(window as any).__badCanvasObjects.push({ when: Date.now(), diag })
              }
            } catch (e) {}
            console.warn("[EditorCanvas] removeInvalidObjectsNow removing invalid object", diag, o)
            try {
              // Attempt to create a downloadable JSON file with the diagnostic
              const payload = { when: Date.now(), diag }
              const j = JSON.stringify(payload, null, 2)
              let downloadAttempted = false
              try {
                const blob = new Blob([j], { type: "application/json" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `bad-canvas-${Date.now()}.json`
                // must be added to DOM for some browsers
                a.style.display = "none"
                document.body.appendChild(a)
                a.click()
                downloadAttempted = true
                setTimeout(() => {
                  try {
                    document.body.removeChild(a)
                  } catch (e) {}
                  try {
                    URL.revokeObjectURL(url)
                  } catch (e) {}
                }, 5000)
              } catch (ee) {
                downloadAttempted = false
              }
              // Try to copy to clipboard as a convenience (may require permission)
              try {
                if (navigator && typeof navigator.clipboard?.writeText === "function") {
                  navigator.clipboard.writeText(j).catch(() => {})
                }
              } catch (ee) {}
              // If automatic download didn't run (blocked), persist to localStorage and
              // render a small on-screen banner with a manual download link.
              if (!downloadAttempted) {
                try {
                  const key = `badCanvasDiag-${Date.now()}`
                  try {
                    localStorage.setItem(key, j)
                  } catch (e) {}
                  // create a banner with a manual download link and copy button
                  const existing = document.getElementById("bad-canvas-dump")
                  if (existing) {
                    try {
                      existing.remove()
                    } catch (e) {}
                  }
                  const banner = document.createElement("div")
                  banner.id = "bad-canvas-dump"
                  banner.style.position = "fixed"
                  banner.style.right = "12px"
                  banner.style.top = "12px"
                  banner.style.zIndex = "2147483647"
                  banner.style.background = "rgba(0,0,0,0.8)"
                  banner.style.color = "white"
                  banner.style.padding = "10px"
                  banner.style.borderRadius = "6px"
                  banner.style.fontSize = "12px"
                  banner.style.maxWidth = "420px"
                  banner.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)"
                  banner.innerHTML = `Diagnostic saved locally. <a id="bad-canvas-download" href="#" style="color:#9be7ff;">Download JSON</a> • <a id="bad-canvas-copy" href="#" style="color:#9be7ff;">Copy JSON</a> • <a id="bad-canvas-close" href="#" style="color:#ffb3b3;">Close</a>`
                  document.body.appendChild(banner)
                  const downloadLink = document.getElementById("bad-canvas-download")
                  const copyLink = document.getElementById("bad-canvas-copy")
                  const closeLink = document.getElementById("bad-canvas-close")
                  if (downloadLink) {
                    downloadLink.addEventListener("click", (ev) => {
                      ev.preventDefault()
                      try {
                        const blob = new Blob([j], { type: "application/json" })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `${key}.json`
                        document.body.appendChild(a)
                        a.click()
                        try {
                          document.body.removeChild(a)
                        } catch (e) {}
                        try {
                          URL.revokeObjectURL(url)
                        } catch (e) {}
                      } catch (e) {}
                    })
                  }
                  if (copyLink) {
                    copyLink.addEventListener("click", (ev) => {
                      ev.preventDefault()
                      try {
                        if (navigator && typeof navigator.clipboard?.writeText === "function") {
                          navigator.clipboard.writeText(j).catch(() => alert("Clipboard copy failed"))
                        } else {
                          // fallback: open a new window with the JSON so user can copy manually
                          const w = window.open("", "_blank")
                          if (w) {
                            w.document.open()
                            w.document.write(`<pre>${j.replace(/</g, "&lt;")}</pre>`)
                            w.document.close()
                          }
                        }
                      } catch (ee) {}
                    })
                  }
                  if (closeLink) {
                    closeLink.addEventListener("click", (ev) => {
                      ev.preventDefault()
                      try {
                        banner.remove()
                      } catch (e) {}
                    })
                  }
                } catch (eee) {}
              }
            } catch (ee) {
              // ignore download/fallback failures entirely
            }
          } catch (ee) {
            console.warn("[EditorCanvas] removeInvalidObjectsNow encountered error while diagnosing object", ee)
          }
          try {
            canvas.value.remove(o)
          } catch (ee) {}
        }
      } catch (ee) {}
    }
    // restore the previous renderOnAddRemove setting
    try {
      ;(canvas.value as any).renderOnAddRemove = prevRenderOnAddRemove
    } catch (e) {}
    // schedule a safe render to refresh the canvas after purge
    try {
      safeRequestRenderAll()
    } catch (e) {}
  } catch (e) {}
}

// Try rendering the canvas safely; if a render error occurs, attempt to repair
// invalid objects and retry once.
async function safeRequestRenderAll() {
  if (!canvas.value) return
  try {
    // sometimes fabric throws during render if invalid objects exist
    try {
      canvas.value.requestRenderAll()
      return
    } catch (e) {
      console.warn("[EditorCanvas] requestRenderAll failed, attempting to repair canvas objects", e)
    }
    // attempt repair then retry
    try {
      ensureValidFabricObjects()
    } catch (ee) {
      console.warn("[EditorCanvas] ensureValidFabricObjects failed", ee)
    }
    try {
      canvas.value.requestRenderAll()
    } catch (e2) {
      console.error("[EditorCanvas] requestRenderAll still failing after repair", e2)
      // Enhanced diagnostic: inspect each canvas object for render problems
      try {
        const objs = canvas.value.getObjects().slice()
        const details: any[] = []
        for (let i = 0; i < objs.length; i++) {
          const o: any = objs[i]
          try {
            const info: any = { index: i }
            try {
              info.ctor = o && o.constructor ? o.constructor.name || String(o.constructor) : null
            } catch (e) {
              info.ctor = null
            }
            try {
              info.hasRender = !!(o && typeof o.render === "function")
            } catch (e) {
              info.hasRender = false
            }
            try {
              info.renderType = o && o.render ? typeof o.render : null
            } catch (e) {
              info.renderType = null
            }
            try {
              info.keys = Object.keys(o || {}).slice(0, 200)
            } catch (e) {
              info.keys = []
            }
            try {
              info.id = (o && (o.id || o.ID || o.ImgID || o.ImgId || o.objectId || o.ObjectID || o.textObjectId || o.textObjectID)) || null
            } catch (e) {
              info.id = null
            }
            try {
              info.url = (o && (o.url || o.src || (o._element && (o._element.currentSrc || o._element.src)))) || null
            } catch (e) {
              info.url = null
            }
            try {
              info.type = (o && (o.type || o.ObjectType)) || null
            } catch (e) {
              info.type = null
            }
            try {
              info.pos = { left: (o && o.left) || null, top: (o && o.top) || null }
            } catch (e) {
              info.pos = null
            }
            try {
              info.dim = {
                w: (o && (o.width || (o.getScaledWidth && o.getScaledWidth && o.getScaledWidth()) || null)) || null,
                h: (o && (o.height || (o.getScaledHeight && o.getScaledHeight && o.getScaledHeight()) || null)) || null,
              }
            } catch (e) {
              info.dim = null
            }
            details.push(info)
          } catch (ee) {}
        }
        const payload = { when: Date.now(), error: String(e2), details }
        try {
          ;(window as any).__badCanvasObjects = (window as any).__badCanvasObjects || []
          ;(window as any).__badCanvasObjects.push(payload)
        } catch (eee) {}
        try {
          const j = JSON.stringify(payload, null, 2)
          // attempt immediate download
          try {
            const blob = new Blob([j], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `bad-canvas-render-${Date.now()}.json`
            a.style.display = "none"
            document.body.appendChild(a)
            a.click()
            setTimeout(() => {
              try {
                document.body.removeChild(a)
              } catch (e) {}
              try {
                URL.revokeObjectURL(url)
              } catch (e) {}
            }, 3000)
          } catch (ee) {
            // fallback: persist to localStorage and show banner
            try {
              const key = `badCanvasRender-${Date.now()}`
              try {
                localStorage.setItem(key, j)
              } catch (e) {}
              const existing = document.getElementById("bad-canvas-dump")
              if (existing)
                try {
                  existing.remove()
                } catch (e) {}
              const banner = document.createElement("div")
              banner.id = "bad-canvas-dump"
              banner.style.position = "fixed"
              banner.style.right = "12px"
              banner.style.top = "12px"
              banner.style.zIndex = "2147483647"
              banner.style.background = "rgba(0,0,0,0.8)"
              banner.style.color = "white"
              banner.style.padding = "10px"
              banner.style.borderRadius = "6px"
              banner.style.fontSize = "12px"
              banner.style.maxWidth = "420px"
              banner.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)"
              banner.innerHTML = `Render diagnostic saved locally. <a id="bad-canvas-download" href="#" style="color:#9be7ff;">Download JSON</a> • <a id="bad-canvas-copy" href="#" style="color:#9be7ff;">Copy JSON</a> • <a id="bad-canvas-close" href="#" style="color:#ffb3b3;">Close</a>`
              document.body.appendChild(banner)
              const downloadLink = document.getElementById("bad-canvas-download")
              const copyLink = document.getElementById("bad-canvas-copy")
              const closeLink = document.getElementById("bad-canvas-close")
              if (downloadLink) {
                downloadLink.addEventListener("click", (ev) => {
                  ev.preventDefault()
                  try {
                    const blob = new Blob([j], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `${key}.json`
                    document.body.appendChild(a)
                    a.click()
                    try {
                      document.body.removeChild(a)
                    } catch (e) {}
                    try {
                      URL.revokeObjectURL(url)
                    } catch (e) {}
                  } catch (e) {}
                })
              }
              if (copyLink) {
                copyLink.addEventListener("click", (ev) => {
                  ev.preventDefault()
                  try {
                    if (navigator && typeof navigator.clipboard?.writeText === "function") {
                      navigator.clipboard.writeText(j).catch(() => alert("Clipboard copy failed"))
                    } else {
                      const w = window.open("", "_blank")
                      if (w) {
                        w.document.open()
                        w.document.write(`<pre>${j.replace(/</g, "&lt;")}</pre>`)
                        w.document.close()
                      }
                    }
                  } catch (ee) {}
                })
              }
              if (closeLink) {
                closeLink.addEventListener("click", (ev) => {
                  ev.preventDefault()
                  try {
                    banner.remove()
                  } catch (e) {}
                })
              }
            } catch (eee) {}
          }
        } catch (eee) {}
      } catch (eee) {
        console.error("[EditorCanvas] failed to produce render diagnostics", e2, eee)
      }
    }
  } catch (e) {
    console.error("[EditorCanvas] safeRequestRenderAll unexpected error", e)
  }
}

// Force a delayed render and offset recalculation to work around cases where
// Fabric's immediate render misses newly-inserted objects (helps when UI
// updates only after switching views). This is a small, temporary workaround.
function delayedRender(ms = 80) {
  try {
    setTimeout(() => {
      try {
        if (!canvas.value) return
        try {
          if (typeof (canvas.value as any).calcOffset === "function") (canvas.value as any).calcOffset()
        } catch (e) {}
        try {
          if (typeof (canvas.value as any).renderAll === "function") (canvas.value as any).renderAll()
        } catch (e) {}
        try {
          if (typeof (canvas.value as any).requestRenderAll === "function") (canvas.value as any).requestRenderAll()
        } catch (e) {}
      } catch (ee) {}
    }, ms)
  } catch (e) {}
}

// Ensure the given object is visible, has updated coords, and trigger both
// immediate and delayed renders to avoid cases where the object is present
// but not yet painted to the canvas (workaround for subtle Fabric timing
// issues after async image creation).
function ensureVisibleAndRender(o: any) {
  try {
    if (!canvas.value || !o) return
    try {
      if (typeof o.setCoords === "function") o.setCoords()
    } catch (e) {}
    try {
      o.visible = true
    } catch (e) {}
    try {
      o.dirty = true
    } catch (e) {}
    try {
      if (typeof (canvas.value as any).calcOffset === "function") (canvas.value as any).calcOffset()
    } catch (e) {}
    try {
      if (typeof (canvas.value as any).requestRenderAll === "function") canvas.value.requestRenderAll()
    } catch (e) {}
    try {
      if (typeof (canvas.value as any).renderAll === "function") (canvas.value as any).renderAll()
    } catch (e) {}
    try {
      delayedRender(60)
    } catch (e) {}
  } catch (e) {}
}

// Copy visual transform and placement from src to dst so a recreated image
// matches the original object's size, scale, rotation and position.
function copyTransform(src: any, dst: any) {
  try {
    if (!src || !dst) return
    // basic positional and visual properties
    const toSet: any = {}
    try {
      if (typeof src.left === "number") toSet.left = src.left
    } catch (e) {}
    try {
      if (typeof src.top === "number") toSet.top = src.top
    } catch (e) {}
    try {
      if (src.angle !== undefined) toSet.angle = src.angle
    } catch (e) {}
    try {
      if (src.flipX !== undefined) toSet.flipX = src.flipX
    } catch (e) {}
    try {
      if (src.flipY !== undefined) toSet.flipY = src.flipY
    } catch (e) {}
    try {
      if (src.originX !== undefined) toSet.originX = src.originX
    } catch (e) {}
    try {
      if (src.originY !== undefined) toSet.originY = src.originY
    } catch (e) {}
    try {
      if (src.opacity !== undefined) toSet.opacity = src.opacity
    } catch (e) {}

    // If source exposes scaled dimensions, compute the scaleX/Y required for dst
    try {
      const srcScaledW = typeof src.getScaledWidth === "function" ? src.getScaledWidth() : src.width || (src.getScaledWidth && src.getScaledWidth) ? src.getScaledWidth() : null
      const srcScaledH =
        typeof src.getScaledHeight === "function" ? src.getScaledHeight() : src.height || (src.getScaledHeight && src.getScaledHeight) ? src.getScaledHeight() : null
      // destination's natural/intrinsic size
      const dstW = typeof dst.width === "number" ? dst.width : dst.getScaledWidth ? dst.getScaledWidth() : null
      const dstH = typeof dst.height === "number" ? dst.height : dst.getScaledHeight ? dst.getScaledHeight() : null
      if (srcScaledW && srcScaledH && dstW && dstH) {
        try {
          const scaleX = srcScaledW / dstW
          const scaleY = srcScaledH / dstH
          // prefer uniform scale if they are near-equal
          if (Math.abs(scaleX - scaleY) < 0.03) {
            toSet.scaleX = scaleX
            toSet.scaleY = scaleX
          } else {
            toSet.scaleX = scaleX
            toSet.scaleY = scaleY
          }
        } catch (e) {}
      } else {
        // fallback to copying explicit scales if present
        try {
          if (typeof src.scaleX === "number") toSet.scaleX = src.scaleX
        } catch (e) {}
        try {
          if (typeof src.scaleY === "number") toSet.scaleY = src.scaleY
        } catch (e) {}
      }
    } catch (e) {}

    // prefer explicit width/height if available (these apply to fabric objects)
    try {
      if (src.width !== undefined) toSet.width = src.width
    } catch (e) {}
    try {
      if (src.height !== undefined) toSet.height = src.height
    } catch (e) {}

    try {
      if (Object.keys(toSet).length > 0 && typeof dst.set === "function") dst.set(toSet)
    } catch (e) {}
    try {
      if (typeof dst.setCoords === "function") dst.setCoords()
    } catch (e) {}
  } catch (e) {}
}

// Ensure a freshly-inserted Fabric image has real pixel content by loading
// the remote image into an HTMLImageElement and applying it to the Fabric
// object (via setElement or _element). This fixes cases where the object's
// placeholder dimensions are correct but the internal element is empty.
async function finalizeInsertedImage(newObj: any, finalUrl: string, imgID?: any, originalObj?: any) {
  try {
    if (!canvas.value || !newObj || !finalUrl) return
    const ctorName = newObj && newObj.constructor ? String(newObj.constructor.name || "") : ""
    const looksLikeImage = newObj.type === "image" || ctorName.toLowerCase().includes("image") || typeof newObj.setElement === "function"
    if (!looksLikeImage) return

    // If already has element, check if it truly matches the desired pixel backing.
    // If it doesn't (intrinsic size or scale mismatch), fall through and replace it;
    // otherwise update metadata and return early.
    try {
      const existingEl = (newObj as any)._element || (newObj.getElement && newObj.getElement && newObj.getElement())
      if (existingEl) {
        try {
          if (!(newObj as any).src) (newObj as any).src = finalUrl
        } catch (e) {}
        try {
          if (!(newObj as any).url) (newObj as any).url = finalUrl
        } catch (e) {}
        // compute target rendered pixel size (best-effort)
        let targetW: number | null = null
        let targetH: number | null = null
        try {
          if (originalObj && typeof originalObj.getScaledWidth === "function") targetW = originalObj.getScaledWidth()
        } catch (e) {}
        try {
          if (originalObj && typeof originalObj.getScaledHeight === "function") targetH = originalObj.getScaledHeight()
        } catch (e) {}
        try {
          if ((targetW === null || targetH === null) && typeof newObj.getScaledWidth === "function") {
            if (targetW === null) targetW = newObj.getScaledWidth()
            if (targetH === null) targetH = newObj.getScaledHeight()
          }
        } catch (e) {}
        try {
          if (targetW === null && typeof newObj.width === "number") targetW = newObj.width
        } catch (e) {}
        try {
          if (targetH === null && typeof newObj.height === "number") targetH = newObj.height
        } catch (e) {}

        // determine existing element intrinsic size if available
        let existingW: number | null = null
        let existingH: number | null = null
        try {
          existingW = existingEl.naturalWidth || existingEl.width || null
        } catch (e) {}
        try {
          existingH = existingEl.naturalHeight || existingEl.height || null
        } catch (e) {}

        // determine current object scale
        const curScaleX = typeof newObj.scaleX === "number" ? newObj.scaleX : 1
        const curScaleY = typeof newObj.scaleY === "number" ? newObj.scaleY : 1

        // if existing intrinsic size equals target and object scale is ~1, we're good
        try {
          const nearlyEqual = (a: number | null, b: number | null) =>
            (a === null && b === null) || (typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= Math.max(1, Math.round(b * 0.03)))
          if (nearlyEqual(existingW, targetW) && nearlyEqual(existingH, targetH) && Math.abs(curScaleX - 1) < 0.03 && Math.abs(curScaleY - 1) < 0.03) {
            try {
              if (typeof newObj.setCoords === "function") newObj.setCoords()
            } catch (e) {}
            try {
              ensureVisibleAndRender(newObj)
            } catch (e) {}
            return
          }
        } catch (e) {}
        // otherwise fall through to replace the element backing so it matches target
      }
    } catch (e) {}

    // Load HTML image and draw into an offscreen canvas sized to the target
    await new Promise<void>((resolve) => {
      try {
        const imgEl = new (window as any).Image()
        imgEl.crossOrigin = "anonymous"
        let done = false
        const fin = () => {
          if (!done) {
            done = true
            resolve()
          }
        }
        imgEl.onload = () => {
          try {
            // determine target pixel size (prefer original object's rendered size)
            let targetW: number | null = null
            let targetH: number | null = null
            try {
              if (originalObj && typeof originalObj.getScaledWidth === "function") targetW = originalObj.getScaledWidth()
            } catch (e) {}
            try {
              if (originalObj && typeof originalObj.getScaledHeight === "function") targetH = originalObj.getScaledHeight()
            } catch (e) {}
            try {
              if ((targetW === null || targetH === null) && typeof newObj.getScaledWidth === "function") {
                if (targetW === null) targetW = newObj.getScaledWidth()
                if (targetH === null) targetH = newObj.getScaledHeight()
              }
            } catch (e) {}
            try {
              if (targetW === null && typeof newObj.width === "number") targetW = newObj.width
            } catch (e) {}
            try {
              if (targetH === null && typeof newObj.height === "number") targetH = newObj.height
            } catch (e) {}

            // fallback to natural size if no target available
            if (!targetW) targetW = imgEl.naturalWidth || 1
            if (!targetH) targetH = imgEl.naturalHeight || 1

            try {
              const canvasEl = document.createElement("canvas")
              canvasEl.width = Math.max(1, Math.round(Number(targetW)))
              canvasEl.height = Math.max(1, Math.round(Number(targetH)))
              const ctx = canvasEl.getContext("2d")
              if (ctx) {
                const iw = imgEl.naturalWidth || 1
                const ih = imgEl.naturalHeight || 1
                const scale = Math.max(canvasEl.width / iw, canvasEl.height / ih)
                const sw = Math.round(canvasEl.width / scale)
                const sh = Math.round(canvasEl.height / scale)
                const sx = Math.max(0, Math.round((iw - sw) / 2))
                const sy = Math.max(0, Math.round((ih - sh) / 2))
                try {
                  ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, canvasEl.width, canvasEl.height)
                } catch (e) {}
              }

              try {
                // Apply the offscreen canvas to the existing newObj (or its inner
                // image child) so we don't remove the freshly-inserted object and
                // cause outer code to re-add duplicates. Ensure the intrinsic
                // width/height equal the offscreen canvas and set scale to 1.
                try {
                  let applied = false
                  // If newObj is a group, prefer applying to an inner image-like child
                  if (newObj && typeof newObj.getObjects === "function") {
                    try {
                      const children = newObj.getObjects()
                      for (const c of children) {
                        try {
                          const isImgChild =
                            (c && (c.type === "image" || (c.constructor && String(c.constructor.name).toLowerCase().includes("image")))) ||
                            (c && typeof c.setElement === "function")
                          if (isImgChild) {
                            try {
                              if (typeof c.setElement === "function") {
                                c.setElement(canvasEl)
                              } else {
                                ;(c as any)._element = canvasEl
                              }
                            } catch (e) {}
                            try {
                              if (typeof c.set === "function") {
                                c.set({ width: canvasEl.width, height: canvasEl.height, scaleX: 1, scaleY: 1 })
                              } else {
                                c.width = canvasEl.width
                                c.height = canvasEl.height
                                c.scaleX = 1
                                c.scaleY = 1
                              }
                            } catch (e) {}
                            try {
                              if (typeof c.setCoords === "function") c.setCoords()
                            } catch (e) {}
                            applied = true
                            break
                          }
                        } catch (e) {}
                      }
                      try {
                        ;(newObj as any)._element = canvasEl
                      } catch (e) {}
                    } catch (e) {}
                    try {
                      if (typeof newObj.set === "function") {
                        newObj.set({ width: canvasEl.width, height: canvasEl.height, scaleX: 1, scaleY: 1 })
                      } else {
                        newObj.width = canvasEl.width
                        newObj.height = canvasEl.height
                        newObj.scaleX = 1
                        newObj.scaleY = 1
                      }
                    } catch (e) {}
                    try {
                      if (typeof newObj.setCoords === "function") newObj.setCoords()
                    } catch (e) {}
                  }
                  // attach metadata and request render
                  try {
                    try {
                      ;(newObj as any).src = finalUrl
                    } catch (e) {}
                    try {
                      ;(newObj as any).url = finalUrl
                    } catch (e) {}
                    try {
                      ;(newObj as any).ImgID = imgID
                    } catch (e) {}
                    // also expose the original remote URL on multiple keys so
                    // serialization prefers the remote URL instead of inline data URLs
                    try {
                      ;(newObj as any).ImgFull = finalUrl
                    } catch (e) {}
                    try {
                      ;(newObj as any).imgFull = finalUrl
                    } catch (e) {}
                    try {
                      ;(newObj as any).originalSrc = finalUrl
                    } catch (e) {}
                    try {
                      ;(newObj as any)._origSrc = finalUrl
                    } catch (e) {}
                  } catch (e) {}
                  try {
                    ensureVisibleAndRender(newObj)
                  } catch (e) {}
                } catch (e) {}
              } catch (e) {}
            } catch (e) {}
          } catch (e) {}
          fin()
        }
        imgEl.onerror = fin
        setTimeout(fin, 2500)
        try {
          imgEl.src = finalUrl
        } catch (e) {
          fin()
        }
      } catch (e) {
        resolve()
      }
    })
  } catch (e) {}
}

// If insertion left a duplicate of the original image on the canvas, try
// to locate and remove it. We match by canonical id fields first, then by
// very-close position heuristics to avoid removing unrelated images.
function removeOriginalIfDuplicate(oldObj: any, newObj: any) {
  try {
    if (!canvas.value || !oldObj || !newObj) return
    const idKeys = ["id", "ID", "ImgID", "objectId", "ObjectID"]
    const objsNow = canvas.value.getObjects()
    const oldLeft = typeof oldObj.left === "number" ? oldObj.left : null
    const oldTop = typeof oldObj.top === "number" ? oldObj.top : null
    // Try to resolve which canvas object corresponds to the newly-inserted newObj.
    let newRef: any = null
    try {
      // If newObj has a canonical id, prefer that lookup
      for (const k of idKeys) {
        try {
          const v = newObj && newObj[k]
          if (v !== undefined && v !== null) {
            for (const c of objsNow) {
              try {
                if (c && (c as any)[k] !== undefined && String((c as any)[k]) === String(v)) {
                  newRef = c
                  break
                }
              } catch (e) {}
            }
            if (newRef) break
          }
        } catch (e) {}
      }
      // otherwise, match by src/url + approximate coords/dimensions
      if (!newRef) {
        const getSrc = (x: any) => (x && (x.src || x.url || (x._element && (x._element.currentSrc || x._element.src)))) || null
        const newSrc = getSrc(newObj)
        const newLeft = typeof newObj.left === "number" ? newObj.left : null
        const newTop = typeof newObj.top === "number" ? newObj.top : null
        for (const c of objsNow) {
          try {
            if (!c) continue
            const cSrc = getSrc(c)
            if (newSrc && cSrc && String(newSrc) === String(cSrc)) {
              // check proximity
              if (newLeft !== null && newTop !== null && typeof c.left === "number" && typeof c.top === "number") {
                const dx = Math.abs(c.left - newLeft)
                const dy = Math.abs(c.top - newTop)
                if (dx <= 6 && dy <= 6) {
                  newRef = c
                  break
                }
              } else {
                newRef = c
                break
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    for (let i = objsNow.length - 1; i >= 0; i--) {
      try {
        const c: any = objsNow[i]
        if (!c) continue
        // never remove the resolved newRef
        if (newRef && c === newRef) continue
        // prefer id-match against the old object
        let idMatch = false
        for (const k of idKeys) {
          try {
            if (oldObj && oldObj[k] !== undefined && c && c[k] !== undefined && String(oldObj[k]) === String(c[k])) {
              idMatch = true
              break
            }
          } catch (e) {}
        }
        if (idMatch) {
          try {
            canvas.value.remove(c)
            console.debug("[EditorCanvas] removeOriginalIfDuplicate removed by id", { removed: c, keep: newRef || newObj })
            continue
          } catch (e) {}
        }
        // fallback: if both are images and very close in position to the original, remove it
        try {
          if ((c.type === "image" || (c.constructor && String(c.constructor.name).toLowerCase().includes("image"))) && oldLeft !== null && oldTop !== null) {
            const dx = Math.abs((c.left || 0) - oldLeft)
            const dy = Math.abs((c.top || 0) - oldTop)
            if (dx <= 8 && dy <= 8) {
              // avoid removing the newRef again
              if (newRef && c === newRef) continue
              try {
                canvas.value.remove(c)
                console.debug("[EditorCanvas] removeOriginalIfDuplicate removed by proximity", { removed: c, dx, dy, keep: newRef || newObj })
              } catch (e) {}
            }
          }
        } catch (e) {}
      } catch (e) {}
    }
  } catch (e) {}
}

// Replace an existing image object on the canvas with a new source
async function replaceImage(obj: any, imgID: any, imgFull: string, props?: any) {
  if (!canvas.value || !obj) return
  console.debug("[EditorCanvas] replaceImage called", { objSummary: { ctor: obj?.constructor?.name, id: obj?.id || obj?.ID || obj?.ImgID }, imgID, imgFull, props })
  // Proactively purge obviously-invalid objects to avoid Fabric render crashes
  try {
    removeInvalidObjectsNow()
  } catch (e) {}
  try {
    const appConfig = useLexAppConfig()
    let finalUrl = imgFull
    if (imgFull && !/^https?:\/\//i.test(imgFull) && appConfig?.imgsURL) {
      let url = String(imgFull).replace(/^\/+/, "")
      finalUrl = appConfig.imgsURL + url
    }
    // If the object is a group/container, prefer replacing the inner image child
    // (call setSrc on that child) to match legacy behavior and avoid removing
    // the outer group which can leave the canvas in an inconsistent state.
    try {
      if (obj && typeof obj.getObjects === "function") {
        try {
          const children = obj.getObjects()
          if (Array.isArray(children) && children.length > 0) {
            for (const child of children) {
              try {
                if (child && typeof child.setSrc === "function") {
                  // If child supports setSrc and no resize requested, do in-place swap
                  const opts = props?._imageManagerOptions || props
                  const hasExplicitSize = typeof props?.width === "number" || typeof props?.height === "number"
                  const forceResize = opts && opts._forceResize === true
                  const wantsResize = !!(hasExplicitSize || forceResize || (opts && typeof opts.sizePct === "number") || (opts && opts.shape))
                  if (!wantsResize) {
                    try {
                      console.debug("[EditorCanvas] replaceImage using child.setSrc", { childCtor: child?.constructor?.name, finalUrl })
                      child.setSrc(
                        finalUrl,
                        () => {
                          try {
                            child.set && child.set({ src: imgFull, ImgID: imgID, dirty: true })
                          } catch (e) {}
                          try {
                            ;(child as any).url = imgFull
                            ;(child as any).src = imgFull
                          } catch (e) {}
                          try {
                            if (opts && opts.shape) (child as any)._imageManagerShape = opts.shape
                          } catch (e) {}
                          try {
                            configureObject(child)
                          } catch (e) {}
                          try {
                            try {
                              ensureVisibleAndRender(child)
                            } catch (e) {}
                            // ensure canvas refresh and history
                            try {
                              if (canvas.value) {
                                canvas.value.requestRenderAll()
                              }
                            } catch (e) {}
                            try {
                              pushHistory()
                            } catch (e) {}
                            safeRequestRenderAll()
                            console.debug("[EditorCanvas] child.setSrc completed and render requested", { imgID, obj })
                            window.dispatchEvent(new CustomEvent("canvas-image-replaced", { detail: { id: imgID, url: imgFull, obj } }))
                          } catch (e) {}
                        },
                        { crossOrigin: "anonymous" }
                      )
                      return
                    } catch (e) {
                      // fallthrough
                    }
                  }
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    // If the object supports setSrc (our CustomImage), prefer in-place replacement
    // unless the caller requested an explicit resize/shape change. CustomImage
    // renders into an offscreen canvas sized at creation time, so changing the
    // object's width after setSrc won't affect the internal rendered resolution.
    // To change the rendered dimensions we must recreate the custom image at the
    // desired size and replace the object on the canvas.
    try {
      const opts = props?._imageManagerOptions || props
      const hasExplicitSize = typeof props?.width === "number" || typeof props?.height === "number"
      const forceResize = opts && opts._forceResize === true
      const wantsResize = !!(hasExplicitSize || forceResize || (opts && typeof opts.sizePct === "number") || (opts && opts.shape))
      if (typeof obj.setSrc === "function" && !wantsResize) {
        // simple in-place swap keeps bounding-box and z-order
        try {
          console.debug("[EditorCanvas] replaceImage using obj.setSrc", { finalUrl, objCtor: obj?.constructor?.name })
          obj.setSrc(
            finalUrl,
            () => {
              try {
                obj.set && obj.set({ src: imgFull, ImgID: imgID, dirty: true })
              } catch (e) {}
              try {
                ;(obj as any).url = imgFull
                ;(obj as any).src = imgFull
              } catch (e) {}
              try {
                if (opts && opts.shape) (obj as any)._imageManagerShape = opts.shape
              } catch (e) {}
              try {
                configureObject(obj)
              } catch (e) {}
              try {
                try {
                  ensureVisibleAndRender(obj)
                } catch (e) {}
                // ensure canvas refresh and history
                try {
                  if (canvas.value) {
                    canvas.value.requestRenderAll()
                  }
                } catch (e) {}
                try {
                  pushHistory()
                } catch (e) {}
                safeRequestRenderAll()
                try {
                  console.debug("[EditorCanvas] obj.setSrc completed and render requested", { imgID, obj })
                } catch (e) {}
                try {
                  window.dispatchEvent(new CustomEvent("canvas-image-replaced", { detail: { id: imgID, url: imgFull, obj } }))
                } catch (e) {}
              } catch (e) {}
            },
            { crossOrigin: "anonymous" }
          )
          return
        } catch (e) {
          // fallthrough to recreate path
        }
      }
      // Otherwise recreate the image at the requested size/shape and replace the object
      if (wantsResize) {
        try {
          const canvasSize = canvas.value ? { width: canvas.value.getWidth(), height: canvas.value.getHeight() } : { width: 900, height: 600 }
          let w: number | undefined = undefined
          let h: number | undefined = undefined
          if (typeof opts?.sizePct === "number") {
            const pct = Math.max(0.01, Math.min(5, opts.sizePct / 100))
            w = Math.max(16, Math.round((canvasSize.width || 900) * pct))
            h = Math.max(16, Math.round((canvasSize.height || 600) * pct))
          }
          if (typeof props?.width === "number") w = props.width
          if (typeof props?.height === "number") h = props.height
          const left = typeof obj.left === "number" ? obj.left : props?.left ?? props?.x ?? 100
          const top = typeof obj.top === "number" ? obj.top : props?.top ?? props?.y ?? 100
          const scaleHint = (opts && opts.shape) || (obj && ((obj as any).ImageAlign || (obj as any).scale)) || "best-fit"
          const createOpts: any = {
            left,
            top,
            selectable: true,
            scale: scaleHint,
          }
          if (typeof w === "number") createOpts.width = w
          if (typeof h === "number") createOpts.height = h
          let newObj: any = await createCustomImage(finalUrl, createOpts)
          // If createCustomImage returned something unexpected (not a Fabric object),
          // fall back to fabric.Image.fromURL to ensure we insert a valid Fabric object.
          try {
            const looksLikeFabric = newObj && typeof newObj.render === "function"
            if (!looksLikeFabric) {
              console.debug("[EditorCanvas] createCustomImage returned non-fabric object, falling back to Image.fromURL")
              try {
                newObj = await new Promise((resolve) => {
                  Image.fromURL(finalUrl, { crossOrigin: "anonymous" }, (img: any) => resolve(img))
                })
              } catch (e) {
                // if even fallback fails, try wrapping a canvas element
                console.warn("[EditorCanvas] fallback Image.fromURL failed for replace", e)
              }
            }
          } catch (e) {
            // swallow and proceed; subsequent checks will handle invalid newObj
          }
          // ensure canvas objects are valid before making a remove/insert
          try {
            ensureValidFabricObjects()
          } catch (e) {}
          try {
            removeInvalidObjectsNow()
          } catch (e) {}

          // copy canonical ids/metadata so sidebar mapping continues to work
          try {
            if ((obj as any).id && !(newObj as any).id) (newObj as any).id = (obj as any).id
            if ((obj as any).ID && !(newObj as any).ID) (newObj as any).ID = (obj as any).ID
            if ((obj as any).ImgID && !(newObj as any).ImgID) (newObj as any).ImgID = (obj as any).ImgID
            // copy any other useful props
            const copyKeys = ["label", "ObjectName", "name"]
            for (const k of copyKeys) {
              try {
                if ((obj as any)[k] !== undefined && (newObj as any)[k] === undefined) (newObj as any)[k] = (obj as any)[k]
              } catch (e) {}
            }
          } catch (e) {}
          // preserve z-index
          const objs = canvas.value!.getObjects()
          const idx = objs.indexOf(obj)
          try {
            // Temporarily disable renderOnAddRemove while we swap objects
            let prevRenderOnAddRemove: any = true
            try {
              prevRenderOnAddRemove = (canvas.value as any).renderOnAddRemove
            } catch (e) {}
            try {
              ;(canvas.value as any).renderOnAddRemove = false
            } catch (e) {}
            // Insert the new object first, so we never leave the canvas without an image
            // if creation or insertion is slow or fails. Remove the old object only
            // after a successful insert. If insertion fails, attempt a fallback
            // Image.fromURL before removing the original object.
            try {
              if (newObj && typeof newObj.render === "function") {
                if (idx >= 0 && idx <= objs.length) {
                  ;(canvas.value as any).insertAt(newObj, idx)
                } else {
                  canvas.value!.add(newObj)
                }
                try {
                  copyTransform(obj, newObj)
                } catch (e) {}
                try {
                  finalizeInsertedImage(newObj, finalUrl, imgID, obj)
                } catch (e) {}
                // Now remove the old object. Be robust: try direct removal by
                // reference, then attempt to match by canonical ids if that
                // fails (some objects may wrap or mutate during insertion).
                let removedOld = false
                try {
                  if (canvas.value!.getObjects().includes(obj)) {
                    canvas.value!.remove(obj)
                    removedOld = true
                  }
                } catch (ee) {}
                if (!removedOld) {
                  try {
                    const idKeys = ["id", "ID", "ImgID", "objectId", "ObjectID"]
                    const objsNow = canvas.value!.getObjects()
                    let foundIdx = -1
                    for (let ii = 0; ii < objsNow.length; ii++) {
                      try {
                        const o2: any = objsNow[ii]
                        for (const k of idKeys) {
                          try {
                            if (o2 && o2[k] !== undefined && obj && obj[k] !== undefined && String(o2[k]) === String(obj[k])) {
                              foundIdx = ii
                              break
                            }
                          } catch (eee) {}
                        }
                        if (foundIdx >= 0) break
                      } catch (eee) {}
                    }
                    if (foundIdx >= 0) {
                      try {
                        const candidate = canvas.value!.getObjects()[foundIdx]
                        if (candidate) {
                          canvas.value!.remove(candidate)
                          removedOld = true
                        }
                      } catch (eee) {}
                    }
                  } catch (eee) {}
                }
                if (!removedOld) {
                  try {
                    try {
                      if (newObj) {
                        ;(newObj as any).url = finalUrl
                        ;(newObj as any).src = finalUrl
                      }
                    } catch (eee) {}
                    setTimeout(() => {
                      try {
                        removeOriginalIfDuplicate(obj, newObj)
                      } catch (ee) {}
                    }, 48)
                  } catch (ee) {}
                  console.warn("[EditorCanvas] replaceImage: failed to remove original object after inserting replacement; scheduled duplicate removal", { idx })
                }
              } else {
                // Attempt fallback creation before removing original
                try {
                  const fallbackImg: any = await new Promise((resolve) => {
                    Image.fromURL(finalUrl, { crossOrigin: "anonymous" }, (img: any) => resolve(img))
                  })
                  if (fallbackImg && typeof fallbackImg.render === "function") {
                    if (idx >= 0 && idx <= objs.length) {
                      ;(canvas.value as any).insertAt(fallbackImg, idx)
                    } else {
                      canvas.value!.add(fallbackImg)
                    }
                    newObj = fallbackImg
                    try {
                      copyTransform(obj, newObj)
                    } catch (e) {}
                    try {
                      finalizeInsertedImage(newObj, finalUrl, imgID, obj)
                    } catch (e) {}
                    try {
                      canvas.value!.remove(obj)
                    } catch (e) {}
                  } else {
                    // couldn't create a valid new object; leave original in place
                    console.warn("[EditorCanvas] replaceImage: could not create replacement, leaving original object in place")
                  }
                } catch (e) {
                  console.error("[EditorCanvas] replaceImage: fallback Image.fromURL failed", e)
                  // leave original object in place
                }
              }
            } catch (e) {}
            // restore renderOnAddRemove and request a safe render
            try {
              ;(canvas.value as any).renderOnAddRemove = prevRenderOnAddRemove
            } catch (e) {}
            // Verify the replacement object is actually on the canvas; if not, attempt to add it again.
            try {
              const present = canvas.value!.getObjects().includes(newObj)
              if (!present && newObj && typeof newObj.render === "function") {
                console.warn("[EditorCanvas] replaceImage: newObj not present after insert, re-adding", { idx })
                try {
                  if (idx >= 0 && idx <= canvas.value!.getObjects().length) (canvas.value as any).insertAt(newObj, idx)
                  else canvas.value!.add(newObj)
                } catch (ee) {
                  try {
                    canvas.value!.add(newObj)
                  } catch (eee) {
                    console.error("[EditorCanvas] failed to re-add newObj", eee)
                  }
                }
                try {
                  try {
                    copyTransform(obj, newObj)
                  } catch (e) {}
                  try {
                    if (newObj) {
                      ;(newObj as any).url = finalUrl
                      ;(newObj as any).src = finalUrl
                    }
                  } catch (eee) {}
                  try {
                    finalizeInsertedImage(newObj, finalUrl, imgID, obj)
                  } catch (e) {}
                  setTimeout(() => {
                    try {
                      removeOriginalIfDuplicate(obj, newObj)
                    } catch (ee) {}
                  }, 48)
                } catch (ee) {}
              }
            } catch (eee) {}
          } catch (e) {}
          try {
            configureObject(newObj)
          } catch (e) {}
          try {
            try {
              ensureVisibleAndRender(newObj)
            } catch (e) {}
            // ensure render is safe and attempt repair if needed
            await safeRequestRenderAll()
            try {
              ;(newObj as any).url = finalUrl
              ;(newObj as any).src = finalUrl
            } catch (e) {}
            // ensure visible, update coords, request render and push history
            try {
              if ((newObj as any).visible === false) (newObj as any).visible = true
            } catch (e) {}
            try {
              if (typeof (newObj as any).setCoords === "function") (newObj as any).setCoords()
            } catch (e) {}
            try {
              if (canvas.value) canvas.value.requestRenderAll()
            } catch (e) {}
            try {
              pushHistory()
            } catch (e) {}
            try {
              console.debug("[EditorCanvas] recreate replace completed, dispatched canvas-image-replaced", { imgID, newObj })
            } catch (e) {}
            try {
              window.dispatchEvent(new CustomEvent("canvas-image-replaced", { detail: { id: imgID, url: finalUrl, obj: newObj } }))
            } catch (e) {}
          } catch (e) {}
          return
        } catch (e) {
          // fallthrough to element fallback below
        }
      }
    } catch (e) {}
    // fallback: create new element and set as object's element
    const imgEl = new (window as any).Image()
    imgEl.crossOrigin = "anonymous"
    imgEl.onload = function () {
      try {
        // If the target is an image-like object with setElement, use it.
        if (typeof obj.setElement === "function") {
          try {
            obj.setElement(imgEl)
          } catch (e) {}
        } else {
          // If target is a group, try to find an inner image-like child and set its element
          try {
            const children = obj && typeof obj.getObjects === "function" ? obj.getObjects() : obj && obj._objects ? obj._objects : null
            if (Array.isArray(children) && children.length > 0) {
              let applied = false
              for (const c of children) {
                try {
                  if (typeof c.setElement === "function") {
                    c.setElement(imgEl)
                    applied = true
                    break
                  }
                } catch (ee) {}
              }
              // as a last resort, set obj._element if present
              if (!applied) {
                try {
                  ;(obj as any)._element = imgEl
                } catch (e) {}
              }
            } else {
              try {
                ;(obj as any)._element = imgEl
              } catch (e) {}
            }
          } catch (e) {}
        }
      } catch (e) {}
      try {
        obj.set && obj.set({ src: imgFull, ImgID: imgID, dirty: true })
      } catch (e) {}
      // apply sizing/shape if provided via props (only when explicitly requested)
      try {
        const opts = props?._imageManagerOptions || props
        const hasExplicitSize = typeof props?.width === "number" || typeof props?.height === "number"
        const forceResize = opts && opts._forceResize === true
        if (opts && (hasExplicitSize || forceResize)) {
          const canvasSize = canvas.value ? { width: canvas.value.getWidth(), height: canvas.value.getHeight() } : { width: 900, height: 600 }
          if (typeof opts.sizePct === "number") {
            const pct = Math.max(0.01, Math.min(5, opts.sizePct / 100))
            const w = Math.max(16, Math.round((canvasSize.width || 900) * pct))
            const h = Math.max(16, Math.round((canvasSize.height || 600) * pct))
            try {
              obj.set && obj.set({ width: w, height: h })
              if (typeof obj.setCoords === "function") obj.setCoords()
            } catch (e) {}
          }
          if (typeof props?.width === "number" || typeof props?.height === "number") {
            try {
              const w = typeof props.width === "number" ? props.width : obj.width
              const h = typeof props.height === "number" ? props.height : obj.height
              obj.set && obj.set({ width: w, height: h })
              if (typeof obj.setCoords === "function") obj.setCoords()
            } catch (e) {}
          }
          if (opts.shape) {
            try {
              ;(obj as any)._imageManagerShape = opts.shape
            } catch (e) {}
          }
        } else if (opts && opts.shape) {
          // even if not resizing, preserve shape hint for future editing
          try {
            ;(obj as any)._imageManagerShape = opts.shape
          } catch (e) {}
        }
      } catch (e) {}
      try {
        configureObject(obj)
      } catch (e) {}
      try {
        // Safety: aggressively purge invalid objects, then use safe render to avoid Fabric crashes
        try {
          removeInvalidObjectsNow()
        } catch (ee) {}
        try {
          if (canvas.value) canvas.value.requestRenderAll()
        } catch (ee) {}
        try {
          safeRequestRenderAll()
        } catch (ee) {}
        try {
          ;(obj as any).url = imgFull
          ;(obj as any).src = imgFull
        } catch (e) {}
        try {
          if (typeof obj.setCoords === "function") obj.setCoords()
        } catch (e) {}
        try {
          pushHistory()
        } catch (e) {}
        try {
          console.debug("[EditorCanvas] fallback imgEl.onload applied and render requested", { imgID, obj })
        } catch (e) {}
        try {
          window.dispatchEvent(new CustomEvent("canvas-image-replaced", { detail: { id: imgID, url: imgFull, obj } }))
        } catch (e) {}
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
  // if ImageManager passed options, respect sizePct/shape
  let width = fabricProps.width
  let height = fabricProps.height
  try {
    const opts = (props && (props as any)._imageManagerOptions) || (fabricProps && fabricProps._imageManagerOptions) || null
    if (opts && typeof opts.sizePct === "number") {
      const canvasSize = canvas.value ? { width: canvas.value.getWidth(), height: canvas.value.getHeight() } : { width: 900, height: 600 }
      const pct = Math.max(0.01, Math.min(5, opts.sizePct / 100))
      width = Math.max(16, Math.round((canvasSize.width || 900) * pct))
      height = Math.max(16, Math.round((canvasSize.height || 600) * pct))
    }
    if (opts && opts.shape) {
      // forward shape info as scale hint (CustomImage interprets 'scale' property)
      if (!fabricProps.scale) fabricProps.scale = opts.shape
    }
  } catch (e) {}
  // Use CustomImage helper to mimic legacy image behavior (best-fit / fill / cropped)
  createCustomImage(url, {
    left,
    top,
    width,
    height,
    selectable: fabricProps.selectable !== false,
    scale: fabricProps.scale || fabricProps.ImageAlign || "best-fit",
  })
    .then(async (group: any) => {
      // Defensive: if createCustomImage returned something unexpected that
      // doesn't look like a Fabric object, attempt a robust fallback using
      // fabric.Image.fromURL so the canvas always receives a valid object.
      try {
        const looksLikeFabric = group && typeof group.render === "function"
        if (!looksLikeFabric) {
          console.warn("[EditorCanvas] createCustomImage returned non-fabric object, attempting fallback Image.fromURL")
          try {
            const fallbackImg: any = await new Promise((resolve, reject) => {
              Image.fromURL(url, { crossOrigin: "anonymous" }, (img: any) => {
                if (!img) return reject(new Error("Image.fromURL returned empty"))
                resolve(img)
              })
            })
            // copy fabricProps onto fallback
            try {
              Object.assign(fallbackImg, fabricProps)
            } catch (e) {}
            // normalize id fields on fallback
            try {
              const normalizedId = fabricProps.ImgID || fabricProps.ID || fabricProps.id || fabricProps.objectId || null
              if (normalizedId && !fallbackImg.id) fallbackImg.id = String(normalizedId)
              if (fabricProps.ImgID && !fallbackImg.ImgID) fallbackImg.ImgID = fabricProps.ImgID
            } catch (e) {}
            group = fallbackImg
          } catch (e) {
            console.error("[EditorCanvas] fallback Image.fromURL failed in addImage", e)
          }
        }
      } catch (e) {}
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
      // If width/height were computed, apply them on the resulting group if possible
      try {
        if (typeof width === "number" && typeof height === "number") {
          if (!group.width) group.width = width
          if (!group.height) group.height = height
          if (typeof group.set === "function") {
            try {
              group.set({ width, height })
            } catch (e) {}
          }
        }
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
      // Prefer explicit color/alpha values coming from the order JSON (FontColor / Alpha)
      // fall back to provided fill or a sensible default.
      fill: fabricProps.fill ?? fabricProps.FontColor ?? fabricProps.Fontcolour ?? fabricProps.BackgroundColor ?? "#60a5fa",
      opacity: Number(fabricProps.Alpha ?? fabricProps.alpha ?? 1),
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
    try {
      // Expose for debugging in browser console
      try {
        ;(window as any).__e5Canvas = inst
      } catch (e) {}
      console.debug("[EditorCanvas] exposed window.__e5Canvas for debugging", !!(window as any).__e5Canvas)
    } catch (e) {}
    // Monkey-patch render functions to guard against invalid objects causing Fabric to throw
    try {
      const origReq = (inst as any).requestRenderAll && (inst as any).requestRenderAll.bind(inst)
      if (origReq) {
        ;(inst as any).requestRenderAll = function patchedRequestRenderAll() {
          try {
            ensureValidFabricObjects()
          } catch (e) {}
          try {
            return origReq()
          } catch (e) {
            try {
              // delegate to safe renderer which will collect diagnostics and attempt repair
              safeRequestRenderAll()
            } catch (ee) {}
          }
        }
      }
      const origRenderAll = (inst as any).renderAll && (inst as any).renderAll.bind(inst)
      if (origRenderAll) {
        ;(inst as any).renderAll = function patchedRenderAll() {
          try {
            ensureValidFabricObjects()
          } catch (e) {}
          try {
            return origRenderAll()
          } catch (e) {
            try {
              safeRequestRenderAll()
            } catch (ee) {}
          }
        }
      }
    } catch (e) {
      // if patching fails, ignore — we still have safeRequestRenderAll
    }
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
      // Fabric-level double click detection: detect two mouse:down events on same target within 350ms
      try {
        let _lastFabricClickTs = 0
        let _lastFabricClickTarget: any = null
        inst.on("mouse:down", (e: any) => {
          try {
            const now = Date.now()
            const target = e && e.target ? e.target : null
            // If both clicks hit the same object within threshold, treat as dblclick
            if (target && _lastFabricClickTarget && target === _lastFabricClickTarget && now - _lastFabricClickTs < 350) {
              try {
                const obj = target as any
                if (!isImageLike(obj)) {
                  // ignore dblclicks on non-image fabric targets
                  _lastFabricClickTs = 0
                  _lastFabricClickTarget = null
                  return
                }
                // derive canonical id: check own props, then parent/group, then search top-level objects' children, then match against editorData.images by URL/label
                let emittedId: any = obj.id || obj.ID || obj.ImgID || obj.objectId || null
                let label: any = obj.ObjectName || obj.label || obj.type || null
                if (!emittedId) {
                  try {
                    const parent = obj.group || obj.parent || null
                    if (parent) {
                      emittedId = emittedId || parent.id || parent.ID || parent.ImgID || parent.objectId || null
                      if (emittedId) console.debug("[EditorCanvas] dblclick parent fallback found id", emittedId)
                    }
                  } catch (e) {}
                }
                if (!emittedId && canvas && canvas.value) {
                  try {
                    const objs = canvas.value.getObjects()
                    for (const candidate of objs) {
                      try {
                        const $candidate: any = candidate
                        const children = $candidate.getObjects ? $candidate.getObjects() : $candidate._objects || null
                        if (children && Array.isArray(children) && children.includes(obj)) {
                          emittedId = emittedId || $candidate.id || $candidate.ID || $candidate.ImgID || $candidate.objectId || null
                          label = label || $candidate.ObjectName || $candidate.label || $candidate.type || label
                          if (emittedId) {
                            console.debug("[EditorCanvas] dblclick found parent candidate", { emittedId })
                            break
                          }
                        }
                        if ($candidate === obj) {
                          emittedId = emittedId || $candidate.id || $candidate.ID || $candidate.ImgID || $candidate.objectId || null
                          if (emittedId) break
                        }
                        if ($candidate._element && obj && obj._element && $candidate._element === obj._element) {
                          emittedId = emittedId || $candidate.id || $candidate.ID || $candidate.ImgID || $candidate.objectId || null
                          if (emittedId) break
                        }
                      } catch (ee) {}
                    }
                  } catch (eee) {}
                }
                // final fallback: try to match editorData images by URL or label
                if (!emittedId) {
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
                              emittedId = f.id || f.ID || f.ImgID || f.objectId || f.ObjectID || null
                              label = label || f.label || labelCandidate
                              break
                            }
                          }
                          if (!emittedId && labelCandidate && fLabel && String(fLabel).trim() === String(labelCandidate).trim()) {
                            emittedId = f.id || f.ID || f.ImgID || f.objectId || f.ObjectID || null
                            label = label || f.label || labelCandidate
                            break
                          }
                        } catch (ee) {}
                      }
                    }
                  } catch (eee) {}
                }

                console.debug("[EditorCanvas] fabric dblclick detected", { emittedId: emittedId ?? null, label })
                window.dispatchEvent(new CustomEvent("canvas-object-dblclick", { detail: { id: emittedId ?? null, label, obj } }))
              } catch (ee) {
                console.debug("[EditorCanvas] fabric dblclick dispatch failed", ee)
              }
              // reset
              _lastFabricClickTs = 0
              _lastFabricClickTarget = null
              return
            }
            // otherwise record click
            _lastFabricClickTs = now
            _lastFabricClickTarget = target
            // clear after threshold
            setTimeout(() => {
              try {
                const diff = Date.now() - _lastFabricClickTs
                if (diff >= 350) {
                  _lastFabricClickTs = 0
                  _lastFabricClickTarget = null
                }
              } catch (e) {}
            }, 400)
          } catch (e) {}
        })
      } catch (e) {
        console.debug("[EditorCanvas] failed to attach fabric dblclick detector", e)
      }
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
    // helper to detect whether a fabric object is image-like (image or group containing image)
    const isImageLike = (o: any) => {
      try {
        if (!o) return false
        const t = String(o.type || "").toLowerCase()
        if (t.includes("image")) return true
        if (typeof o.setSrc === "function") return true
        // element-backed objects (img element)
        if (o._element) return true
        const children = typeof o.getObjects === "function" ? o.getObjects() : o._objects || null
        if (Array.isArray(children)) {
          return children.some((c: any) => {
            try {
              const ct = String(c.type || "").toLowerCase()
              if (ct.includes("image")) return true
              if (typeof c.setSrc === "function") return true
              if (c._element) return true
            } catch (e) {}
            return false
          })
        }
      } catch (e) {}
      return false
    }
    // Attach a DOM dblclick listener to the canvas element to support legacy behavior
    try {
      const el = canvasRef.value as HTMLCanvasElement
      if (el && typeof el.addEventListener === "function") {
        el.addEventListener("dblclick", (ev: MouseEvent) => {
          try {
            if (!canvas.value) return
            // find top-most object under pointer
            const rect = el.getBoundingClientRect()
            const pointer = {
              x: ev.clientX - rect.left,
              y: ev.clientY - rect.top,
            }
            console.debug("[EditorCanvas] dblclick event", { clientX: ev.clientX, clientY: ev.clientY, pointer })
            const objs = canvas.value.getObjects().slice().reverse()
            for (const o of objs) {
              try {
                const obj = o as any
                // skip non-image objects
                if (!isImageLike(obj)) continue
                // use containsPoint if available
                if (typeof obj.containsPoint === "function") {
                  if (obj.containsPoint(pointer)) {
                    const emittedId = obj.id || obj.ID || obj.ImgID || obj.objectId || null
                    const label = obj.ObjectName || obj.label || obj.type || null
                    console.debug("[EditorCanvas] dispatching canvas-object-dblclick", { emittedId, label })
                    window.dispatchEvent(new CustomEvent("canvas-object-dblclick", { detail: { id: emittedId, label, obj } }))
                    return
                  }
                } else {
                  // approximate using bounding box
                  const left = obj.left || 0
                  const top = obj.top || 0
                  const width = obj.width || (obj.getScaledWidth && obj.getScaledWidth()) || (obj.getScaledWidth ? obj.getScaledWidth() : obj.width || 0)
                  const height = obj.height || (obj.getScaledHeight && obj.getScaledHeight()) || (obj.getScaledHeight ? obj.getScaledHeight() : obj.height || 0)
                  if (pointer.x >= left && pointer.x <= left + (width || 0) && pointer.y >= top && pointer.y <= top + (height || 0)) {
                    const emittedId = obj.id || obj.ID || obj.ImgID || obj.objectId || null
                    const label = obj.ObjectName || obj.label || obj.type || null
                    console.debug("[EditorCanvas] dispatching canvas-object-dblclick (bbox)", { emittedId, label })
                    window.dispatchEvent(new CustomEvent("canvas-object-dblclick", { detail: { id: emittedId, label, obj } }))
                    return
                  }
                }
              } catch (ee) {}
            }
            console.debug("[EditorCanvas] dblclick: no object found", { pointer })
          } catch (e) {}
        })
      }
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

function getCanvasSize() {
  try {
    if (!canvas.value) return null
    return { width: canvas.value.getWidth(), height: canvas.value.getHeight() }
  } catch (e) {
    return null
  }
}

function _stripUrl(u: any) {
  try {
    if (!u) return ""
    const s = String(u || "")
    const first = s.split("?")[0] || ""
    return first.replace(/\/$/, "")
  } catch (e) {
    return String(u || "")
  }
}

function findObjectByUrl(url: string) {
  if (!canvas.value || !url) return null
  const target = _stripUrl(url)
  try {
    const objs = canvas.value.getObjects()
    for (const o of objs) {
      try {
        const candidates: any[] = []
        if ((o as any).url) candidates.push((o as any).url)
        if ((o as any).src) candidates.push((o as any).src)
        if ((o as any)._element) {
          const el = (o as any)._element
          if (el.currentSrc) candidates.push(el.currentSrc)
          if (el.src) candidates.push(el.src)
        }
        for (const c of candidates) {
          if (!c) continue
          if (_stripUrl(c) === target) return o
        }
        // check children if group
        const children = (o as any).getObjects ? (o as any).getObjects() : null
        if (Array.isArray(children)) {
          for (const c of children) {
            const childCandidates: any[] = []
            if ((c as any).url) childCandidates.push((c as any).url)
            if ((c as any).src) childCandidates.push((c as any).src)
            if ((c as any)._element) {
              const el = (c as any)._element
              if (el.currentSrc) childCandidates.push(el.currentSrc)
              if (el.src) childCandidates.push(el.src)
            }
            for (const cc of childCandidates) {
              if (!cc) continue
              if (_stripUrl(cc) === target) return o
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null
}

function selectObjectByUrl(url: string) {
  if (!canvas.value) return
  try {
    const obj = findObjectByUrl(url)
    if (!obj) return
    canvas.value.setActiveObject(obj)
    canvas.value.requestRenderAll()
    const label = (obj as any).ObjectName || (obj as any).label || obj.type || ((obj as any).text ? String((obj as any).text).slice(0, 40) : "Object")
    const emittedId = (obj as any).id || (obj as any).ID || (obj as any).ImgID || null
    window.dispatchEvent(new CustomEvent("canvas-selection-changed", { detail: { id: emittedId, label } }))
  } catch (e) {
    console.warn("selectObjectByUrl failed", e)
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
  findObjectByUrl,
  selectObjectByUrl,
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
  getCanvasSize,
})
</script>
