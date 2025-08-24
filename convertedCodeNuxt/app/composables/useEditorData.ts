import { ref, computed } from "vue"
import { useOrderVars } from "./useOrderVars"
import { useLexAppConfig } from "./useLexAppConfig"

// Singleton state for editor data
const faces = ref<{ [key: string]: any[] }>({})
const faceNames = ["FrontFace", "BackFace", "InsideFace", "EnvelopeFace"]
const selectedFace = ref("FrontFace")
const loading = ref(false)
const error = ref<Error | null>(null)
const advMode = ref(false)

async function loadFromApi() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch("/api/editor-data")
    if (!res.ok) throw new Error("Failed to load editor data")
    const data = await res.json()
    for (const face of faceNames) faces.value[face] = data[face] || []
    const orderVars = useOrderVars()
    orderVars.frontTemplateID = data.FrontTemplateID || 0
    orderVars.backTemplateID = data.BackTemplateID || 0
    orderVars.insideTemplateID = data.InsideTemplateID || 0
    orderVars.envelopeTemplateID = data.EnvelopeTemplateID || 0
    if (Array.isArray(data.LoadedFonts)) orderVars.loadedFonts = data.LoadedFonts
    if (Array.isArray(data.AllFonts)) orderVars.allFonts = data.AllFonts
  } catch (e: any) {
    error.value = e
  } finally {
    loading.value = false
  }
}

const currentObjects = computed(() => faces.value[selectedFace.value] || [])

const textFields = computed(() =>
  currentObjects.value
    .filter((obj: any) => obj.ResourceType === "T")
    .map((obj: any, idx: number) => ({
      id: obj.ID?.toString() || `text-${idx}`,
      label: obj.ObjectName || `Text ${idx + 1}`,
      value: obj.Text || obj.text || "",
      left: obj.Left ?? obj.left ?? obj.X ?? obj.x ?? 0,
      top: obj.Top ?? obj.top ?? obj.Y ?? obj.y ?? 0,
      width: obj.Width ?? obj.width ?? 200,
      height: obj.Height ?? obj.height ?? 40,
      fontSize: parseInt(obj.FontSize || obj.fontSize || obj.OrgFontSize || 24),
      fontFamily: (() => {
        let val = obj.Font || obj.fontFamily || "Arial"
        if (String(val).toLowerCase() === "mrs eaves small caps" || String(val).toLowerCase() === "mrseavessmallcaps") return "MrsEavesSmallCaps"
        return String(val).replace(/\s+/g, "")
      })(),
      fill: obj.FontColor || obj.FillColor || obj.Color || obj.color || obj.fill || "#000",
      fontWeight: obj.FontWeight || (obj.FontStyle && obj.FontStyle.includes("fsBold") ? "bold" : undefined),
      fontStyle: obj.FontStyle && obj.FontStyle.includes("Italic") ? "italic" : undefined,
      textAlign: obj.TextAlign ? (obj.TextAlign.startsWith("ta") ? obj.TextAlign.slice(2).toLowerCase() : obj.TextAlign) : "left",
      backgroundColor: obj.BackgroundColor || undefined,
      ...obj,
    }))
)

const appConfig = useLexAppConfig()
const images = computed(() =>
  currentObjects.value
    .filter((obj: any) => obj.ResourceType === "I")
    .map((obj: any) => {
      const text = obj.Text || obj.text || ""
      const customUrl = (obj as any).__customUrl
      const rawGroup = obj.ObjectGroup || obj.objectGroup || ""
      let groupName = typeof rawGroup === "string" ? rawGroup.trim() : String(rawGroup || "")
      if (groupName.toLowerCase() === "logo" || groupName.toLowerCase() === "logos") groupName = "logos"
      groupName = groupName.replace(/^\/+|\/+$/g, "")
      const base = typeof appConfig.imgsURL === "string" ? appConfig.imgsURL.replace(/\/+$/g, "") : ""
      const groupPath = groupName ? `${groupName}/` : ""
      let url = base

      if (customUrl && typeof customUrl === "string" && customUrl.trim() !== "") {
        url = customUrl
      } else {
        if (text === "") {
          if (obj.ObjectType == 124) {
            url = `${base}/${groupPath}Default/1.png`.replace(/([^:]\/)\/+/, "$1")
          } else {
            url = `${base}/${groupPath}M3/1.png?v=${appConfig.appVersion || "1"}`.replace(/([^:]\/)\/+/, "$1")
          }
        } else if (text === "[Offer area]" || text === "Click here to add Coupon One" || text === "Click here to add Coupon Two") {
          url = `${base}/${groupPath}M3/1.png?v=${appConfig.appVersion || "1"}`.replace(/([^:]\/)\/+/, "$1")
        } else {
          url = `${base}/${groupPath}${String(text).replace(/\\/g, "/")}.png`.replace(/([^:]\/)\/+/, "$1")
        }
      }

      const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      if (isLocalhost) {
        if (url.includes("/Images/")) url = url.replace("/Images/", "/")
        if (!/^https?:\/\//i.test(url)) url = `http://localhost:3000${url}`
      } else {
        if (!/^https?:\/\//i.test(url)) url = `https://agentzmarketing.com${url}`
      }

      return {
        label: obj.ObjectName || "Image",
        url,
        type: "image",
        left: obj.Left ?? obj.left ?? obj.X ?? obj.x ?? 0,
        top: obj.Top ?? obj.top ?? obj.Y ?? obj.y ?? 0,
        width: obj.Width ?? obj.width ?? 100,
        height: obj.Height ?? obj.height ?? 100,
        FillColor: obj.FontColor ?? obj.FillColor ?? obj.fillColor ?? obj.Color ?? obj.color ?? obj.fill ?? "#fff",
        _groupName: groupName,
        _baseUrl: base,
        _groupPath: groupPath,
        ...obj,
      }
    })
)

const shapes = computed(() =>
  currentObjects.value
    .filter((obj: any) => obj.ResourceType === "S")
    .map((obj: any) => ({
      label: obj.ObjectName || "Shape",
      type: obj.ObjectType === 45 ? "rect" : obj.ObjectType === 1 ? "text" : "shape",
      left: obj.Left ?? obj.left ?? obj.X ?? obj.x ?? 0,
      top: obj.Top ?? obj.top ?? obj.Y ?? obj.y ?? 0,
      width: obj.Width ?? obj.width ?? 100,
      height: obj.Height ?? obj.height ?? 60,
      FillColor:
        obj.FontColor ??
        obj.FillColor ??
        obj.fillColor ??
        obj.Color ??
        obj.color ??
        obj.fill ??
        obj.Fill ??
        obj.FILL ??
        obj.BgColor ??
        obj.bgColor ??
        obj.BGColor ??
        obj.BGCOLOR ??
        "#60a5fa",
      ...obj,
    }))
)

const coupons = computed(() =>
  currentObjects.value
    .filter((obj: any) => obj.ResourceType === "C")
    .map((obj: any) => ({
      label: obj.ObjectName || "Coupon",
      code: obj.Text || obj.Code || "",
      ...obj,
    }))
)

const canvasSize = computed(() => {
  const objs = faces.value[selectedFace.value] || []
  if (objs.length > 0) {
    const w = objs[0].CanvasWidth || objs[0].TemplateWidth || 900
    const h = objs[0].CanvasHeight || objs[0].TemplateHeight || 600
    return { width: w, height: h }
  }
  return { width: 900, height: 600 }
})

function updateTextField(id: string, value: string) {
  const field = textFields.value.find((f) => f.id === id)
  if (field) field.value = value
}

export const useEditorData = () => {
  return {
    textFields,
    images,
    shapes,
    coupons,
    loading,
    error,
    loadFromApi,
    updateTextField,
    selectedFace,
    faceNames,
    canvasSize,
    faces,
    advMode,
    toggleAdvMode: () => {
      advMode.value = !advMode.value
      return advMode.value
    },
    advEditAllowed: () => {
      try {
        const orderVars = useOrderVars()
        const membership = orderVars.membershiptype ?? 0
        return !!(process?.env?.DEBUG || membership !== 0)
      } catch (e) {
        return true
      }
    },
    backgroundImageUrl: computed(() => {
      const faceToTemplateId = {
        FrontFace: "FrontTemplateID",
        BackFace: "BackTemplateID",
        InsideFace: "InsideTemplateID",
        EnvelopeFace: "EnvelopeTemplateID",
      }
      const faceKey = selectedFace.value as keyof typeof faceToTemplateId
      let templateId: any = null
      if (faces.value && faces.value[faceKey] && faces.value[faceKey][0]) {
        templateId = faces.value[faceKey][0][faceToTemplateId[faceKey]]
      }
      if (!templateId) return null
      try {
        const appCfg = useLexAppConfig()
        let templateURL = appCfg.templateURL
        if (typeof window !== "undefined" && window.location && window.location.hostname) {
          const host = window.location.hostname.toUpperCase()
          if (["M3TOOLBOX.COM", "AGENTZMARKETING.COM", "LEXINETPRINTS.COM", "LEXINET.NET", "LIFEWAYSTORES.COM"].some((h) => host.indexOf(h) >= 0)) {
            templateURL = appCfg.WebData + "NewTemplates/"
          }
        }
        return templateURL + templateId + "p.jpg?v=" + appCfg.appVersion
      } catch (e) {
        return null
      }
    }),
  }
}
