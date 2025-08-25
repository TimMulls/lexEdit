const fs = require("fs")
const path = require("path")

function loadJsonFile(p) {
  if (!fs.existsSync(p)) return null
  let txt = fs.readFileSync(p, "utf8")
  // strip code fences if present
  txt = txt.replace(/^\s*```[\s\S]*?\n/, "")
  txt = txt.replace(/\n```\s*$/, "")
  try {
    return JSON.parse(txt)
  } catch (e) {
    try {
      return JSON.parse(txt.trim())
    } catch (ee) {
      return null
    }
  }
}

const repoRoot = path.resolve(__dirname, "..")
const expectedPath = path.join(repoRoot, "logs", "shouldBeSaveData.json")
const actualPath = path.join(repoRoot, "logs", "lookslikenow.txt")
const expected = loadJsonFile(expectedPath)
const actual = loadJsonFile(actualPath)
if (!expected) {
  console.error("Missing expected payload at", expectedPath)
  process.exit(2)
}
if (!actual) {
  console.error("Missing or unparsable actual payload at", actualPath)
  process.exit(2)
}

function key(o) {
  return String(o.ID ?? o.id ?? o.ObjectName ?? o.ObjectName ?? "<unknown>")
}

console.log("Expected version:", expected.version)
console.log("Actual version:", actual.version)

const expObjs = expected.objects || []
const actObjs = actual.objects || []
console.log("expected objects:", expObjs.length, "actual objects:", actObjs.length)

function summarize(o) {
  return {
    id: o.ID ?? o.id ?? o.ObjectName,
    type: (o.type || o.Type || "").toLowerCase(),
    left: o.left ?? o.x ?? null,
    top: o.top ?? o.y ?? null,
    width: o.width ?? null,
    height: o.height ?? null,
    src: o.src ? String(o.src).slice(0, 200) : null,
    fill: o.fill || o.FontColor || o.BackgroundColor || null,
    fontFamily: o.fontFamily || o.FontFamily || o.font || null,
  }
}

for (let i = 0; i < Math.max(expObjs.length, actObjs.length); i++) {
  const e = expObjs[i]
  const a = actObjs[i]
  console.log("--- object", i, "---")
  if (!e) {
    console.log("EXPECTED: <missing>")
  } else console.log("EXPECTED:", summarize(e))
  if (!a) {
    console.log("ACTUAL: <missing>")
  } else console.log("ACTUAL:", summarize(a))
  if (e && a) {
    // quick diffs
    const diffs = []
    if ((e.src || "") !== (a.src || "")) diffs.push("src")
    if ((e.fill || "") !== (a.fill || a.FontColor || "")) diffs.push("fill")
    if (String(e.width || "") !== String(a.width || "")) diffs.push("width")
    if (String(e.height || "") !== String(a.height || "")) diffs.push("height")
    if (String(e.left || "") !== String(a.left || "")) diffs.push("left")
    if (String(e.top || "") !== String(a.top || "")) diffs.push("top")
    if (String((e.type || "").toLowerCase()) !== String((a.type || "").toLowerCase())) diffs.push("type")
    if (diffs.length) console.log("DIFFS:", diffs.join(", "))
    else console.log("DIFFS: none")
  }
}
