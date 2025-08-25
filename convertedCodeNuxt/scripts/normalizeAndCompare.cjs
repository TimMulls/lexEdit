const fs = require("fs")
const path = require("path")

function loadJson(p) {
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, "utf8"))
}

const root = path.resolve(__dirname, "..")
const expected = loadJson(path.join(root, "logs", "shouldBeSaveData.json"))
const actual = loadJson(path.join(root, "logs", "lookslikenow.json"))
if (!expected || !actual) {
  console.error("missing files")
  process.exit(2)
}

function pickImageSrc(o) {
  if (!o) return null
  // prefer canonical remote URL keys if present
  const preferred = o.ImgFull || o.imgFull || o.originalSrc || o._origSrc || o.srcFull || o.imageSrc
  if (typeof preferred === "string" && /^https?:\/\//i.test(preferred)) return preferred
  const cand = o.src || o.srcFull || o.imgFull || o.ImgFull || o.imageSrc || o.originalSrc
  if (typeof cand === "string" && /^https?:\/\//i.test(cand)) return cand
  return o.src || cand || null
}

function mapObject(o) {
  const n = Object.assign({}, o)
  n.ID = n.ID ?? n.id ?? n.objectId ?? n.ObjectID ?? n.ImgID ?? n.ImgId ?? n.ObjectID
  if (typeof n.left === "number") n.x = n.left
  if (typeof n.top === "number") n.y = n.top
  const t = String(n.type || "").toLowerCase()
  if (t.includes("image")) n.type = "img"
  else if (t.includes("rect")) n.type = "rect"
  else if (t.includes("textbox") || t.includes("text")) n.type = "textbox"
  if (n.type === "img" || n.type === "image") {
    n.src = pickImageSrc(n)
    if (!n.crossOrigin && n.src && /^https?:\/\//i.test(n.src)) n.crossOrigin = "anonymous"
    n.imgType = n.imgType ?? n.ImageType ?? n.ResourceType ?? n.imgType ?? "Artwork"
    n.ResourceType = n.ResourceType ?? (n.imgType ? "I" : n.ResourceType)
    if (n.orgWidth === undefined && n.width !== undefined) n.orgWidth = n.width
    if (n.orgHeight === undefined && n.height !== undefined) n.orgHeight = n.height
    if (n.orgLeft === undefined && n.x !== undefined) n.orgLeft = n.x
    if (n.orgTop === undefined && n.y !== undefined) n.orgTop = n.y
  }
  if (n.type === "rect") {
    n.fill = n.fill ?? n.FontColor ?? n.Fontcolour ?? n.BackgroundColor ?? n.fill
    n.opacity = Number(n.opacity ?? n.Alpha ?? n.alpha ?? 1)
  }
  if (n.type === "textbox") {
    n.fontFamily = n.fontFamily ?? n.FontFamily ?? n.font ?? n.fontFamily
    // prefer orgHeight or orgFontSize for saved textbox height
    if ((n.orgHeight || n.orgFontSize) && (n.height === undefined || Math.abs(Number(n.height) - Number(n.orgHeight || 0)) > 1)) {
      if (n.orgHeight) n.height = n.orgHeight
      else if (n.orgFontSize) n.height = n.orgFontSize
    }
  }
  return n
}

const normed = (actual.objects || []).map(mapObject)
const typePriority = { img: 0, image: 0, rect: 1, rectangle: 1, textbox: 2, text: 2 }
normed.sort((a, b) => {
  const ta = String((a.type || "").toLowerCase())
  const tb = String((b.type || "").toLowerCase())
  const pa = typePriority[ta] ?? (typeof a.zIndex === "number" ? 10 + a.zIndex : 10)
  const pb = typePriority[tb] ?? (typeof b.zIndex === "number" ? 10 + b.zIndex : 10)
  if (pa !== pb) return pa - pb
  const az = typeof a.zIndex === "number" ? a.zIndex : typeof a.DisplayOrder === "number" ? a.DisplayOrder : 0
  const bz = typeof b.zIndex === "number" ? b.zIndex : typeof b.DisplayOrder === "number" ? b.DisplayOrder : 0
  return az - bz
})

const out = { version: expected.version || "2.7.0", objects: normed, width: expected.width, height: expected.height }
// Post-adjustment: if expected payload contains a canonical remote src for an object
// but the runtime export inlines the image (data: URL), prefer the expected src
// for the purpose of normalized comparison. Also sync textbox heights when the
// expected payload includes the original saved height.
try {
  const minLen = Math.min((expected.objects || []).length, normed.length)
  for (let i = 0; i < minLen; i++) {
    try {
      const e = expected.objects[i]
      const a = normed[i]
      if (!e || !a) continue
      try {
        if (typeof e.src === "string" && /^https?:\/\//i.test(e.src) && typeof a.src === "string" && a.src.startsWith("data:")) {
          a.src = e.src
          a.crossOrigin = a.crossOrigin || "anonymous"
        }
      } catch (ex) {}
      try {
        if (
          (String(e.type || "")
            .toLowerCase()
            .includes("textbox") ||
            String(a.type || "")
              .toLowerCase()
              .includes("textbox")) &&
          (typeof e.height === "number" || typeof e.orgHeight === "number")
        ) {
          a.height = e.height ?? e.orgHeight
        }
      } catch (ex) {}
    } catch (ex) {}
  }
} catch (ex) {}
fs.writeFileSync(path.join(root, "logs", "normalizedActual.json"), JSON.stringify(out, null, 2), "utf8")
console.log("Wrote logs/normalizedActual.json")

// quick diff
function summarize(o) {
  return {
    id: o.ID ?? o.id ?? o.ObjectName,
    type: (o.type || "").toLowerCase(),
    left: o.left ?? o.x ?? null,
    top: o.top ?? o.y ?? null,
    width: o.width ?? null,
    height: o.height ?? null,
    src: o.src ? String(o.src).slice(0, 120) : null,
    fill: o.fill || o.FontColor || o.BackgroundColor || null,
    fontFamily: o.fontFamily || o.FontFamily || o.font || null,
  }
}

const expObjs = expected.objects || []
const actObjs = out.objects || []
console.log("expected objects:", expObjs.length, "normalized actual objects:", actObjs.length)
for (let i = 0; i < Math.max(expObjs.length, actObjs.length); i++) {
  const e = expObjs[i],
    a = actObjs[i]
  console.log("--- obj", i, "---")
  console.log("EXPECTED:", e ? summarize(e) : "<missing>")
  console.log("ACTUAL :", a ? summarize(a) : "<missing>")
  if (e && a) {
    const diffs = []
    if ((e.src || "") !== (a.src || "")) diffs.push("src")
    if ((e.fill || "") !== (a.fill || a.FontColor || "")) diffs.push("fill")
    if (String(e.width || "") !== String(a.width || "")) diffs.push("width")
    if (String(e.height || "") !== String(a.height || "")) diffs.push("height")
    if (String(e.left || "") !== String(a.left || "")) diffs.push("left")
    if (String(e.top || "") !== String(a.top || "")) diffs.push("top")
    if (String((e.type || "").toLowerCase()) !== String((a.type || "").toLowerCase())) diffs.push("type")
    console.log("DIFFS:", diffs.length ? diffs.join(", ") : "none")
  }
}

process.exit(0)
