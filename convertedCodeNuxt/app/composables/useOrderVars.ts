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
    // Normalize incoming keys (API may use PascalCase / uppercase keys like UserID, OrderNumber)
    const normalized: any = {}
    const getFirst = (obj: any, candidates: string[]) => {
      for (const c of candidates) if (obj && Object.prototype.hasOwnProperty.call(obj, c)) return obj[c]
      return undefined
    }

    // map common API keys to local reactive keys
    normalized.orderNumber = getFirst(data, ["OrderNumber", "orderNumber"])
    normalized.userId = getFirst(data, ["UserID", "UserId", "userId"])
    normalized.portalId = getFirst(data, ["PortalID", "portalId", "PortalId"])
    normalized.membershiptype = getFirst(data, ["MembershipType", "membershiptype", "membership"])
    normalized.sessionId = getFirst(data, ["SessionID", "sessionId", "session"])
    normalized.defaultSide = getFirst(data, ["DefaultSide", "defaultSide"])
    normalized.marketingSeries = getFirst(data, ["MarketingSeries", "marketingSeries"])
    normalized.frontJSON = getFirst(data, ["FrontJSON", "frontJSON"])
    normalized.insideJSON = getFirst(data, ["InsideJSON", "insideJSON"])
    normalized.backJSON = getFirst(data, ["BackJSON", "backJSON"])
    normalized.envelopeJSON = getFirst(data, ["EnvelopeJSON", "envelopeJSON"])
    normalized.frontTemplateID = getFirst(data, ["FrontTemplateID", "frontTemplateID"])
    normalized.insideTemplateID = getFirst(data, ["InsideTemplateID", "insideTemplateID"])
    normalized.backTemplateID = getFirst(data, ["BackTemplateID", "backTemplateID"])
    normalized.envelopeTemplateID = getFirst(data, ["EnvelopeTemplateID", "envelopeTemplateID"])
    normalized.frontEditAllowed = getFirst(data, ["frontEditAllowed", "FrontEditAllowed"])
    normalized.insideEditAllowed = getFirst(data, ["insideEditAllowed", "InsideEditAllowed"])
    normalized.backEditAllowed = getFirst(data, ["backEditAllowed", "BackEditAllowed"])
    normalized.productSize = getFirst(data, ["productSize", "ProductSize"])
    normalized.productType = getFirst(data, ["productType", "ProductType"])
    normalized.allowCutLines = getFirst(data, ["allowCutLines", "AllowCutLines"])
    normalized.currentPage = getFirst(data, ["currentPage", "CurrentPage"])
    normalized.hasCoupons = getFirst(data, ["hasCoupons", "HasCoupons"])
    normalized.currentCouponSize = getFirst(data, ["currentCouponSize", "CurrentCouponSize"])
    normalized.isLoadingTemplate = getFirst(data, ["isLoadingTemplate", "IsLoadingTemplate"])
    normalized.allSidesEdited = getFirst(data, ["allSidesEdited", "AllSidesEdited"])
    normalized.backEdited = getFirst(data, ["backEdited", "BackEdited"])
    normalized.insideEdited = getFirst(data, ["insideEdited", "InsideEdited"])

    // Coerce numeric-ish fields
    const numFields = ["orderNumber", "userId", "portalId", "frontTemplateID", "insideTemplateID", "backTemplateID", "envelopeTemplateID", "productSize", "productType"]
    for (const k of numFields) {
      if (normalized[k] !== undefined && normalized[k] !== null) {
        const n = Number(normalized[k])
        normalized[k] = Number.isNaN(n) ? normalized[k] : n
      }
    }

    // Shallow-merge normalized data into reactive orderVars
    Object.assign(orderVars, normalized)
    // Preserve font arrays and other arrays explicitly below
    // Normalize font family names to match mapping and CSS (e.g., 'Mrs Eaves Small Caps' → 'MrsEavesSmallCaps')
    function normalizeFontName(font?: string | null): string {
      const s = typeof font === "string" ? font : ""
      if (!s) return ""
      const name = (s.split(":")[0] ?? "").trim()
      if (name.toLowerCase() === "mrs eaves small caps" || name.toLowerCase() === "mrseavessmallcaps") {
        return s.replace(name, "MrsEavesSmallCaps")
      }
      // Add more normalization rules as needed
      return s.replace(name, name.replace(/\s+/g, ""))
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
