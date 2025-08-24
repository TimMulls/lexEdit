// API route for GetOrderVars example data
import { defineEventHandler } from "h3"
import { promises as fs } from "fs"
import { join } from "path"

const REMOTE_ORDERVARS_URL =
  "https://agentzmarketing.com/DesktopModules/EditorServices/API/LexEditor/GetOrderVars?enc=xp9zJWGBb99iuvodeRz03xKygs9jN3p2rzaY6Mu2FGCqQIS0iyLkG97B%2BZFf4SqVDigmnBdgJWX1j77jabFuUzMDKPymTM0XoZ9lNXieYTqYCqwSUiXcpQ1MzFM774xYpJvDEl1X1ZYo24ICNbaYTtH1FppVpc3TRwLXxYh77vPusnKHqy0UXUaOn%2FxqqIo1ss4lODmeplxmc2uDOjNWPg%3D%3D"

const CACHE_DIR = join(process.cwd(), "server", ".cache")
const CACHE_FILE = join(CACHE_DIR, "order-vars.json")
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

const FALLBACK = {
  OrderNumber: 292879,
  UserID: 42707,
  PortalID: 4,
  MembershipType: 100027,
  SessionID: "1axrn53oagwmqvxdwi1la5cy",
  Side: "",
  MarketingSeries: false,
  LoadedFonts: ["Arial:n4,i4,n7,i7", "Montserrat:n4,n7,i7", "Mrs Eaves Small Caps:n4"],
  AllFonts: [
    "Aachen BT:n4,n7",
    "Adobe Caslon Regular:n4,i4,n7,i7",
    "Arbutus Slab Regular:n4",
    "Arial Narrow:n4,i4,n7,i7",
    "Arial Rounded MT Bold:n4",
    "Arial:n4,i4,n7,i7",
    "AustralSlabRust-Regular:n4",
    "Baginda Script:n4",
    "Bauhaus Light:n4,i4,n7,i7",
    "Bebas Neue:n4",
    "BernhardMod BT:n4,i4,n7,i7",
    "Black Ground:n4",
    "BlackJack:n4,i4,n7,i7",
    "BlockBE-Condensed:n4",
    "Bodoni MT:n4,i4,n7,i7",
    "Brooke Smith Script:n4,i4,n7,i7",
    "Caecilia LT Std Light:n4",
    "Caecilia LT Std Roman:n4",
    "CaflischScript:n4,n7",
    "Calisto MT:n4,i4,n7,i7",
    "Cambria:n4,i4,n7,i7",
    "Cammron Demo:n4",
    "Cardenio Modern:n4,n7",
    "Caslon:n4,i4,n7,i7",
    "Caviar Dreams:n4,i4,n7,i7",
    "Century Gothic:n4,i4,n7,i7",
    "Champagne & Limousines:n4,i4,n7,i7",
    "Concrete:n4",
    "Corky:n4",
    "Crimson Text:n4,i4,n7,i7",
    "Crunchy:n4",
    "Dancing Script:n4,n7",
    "Darling Modern:n4",
    "DK Longreach:n4",
    "Dominique:n4",
    "DTC Water Floatie:n4",
    "Dulcelin:n4",
    "Emilea:n4",
    "FLOTTA:n4",
    "Franklin Gothic Demi:n4,i4",
    "FranklinGothic-Book:n4,i4",
    "Freehand591:n4,n7",
    "Futura:n4,i4,n7",
    "Futura-Bold:n7",
    "Futura-Bold_Oblique:i7",
    "FuturaBT-Light:n4,i4",
    "Futura-Condensed:n7",
    "Futura-CondensedExtraBold:n4",
    "Futura-ExtraBold:n7",
    "Garamond:n4,i4,n7,i7",
    "Gargle Rg:n4,i4,n7,i7",
    "Georgia Belle:n4",
    "Gibson:n4",
    "GillSans:n4,i4,n7,i7",
    "Glitter lovers:n4",
    "Gotham Book:n4,i4,n7,i7",
    "Gotham Medium:n4",
    "Hackney Vector:n4",
    "Handwriting:n4",
    "Harlow Duo Script:n4",
    "Helvetica Condensed:n4,i4,n7,i7",
    "Helvetica:n4,i4,n7,i7",
    "Helvetica-Condensed-Black:n4,i4,n7,i7",
    "Helvetica-Condensed-Bold:n7",
    "HelveticaNeue:n4,i4,n7,i7",
    "HelveticaNeueLT Pro 55 Roman:n4",
    "HelveticaNeueLT Std Cn:n4",
    "HelveticaNeueLT Std Lt Cn:n4",
    "HelveticaNeueLT Std Med Cn:n4",
    "HONEY&JAM:n4",
    "ITC Avant Garde Std Bk:n4",
    "ITC Avant Garde Std Bk:n4,n7",
    "ITC Galliard:n4,i4,n7,i7",
    "ITCAvantGardeGothic:n4,i4,n7,i7",
    "Josefin Sans:n4,i4,n7,i7",
    "KidDos Font KidDos Font:n4",
    "LemonadeICG:n4",
    "Lobster Two:n4,i4,n7,i7",
    "Lora:n4,i4,n7,i7",
    "Marshmallow Regular:n4,i4,n7,i7",
    "Melvern:n4",
    "Mermaid:n4",
    "Milkshake Script Thin:n4",
    "Minion Pro:n4,i4,n7,i7",
    "Monotype Corsiva:n4",
    "Montserrat:n4,n7,i7",
    "Moonbright Demo:n4",
    "Mrs Eaves Small Caps:n4",
    "Myriad Condensed:n4,i4,n7,i7",
    "Myriad:n4,i4,n7,i7",
    "NewBaskerville:n4,i4,n7,i7",
    "Octin Vintage Free:n4",
    "Optima Roman:n4,i4,n7,i7",
    "Oxida:n4",
    "Palatino Linotype:n4,i4,n7,i7",
    "Professionals Sans:n4,i4,n7,i7",
    "Promixa Nova:n4",
    "Proxima Nova Rg:n4",
    "Rockwell:n4,i4,n7,i7",
    "Serlio LT Std:n4,i4,n7,i7",
    "Stay:n4",
    "Superclarendon:n4,i4,n7,i7",
    "Tahoma:n4,i4,n7,i7",
    "Times New Roman:n4,i4,n7,i7",
    "Trajan:n4,n7",
    "Trebuchet MS:n4,i4,n7,i7",
    "Univers Condensed:n4,i4,n7,i7",
    "Univers UltraCondensed:n4",
    "Univers:n4,i4,n7,i7",
    "Wild Mango:n4",
    "ZapfChancery:n4,i4,n7,i7",
  ],
}

async function readCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8")
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.ts || !parsed.payload) return null
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
    return parsed.payload
  } catch (e) {
    return null
  }
}

async function writeCache(payload: any) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    const toWrite = JSON.stringify({ ts: Date.now(), payload }, null, 2)
    await fs.writeFile(CACHE_FILE, toWrite, "utf8")
  } catch (e) {
    console.error("order-vars cache write failed", e)
  }
}

export default defineEventHandler(async () => {
  // Try cache first
  try {
    const cached = await readCache()
    if (cached) return cached
  } catch (e) {}

  // Fetch remote and update cache
  try {
    const res = await fetch(REMOTE_ORDERVARS_URL)
    if (!res.ok) throw new Error(`remote fetch failed: ${res.status}`)
    const text = await res.text()
    let payload: any = null
    try {
      payload = JSON.parse(text || "{}")
    } catch (e) {
      payload = text
    }
    // persist cache and return
    try {
      await writeCache(payload)
    } catch (e) {}
    return payload
  } catch (e) {
    console.error("GetOrderVars proxy failed, returning fallback", e)
    // try cache even if stale
    const stale = await (async () => {
      try {
        const raw = await fs.readFile(CACHE_FILE, "utf8")
        const parsed = JSON.parse(raw)
        return parsed?.payload ?? null
      } catch (e) {
        return null
      }
    })()
    return stale || FALLBACK
  }
})
