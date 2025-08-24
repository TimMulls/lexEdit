// CustomImage.ts
// Lightweight helper to create an image object that mimics legacy "fabric.Img" behavior
// Supports `scale: 'best-fit' | 'fill'` and centers the raster inside the target box while
// clipping visible area to the box (so images behave like legacy IAMIDDLECENTER / BEST_FIT / IACROP)
// Import fabric classes used. The workspace uses the fabric package where classes are available from the module.
import { Image as FabricImage, Rect as FabricRect, Group as FabricGroup } from "fabric"

type Opts = {
  left?: number
  top?: number
  width?: number
  height?: number
  selectable?: boolean
  scale?: string | null
  align?: string | null
  [k: string]: any
}

export function createCustomImage(url: string, opts: Opts = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const imgEl = new Image()
    imgEl.crossOrigin = "anonymous"
    imgEl.onload = () => {
      try {
        const imgW = imgEl.naturalWidth || imgEl.width || 1
        const imgH = imgEl.naturalHeight || imgEl.height || 1

        const targetW = typeof opts.width === "number" ? opts.width : imgW
        const targetH = typeof opts.height === "number" ? opts.height : imgH

        const left = typeof opts.left === "number" ? opts.left : 0
        const top = typeof opts.top === "number" ? opts.top : 0

        const scaleMode = (opts.scale || "best-fit").toString().toLowerCase()
        const scale = scaleMode === "fill" || scaleMode === "iacrop" ? Math.max(targetW / imgW, targetH / imgH) : Math.min(targetW / imgW, targetH / imgH)

        // (previously created intermediate image removed) -- we'll construct
        // the returned FabricImage below and draw directly into its box. Disable
        // object caching to avoid cache-invalidation problems while using a
        // custom _render implementation.

        // Instead of relying on a custom _render and mixing Fabric transforms,
        // pre-render the desired cropped/scaled image into an offscreen canvas
        // sized exactly to the target box. Then create a Fabric.Image from that
        // canvas. This guarantees pixel placement exactly matches the object's box
        // and avoids group/local coordinate/clip issues.
        const drawToCanvas = (el: HTMLImageElement, w: number, h: number, mode: string) => {
          const c = document.createElement("canvas")
          c.width = Math.max(1, Math.round(w))
          c.height = Math.max(1, Math.round(h))
          const ctx = c.getContext("2d")
          if (!ctx) return c
          const srcW = el.naturalWidth || el.width || 1
          const srcH = el.naturalHeight || el.height || 1
          if (mode === "fill" || mode === "iacrop") {
            // crop source so scaled area fills destination
            const s = Math.max(w / srcW, h / srcH)
            let srcCropW = Math.max(1, Math.round(w / s))
            let srcCropH = Math.max(1, Math.round(h / s))
            if (srcCropW > srcW) srcCropW = srcW
            if (srcCropH > srcH) srcCropH = srcH
            const srcX = Math.floor(Math.max(0, (srcW - srcCropW) / 2))
            const srcY = Math.floor(Math.max(0, (srcH - srcCropH) / 2))
            try {
              ctx.drawImage(el, srcX, srcY, srcCropW, srcCropH, 0, 0, c.width, c.height)
            } catch (e) {
              /* silent */
            }
          } else {
            // best-fit: scale entire source to fit and center inside box
            const s = Math.min(w / srcW, h / srcH)
            const scaledW = Math.max(1, Math.round(srcW * s))
            const scaledH = Math.max(1, Math.round(srcH * s))
            const destX = Math.round((c.width - scaledW) / 2)
            const destY = Math.round((c.height - scaledH) / 2)
            try {
              ctx.drawImage(el, 0, 0, srcW, srcH, destX, destY, scaledW, scaledH)
            } catch (e) {
              /* silent */
            }
          }
          return c
        }

        // initial offscreen canvas rendered to the target box
        const canvasEl = drawToCanvas(imgEl, targetW, targetH, scaleMode)

        const imgObj: any = new FabricImage(canvasEl, {
          left,
          top,
          originX: "left",
          originY: "top",
          selectable: typeof opts.selectable === "boolean" ? opts.selectable : true,
          width: targetW,
          height: targetH,
          objectCaching: false,
        })

        // Store legacy-like metadata
        imgObj.orgWidth = imgW
        imgObj.orgHeight = imgH
        imgObj.orgLeft = left
        imgObj.orgTop = top
        imgObj.ImageAlign = opts.scale || "BEST_FIT"

        // Provide setSrc replacement that redraws into the offscreen canvas and requests a redraw
        imgObj.setSrc = (newUrl: string, cb?: () => void) => {
          const newEl = new Image()
          newEl.crossOrigin = "anonymous"
          newEl.onload = () => {
            try {
              // redraw into the existing canvas element so Fabric uses the same object element
              const newCanvas = drawToCanvas(newEl, targetW, targetH, scaleMode)
              imgObj._element = newCanvas
              imgObj.orgWidth = newEl.naturalWidth || 1
              imgObj.orgHeight = newEl.naturalHeight || 1
              // flag dirty and update coords
              imgObj.dirty = true
              imgObj.setCoords && imgObj.setCoords()
              const c = (imgObj as any).canvas
              if (c && typeof c.requestRenderAll === "function") c.requestRenderAll()
              else if (c && typeof c.renderAll === "function") c.renderAll()
              if (typeof cb === "function") cb()
            } catch (e) {
              if (typeof cb === "function") cb()
            }
          }
          newEl.onerror = () => {
            if (typeof cb === "function") cb()
          }
          newEl.src = newUrl
        }

        // Finalize the Fabric.Image instance so it can be added directly to the canvas.
        // Use the image's own box (width/height = targetW/targetH) and place at canvas coords
        // (left/top). This avoids group-local coordinate/clip mismatches.
        imgObj.left = left
        imgObj.top = top
        imgObj.originX = "left"
        imgObj.originY = "top"
        imgObj.width = targetW
        imgObj.height = targetH
        imgObj.selectable = typeof opts.selectable === "boolean" ? opts.selectable : true

        // legacy metadata lives on the image for compatibility
        imgObj.orgWidth = imgW
        imgObj.orgHeight = imgH
        imgObj.orgLeft = left
        imgObj.orgTop = top
        imgObj.ImageAlign = opts.scale || "BEST_FIT"

        imgObj.setCoords && imgObj.setCoords()

        console.debug("[createCustomImage] created image", { left: imgObj.left, top: imgObj.top, width: imgObj.width, height: imgObj.height })
        resolve(imgObj)
      } catch (err) {
        reject(err)
      }
    }
    imgEl.onerror = (e) => reject(e)
    imgEl.src = url
  })
}
