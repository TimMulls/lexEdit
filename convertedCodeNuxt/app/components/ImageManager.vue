<template>
  <div class="fixed inset-0 z-50 bg-white border shadow-lg flex pointer-events-auto">
    <div class="w-44 border-r p-2 bg-gray-50">
      <div class="font-bold mb-2 flex items-center gap-2"><i class="material-icons">image</i> My Images</div>
      <ul class="space-y-1 text-sm">
        <li
          v-for="t in types"
          :key="t.key"
          :class="['p-2 hover:bg-gray-100 rounded cursor-pointer', t.key === activeType ? 'bg-primary-50 font-medium' : '']"
          @click="loadImages(t.key)">
          {{ t.label }}
        </li>
      </ul>
    </div>
    <div class="flex-1 p-4 overflow-auto">
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm text-gray-600">
          Showing: <strong class="ml-1">{{ activeLabel }}</strong>
        </div>
        <div>
          <button class="text-xs px-2 py-1 border rounded mr-2" @click="refresh">Refresh</button>
          <button class="text-xs px-2 py-1 border rounded" @click="$emit('close')">Close</button>
        </div>
      </div>

      <div class="border rounded p-4 mb-4">
        <div class="text-xs text-gray-500 mb-2">Upload / Drag & Drop (legacy Dropzone is not ported here)</div>
        <div class="h-40 border-dashed border-2 border-gray-200 flex items-center justify-center">Upload placeholder</div>
      </div>

      <div v-if="loading" class="py-8 text-center text-sm text-gray-500">Loading images...</div>

      <div v-else class="mt-4 grid grid-cols-4 gap-3">
        <div
          v-for="(img, idx) in images"
          :key="img.ImgID || img.CouponID || img.ImgFull"
          :ref="(el) => (imgRefs[idx] = el)"
          :class="[
            'border rounded overflow-hidden bg-white',
            selectedInitialId && (img.ImgID || img.CouponID || img.ImgFull) == selectedInitialId ? 'ring-2 ring-primary-400' : '',
          ]">
          <div class="relative">
            <img :src="makeFullUrl(img.ImgThumb || img.ImgFull || img.CouponThumb)" class="w-full h-32 object-cover" />
            <span v-if="(img as any)._isDefault" class="absolute top-1 left-1 bg-yellow-200 text-xs text-yellow-800 px-1 py-0.5 rounded">Default</span>
          </div>
          <div class="p-2 text-xs flex items-center justify-between">
            <div class="truncate pr-2">{{ (img.ImgName || img.CouponDescription || "").slice(0, 32) }}</div>
            <div class="flex items-center gap-1">
              <!-- If default, auxiliary Download button -->
              <button v-if="(img as any)._isDefault" class="text-xs px-2 py-0.5 border rounded" @click="onDownload(img)">Download</button>

              <!-- Main action: Replace when canvas has selection, otherwise Add -->
              <button v-if="showReplaceRef" class="text-xs px-2 py-0.5 border rounded bg-yellow-50" @click="onReplace(img)">Replace</button>
              <button v-else class="text-xs px-2 py-0.5 border rounded" @click="onSelect(img)">{{ selectLabel(img) }}</button>

              <button v-if="canEdit(img)" class="text-xs px-2 py-0.5 border rounded" @click="onEdit(img)">Edit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="w-44 border-l p-2 bg-gray-50">
      <div class="text-sm font-medium mb-2">Size & Shape</div>
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <button class="text-xs px-2 py-1 border rounded" @click.prevent="setPreset(50)">Small</button>
          <button class="text-xs px-2 py-1 border rounded" @click.prevent="setPreset(75)">Medium</button>
          <button class="text-xs px-2 py-1 border rounded" @click.prevent="setPreset(100)">Large</button>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-xs">Scale %</label>
          <input type="number" min="10" max="200" v-model.number="sizePct" class="w-16 text-sm px-2 py-1 border rounded" />
        </div>

        <div>
          <label class="text-xs">Shape</label>
          <select v-model="shape" class="w-full text-sm px-2 py-1 border rounded">
            <option value="fit">Fit</option>
            <option value="crop">Crop</option>
            <option value="circle">Circle</option>
            <option value="stretch">Stretch</option>
          </select>
        </div>

        <div class="flex items-center justify-between">
          <button class="text-xs px-2 py-1 border rounded" @click="$emit('close')">Close</button>
          <div class="text-xs text-gray-500">Preview scale: {{ sizePct }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue"
import { useLexAppConfig } from "../composables/useLexAppConfig"
import { useOrderVars } from "../composables/useOrderVars"

const emit = defineEmits(["close", "select-image", "replace-image"])

const types = [
  { key: "Artwork", label: "Design Photos" },
  { key: "Logos", label: "Logos" },
  { key: "Signatures", label: "Signatures" },
  { key: "PersonalPhotos", label: "Personal Photos" },
  { key: "OwnDesigns", label: "Own Designs" },
  { key: "QRCodes", label: "QR Codes" },
  { key: "Coupons", label: "Coupons" },
]

const appConfig = useLexAppConfig()
const orderVars = useOrderVars()

const props = defineProps<{ initialImage?: any; hasImageSelected?: boolean }>()

// size/shape controls
const sizePct = ref<number>(75)
const shape = ref<string>("fit")
function setPreset(pct: number) {
  sizePct.value = pct
}

// reactive boolean copied from prop to avoid timing issues when loading images
const showReplaceRef = ref<boolean>(false)
try {
  showReplaceRef.value = !!(props && (props as any).hasImageSelected)
} catch (e) {
  showReplaceRef.value = false
}
watch(
  () => (props as any).hasImageSelected,
  (v) => {
    try {
      showReplaceRef.value = !!v
    } catch (e) {
      showReplaceRef.value = false
    }
  }
)

const activeType = ref<string>("Artwork")
const images = ref<any[]>([])
const loading = ref(false)
const selectedInitialId = ref<string | null>(null)
const imgRefs: any[] = []

// When images change, try to scroll the initial image into view if present
watch(images, async () => {
  if (!selectedInitialId.value) return
  await nextTick()
  try {
    const idx = images.value.findIndex((i: any) => String(i.ImgID || i.CouponID || i.ImgFull) === String(selectedInitialId.value))
    if (idx >= 0 && imgRefs[idx]) {
      const el = imgRefs[idx] as HTMLElement
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  } catch (e) {}
})

const activeLabel = computed(() => {
  const t = types.find((x) => x.key === activeType.value)
  return t ? t.label : activeType.value
})

function selectLabel(img: any) {
  return img && (img.ImgFull || img.CouponFull) ? "Add" : "Add"
}

function canEdit(img: any) {
  return !!img && !!img.ImgID && !String(img.ImgFull || "").includes("Default/")
}

async function loadImages(typeKey: string) {
  activeType.value = typeKey
  images.value = []
  loading.value = true

  // Coupons use a different endpoint
  if (typeKey === "Coupons") {
    const couponData: any = {
      templateID: orderVars.backTemplateID,
      couponSize: orderVars.currentCouponSize || "L",
    }
    if (orderVars.membershiptype === 100000) couponData.membershipType = orderVars.membershiptype
    try {
      const res = await fetch(appConfig.webAPIURL + "GetCoupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(couponData),
      })
      const text = await res.text()
      images.value = JSON.parse(text || "[]")
      console.log("Coupons loaded", images.value)
    } catch (e) {
      console.error("GetCoupons error", e)
      images.value = []
    } finally {
      loading.value = false
    }
    return
  }

  // Generic images endpoint
  try {
    console.log("[ImageManager] orderVars:", JSON.parse(JSON.stringify(orderVars)))
    const params = new URLSearchParams({
      imgType: String(typeKey || ""),
      userId: String(orderVars.userId ?? ""),
      sessionId: String(orderVars.sessionId ?? ""),
      productId: String(orderVars.frontTemplateID ?? 0),
    })
    console.log("Loading images with params", params.toString())
    const res = await fetch(appConfig.webAPIURL + "GetImages?" + params.toString())
    const text = await res.text()
    images.value = JSON.parse(text || "[]")
    console.log("Images loaded", images.value)
  } catch (e) {
    console.error("GetImages error", e)
    images.value = []
  } finally {
    loading.value = false
  }

  // debug: log whether parent indicates a selection exists so UI shows Replace
  try {
    console.debug("[ImageManager] hasImageSelected prop:", Boolean((props as any).hasImageSelected))
  } catch (e) {}

  // Normalize: dedupe by ImgID/CouponID/ImgFull and mark Default images
  try {
    let normalized: any[] = []
    const seen = new Set<string>()
    let srcList: any = images.value || []
    // If API returned a double-encoded JSON string, try to parse it
    if (typeof srcList === "string") {
      try {
        srcList = JSON.parse(srcList)
      } catch (e) {
        console.debug("[ImageManager] images value is string and JSON.parse failed, falling back", srcList)
      }
    }
    if (!Array.isArray(srcList)) {
      // wrap single object into array for uniform processing
      srcList = srcList ? [srcList] : []
    }
    for (let it of srcList) {
      // If an entry is a JSON string, try to parse it
      if (typeof it === "string") {
        try {
          it = JSON.parse(it)
        } catch (e) {
          // skip non-parseable strings
          continue
        }
      }
      if (!it || typeof it !== "object") continue
      const key = String(it.ImgID ?? it.CouponID ?? it.ImgFull ?? it.CouponFull ?? (it.ImgThumb || ""))
      if (!key) continue
      if (seen.has(key)) continue
      seen.add(key)
      // mark default images (legacy default path contains '/Default/')
      ;(it as any)._isDefault = String(it.ImgFull || it.CouponFull || "").includes("/Default/")
      normalized.push(it)
    }
    images.value = normalized
    console.debug("[ImageManager] Images loaded (normalized)", images.value)
  } catch (e) {
    // if normalization fails, leave images as-is
    console.debug("[ImageManager] normalization failed", e)
  }
}

function refresh() {
  loadImages(activeType.value)
}

function onSelect(img: any) {
  // Emit select-image with the full image url and id; EditorRoot will call canvas methods
  const raw = img.ImgFull || img.CouponFull || img.ImgFullPath || img.ImgThumb || img.CouponThumb || ""
  const imgFull = makeFullUrl(raw)
  const id = img.ImgID || img.CouponID || (img.ImgPreText ? String(img.ImgPreText) + img.ImgID : img.ImgID)
  emit("select-image", { id, url: imgFull, options: { sizePct: sizePct.value, shape: shape.value } })
}

function onEdit(img: any) {
  // For now, call select as edit; future: open crop editor
  onSelect(img)
}

function onReplace(img: any) {
  const raw = img.ImgFull || img.CouponFull || img.ImgFullPath || img.ImgThumb || img.CouponThumb || ""
  const imgFull = makeFullUrl(raw)
  const id = img.ImgID || img.CouponID || (img.ImgPreText ? String(img.ImgPreText) + img.ImgID : img.ImgID)
  emit("replace-image", { id, url: imgFull, raw: img, options: { sizePct: sizePct.value, shape: shape.value } })
}

function onDownload(img: any) {
  const raw = img.ImgFull || img.CouponFull || img.ImgThumb || img.CouponThumb || ""
  const url = makeFullUrl(raw) || "#"
  try {
    window.open(url, "_blank")
  } catch (e) {
    // fallback: navigate
    location.href = url
  }
}

// Helper: convert relative or partial image paths into absolute URLs using appConfig
function makeFullUrl(path: string | undefined | null) {
  if (!path) return ""
  const p = String(path || "").trim()
  if (!p) return ""
  // full http(s)
  if (/^https?:\/\//i.test(p)) return p
  // protocol-relative
  if (/^\/\//.test(p)) return (typeof window !== "undefined" ? window.location.protocol : "https:") + p
  // leading slash -> prefix with baseURL (which may include protocol)
  const base = String(appConfig.baseURL || "")
  if (p.startsWith("/")) {
    if (base) return base.replace(/\/$/, "") + p
    return p
  }
  // starts with ASRWebData or WebData-like -> prefix base
  if (/^ASRWebData/i.test(p)) {
    return base.replace(/\/$/, "") + "/" + p.replace(/^\/+/, "")
  }
  // otherwise assume relative to imgsURL or WebData
  const imgs = String(appConfig.imgsURL || base)
  return imgs.replace(/\/$/, "") + "/" + p.replace(/^\/+/, "")
}

// initial load
if (props.initialImage) {
  // best-effort: set initial selected id and try to pick appropriate type
  selectedInitialId.value = props.initialImage?.id || props.initialImage?.ID || null
  // if image has an ObjectGroup or known path, try to set type
  const grp = (props.initialImage?.ObjectGroup || props.initialImage?.group || "").toString()
  if (grp) {
    const guess = types.find((t) => grp.toLowerCase().includes(t.key.toLowerCase()))
    if (guess) activeType.value = guess.key
  }
}
loadImages(activeType.value)
</script>

<style scoped>
.material-icons {
  font-size: 18px;
}
</style>
