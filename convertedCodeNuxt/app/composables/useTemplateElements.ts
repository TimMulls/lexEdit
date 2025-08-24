import { useCanvas } from "./useCanvas"
import { useOrderVars } from "./useOrderVars"

// Composable for template element logic (add text, image, shape)
import { Ref } from "vue"

// Pass in a ref to the EditorCanvas component instance
export function useTemplateElements(editorCanvasRef: Ref<any>) {
  const canvas = useCanvas()
  const orderVars = useOrderVars()

  // Add a text object to the canvas with full legacy property support
  /**
   * Add a text object to the canvas
   * @param {Object} opts - Text object config (legacy and modern properties)
   * Example: {
   *   value: string, textObjectId?: string|number, left?: number, top?: number, width?: number, height?: number,
   *   fontSize?: number, fontFamily?: string, fontWeight?: string, fontStyle?: string, textAlign?: string,
   *   fill?: string, stroke?: string, zIndex?: number, autoFontSize?: boolean, allowCuttedWords?: boolean, minHeight?: number, ...
   * }
   */
  function addText(opts: any = {}) {
    // Legacy mapping: value, textObjectId, and all other props
    const { value = "", textObjectId = undefined, ...props } = opts
    if (editorCanvasRef.value && typeof editorCanvasRef.value.addText === "function") {
      editorCanvasRef.value.addText(value, textObjectId, props)
    }
  }

  // Add an image to the canvas, matching legacy logic
  function addImage(imgUrl: string, opts: any = {}) {
    if (!canvas.canvas.value) return
    // Use appConfig from useCanvas scope
    // Use ObjectGroup as imageType if present
    const imageType = opts.ObjectGroup || opts.imageType || ""
    // Get appConfig from useLexAppConfig directly
    const { useLexAppConfig } = require("./useLexAppConfig")
    const appConfig = useLexAppConfig()
    let finalUrl = imgUrl
    if (imgUrl && !/^https?:\/+/.test(imgUrl) && appConfig?.imgsURL) {
      let url = imgUrl.replace(/^\/+/, "")
      // Remove 'images' segment from the start if present
      url = url.replace(/^images\/?/, "")
      // Remove leading and trailing slashes from imageType
      let cleanType = imageType.replace(/^\/+/, "").replace(/\/+$/, "")
      finalUrl = appConfig.imgsURL + (cleanType ? cleanType + "/" : "") + url
    }
    // @ts-ignore
    window.fabric.Image.fromURL(
      finalUrl,
      (img: any) => {
        const imgWidth = img.width || opts.width || 200
        const imgHeight = img.height || opts.height || 200
        const canvasWidth = canvas.canvas.value!.getWidth() / (canvas.canvasScale?.value || 1)
        const canvasHeight = canvas.canvas.value!.getHeight() / (canvas.canvasScale?.value || 1)
        let iWidth = imgWidth
        let iHeight = imgHeight
        if (iWidth > canvasWidth) iWidth = canvasWidth - 40
        if (iHeight > canvasHeight) iHeight = canvasHeight - 40
        img.set({
          left: opts.left ?? 20,
          top: opts.top ?? 20,
          width: iWidth,
          height: iHeight,
          angle: 0,
          scaleX: canvas.canvasScale?.value || 1,
          scaleY: canvas.canvasScale?.value || 1,
          orgLeft: 20,
          orgTop: 20,
          orgWidth: iWidth,
          orgHeight: iHeight,
          PageNumber: opts.PageNumber,
          ObjectName: opts.ObjectName || "Added Image " + (imageType || ""),
          ObjectType: opts.ObjectType,
          ObjectGroup: imageType,
          ResourceType: opts.ResourceType || "I",
          ImageAlign: opts.ImageAlign || "BEST_FIT",
          lockScalingFlip: true,
          imgType: imageType,
          src: imgUrl,
          requiredObject: 0,
          initiallyVisible: 1,
          SuppressPrinting: false,
          zIndex: 0,
          DisplayOrder: 0,
          lineIndex: 0,
          strokeWidth: 0,
          KeepOnProof: true,
          dirty: true,
          ...opts,
        })
        canvas.canvas.value!.add(img)
        canvas.canvas.value!.setActiveObject(img)
        setTimeout(() => {
          canvas.canvas.value?.calcOffset?.()
          canvas.canvas.value?.requestRenderAll?.()
        }, 500)
      },
      { crossOrigin: "anonymous" }
    )
  }

  // Add a shape to the canvas
  function addShape(type: string) {
    if (editorCanvasRef.value && typeof editorCanvasRef.value.addShape === "function") {
      editorCanvasRef.value.addShape(type)
    }
  }

  // TODO: Add more methods for replaceImage, add/replace QR, etc.

  return {
    addText,
    addImage,
    addShape,
    // ...other template element methods
  }
}
