// Ported from OldCode/src/app/orderVars.ts
import { reactive } from "vue"
const orderVars = reactive({
  orderNumber: 0,
  userId: 0,
  portalId: 0,
  membershiptype: 0,
  sessionId: "",
  defaultSide: "",
  marketingSeries: false,
  frontJSON: "",
  insideJSON: "",
  backJSON: "",
  envelopeJSON: "",
  frontTemplateID: 0,
  insideTemplateID: 0,
  backTemplateID: 0,
  envelopeTemplateID: 0,
  frontEditAllowed: false,
  insideEditAllowed: false,
  backEditAllowed: false,
  productSize: 0,
  productType: 0,
  allowCutLines: false,
  currentPage: 0,
  hasCoupons: false,
  currentCouponSize: "",
  isLoadingTemplate: false,
  allSidesEdited: false,
  backEdited: false,
  insideEdited: false,
  loadedFonts: [] as string[],
  allFonts: [] as string[],
})

export async function fetchOrderVars() {
  try {
    const res = await fetch("/api/order-vars")
    if (!res.ok) throw new Error("Failed to load order vars")
    const data = await res.json()
    Object.assign(orderVars, data)
    // Normalize font family names to match mapping and CSS (e.g., 'Mrs Eaves Small Caps' → 'MrsEavesSmallCaps')
    function normalizeFontName(font: string | undefined) {
      if (typeof font !== "string" || !font) return font ?? ""
      const name = (font ?? "").split(":")[0].trim()
      if (name.toLowerCase() === "mrs eaves small caps" || name.toLowerCase() === "mrseavessmallcaps") {
        return font.replace(name, "MrsEavesSmallCaps")
      }
      // Add more normalization rules as needed
      return font.replace(name, name.replace(/\s+/g, ""))
    }
    if (Array.isArray(data.LoadedFonts)) {
      if (!Array.isArray(orderVars.loadedFonts)) orderVars.loadedFonts = []
      const normalized = data.LoadedFonts.map(normalizeFontName)
      orderVars.loadedFonts.splice(0, orderVars.loadedFonts.length, ...normalized)
      // console.log("[fetchOrderVars] Set loadedFonts:", orderVars.loadedFonts)
    }
    if (Array.isArray(data.AllFonts)) {
      if (!Array.isArray(orderVars.allFonts)) orderVars.allFonts = []
      const normalized = data.AllFonts.map(normalizeFontName)
      orderVars.allFonts.splice(0, orderVars.allFonts.length, ...normalized)
      // console.log("[fetchOrderVars] Set allFonts:", orderVars.allFonts)
    }
    return orderVars
  } catch (e) {
    // Optionally handle error
    // console.error('Failed to fetch order vars', e)
    return orderVars
  }
}

export function useOrderVars() {
  return orderVars
}
