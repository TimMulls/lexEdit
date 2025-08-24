import { ref } from "vue"
import { Canvas } from "fabric"

export function useZoom(canvasRef: { value: Canvas | null }, containerId = "canvasContainer") {
  const canvasScale = ref(1.0)
  const SCALE_FACTOR = 1.1
  let zoomFitRunning = false
  // Store a stable base canvas size to avoid drift from repeated setWidth/setHeight calls
  let baseCanvasWidth: number | null = null
  let baseCanvasHeight: number | null = null

  function setCanvasDisplay() {
    if (!canvasRef.value) return
    const container = document.getElementById(containerId)
    if (!container) return

    const canvasWidth = canvasRef.value.getWidth()
    const canvasHeight = canvasRef.value.getHeight()
    const windowWidth = Math.max(0, container.clientWidth - 5)
    const windowHeight = Math.max(0, container.clientHeight - 5)

    if (canvasWidth >= windowWidth || canvasHeight >= windowHeight) {
      ;(container as HTMLElement).style.display = "inline-block"
    } else {
      ;(container as HTMLElement).style.display = "flex"
    }
  }

  // skipDisplay: when true do not toggle container display (used during zoomFit)
  function setCanvasZoom(scale: number, cb?: () => void, skipDisplay?: boolean) {
    if (!canvasRef.value) return

    // Will not zoom with objects selected.
    const active = canvasRef.value.getActiveObjects()
    if (active && active.length) {
      canvasRef.value.discardActiveObject()
      canvasRef.value.renderAll()
    }
    // Diagnostics: capture sizes before zoom change
    try {
      const pre = {
        requestedScale: scale,
        prevScale: canvasScale.value,
        canvasWidth: canvasRef.value.getWidth(),
        canvasHeight: canvasRef.value.getHeight(),
        containerClientWidth: document.getElementById(containerId)?.clientWidth,
        containerClientHeight: document.getElementById(containerId)?.clientHeight,
      }
      console.debug("[setCanvasZoom] pre", pre)
      try {
        const containerEl = document.getElementById(containerId) as HTMLElement | null
        const computed = containerEl ? window.getComputedStyle(containerEl) : null
        const parent = containerEl?.parentElement
        const parentRect = parent ? parent.getBoundingClientRect() : null
        const debugExtra = {
          timestamp: Date.now(),
          containerId,
          containerStyle: containerEl ? containerEl.style.display : undefined,
          containerComputedDisplay: computed?.display,
          containerClient: containerEl ? { w: containerEl.clientWidth, h: containerEl.clientHeight } : undefined,
          parentClient: parent ? { w: parent.clientWidth, h: parent.clientHeight } : undefined,
          parentRect,
          windowInner: { w: window.innerWidth, h: window.innerHeight },
          stack: new Error("stack").stack?.split("\n").slice(1, 6),
        }
        console.debug("[setCanvasZoom] pre.extra", debugExtra)
      } catch (e) {
        console.debug("[setCanvasZoom] pre.extra failed", e)
      }
    } catch (e) {
      console.debug("[setCanvasZoom] pre: failed to read sizes", e)
    }

    // Ensure base canvas dimensions are initialized from the unzoomed canvas size.
    if (baseCanvasWidth === null || baseCanvasHeight === null) {
      try {
        const currentScale = canvasScale.value || 1
        baseCanvasWidth = canvasRef.value.getWidth() / currentScale
        baseCanvasHeight = canvasRef.value.getHeight() / currentScale
        console.debug("[setCanvasZoom] initialized baseCanvasSize", { baseCanvasWidth, baseCanvasHeight, currentScale })
      } catch (e) {
        console.debug("[setCanvasZoom] failed to initialize baseCanvasSize", e)
      }
    }

    // Always log the base canvas size for diagnosis
    console.debug("[setCanvasZoom] baseCanvas", { baseCanvasWidth, baseCanvasHeight })

    // Get Unzoomed height/width (based on current scale)
    const baseWidth = baseCanvasWidth ?? canvasRef.value.getWidth() / (canvasScale.value || 1)
    const baseHeight = baseCanvasHeight ?? canvasRef.value.getHeight() / (canvasScale.value || 1)

    const canvasHeight = baseHeight
    const canvasWidth = baseWidth

    // Set New Zoom Height/Width
    canvasRef.value.setHeight(canvasHeight * scale)
    canvasRef.value.setWidth(canvasWidth * scale)

    // Set New Canvas zoom
    canvasScale.value = scale
    canvasRef.value.setZoom(scale)

    canvasRef.value.renderAll()
    canvasRef.value.calcOffset()

    // Diagnostics: capture sizes after zoom change
    try {
      const post = {
        appliedScale: canvasScale.value,
        canvasWidth: canvasRef.value.getWidth(),
        canvasHeight: canvasRef.value.getHeight(),
        containerClientWidth: document.getElementById(containerId)?.clientWidth,
        containerClientHeight: document.getElementById(containerId)?.clientHeight,
      }
      console.debug("[setCanvasZoom] post", post)
      try {
        const rect = document.getElementById(containerId)?.getBoundingClientRect()
        if (rect) console.debug("[setCanvasZoom] container rect", rect)
        try {
          const containerEl = document.getElementById(containerId) as HTMLElement | null
          const computed = containerEl ? window.getComputedStyle(containerEl) : null
          const parent = containerEl?.parentElement
          const parentRect = parent ? parent.getBoundingClientRect() : null
          const debugExtra = {
            timestamp: Date.now(),
            containerId,
            containerStyle: containerEl ? containerEl.style.display : undefined,
            containerComputedDisplay: computed?.display,
            containerClient: containerEl ? { w: containerEl.clientWidth, h: containerEl.clientHeight } : undefined,
            parentClient: parent ? { w: parent.clientWidth, h: parent.clientHeight } : undefined,
            parentRect,
            windowInner: { w: window.innerWidth, h: window.innerHeight },
            stack: new Error("stack").stack?.split("\n").slice(1, 6),
          }
          console.debug("[setCanvasZoom] post.extra", debugExtra)
        } catch (e) {
          console.debug("[setCanvasZoom] post.extra failed", e)
        }
      } catch (e) {
        console.debug("[setCanvasZoom] container rect read failed", e)
      }
    } catch (e) {
      console.debug("[setCanvasZoom] post: failed to read sizes", e)
    }

    // Adjust container display to match legacy behavior unless skipped
    if (!skipDisplay) {
      setCanvasDisplay()
    } else {
      console.debug("[setCanvasZoom] skipDisplay=true, not toggling container display")
    }

    // Expose a small debug dump on window so developer can call it interactively
    try {
      ;(window as any).__lexZoomDebug = (window as any).__lexZoomDebug || {}
      ;(window as any).__lexZoomDebug.getState = function () {
        const containerEl = document.getElementById(containerId) as HTMLElement | null
        return {
          timestamp: Date.now(),
          canvasScale: canvasScale.value,
          baseCanvasWidth,
          baseCanvasHeight,
          canvasWidth: canvasRef.value?.getWidth(),
          canvasHeight: canvasRef.value?.getHeight(),
          containerClient: containerEl ? { w: containerEl.clientWidth, h: containerEl.clientHeight } : undefined,
          containerStyle: containerEl ? containerEl.style.display : undefined,
          windowInner: { w: window.innerWidth, h: window.innerHeight },
        }
      }
    } catch (e) {
      console.debug("[setCanvasZoom] failed to set window.__lexZoomDebug", e)
    }

    if (typeof cb === "function") cb()
  }

  function zoomIn() {
    if (!canvasRef.value) return
    const container = document.getElementById(containerId)
    if (container) (container as HTMLElement).style.display = "inline-block"

    if (canvasScale.value < 2) {
      setCanvasZoom(canvasScale.value * SCALE_FACTOR)
    }
  }

  function zoomOut() {
    if (!canvasRef.value) return
    if (canvasScale.value > 0.1) {
      setCanvasZoom(canvasScale.value / SCALE_FACTOR)
    }
  }

  async function zoomFit(resetZoom = true) {
    // Replace iterative/DOM-toggle behavior with a single-pass deterministic fit.
    // Measure available space once (prefer parent element as a stable reference), compute target scale,
    // then apply one setCanvasZoom. This avoids intermediate display toggles and layout feedback loops.
    if (!canvasRef.value) return
    if (zoomFitRunning) {
      console.debug("[zoomFit] already running, ignoring re-entry")
      return
    }
    // Prevent very-rapid repeated zoomFit calls from cascading small layout-driven changes.
    const now = Date.now()
    if ((zoomFit as any)._lastZoomFitAt && now - (zoomFit as any)._lastZoomFitAt < 250) {
      console.debug("[zoomFit] ignored due to cooldown", { last: (zoomFit as any)._lastZoomFitAt, now })
      return
    }
    zoomFitRunning = true

    const canvas = canvasRef.value

    // Ensure we have unzoomed base canvas dimensions
    let baseWidth = baseCanvasWidth
    let baseHeight = baseCanvasHeight
    try {
      if (baseWidth == null || baseHeight == null) {
        const currentScale = canvasScale.value || canvas.getZoom() || 1
        baseWidth = canvas.getWidth() / currentScale
        baseHeight = canvas.getHeight() / currentScale
        console.debug("[zoomFit] computed base canvas from current state", { baseWidth, baseHeight, currentScale })
      }
    } catch (e) {
      console.debug("[zoomFit] failed to compute base canvas, aborting", e)
      zoomFitRunning = false
      return
    }

    // Measure available area once. Prefer the container's parent as it is less likely to flip when we change
    // the container display style. Fall back to the container itself or window.
    const containerEl = document.getElementById(containerId) as HTMLElement | null
    let availW = 0
    let availH = 0
    if (containerEl && containerEl.parentElement) {
      const parent = containerEl.parentElement
      availW = Math.max(0, parent.clientWidth - 10)
      availH = Math.max(0, parent.clientHeight - 10)
    } else if (containerEl) {
      availW = Math.max(0, containerEl.clientWidth - 10)
      availH = Math.max(0, containerEl.clientHeight - 10)
    } else {
      availW = Math.max(0, window.innerWidth - 10)
      availH = Math.max(0, window.innerHeight - 10)
    }

    // Stabilize by preferring the maximum available area seen recently (5s).
    // This prevents small drops after applying a zoom from causing cascading shrink.
    try {
      const nowMs = Date.now()
      const lastMax = (zoomFit as any)._maxAvail as { w: number; h: number; t: number } | undefined
      const WINDOW_MS = 5000
      if (lastMax && nowMs - lastMax.t < WINDOW_MS) {
        if (lastMax.w > availW) {
          console.debug("[zoomFit] using recent max availW to avoid shrink", { availW, lastMaxW: lastMax.w })
          availW = Math.max(availW, lastMax.w)
        }
        if (lastMax.h > availH) {
          console.debug("[zoomFit] using recent max availH to avoid shrink", { availH, lastMaxH: lastMax.h })
          availH = Math.max(availH, lastMax.h)
        }
      }
      ;(zoomFit as any)._maxAvail = { w: Math.max((zoomFit as any)._maxAvail?.w || 0, availW), h: Math.max((zoomFit as any)._maxAvail?.h || 0, availH), t: nowMs }
    } catch (e) {
      console.debug("[zoomFit] failed to stabilize avail measurement", e)
    }

    // Compute scale to fit base canvas into available area
    const scaleW = baseWidth > 0 ? availW / baseWidth : 1
    const scaleH = baseHeight > 0 ? availH / baseHeight : 1
    let target = Math.min(scaleW, scaleH)

    // Respect sensible limits and round to 3 decimals (legacy used 3-decimal rounding)
    target = Math.max(0.1, Math.min(2, target))
    target = Math.round(target * 1000) / 1000

    console.debug("[zoomFit] single-pass target", { baseWidth, baseHeight, availW, availH, scaleW, scaleH, target })

    // If target is very close to current, skip to avoid unnecessary reflows and prevent
    // repeated tiny shrinkage when layout measurements jitter between runs.
    const currentScale = canvasScale.value || canvas.getZoom() || 1
    const ABS_TOLERANCE = 0.02 // absolute tolerance (2 percentage points)
    // If caller requested resetZoom (the default from UI), force apply even for small changes.
    if (!resetZoom) {
      if (Math.abs(currentScale - target) < ABS_TOLERANCE) {
        console.debug("[zoomFit] change below tolerance, skipping apply", { current: currentScale, target, ABS_TOLERANCE })
        zoomFitRunning = false
        return
      }
    } else {
      console.debug("[zoomFit] resetZoom requested — forcing apply", { current: currentScale, target })
    }

    // Determine desired container display without relying on setCanvasDisplay's measurement
    // We will apply the zoom without letting setCanvasZoom toggle the display, then set
    // the container display deterministically based on the computed target to avoid
    // layout feedback loops that cause repeated shrinkage.
    // Use a local reference to avoid any runtime binding weirdness
    const _setCanvasZoom = setCanvasZoom as any
    try {
      const containerEl = document.getElementById(containerId) as HTMLElement | null
      if (containerEl && containerEl.parentElement) {
        const parent = containerEl.parentElement
        const desiredInline = baseWidth * target >= Math.max(0, parent.clientWidth - 5) || baseHeight * target >= Math.max(0, parent.clientHeight - 5)
        // Apply zoom but skip setCanvasDisplay to avoid toggling during the zoom apply.
        _setCanvasZoom(
          target,
          undefined,
          true
        )(
          // Now set display deterministically.
          containerEl as HTMLElement
        ).style.display = desiredInline ? "inline-block" : "flex"
      } else {
        // No container parent: just apply the zoom (skip display toggle to avoid surprises)
        _setCanvasZoom(target, undefined, true)
      }
    } catch (e) {
      console.debug("[zoomFit] failed to apply deterministic display, falling back to normal apply", e)
      // Fallback: normal apply
      try {
        _setCanvasZoom(target)
      } catch (err) {
        console.debug("[zoomFit] fallback setCanvasZoom failed", err)
      }
    }

    // Mark last run time and clear running flag
    ;(zoomFit as any)._lastZoomFitAt = now
    zoomFitRunning = false
    return
  }

  return {
    canvasScale,
    setCanvasZoom,
    zoomIn,
    zoomOut,
    zoomFit,
  }
}
