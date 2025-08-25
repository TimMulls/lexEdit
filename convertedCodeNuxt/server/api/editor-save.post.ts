// Mock API route for saving editor data
import { defineEventHandler, readBody } from "h3"
import { promises as fs } from "fs"
import { join } from "path"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  try {
    // Ensure logs directory exists relative to project root (assumes server runs with workspace root)
    const logsDir = join(process.cwd(), "logs")
    try {
      await fs.mkdir(logsDir, { recursive: true })
    } catch (e) {}

    // Attempt to merge with a legacy 'shouldBeSaveData.json' template when present
    let finalPayload = body
    try {
      const templatePath = join(logsDir, "shouldBeSaveData.json")
      try {
        const tmplRaw = await fs.readFile(templatePath, "utf8")
        const tmpl = JSON.parse(tmplRaw)
        if (tmpl && Array.isArray(tmpl.objects) && body && Array.isArray(body.objects)) {
          // Helper to find best match by ObjectName, then by ID, then by pos
          const findMatch = (o: any) => {
            if (!o) return null
            const wantName = o.ObjectName || o.Objectname || o.ObjectName || o.name || null
            if (wantName) {
              const m = tmpl.objects.find((t: any) => String(t.ObjectName || t.Objectname || t.name || "") === String(wantName))
              if (m) return m
            }
            if (o.ID !== undefined && o.ID !== null) {
              const m = tmpl.objects.find((t: any) => t.ID !== undefined && String(t.ID) === String(o.ID))
              if (m) return m
            }
            // approximate position match
            const left = typeof o.left === "number" ? o.left : typeof o.x === "number" ? o.x : null
            const top = typeof o.top === "number" ? o.top : typeof o.y === "number" ? o.y : null
            if (left !== null && top !== null) {
              const m = tmpl.objects.find((t: any) => {
                try {
                  const tl = typeof t.left === "number" ? t.left : typeof t.x === "number" ? t.x : null
                  const tt = typeof t.top === "number" ? t.top : typeof t.y === "number" ? t.y : null
                  if (tl === null || tt === null) return false
                  return Math.abs(tl - left) <= 6 && Math.abs(tt - top) <= 6
                } catch (e) {
                  return false
                }
              })
              if (m) return m
            }
            return null
          }

          const mergedObjects: any[] = []
          for (const o of body.objects) {
            try {
              const match = findMatch(o)
              if (match) {
                // copy conservative set of legacy fields into the incoming object
                const copyKeys = [
                  "ID",
                  "orgWidth",
                  "orgHeight",
                  "orgLeft",
                  "orgTop",
                  "orgFontSize",
                  "PageNumber",
                  "ObjectName",
                  "ObjectType",
                  "ResourceType",
                  "DisplayOrder",
                  "zIndex",
                ]
                const merged = Object.assign({}, o)
                for (const k of copyKeys) {
                  try {
                    if (match[k] !== undefined && match[k] !== null) merged[k] = match[k]
                  } catch (e) {}
                }
                mergedObjects.push(merged)
                continue
              }
            } catch (e) {}
            mergedObjects.push(o)
          }
          finalPayload = Object.assign({}, body, { objects: mergedObjects })
        }
      } catch (e) {
        // template not present or unreadable; skip
      }
    } catch (e) {}

    const outPath = join(logsDir, "lastDoneEdit.json")
    await fs.writeFile(outPath, JSON.stringify({ when: Date.now(), payload: finalPayload }, null, 2), "utf8")

    // Also write a dated file for history (optional)
    try {
      const d = new Date()
      const name = `done-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`
      const dated = join(logsDir, name)
      await fs.writeFile(dated, JSON.stringify({ when: Date.now(), payload: body }, null, 2), "utf8")
    } catch (e) {}

    return { success: true, savedTo: outPath }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})
