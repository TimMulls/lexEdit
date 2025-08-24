import { ref, computed, onMounted } from "vue"
import { useOrderVars } from "./useOrderVars"
// Enhanced composable with face selection and full object mapping
// --- Singleton State ---

const faces = ref<{ [key: string]: any[] }>({})
const faceNames = ["FrontFace", "BackFace", "InsideFace", "EnvelopeFace"]
const selectedFace = ref("FrontFace")
const loading = ref(false)
const error = ref<Error | null>(null)
// Advanced edit mode (mirrors legacy E.AdvMode)
const advMode = ref(false)

// Load from API
async function loadFromApi() {
  console.log("[loadFromApi] called")
  loading.value = true
  error.value = null
  try {
    const res = await fetch("/api/editor-data")
    if (!res.ok) throw new Error("Failed to load editor data")
    const data = await res.json()
    console.log("[loadFromApi] API data:", JSON.parse(JSON.stringify(data)))
    // Store all faces
    for (const face of faceNames) {
      faces.value[face] = data[face] || []
    }
    // Set template IDs and fonts in orderVars for background loading and font loading
    const orderVars = useOrderVars()
    orderVars.frontTemplateID = data.FrontTemplateID || 0
    orderVars.backTemplateID = data.BackTemplateID || 0
    orderVars.insideTemplateID = data.InsideTemplateID || 0
    orderVars.envelopeTemplateID = data.EnvelopeTemplateID || 0
    // Assign fonts from API to orderVars
    if (Array.isArray(data.LoadedFonts)) {
      if (!Array.isArray(orderVars.loadedFonts)) orderVars.loadedFonts = []
      orderVars.loadedFonts.splice(0, orderVars.loadedFonts.length, ...data.LoadedFonts)
      console.log("[loadFromApi] Set loadedFonts:", orderVars.loadedFonts)
    }
    if (Array.isArray(data.AllFonts)) {
      if (!Array.isArray(orderVars.allFonts)) orderVars.allFonts = []
      orderVars.allFonts.splice(0, orderVars.allFonts.length, ...data.AllFonts)
      console.log("[loadFromApi] Set allFonts:", orderVars.allFonts)
    }
    console.log("[loadFromApi] Set orderVars:", JSON.parse(JSON.stringify(orderVars)))
  } catch (e: any) {
    error.value = e
  } finally {
    loading.value = false
  }
}

// Computed: objects for selected face
const currentObjects = computed(() => faces.value[selectedFace.value] || [])

// Computed: text fields, images, shapes, coupons for selected face
const textFields = computed(() =>
  currentObjects.value
    .filter((obj: any) => obj.ResourceType === "T")
    .map((obj: any, idx: number) => {
      const mapped = {
        id: obj.ID?.toString() || `text-${idx}`,
        label: obj.ObjectName || `Text ${idx + 1}`,
        value: obj.Text || obj.text || "",
        left: obj.Left ?? obj.left ?? obj.X ?? obj.x ?? 0,
        top: obj.Top ?? obj.top ?? obj.Y ?? obj.y ?? 0,
        width: obj.Width ?? obj.width ?? 200,
        height: obj.Height ?? obj.height ?? 40,
        fontSize: parseInt(obj.FontSize || obj.fontSize || obj.OrgFontSize || 24),
        fontFamily: (() => {
          let val = obj.Font
          if (typeof val !== "string" || !val.trim()) val = obj.fontFamily
          if (typeof val !== "string" || !val.trim()) val = "Arial"
          // Normalize font family to match CSS (e.g., 'mrs eaves small caps' → 'MrsEavesSmallCaps')
          val = String(val).trim()
          // Remove spaces and capitalize each word (legacy font tool style)
          if (val.toLowerCase() === "mrs eaves small caps" || val.toLowerCase() === "mrseavessmallcaps") {
            return "MrsEavesSmallCaps"
          }
          // Add more normalization rules as needed
          return val.replace(/\s+/g, "")
        })(),
        fill: obj.FontColor || obj.FillColor || obj.Color || obj.color || obj.fill || "#000",
        fontWeight: obj.FontWeight || (obj.FontStyle && obj.FontStyle.includes("fsBold") ? "bold" : undefined),
        fontStyle: obj.FontStyle && obj.FontStyle.includes("Italic") ? "italic" : undefined,
        textAlign: obj.TextAlign ? (obj.TextAlign.startsWith("ta") ? obj.TextAlign.slice(2).toLowerCase() : obj.TextAlign) : "left",
        backgroundColor: obj.BackgroundColor || undefined,
        ...obj,
      }
      console.log("[useEditorData] mapped text=", mapped)
      return mapped
    })
)
import { useLexAppConfig } from "./useLexAppConfig"
const appConfig = useLexAppConfig()
const images = computed(() => {
  return currentObjects.value
    .filter((obj: any) => obj.ResourceType === "I")
    .map((obj: any) => {
      const text = obj.Text || obj.text || ""
      // base and groupPath will be computed below; use appConfig.imgsURL as base
      const rawGroup = obj.ObjectGroup || obj.objectGroup || ""
      let groupName = typeof rawGroup === "string" ? rawGroup.trim() : String(rawGroup || "")
      if (groupName.toLowerCase() === "logo" || groupName.toLowerCase() === "logos") groupName = "logos"
      groupName = groupName.replace(/^\/+|\/+$/g, "")
      const base = typeof appConfig.imgsURL === "string" ? appConfig.imgsURL.replace(/\/+$/g, "") : ""
      const groupPath = groupName ? `${groupName}/` : ""
      let url = base
      // Collapse duplicate slashes in the path portion but preserve protocol (https://)
      // Use a regex that avoids collapsing the '//' after the scheme (e.g. 'https://')
      if (text === "") {
        if (obj.ObjectType == 124) {
          url = `${base}/${groupPath}Default/1.png`.replace(/([^:]\/)\/+/g, "$1")
        } else {
          url = `${base}/${groupPath}M3/1.png?v=${appConfig.appVersion || "1"}`.replace(/([^:]\/)\/+/g, "$1")
        }
      } else if (text === "[Offer area]" || text === "Click here to add Coupon One" || text === "Click here to add Coupon Two") {
        url = `${base}/${groupPath}M3/1.png?v=${appConfig.appVersion || "1"}`.replace(/([^:]\/)\/+/g, "$1")
      } else {
        url = `${base}/${groupPath}${String(text).replace(/\\/g, "/")}.png`.replace(/([^:]\/)\/+/g, "$1")
      }

      // --- DEBUG/DEV URL REMAPPING LOGIC ---
      // Only remove '/Images/' and prepend localhost if running on localhost and url is not already absolute
      const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      if (isLocalhost) {
        if (url.includes("/Images/")) {
          url = url.replace("/Images/", "/")
        }
        if (!/^https?:\/\//i.test(url)) {
          url = `http://localhost:3000${url}`
        }
      } else {
        // On production, if not absolute, prepend prod domain
        if (!/^https?:\/\//i.test(url)) {
          url = `https://agentzmarketing.com${url}`
        }
      }
      // --- END DEBUG/DEV URL REMAPPING LOGIC ---

      const mapped = {
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
      console.log("[useEditorData] mapped image raw=", text, "final url=", url, "mapped=", mapped)
      return mapped
    })
})
const shapes = computed(() =>
  currentObjects.value
    .filter((obj: any) => obj.ResourceType === "S")
    .map((obj: any) => {
      const mapped = {
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
        Color:
          obj.FontColor ??
          obj.Color ??
          obj.color ??
          obj.FillColor ??
          obj.fillColor ??
          obj.fill ??
          obj.Fill ??
          obj.FILL ??
          obj.BgColor ??
          obj.bgColor ??
          obj.BGColor ??
          obj.BGCOLOR ??
          "#60a5fa",
        fill:
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
      }
      console.log("[useEditorData] mapped shape=", mapped)
      return mapped
    })
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

// Canvas/template size for selected face
const canvasSize = computed(() => {
  // Try to get from face meta or first object
  const objs = faces.value[selectedFace.value] || []
  if (objs.length > 0) {
    const w = objs[0].CanvasWidth || objs[0].TemplateWidth || 900
    const h = objs[0].CanvasHeight || objs[0].TemplateHeight || 600
    return { width: w, height: h }
  }
  return { width: 900, height: 600 }
})

// Update a text field by ID
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
    faces, // Expose faces so components can update the data model
    // Advanced edit helpers
    advMode,
    toggleAdvMode: () => {
      advMode.value = !advMode.value
      return advMode.value
    },
    advEditAllowed: () => {
      try {
        const orderVars = useOrderVars()
        const membership = orderVars.membershiptype ?? 0
        // Mirror legacy restrictions: disallow for certain membership types
        const disallowed = [/*JamesHardie*/ 0, /*GAF*/ 0, /*LPBuildsmart*/ 0, /*LifeWay*/ 0]
        // If membership equals any disallowed value then false, else true
        return !!(process?.env?.DEBUG || membership !== 0)
      } catch (e) {
        return true
      }
    },
    // Background image URL for the current face (legacy logic)
    backgroundImageUrl: computed(() => {
      // Map face to template ID property
      const faceToTemplateId = {
        FrontFace: "FrontTemplateID",
        BackFace: "BackTemplateID",
        InsideFace: "InsideTemplateID",
        EnvelopeFace: "EnvelopeTemplateID",
      }
      // Get template ID from loaded API data (if available)
      const faceKey = selectedFace.value as keyof typeof faceToTemplateId
      let templateId = null
      if (faces.value && faces.value[faceKey] && faces.value[faceKey][0]) {
        // Try to get from face meta or first object
        templateId = faces.value[faceKey][0][faceToTemplateId[faceKey]]
      }
      // Fallback: try to get from global data (not available in new API)
      if (!templateId) return null
      // Use appConfig for URL
      try {
        const appConfig = require("../composables/useLexAppConfig").useLexAppConfig()
        let templateURL = appConfig.templateURL
        // Legacy: for certain hostnames, use NewTemplates
        if (typeof window !== "undefined" && window.location && window.location.hostname) {
          const host = window.location.hostname.toUpperCase()
          if (["M3TOOLBOX.COM", "AGENTZMARKETING.COM", "LEXINETPRINTS.COM", "LEXINET.NET", "LIFEWAYSTORES.COM"].some((h) => host.indexOf(h) >= 0)) {
            templateURL = appConfig.WebData + "NewTemplates/"
          }
        }
        return templateURL + templateId + "p.jpg?v=" + appConfig.appVersion
      } catch (e) {
        return null
      }
    }),
  }
}
