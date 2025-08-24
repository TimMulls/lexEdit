import { useLexAppConfig } from "./useLexAppConfig"
import { useOrderVars } from "./useOrderVars"

export function loadEditorFonts({
  onLoading,
  onFontLoading,
  onFontActive,
  onFontInactive,
  onInactive,
  onActive,
}: {
  onLoading?: (families: string[]) => void
  onFontLoading?: (fontFamily: string, fontDescription: string) => void
  onFontActive?: (fontFamily: string, fontDescription: string) => void
  onFontInactive?: (fontFamily: string, fontDescription: string) => void
  onInactive?: () => void
  onActive?: () => void
} = {}) {
  if (typeof window === "undefined") return // Only run on client
  // Dynamically import webfontloader only on client
  import("webfontloader").then((WebFontModule) => {
    const WebFont = WebFontModule.default || WebFontModule
    const config = useLexAppConfig()
    const orderVars = useOrderVars()
    const families =
      orderVars.loadedFonts && orderVars.loadedFonts.length > 0
        ? (orderVars.loadedFonts.map((f) => (f && typeof f === "string" ? f.split(":")[0] : undefined)).filter(Boolean) as string[])
        : ["Arial"]
    // Debug: log raw font list
    console.log("[WebFontLoader] Raw font list:", families)
    // Filter out undefined, null, empty, or non-string values
    const validFonts = families.filter((f) => typeof f === "string" && f.trim().length > 0)
    if (!validFonts.length) {
      console.warn("[WebFontLoader] No valid fonts to load after filtering.")
      return
    }
    WebFont.load({
      custom: {
        families: validFonts,
        urls: [config.fontsCssFile],
      },
      loading() {
        onLoading?.(validFonts)
      },
      fontloading(fontFamily, fontDescription) {
        onFontLoading?.(fontFamily, fontDescription)
      },
      fontactive(fontFamily, fontDescription) {
        onFontActive?.(fontFamily, fontDescription)
      },
      fontinactive(fontFamily, fontDescription) {
        onFontInactive?.(fontFamily, fontDescription)
      },
      inactive() {
        onInactive?.()
      },
      active() {
        onActive?.()
      },
    })
  })
}
