<template>
  <div class="absolute inset-0 z-30 bg-white border shadow-lg flex">
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
        <div v-for="img in images" :key="img.ImgID || img.CouponID || img.ImgFull" class="border rounded overflow-hidden bg-white">
          <img :src="img.ImgThumb || img.ImgFull || img.CouponThumb" class="w-full h-32 object-cover" />
          <div class="p-2 text-xs flex items-center justify-between">
            <div class="truncate pr-2">{{ (img.ImgName || img.CouponDescription || "").slice(0, 32) }}</div>
            <div class="flex items-center gap-1">
              <button class="text-xs px-2 py-0.5 border rounded" @click="onSelect(img)">{{ selectLabel(img) }}</button>
              <button v-if="canEdit(img)" class="text-xs px-2 py-0.5 border rounded" @click="onEdit(img)">Edit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="w-12 border-l flex items-center justify-center">
      <button class="p-2" @click="$emit('close')">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useLexAppConfig } from "../composables/useLexAppConfig"
import { useOrderVars } from "../composables/useOrderVars"

const emit = defineEmits(["close", "select-image"])

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

const activeType = ref<string>("Artwork")
const images = ref<any[]>([])
const loading = ref(false)

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
    const params = new URLSearchParams({
      imgType: String(typeKey || ""),
      userId: String(orderVars.userId ?? ""),
      sessionId: String(orderVars.sessionId ?? ""),
      productId: String(orderVars.frontTemplateID ?? 0),
    })
    const res = await fetch(appConfig.webAPIURL + "GetImages?" + params.toString())
    const text = await res.text()
    images.value = JSON.parse(text || "[]")
  } catch (e) {
    console.error("GetImages error", e)
    images.value = []
  } finally {
    loading.value = false
  }
}

function refresh() {
  loadImages(activeType.value)
}

function onSelect(img: any) {
  // Emit select-image with the full image url and id; EditorRoot will call canvas methods
  const imgFull = img.ImgFull || img.CouponFull || img.ImgFullPath || img.ImgFull || img.CouponThumb
  const id = img.ImgID || img.CouponID || (img.ImgPreText ? String(img.ImgPreText) + img.ImgID : img.ImgID)
  emit("select-image", { id, url: imgFull })
}

function onEdit(img: any) {
  // For now, call select as edit; future: open crop editor
  onSelect(img)
}

// initial load
loadImages(activeType.value)
</script>

<style scoped>
.material-icons {
  font-size: 18px;
}
</style>
