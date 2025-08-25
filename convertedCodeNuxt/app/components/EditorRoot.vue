<template>
  <div class="flex flex-col min-h-screen bg-[#f8f8f8] font-sans">
    <!-- Top Bar -->
    <div class="flex items-center justify-between w-full bg-white border-b h-12 px-8 relative z-10 shadow-sm">
      <div class="flex items-center gap-2">
        <span class="font-bold text-base">OrderLabel</span>
        <span class="ml-4 font-semibold text-sm text-gray-500">ProductDesc</span>
      </div>
      <div class="flex items-center gap-4">
        <span class="font-bold text-xs text-primary-700 cursor-pointer hover:underline mr-2" @click="toggleAdv">{{
          advMode ? "Advanced Editing: ON" : "Go To Advanced Editing"
        }}</span>
        <div class="ml-2"><DropdownMenu /></div>
      </div>
    </div>
    <!-- Tabs -->
    <div class="flex border-b bg-white h-10 items-center px-8">
      <button
        v-for="(face, idx) in editorData.faceNames"
        :key="face"
        :class="[
          'px-4 py-1 text-sm',
          editorData.selectedFace.value === face ? 'border-b-2 border-primary-500 font-medium text-primary-700' : 'text-gray-400',
          face === 'InsideFace' || face === 'EnvelopeFace' ? 'hidden' : '',
        ]"
        @click="editorData.selectedFace.value = face">
        {{ face.replace("Face", "") }}
      </button>
    </div>
    <!-- Main Grid -->
    <div class="flex-1 grid grid-cols-12 gap-0 min-h-0">
      <!-- Sidebar (left column) -->
      <aside class="col-span-3 bg-white border-r overflow-auto p-4">
        <div class="space-y-2">
          <!-- Text fields accordion -->
          <AccordionSection v-if="(editorData.textFields.value || []).length > 0" :open="openAccordion === 0" @toggle="setAccordion(0)">
            <template #title>
              <span class="flex items-center font-bold text-sm py-2"><Icon name="material-symbols:edit" class="mr-2 text-lg text-gray-500" />Text(s)</span>
            </template>
            <div class="divide-y divide-gray-100">
              <div
                v-for="txt in editorData.textFields.value || []"
                :key="txt.id || txt.ID || txt.objectId || txt.label"
                :class="['flex items-center py-1.5 px-2.5', selectedObjectId && String(selectedObjectId) === String(txt.id || txt.ID || txt.objectId) ? 'bg-primary-50' : '']">
                <Icon name="material-symbols:edit" class="mr-2 text-gray-400 text-base" />
                <span
                  class="text-xs font-medium text-gray-700 flex-1 cursor-pointer"
                  @click="
                    (e) => {
                      openAccordion = 0
                      onSidebarFieldFocus(txt)
                    }
                  "
                  >{{ txt.label || txt.ObjectName || txt.Text || "Text" }}</span
                >
              </div>
            </div>
          </AccordionSection>
          <AccordionSection v-if="(editorData.images.value || []).length > 0" :open="openAccordion === 1" @toggle="setAccordion(1)">
            <template #title>
              <span class="flex items-center font-bold text-sm py-2"><Icon name="material-symbols:image" class="mr-2 text-lg text-gray-500" />Image(s)</span>
            </template>
            <div class="divide-y divide-gray-100">
              <div
                v-for="img in editorData.images.value || []"
                :key="img.id || img.ID || img.objectId || img.label"
                :class="[
                  'flex items-center py-1.5 px-2.5',
                  selectedObjectId && String(selectedObjectId) === String(img.id || img.ID || img.objectId || img.ImgID || '') ? 'bg-primary-50' : '',
                ]">
                <Icon name="material-symbols:image" class="mr-2 text-gray-400 text-base" />
                <img
                  :src="img.thumb || img.url"
                  :class="[
                    'w-16 h-10 object-cover rounded mr-2 border',
                    selectedObjectId && String(selectedObjectId) === String(img.id || img.ID || img.objectId || img.ImgID || '') ? 'ring-2 ring-primary-400' : '',
                  ]"
                  @click="
                    (e) => {
                      openAccordion = 1
                      onSidebarImageClick(img)
                    }
                  " />
                <span
                  class="text-xs font-medium text-gray-700 flex-1"
                  @click="
                    (e) => {
                      openAccordion = 1
                      onSidebarImageClick(img)
                    }
                  "
                  >{{ img.label }}</span
                >
                <button class="ml-2 border border-gray-300 rounded px-2 py-0.5 text-xs bg-white hover:bg-gray-100 transition" @click="() => onSidebarChangeDesignClick(img)">
                  Change Design
                </button>
              </div>
            </div>
          </AccordionSection>
          <AccordionSection v-if="(editorData.coupons.value || []).length > 0" :open="openAccordion === 2" @toggle="setAccordion(2)">
            <template #title>
              <span class="flex items-center font-bold text-sm py-2"><Icon name="material-symbols:confirmation-number" class="mr-2 text-lg text-gray-500" />Select Coupon</span>
            </template>
            <div class="divide-y divide-gray-100">
              <div v-for="coupon in editorData.coupons.value || []" :key="coupon.id || coupon.ID || coupon.objectId || coupon.label" class="flex items-center py-1.5 px-2.5">
                <Icon name="material-symbols:confirmation-number" class="mr-2 text-gray-400 text-base" />
                <span class="text-xs font-medium text-gray-700 flex-1">{{ coupon.label }}</span>
              </div>
            </div>
          </AccordionSection>
          <AccordionSection v-if="(editorData.shapes.value || []).length > 0" :open="openAccordion === 3" @toggle="setAccordion(3)">
            <template #title>
              <span class="flex items-center font-bold text-sm py-2"><Icon name="material-symbols:category" class="mr-2 text-lg text-gray-500" />Shape(s)</span>
            </template>
            <div class="divide-y divide-gray-100">
              <div
                v-for="shape in editorData.shapes.value || []"
                :key="shape.id || shape.ID || shape.objectId || shape.label"
                :class="[
                  'flex items-center py-1.5 px-2.5',
                  selectedObjectId && String(selectedObjectId) === String(shape.id || shape.ID || shape.objectId || '') ? 'bg-primary-50' : '',
                ]">
                <Icon name="material-symbols:category" class="mr-2 text-gray-400 text-base" />
                <span class="text-xs font-medium text-gray-700 flex-1 cursor-pointer" @click="(e) => onSidebarShapeClick(shape)">{{ shape.label }}</span>
              </div>
            </div>
          </AccordionSection>
        </div>
      </aside>
      <!-- Main Area -->
      <main class="col-span-9 flex flex-col min-h-0 bg-[#f8f8f8]">
        <!-- Toolbar -->
        <div class="flex items-center bg-white shadow-sm h-12 px-0 gap-0 text-xs font-normal rounded-t border-b border-gray-300 p-2">
          <button
            type="button"
            class="select-none cursor-pointer bg-white flex flex-col items-center justify-center w-20 h-12 hover:bg-gray-100 transition font-sans border-r border-gray-200"
            v-if="advMode || advEditAllowed"
            @click="onAddText">
            <Icon name="material-symbols:edit" class="text-[22px] mb-0.5" />
            <span class="mt-0.5 text-xs font-semibold">Add Text</span>
          </button>
          <button
            type="button"
            class="select-none cursor-pointer bg-white flex flex-col items-center justify-center w-20 h-12 hover:bg-gray-100 transition font-sans border-r border-gray-200"
            v-if="advMode || advEditAllowed"
            @click="onAddImage">
            <Icon name="material-symbols:image" class="text-[22px] mb-0.5" />
            <span class="mt-0.5 text-xs font-semibold">Add Image</span>
          </button>
          <button type="button" class="select-none bg-white px-3 py-2 ml-2 border rounded text-sm" @click="showImageManager = true">Images</button>
          <button
            type="button"
            class="select-none cursor-pointer bg-white flex flex-col items-center justify-center w-20 h-12 hover:bg-gray-100 transition font-sans border-r border-gray-200"
            v-if="advMode || advEditAllowed"
            @click="toggleShapeMenu">
            <Icon name="material-symbols:category" class="text-[22px] mb-0.5" />
            <span class="mt-0.5 text-xs font-semibold">Add Shape</span>
          </button>
          <button
            type="button"
            class="select-none cursor-pointer bg-white flex flex-col items-center justify-center w-20 h-12 hover:bg-gray-100 transition font-sans border-r border-gray-200"
            v-if="advMode || advEditAllowed"
            @click="onAddCoupon">
            <Icon name="material-symbols:confirmation-number" class="text-[22px] mb-0.5" />
            <span class="mt-0.5 text-xs font-semibold">Add Coupon</span>
          </button>
          <button
            type="button"
            class="select-none cursor-pointer bg-white flex flex-col items-center justify-center w-24 h-12 hover:bg-gray-100 transition font-sans border-r border-gray-200"
            @click="onPrintPreview">
            <Icon name="material-symbols:print" class="text-[22px] mb-0.5" />
            <span class="mt-0.5 text-xs font-semibold">Print Preview</span>
          </button>
          <button
            type="button"
            class="select-none cursor-pointer bg-white flex flex-col items-center justify-center w-16 h-12 hover:bg-gray-100 transition font-sans border-r border-gray-200"
            @click="onZoomIn">
            <Icon name="material-symbols:zoom-in" class="text-[22px] mb-0.5" />
            <span class="mt-0.5 text-xs font-semibold">Zoom In</span>
          </button>
          <button
            type="button"
            class="select-none cursor-pointer bg-white flex flex-col items-center justify-center w-20 h-12 hover:bg-gray-100 transition font-sans border-r border-gray-200"
            @click="onZoomFit">
            <Icon name="material-symbols:fit-screen" class="text-[22px] mb-0.5" />
            <span class="mt-0.5 text-xs font-semibold">Zoom Fit</span>
          </button>
          <button
            type="button"
            class="select-none cursor-pointer bg-white flex flex-col items-center justify-center w-20 h-12 hover:bg-gray-100 transition font-sans"
            @click="onZoomOut">
            <Icon name="material-symbols:zoom-out" class="text-[22px] mb-0.5" />
            <span class="mt-0.5 text-xs font-semibold">Zoom Out</span>
          </button>
          <div class="flex-1"></div>
          <button
            type="button"
            :disabled="!canUndo"
            :aria-disabled="!canUndo"
            @click="onUndo"
            :class="[
              'select-none bg-white flex flex-col items-center justify-center w-14 h-12 font-sans border-l border-gray-200',
              canUndo ? '' : 'text-gray-300 cursor-not-allowed',
            ]">
            <Icon name="material-symbols:undo" class="text-[22px] mb-0.5" /><span class="mt-0.5 text-xs font-semibold">Undo</span>
          </button>
          <button
            type="button"
            :disabled="!canRedo"
            :aria-disabled="!canRedo"
            @click="onRedo"
            :class="[
              'select-none bg-white flex flex-col items-center justify-center w-14 h-12 font-sans border-l border-gray-200',
              canRedo ? '' : 'text-gray-300 cursor-not-allowed',
            ]">
            <Icon name="material-symbols:redo" class="text-[22px] mb-0.5" /><span class="mt-0.5 text-xs font-semibold">Redo</span>
          </button>
        </div>
        <!-- Shape picker dropdown -->
        <div v-if="showShapeMenu" class="absolute z-40 mt-14 ml-4 bg-white border rounded shadow p-2">
          <div class="grid grid-cols-3 gap-2">
            <button v-for="shape in editorData.shapes.value || []" :key="shape.type" class="p-2 border rounded text-xs" @click="onAddShape(shape.type)">
              {{ shape.label || shape.type }}
            </button>
          </div>
        </div>
        <!-- Info / Element Prop Bar -->
        <ElementPropBar
          v-if="selectedLabel"
          :label="selectedLabel"
          :objectId="selectedObjectId"
          :initialFontFamily="selectedInitials.fontFamily"
          :initialFontSize="selectedInitials.fontSize"
          :initialOpacity="selectedInitials.opacity"
          :initialUnderline="selectedInitials.underline"
          :initialFontWeight="selectedInitials.fontWeight"
          :initialFontStyle="selectedInitials.fontStyle"
          :initialTextAlign="selectedInitials.textAlign"
          :capabilities="selectedCapabilities"
          :fontVariantAvailability="fontVariantAvailability[selectedObjectId || ''] || { italic: true, bold: true }" />
        <div v-else class="bg-[#fffbe6] border-b border-x border-[#ffe58f] text-[#ad8b00] px-4 h-12 text-sm flex items-center shrink-0">
          <Icon name="material-symbols:info" class="mr-2 text-[#ad8b00] text-base" />
          <div class="ml-2 leading-tight">
            <div v-if="advMode"><strong>Select an object on the card below to edit.</strong> | Or click add new text or image buttons above</div>
            <div v-else-if="!advEditAllowed"><strong>Change Images or Text using left box.</strong></div>
            <div v-else><strong>Change Images or Text using left box.</strong><br />Or click "Advanced Editing" to add new text, image or move objects on card.</div>
          </div>
        </div>
        <!-- Canvas Area -->
        <div class="flex-1 flex justify-center items-start bg-white p-0 min-h-0 min-w-0 overflow-auto border border-gray-400 rounded-b shadow-inner">
          <div class="w-full max-w-5xl mx-auto">
            <EditorCanvas ref="canvasComponent" :canvasWidth="editorData.canvasSize.value.width" :canvasHeight="editorData.canvasSize.value.height" />
            <ImageManager
              v-if="showImageManager"
              :hasImageSelected="isImageSelectedComputed"
              @close="showImageManager = false"
              @select-image="onImageSelected"
              @replace-image="onImageReplace" />
          </div>
        </div>
        <!-- Bottom Action Buttons -->
        <div class="flex justify-between items-center w-full px-8 py-4 bg-transparent text-primary-900 text-sm font-semibold">
          <button class="hover:underline" @click="$emit('select-new-design')">&lt; SELECT NEW DESIGN</button>
          <button class="hover:underline" @click="onDoneEditing">DONE EDITING &gt;</button>
        </div>
      </main>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ ready: boolean }>()
import { ref, watch, onMounted, nextTick, computed } from "vue"
import { fetchOrderVars } from "../composables/useOrderVars"
import { useLexAppConfig } from "../composables/useLexAppConfig"
import ElementPropBar from "./ElementPropBar.vue"
import ImageManager from "./ImageManager.vue"
import EditorCanvas from "./EditorCanvas.vue"
// No import for Icon needed; use <Icon> directly in template

const editorData = useEditorData()
const canvasComponent = ref<any>(null)
const showShapeMenu = ref(false)
const showImageManager = ref(false)
const isImageSelected = ref(false)
const isImageSelectedComputed = computed(() => {
  try {
    // Prefer the canonical selectedObjectId (set from canvas-selection-changed event)
    const id = selectedObjectId.value
    if (!id) return false
    // Try to match id against editorData.images entries (covers groups and custom images)
    try {
      const match = (editorData.images.value || []).some((img: any) => {
        const candidates = [img.id, img.ID, img.objectId, img.ImgID, img.CouponID, img.ObjectID]
        for (const c of candidates) {
          if (c !== undefined && c !== null && String(c) === String(id)) return true
        }
        // also match by url if available
        if (img.url && String(img.url) === String(id)) return true
        return false
      })
      if (match) return true
    } catch (e) {}

    // Fallback: query canvas active object (in case selection hasn't been mapped to sidebar yet)
    try {
      const act = canvasComponent.value?.getActiveObject?.()
      if (!act) return false
      const t = String(act.type || "").toLowerCase()
      if (t.includes("image")) return true
      const children = (act as any)._objects || (act as any).getObjects?.()
      if (Array.isArray(children)) {
        return children.some((c: any) => {
          try {
            const ct = String(c.type || "").toLowerCase()
            if (ct.includes("image")) return true
            if (typeof c.setSrc === "function") return true
            return false
          } catch (e) {
            return false
          }
        })
      }
    } catch (e) {}
    return false
  } catch (e) {
    return false
  }
})
// pending action when Image Manager is opened from toolbar (force add/replace)
const pendingImageAction = ref<null | "add" | "replace">(null)
// expose component so template can use it
const components = { ElementPropBar }
const selectedLabel = ref<string | null>(null)
const selectedObjectId = ref<string | undefined>(undefined)
// Reentrancy guard: when we programmatically select on the canvas we temporarily suppress handling
let _suppressCanvasSelectionEvents = false
let _lastSelectionKey: string | null = null
let _lastSelectionTs = 0

function programmaticSelect(id: string) {
  try {
    _suppressCanvasSelectionEvents = true
    if (canvasComponent.value && typeof canvasComponent.value.selectObjectByID === "function") {
      canvasComponent.value.selectObjectByID(String(id))
    }
  } catch (e) {
    console.error("programmaticSelect error", e)
  } finally {
    // clear suppression shortly after to allow real user events
    setTimeout(() => {
      _suppressCanvasSelectionEvents = false
    }, 120)
  }
}
import { reactive } from "vue"
import { useOrderVars } from "../composables/useOrderVars"
const selectedInitials = reactive({
  fontFamily: "Arial",
  fontSize: 24,
  opacity: 1,
  underline: false,
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "left",
  fill: null,
  backgroundColor: null,
})
const selectedCapabilities = reactive({
  canFont: false,
  canSize: false,
  canStyle: false,
  canAlign: false,
  canFill: false,
  canBg: false,
  canOpacity: false,
  canArrange: false,
  canRemove: false,
})
const advMode = editorData.advMode
const advEditAllowed = editorData.advEditAllowed()
const canUndo = ref(false)
const canRedo = ref(false)

function onUndo() {
  if (canvasComponent.value && typeof canvasComponent.value.undo === "function") canvasComponent.value.undo()
}

// Build the legacy SaveData payload from the current canvas and log it (no network call)
function buildSavePayloadForPage(pageNumber = 1) {
  try {
    const comp = canvasComponent.value
    console.debug("[buildSavePayloadForPage] entry", { pageNumber, compPresent: !!comp, hasGetCanvasSnapshot: !!(comp && typeof comp.getCanvasSnapshot === "function") })
    if (!comp || typeof comp.getCanvasSnapshot !== "function") {
      // fallback: try to access underlying fabric canvas directly
      const inst = comp?.canvas || (window as any).__e5Canvas || comp
      console.debug("[buildSavePayloadForPage] falling back to underlying instance", { hasInst: !!inst })
      if (!inst) return null

      // prefer using Fabric's dataless serializer with the same extraKeys used by legacy code
      const appConfig = useLexAppConfig()
      // Pre-walk live canvas objects and ensure canonical remote URL metadata
      // exists on image-like objects so Fabric's dataless serializer will
      // include a remote URL instead of an inlined data: URL.
      try {
        if (inst && typeof inst.getObjects === "function") {
          const liveObjs = inst.getObjects()
          const sidebarImgs = (editorData && editorData.images && editorData.images.value) || []
          for (const lo of liveObjs) {
            try {
              if (!lo) continue
              const t = String(lo.type || "").toLowerCase()
              const isImgLike = t.includes("image") || typeof lo.setSrc === "function" || typeof lo.setElement === "function"
              if (!isImgLike) continue

              // Try to discover a canonical remote URL from several candidate fields
              let remote: string | null = null
              const candKeys = ["ImgFull", "imgFull", "originalSrc", "_origSrc", "url", "src", "__customUrl"]
              for (const k of candKeys) {
                try {
                  const v = (lo as any)[k]
                  if (v && typeof v === "string" && /^https?:\/\//i.test(v)) {
                    remote = v
                    break
                  }
                } catch (e) {}
              }

              // If underlying element exposes a src/currentSrc that's remote, use it
              if (!remote) {
                try {
                  const el = (lo as any)._element || (lo as any).element || null
                  if (el) {
                    const cand = el.currentSrc || el.src || null
                    if (cand && typeof cand === "string" && /^https?:\/\//i.test(cand)) remote = cand
                  }
                } catch (e) {}
              }

              // Try matching against sidebar images to recover a remote URL
              if (!remote && Array.isArray(sidebarImgs) && sidebarImgs.length > 0) {
                try {
                  for (const si of sidebarImgs) {
                    try {
                      if (!si) continue
                      if ((lo as any).ImgID && (String(si.ImgID) === String((lo as any).ImgID) || String(si.ID) === String((lo as any).ImgID))) {
                        const cand = si.__customUrl || si.url || si.thumb || null
                        if (cand && typeof cand === "string" && /^https?:\/\//i.test(cand)) {
                          remote = cand
                          break
                        }
                      }
                      if ((lo as any).ID && (String(si.ImgID) === String((lo as any).ID) || String(si.ID) === String((lo as any).ID))) {
                        const cand = si.__customUrl || si.url || si.thumb || null
                        if (cand && typeof cand === "string" && /^https?:\/\//i.test(cand)) {
                          remote = cand
                          break
                        }
                      }
                      const wantName = (lo as any).ObjectName || (lo as any).Objectname || (lo as any).name
                      if (wantName && String(si.ObjectName || si.label || si.name) === String(wantName)) {
                        const cand = si.__customUrl || si.url || si.thumb || null
                        if (cand && typeof cand === "string" && /^https?:\/\//i.test(cand)) {
                          remote = cand
                          break
                        }
                      }
                    } catch (e) {}
                  }
                } catch (e) {}
              }

              if (remote) {
                try {
                  ;(lo as any).ImgFull = (lo as any).ImgFull || remote
                } catch (e) {}
                try {
                  ;(lo as any).imgFull = (lo as any).imgFull || remote
                } catch (e) {}
                try {
                  ;(lo as any).originalSrc = (lo as any).originalSrc || remote
                } catch (e) {}
                try {
                  ;(lo as any)._origSrc = (lo as any)._origSrc || remote
                } catch (e) {}
                // also ensure url/src fields reflect a remote when possible
                try {
                  if ((!(lo as any).url || !/^https?:\/\//i.test(String((lo as any).url || ""))) && remote) (lo as any).url = remote
                } catch (e) {}
                try {
                  if ((!(lo as any).src || !/^https?:\/\//i.test(String((lo as any).src || ""))) && remote) (lo as any).src = remote
                } catch (e) {}
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
      let snap: any = null
      try {
        if (inst.toDatalessJSON && typeof inst.toDatalessJSON === "function") {
          const raw = inst.toDatalessJSON(appConfig.extraKeys || [])
          snap = typeof raw === "string" ? JSON.parse(raw) : raw
        } else if (inst.toObject && typeof inst.toObject === "function") {
          // fallback: ask toObject for the same extra keys so we include org*/ImgFull metadata
          snap = inst.toObject(appConfig.extraKeys || [])
        }
      } catch (e) {
        // last-resort fallback to a minimal toObject call
        try {
          if (inst.toObject && typeof inst.toObject === "function") snap = inst.toObject()
        } catch (ee) {
          snap = null
        }
      }
      // snap may be a plain object already
      try {
        const parsed = typeof snap === "string" ? JSON.parse(snap) : snap
        console.debug("[buildSavePayloadForPage] using inst serializer", { parsedSnapshotPresent: !!parsed })

        // Post-process serialized objects using live Fabric instances so we
        // preserve ImgFull/imgFull/originalSrc metadata (avoid data URLs).
        try {
          if (parsed && Array.isArray(parsed.objects) && inst && typeof inst.getObjects === "function") {
            const liveObjs = inst.getObjects().slice()
            const idKeys = ["ID", "id", "ImgID", "objectId", "ObjectID", "ObjectID"]
            for (const sObj of parsed.objects) {
              try {
                // prefer canonical id match
                let matched = null
                for (const k of idKeys) {
                  const v = sObj[k]
                  if (v !== undefined && v !== null) {
                    matched = liveObjs.find((lo: any) => {
                      try {
                        return lo && lo[k] !== undefined && String(lo[k]) === String(v)
                      } catch (e) {
                        return false
                      }
                    })
                    if (matched) break
                  }
                }
                // fallback: try matching by ObjectName / name fields
                if (!matched && (sObj.ObjectName || sObj.Objectname || sObj.name)) {
                  const want = String(sObj.ObjectName || sObj.Objectname || sObj.name)
                  matched = liveObjs.find((lo: any) => {
                    try {
                      const candidates = [lo.ObjectName, lo.Objectname, lo.name, lo.ObjectID, lo.ID, lo.ImgID]
                      for (const c of candidates) {
                        if (c !== undefined && c !== null && String(c) === want) return true
                      }
                    } catch (e) {}
                    return false
                  })
                }
                // fallback: match by approximate position/size
                if (!matched) {
                  const sLeft = typeof sObj.left === "number" ? sObj.left : null
                  const sTop = typeof sObj.top === "number" ? sObj.top : null
                  const sW = typeof sObj.width === "number" ? sObj.width : null
                  const sH = typeof sObj.height === "number" ? sObj.height : null
                  matched = liveObjs.find((lo: any) => {
                    try {
                      const lLeft = typeof lo.left === "number" ? lo.left : null
                      const lTop = typeof lo.top === "number" ? lo.top : null
                      const lW = typeof lo.getScaledWidth === "function" ? lo.getScaledWidth() : typeof lo.width === "number" ? lo.width : null
                      const lH = typeof lo.getScaledHeight === "function" ? lo.getScaledHeight() : typeof lo.height === "number" ? lo.height : null
                      if (sLeft === null || sTop === null) return false
                      if (lLeft === null || lTop === null) return false
                      const dx = Math.abs((lLeft || 0) - (sLeft || 0))
                      const dy = Math.abs((lTop || 0) - (sTop || 0))
                      const dw = sW !== null && lW !== null ? Math.abs((lW || 0) - (sW || 0)) : 0
                      const dh = sH !== null && lH !== null ? Math.abs((lH || 0) - (sH || 0)) : 0
                      return dx <= 6 && dy <= 6 && dw <= 6 && dh <= 6
                    } catch (e) {
                      return false
                    }
                  })
                }

                if (matched) {
                  try {
                    const keysToCopy = ["ImgFull", "imgFull", "originalSrc", "_origSrc"]
                    for (const kk of keysToCopy) {
                      try {
                        const val = (matched as any)[kk]
                        if (val !== undefined && val !== null) {
                          sObj[kk] = val
                          // if src is an inlined data url but we have a canonical remote, prefer it
                          if (typeof val === "string" && /^https?:\/\//i.test(String(val))) {
                            if (typeof sObj.src === "string" && String(sObj.src).startsWith("data:")) sObj.src = val
                          }
                        }
                      } catch (e) {}
                    }
                    // also copy org* metadata which legacy normalization prefers
                    try {
                      const orgKeys = ["orgWidth", "orgHeight", "orgFontSize", "orgLeft", "orgTop"]
                      for (const ok of orgKeys) {
                        try {
                          const v = (matched as any)[ok]
                          if (v !== undefined && v !== null) sObj[ok] = v
                        } catch (e) {}
                      }
                    } catch (e) {}
                  } catch (e) {}
                }
                // If we couldn't find a live object match, try matching against
                // the sidebar image list (editorData.images) to recover canonical
                // remote URLs for custom images added via ImageManager.
                if (!matched) {
                  try {
                    const imgs = (editorData && editorData.images && editorData.images.value) || []
                    if (Array.isArray(imgs) && imgs.length > 0) {
                      const tryMatch = (it: any) => {
                        try {
                          if (!it) return false
                          // match by ImgID/ID fields
                          if (sObj.ID && (String(it.ImgID) === String(sObj.ID) || String(it.ID) === String(sObj.ID))) return true
                          // match by ObjectName
                          if (sObj.ObjectName && String(it.ObjectName || it.label || it.name) === String(sObj.ObjectName)) return true
                          // if parsed src is data: and sidebar has __customUrl or url that contains filename, match
                          if (typeof sObj.src === "string" && sObj.src.startsWith("data:")) {
                            const candidate = String(it.__customUrl || it.url || "")
                            if (candidate) {
                              try {
                                const fn = candidate.split("/").pop() || candidate
                                if (fn && sObj.ObjectName && fn.includes(String(sObj.ObjectName))) return true
                                // also match by filename presence
                                const parsedFn = (sObj.ObjectName || "").toString()
                                if (parsedFn && candidate.includes(parsedFn)) return true
                              } catch (e) {}
                            }
                          }
                          return false
                        } catch (e) {
                          return false
                        }
                      }
                      const found = imgs.find(tryMatch)
                      if (found) {
                        try {
                          const remote = found.__customUrl || found.url || found.thumb || null
                          if (remote && typeof remote === "string" && /^https?:\/\//i.test(remote)) {
                            // prefer remote URL
                            sObj.src = remote
                            sObj.ImgID = sObj.ImgID ?? found.ImgID ?? found.ID
                            sObj.ID = sObj.ID ?? found.ImgID ?? found.ID
                            sObj.ImgFull = sObj.ImgFull ?? remote
                          }
                        } catch (e) {}
                      }
                    }
                  } catch (e) {}
                }
              } catch (e) {}
            }
          }
        } catch (e) {
          console.warn("[buildSavePayloadForPage] post-process failed", e)
        }

        return normalizeSnapshot(parsed)
      } catch (e) {
        console.warn("[buildSavePayloadForPage] failed parsing inst snapshot, returning raw snap", { snap })
        return snap
      }
    }

    // if composable provides a helper return that
    try {
      console.debug("[buildSavePayloadForPage] using component.getCanvasSnapshot")
      const raw = comp.getCanvasSnapshot(pageNumber)
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
      return normalizeSnapshot(parsed)
    } catch (e) {
      // fallback to returning whatever the component provided
      try {
        const rawFallback = comp.getCanvasSnapshot(pageNumber)
        console.warn("[buildSavePayloadForPage] getCanvasSnapshot threw but returned on retry", { rawType: typeof rawFallback })
        return rawFallback
      } catch (ee) {
        console.error("[buildSavePayloadForPage] getCanvasSnapshot failed", ee)
        return null
      }
    }
  } catch (e) {
    console.error("buildSavePayloadForPage error", e)
    return null
  }
}

// Convert a fabric-like snapshot into a legacy-shaped payload
function normalizeSnapshot(snap: any) {
  if (!snap) return null
  const out: any = {}
  // Force legacy editor version for saved payloads to improve compatibility
  out.version = "2.7.0"
  const objs = Array.isArray(snap.objects) ? snap.objects.slice() : []

  // helper to pick the best src for an image
  function pickImageSrc(o: any) {
    if (!o) return o
    // prefer canonical remote URL keys if present (ImgFull/imgFull/originalSrc)
    const preferred = o.ImgFull || o.imgFull || o.originalSrc || o._origSrc || o.srcFull || o.imageSrc
    if (typeof preferred === "string" && /^https?:\/\//i.test(preferred)) return preferred
    // otherwise fall back to any src (may be a data URL)
    const cand = o.src || o.srcFull || o.imgFull || o.ImgFull || o.imageSrc || o.originalSrc
    return cand || null
  }

  function mapObject(o: any) {
    const n: any = Object.assign({}, o)
    // normalize id names
    n.ID = n.ID ?? n.id ?? n.objectId ?? n.ObjectID ?? n.imgID ?? n.ImgID
    // canonical position fields
    if (typeof n.left === "number") n.x = n.left
    if (typeof n.top === "number") n.y = n.top

    // normalize types to legacy short names
    const t = String(n.type || "").toLowerCase()
    if (t.includes("image")) n.type = "img"
    else if (t.includes("rect")) n.type = "rect"
    else if (t.includes("textbox") || t.includes("text")) n.type = "textbox"
    else n.type = t || n.type

    // image-specific fields
    if (n.type === "img" || n.type === "image") {
      n.src = pickImageSrc(n)
      if (!n.crossOrigin && n.src && /^https?:\/\//i.test(n.src)) n.crossOrigin = "anonymous"
      n.imgType = n.imgType ?? n.ImageType ?? n.ResourceType ?? n.imgType ?? "Artwork"
      n.ResourceType = n.ResourceType ?? (n.imgType ? "I" : n.ResourceType)
      // preserve org* metadata when present
      if (n.orgWidth === undefined && n.width !== undefined) n.orgWidth = n.orgWidth ?? n.width
      if (n.orgHeight === undefined && n.height !== undefined) n.orgHeight = n.orgHeight ?? n.height
      if (n.orgLeft === undefined && n.x !== undefined) n.orgLeft = n.orgLeft ?? n.x
      if (n.orgTop === undefined && n.y !== undefined) n.orgTop = n.orgTop ?? n.y
    }

    // shape/color normalization
    if (n.type === "rect") {
      n.fill = n.fill ?? n.FontColor ?? n.Fontcolour ?? n.BackgroundColor ?? n.fill
      n.opacity = Number(n.opacity ?? n.Alpha ?? n.alpha ?? 1)
    }

    // text normalization: keep original fields but ensure fontFamily is present
    if (n.type === "textbox") {
      n.fontFamily = n.fontFamily ?? n.FontFamily ?? n.font ?? n.fontFamily
      // normalize common CamelCase -> plus-separated lowercase for legacy compatibility
      try {
        if (typeof n.fontFamily === "string") {
          const spaced = n.fontFamily.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_\-]+/g, " ")
          n.fontFamily = spaced.trim().replace(/\s+/g, "+").toLowerCase()
        }
      } catch (e) {}
      // prefer orgHeight/orgFontSize for saved textbox height when available
      // If we have a runtime font multiplier, derive an orgHeight/orgFontSize
      // similar to the legacy serializer so the saved payload matches.
      try {
        if ((!n.orgHeight || !n.orgFontSize) && typeof n._fontSizeMult === "number" && typeof n.height === "number") {
          try {
            const derivedOrgHeight = Math.round(Number(n.height) / Number(n._fontSizeMult || 1))
            if (!n.orgHeight) n.orgHeight = derivedOrgHeight
            if (!n.orgFontSize) n.orgFontSize = Math.round((n.fontSize || 0) / (n._fontSizeMult || 1))
          } catch (e) {}
        }
        if ((n.orgHeight || n.orgFontSize) && (n.height === undefined || Math.abs(Number(n.height) - Number(n.orgHeight || 0)) > 1)) {
          if (n.orgHeight) n.height = n.orgHeight
        }
      } catch (e) {}
    }

    return n
  }

  const normed = objs.map(mapObject)

  // sort by preferred type order (images first, then shapes, then text) to match legacy payload ordering
  const typePriority: Record<string, number> = { img: 0, image: 0, rect: 1, rectangle: 1, textbox: 2, text: 2 }
  normed.sort((a: any, b: any) => {
    const ta = String((a.type || "").toLowerCase())
    const tb = String((b.type || "").toLowerCase())
    const pa = typePriority[ta] ?? (typeof a.zIndex === "number" ? 10 + a.zIndex : 10)
    const pb = typePriority[tb] ?? (typeof b.zIndex === "number" ? 10 + b.zIndex : 10)
    if (pa !== pb) return pa - pb
    // fallback to zIndex or DisplayOrder
    const az = typeof a.zIndex === "number" ? a.zIndex : typeof a.DisplayOrder === "number" ? a.DisplayOrder : 0
    const bz = typeof b.zIndex === "number" ? b.zIndex : typeof b.DisplayOrder === "number" ? b.DisplayOrder : 0
    return az - bz
  })

  out.objects = normed
  // width/height fallbacks
  out.width = snap.width ?? snap.canvasWidth ?? (canvasComponent.value && canvasComponent.value.width) ?? undefined
  out.height = snap.height ?? snap.canvasHeight ?? (canvasComponent.value && canvasComponent.value.height) ?? undefined
  return out
}

function onDoneEditing() {
  console.log("[EditorRoot] onDoneEditing called, building payload...")
  try {
    const payload = buildSavePayloadForPage(1)
    if (!payload) {
      console.warn("No canvas payload available")
      return
    }
    // The legacy SaveData expects url-encoded JSON in a parameter named jsonData
    const json = JSON.stringify(payload)
    const encoded = encodeURIComponent(json)
    const orderVars = useOrderVars()
    const orderNumber = orderVars.orderNumber || ""
    const sessionID = orderVars.sessionId || ""
    const productID = orderVars.productType || ""
    const pageNumber = 1
    const query = `jsonData=${encoded}&orderNumber=${encodeURIComponent(String(orderNumber))}&sessionID=${encodeURIComponent(
      String(sessionID)
    )}&pageNumber=${pageNumber}&productID=${encodeURIComponent(String(productID))}`
    console.log("[EditorRoot] Done Editing payload (preview only):")
    console.log(query)
    console.log("Data Only", json)
    // Also expose the parsed JSON for easy diffing in console
    try {
      ;(window as any).__lastSavePayload = payload
    } catch (e) {}
    // Dev convenience: POST the payload to server API to persist into logs/lastDoneEdit.json
    try {
      try {
        if (typeof fetch === "function") {
          fetch("/api/editor-save", { method: "POST", headers: { "Content-Type": "application/json" }, body: json })
            .then((r) =>
              r
                .json()
                .then((j) => console.debug("[EditorRoot] saved payload to server", j))
                .catch(() => {})
            )
            .catch(() => {})
        }
      } catch (e) {}
    } catch (e) {}
  } catch (e) {
    console.error("onDoneEditing error", e)
  }
}

function onRedo() {
  if (canvasComponent.value && typeof canvasComponent.value.redo === "function") canvasComponent.value.redo()
}

function toggleAdv() {
  const newMode = editorData.toggleAdvMode()
  // Inform editor canvas of edit mode change if it exposes editMode
  if (canvasComponent.value && typeof canvasComponent.value.setEditMode === "function") {
    // ensure nextTick so canvas exists and objects are loaded
    nextTick(() => canvasComponent.value.setEditMode(newMode))
  }
}

// Keep canvas edit mode in sync if advMode changes elsewhere
watch(
  () => advMode.value,
  (val) => {
    if (canvasComponent.value && typeof canvasComponent.value.setEditMode === "function") {
      try {
        canvasComponent.value.setEditMode(!!val)
      } catch (e) {}
    }
  }
)

// Accordion state
const openAccordion = ref(0)
function setAccordion(idx: number) {
  if (openAccordion.value !== idx) openAccordion.value = idx
}

// Map of objectId -> { italic: boolean, bold: boolean }
const fontVariantAvailability = ref<Record<string, { italic: boolean; bold: boolean }>>({})

// Handlers used by the template
function onAddText() {
  const defaultText = "Click to edit this text."
  const defaultProps: any = {
    ResourceType: "T",
    ObjectName: `Added Text Box ${Math.floor(Math.random() * 1000) + 1}`,
    Text: defaultText,
    left: 100,
    top: 100,
    width: 200,
    height: 100,
    fontSize: 12 * 1.3333,
    fontFamily: "Arial",
    textAlign: "left",
    vAlign: "middle",
    angle: 0,
    fill: "#000000",
    textPadding: 0,
    strokeStyle: "transparent",
    originX: "left",
    hasRotatingPoint: true,
    centeredScaling: false,
    centeredRotation: true,
    lockScalingX: false,
    lockScalingY: false,
    selectable: true,
    PageNumber: 1,
    ObjectType: 120,
    ObjectGroup: "BackgroundText",
    autoFontSize: false,
    autoBoxHeight: true,
    textSuffix: "",
    textPrefix: "",
    maxLength: 0,
    allowFontResize: true,
    requiredObject: 0,
    initiallyVisible: 1,
    SuppressPrinting: false,
    WordBreak: 1,
    zIndex: 0,
    DisplayOrder: 0,
    lineIndex: 0,
    field_type: 1,
    radius: 0,
    strokeWidth: 0,
    KeepOnProof: true,
    TextCase: "tcNone",
    fontStyle: "",
    backgroundColor: "",
    visible: true,
    editable: true,
    evented: true,
    opacity: 1,
  }
  if (canvasComponent.value?.addText) {
    canvasComponent.value.addText(defaultText, undefined, defaultProps)
  }
  const faces = editorData.faces.value
  const selectedFace = editorData.selectedFace.value
  if (faces && selectedFace && Array.isArray(faces[selectedFace])) {
    faces[selectedFace].push({ ...defaultProps })
  }
}

function onAddImage() {
  // Open the Image Manager so user explicitly selects an image to add
  pendingImageAction.value = "add"
  showImageManager.value = true
}

function onAddShape(type?: string) {
  let shapeType = type
  const shape = editorData.shapes.value?.[0]
  if (!shapeType && shape) shapeType = shape.type
  if (shapeType && canvasComponent.value?.addShape) canvasComponent.value.addShape(shapeType)
  showShapeMenu.value = false
}

function onAddCoupon() {
  const coupon = editorData.coupons.value?.[0]
  if (coupon && canvasComponent.value?.addCoupon) canvasComponent.value.addCoupon(coupon.code || "")
}

function onPrintPreview() {
  canvasComponent.value?.printPreview && canvasComponent.value.printPreview()
}

function onZoomIn() {
  canvasComponent.value?.zoomIn && canvasComponent.value.zoomIn()
}

function onZoomFit() {
  console.debug("[EditorRoot] onZoomFit handler invoking canvasComponent.zoomFit", { timestamp: Date.now(), caller: "EditorRoot.onZoomFit" })
  canvasComponent.value?.zoomFit && canvasComponent.value?.zoomFit()
}

function onZoomOut() {
  canvasComponent.value?.zoomOut && canvasComponent.value.zoomOut()
}

function toggleShapeMenu() {
  showShapeMenu.value = !showShapeMenu.value
}

// Handle image selection from ImageManager (either Add or Replace depending on context)
function onImageSelected(payload: { id: any; url: string; options?: { sizePct?: number; shape?: string } }) {
  try {
    // If a pending action is set (toolbar triggered), obey it
    if (pendingImageAction.value === "add") {
      if (typeof canvasComponent.value?.addImage === "function") {
        // push to sidebar images if not present
        try {
          const faceKey = editorData.selectedFace.value
          const facesRef: any = editorData.faces
          if (!facesRef.value) facesRef.value = {}
          if (!Array.isArray(facesRef.value[faceKey])) facesRef.value[faceKey] = []
          // Avoid duplicates by url or id
          const exists = facesRef.value[faceKey].some(
            (it: any) => String(it.ID || it.id || it.ImgID || "") === String(payload.id || "") || String(it.__customUrl || it.Text || "") === String(payload.url)
          )
          if (!exists) {
            // compute a generated id for custom images when payload.id is not present
            const generatedId = payload.id || `custom-${Date.now()}-${Math.floor(Math.random() * 10000)}`
            // Determine sensible target size to fit within canvas
            // prefer actual canvas dimensions when available
            let canvasSize = { width: 900, height: 600 }
            try {
              const cs = canvasComponent.value && typeof canvasComponent.value.getCanvasSize === "function" ? canvasComponent.value.getCanvasSize() : null
              if (cs && cs.width && cs.height) canvasSize = cs
            } catch (e) {}
            // determine size from payload.options.sizePct if provided, otherwise default 80%
            const pct = payload.options && typeof payload.options.sizePct === "number" ? payload.options.sizePct / 100 : 0.8
            const targetW = Math.max(64, Math.round((canvasSize.width || 900) * pct))
            const targetH = Math.max(64, Math.round((canvasSize.height || 600) * pct))
            const left = Math.max(0, Math.round(((canvasSize.width || 900) - targetW) / 2))
            const top = Math.max(0, Math.round(((canvasSize.height || 600) - targetH) / 2))

            // push sidebar entry; include ID/ImgID and __customUrl so images computed will show it
            facesRef.value[faceKey].push({
              ResourceType: "I",
              ID: generatedId,
              ImgID: generatedId,
              __customUrl: payload.url,
              url: payload.url,
              ObjectName: payload.id ? String(payload.id) : "Added Image",
            })
            // After adding, try to select the newly added image on the canvas and scroll sidebar into view
            const newObj = facesRef.value[faceKey][facesRef.value[faceKey].length - 1]
            nextTick(() => {
              try {
                // Prefer selecting by ID if available
                if (newObj.ID || newObj.ImgID) {
                  const idStr = String(newObj.ID || newObj.ImgID)
                  if (canvasComponent.value && typeof canvasComponent.value.selectObjectByID === "function") canvasComponent.value.selectObjectByID(idStr)
                } else if (newObj.__customUrl && canvasComponent.value && typeof canvasComponent.value.selectObjectByUrl === "function") {
                  canvasComponent.value.selectObjectByUrl(newObj.__customUrl)
                }
                // Ensure sidebar accordion opens to images
                openAccordion.value = 1
                // Scroll the sidebar to the item's image element if present
                try {
                  const cleanUrl = String(payload.url || "").replace(/"/g, "")
                  const selector = `img[src*="${cleanUrl}"]`
                  const el = document.querySelector(selector) as HTMLElement | null
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
                } catch (e) {}
              } catch (e) {}
            })

            // Call addImage with target sizing so new image fits the canvas
            if (canvasComponent.value && typeof canvasComponent.value.addImage === "function") {
              const opts: any = { ImgID: generatedId, width: targetW, height: targetH, left, top, selectable: true }
              if (payload.options) opts._imageManagerOptions = payload.options
              canvasComponent.value.addImage(payload.url, opts)
              // After short delay allow fabric to add object and then select it so sidebar opens
              nextTick(() =>
                setTimeout(() => {
                  try {
                    programmaticSelect(String(generatedId))
                    openAccordion.value = 1
                  } catch (e) {}
                }, 120)
              )
            }
            // early return so we don't call addImage again below
            pendingImageAction.value = null
            showImageManager.value = false
            return
          }
        } catch (e) {
          console.debug("failed to update editorData.faces", e)
        }
        // if already exists, just add by url with provided id
        const addOpts: any = { ImgID: payload.id }
        if (payload.options) addOpts._imageManagerOptions = payload.options
        canvasComponent.value.addImage(payload.url, addOpts)
      }
    } else {
      // no forced pending action — follow previous behavior: replace if image selected, otherwise add if allowed
      const selectedObj = canvasComponent.value?.getActiveObject?.()
      const selIsImage = selectedObj && selectedObj.type && String(selectedObj.type).toLowerCase().includes("image")
      if (selIsImage && typeof canvasComponent.value.replaceImage === "function") {
        const repOpts: any = { ImgID: payload.id }
        if (payload.options) repOpts._imageManagerOptions = payload.options
        canvasComponent.value.replaceImage(selectedObj, payload.id, payload.url, repOpts)
      } else if ((advMode.value || advEditAllowed) && typeof canvasComponent.value.addImage === "function") {
        // update sidebar then add
        try {
          const faceKey = editorData.selectedFace.value
          const facesRef: any = editorData.faces
          if (!facesRef.value) facesRef.value = {}
          if (!Array.isArray(facesRef.value[faceKey])) facesRef.value[faceKey] = []
          const exists = facesRef.value[faceKey].some(
            (it: any) => String(it.ID || it.id || it.ImgID || "") === String(payload.id || "") || String(it.__customUrl || it.Text || "") === String(payload.url)
          )
          if (!exists) {
            facesRef.value[faceKey].push({ ResourceType: "I", ID: payload.id, __customUrl: payload.url, ObjectName: payload.id ? String(payload.id) : "Added Image" })
          }
        } catch (e) {}
        const addOpts2: any = { ImgID: payload.id }
        if (payload.options) addOpts2._imageManagerOptions = payload.options
        canvasComponent.value.addImage(payload.url, addOpts2)
      } else {
        console.debug("[EditorRoot] image selection ignored (no adv mode or canvas handler)")
      }
    }
  } catch (e) {
    console.error("onImageSelected error", e)
  } finally {
    pendingImageAction.value = null
    showImageManager.value = false
  }
}

// Handle explicit replace event from ImageManager (button replacement action)
function onImageReplace(payload: { id: any; url: string; raw?: any; options?: { sizePct?: number; shape?: string } }) {
  try {
    const selectedObj = canvasComponent.value?.getActiveObject?.()
    const isImage = selectedObj && selectedObj.type && String(selectedObj.type).toLowerCase().includes("image")
    if (isImage && typeof canvasComponent.value.replaceImage === "function") {
      const repOpts: any = { ImgID: payload.id }
      if (payload.options) repOpts._imageManagerOptions = payload.options
      canvasComponent.value.replaceImage(selectedObj, payload.id, payload.url, repOpts)
      // Update the sidebar data (editorData.faces) for the currently selected image
      try {
        const selId = selectedObjectId.value
        const faceKey = editorData.selectedFace.value
        const facesRef: any = editorData.faces
        if (selId && facesRef && facesRef.value && Array.isArray(facesRef.value[faceKey])) {
          const idx = facesRef.value[faceKey].findIndex((it: any) => String(it.ID || it.id || it.ImgID || it.objectId || "") === String(selId))
          if (idx >= 0) {
            const entry = { ...(facesRef.value[faceKey][idx] || {}) }
            // update URLs/thumbs while preserving the canonical ID so selection still maps
            entry.__customUrl = payload.url
            entry.url = payload.url
            entry.thumb = payload.url
            if (payload.raw && payload.raw.label) entry.ObjectName = payload.raw.label
            if (payload.id) entry.ImgID = payload.id
            // replace in-place to ensure reactivity
            facesRef.value[faceKey].splice(idx, 1, entry)
            // ensure UI selects and scrolls to this item
            nextTick(() => {
              try {
                programmaticSelect(String(selId))
                openAccordion.value = 1
              } catch (e) {}
            })
          }
        }
      } catch (e) {
        console.debug("failed to update sidebar entry after replace", e)
      }
    } else {
      console.debug("onImageReplace: no image selected to replace")
    }
  } catch (e) {
    console.error("onImageReplace error", e)
  } finally {
    // clear any pending action and close manager
    pendingImageAction.value = null
    showImageManager.value = false
  }
}

function onSidebarFieldFocus(field: any) {
  // When a text field in the sidebar is focused, select the corresponding canvas object by id
  const id = field.id || field.ID || field.objectId || null
  if (!id) return
  openAccordion.value = 0
  // Use programmaticSelect to avoid triggering the canvas-selection-changed handler loop
  programmaticSelect(String(id))
  // Focus the input element in the sidebar
  nextTick(() => {
    try {
      const elId = "sidebar_text_" + String(id)
      const el = document.getElementById(elId) as HTMLInputElement | null
      if (el) {
        el.focus()
        const val = el.value || ""
        el.setSelectionRange(val.length, val.length)
      }
    } catch (e) {}
  })
}

// Watch text field changes and update canvas
watch(
  () => editorData.textFields.value.map((f: any) => ({ id: f.id, value: f.value })),
  (newFields: any[], oldFields: any[]) => {
    if (!canvasComponent.value?.updateText) return
    newFields.forEach((field, idx) => {
      if (!oldFields || field.value !== oldFields[idx]?.value) {
        canvasComponent.value.updateText(field.id, field.value)
      }
    })
  },
  { deep: true }
)

// Reload canvas helper
async function reloadCanvasObjects() {
  if (!canvasComponent.value?.clearCanvas) return
  // Suppress handling of selection events during full reload
  _suppressCanvasSelectionEvents = true
  canvasComponent.value.clearCanvas()
  const faceMap = {
    FrontFace: "front",
    BackFace: "back",
    InsideFace: "inside",
    EnvelopeFace: "envelope",
  }
  const faceKey = editorData.selectedFace.value
  const face = faceMap[faceKey as keyof typeof faceMap] || "front"
  try {
    const { useOrderVars } = require("../composables/useOrderVars")
    const orderVars = useOrderVars()
    console.log("[reloadCanvasObjects] orderVars before background:", JSON.parse(JSON.stringify(orderVars)))
  } catch (e) {}

  if (canvasComponent.value.loadBackgroundImage) {
    // Suppress history during full reload to avoid creating undo entries for initial population
    if (canvasComponent.value && typeof canvasComponent.value.beginHistorySuppress === "function") canvasComponent.value.beginHistorySuppress()
    canvasComponent.value.loadBackgroundImage(face, async () => {
      if (canvasComponent.value.resetZoomTo100) canvasComponent.value.resetZoomTo100()

      const allObjects = [
        ...editorData.textFields.value.map((obj: any) => ({ ...obj, __type: "text" })),
        ...editorData.images.value.map((obj: any) => ({ ...obj, __type: "image" })),
        ...editorData.shapes.value.map((obj: any) => ({ ...obj, __type: "shape" })),
        ...editorData.coupons.value.map((obj: any) => ({ ...obj, __type: "coupon" })),
      ]
      allObjects.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      for (const obj of allObjects) {
        if (obj.__type === "text" && canvasComponent.value.addText) {
          canvasComponent.value.addText(obj.value, obj.id, obj)
        } else if (obj.__type === "image" && canvasComponent.value.addImage) {
          canvasComponent.value.addImage(obj.url, obj)
        } else if (obj.__type === "shape" && canvasComponent.value.addShape) {
          canvasComponent.value.addShape(obj.type, obj)
        } else if (obj.__type === "coupon" && canvasComponent.value.addCoupon) {
          canvasComponent.value.addCoupon(obj.code, obj)
        }
      }
      if (canvasComponent.value.zoomFit) canvasComponent.value.zoomFit()
      // Ensure canvas edit mode matches UI advanced mode after objects loaded
      if (canvasComponent.value && typeof canvasComponent.value.setEditMode === "function") {
        canvasComponent.value.setEditMode(advMode.value)
      }
      // Initialize history baseline after objects loaded
      if (canvasComponent.value && typeof canvasComponent.value.initHistorySnapshot === "function") canvasComponent.value.initHistorySnapshot()
      if (canvasComponent.value && typeof canvasComponent.value.endHistorySuppress === "function") canvasComponent.value.endHistorySuppress()
      // allow a short grace period for any selection events to settle before re-enabling handling
      setTimeout(() => {
        _suppressCanvasSelectionEvents = false
      }, 200)
    })
  }
}

function onSidebarImageClick(img: any) {
  const id = img.id || img.ID || img.objectId || img.ID || img.ObjectId || img.ObjectID || null
  if (!id) {
    console.debug("[EditorRoot] onSidebarImageClick: image has no id, cannot select", img)
    return
  }
  // set label so ElementPropBar appears and open images accordion
  selectedLabel.value = img.label || img.ObjectName || img.name || "Image"
  openAccordion.value = 1
  programmaticSelect(String(id))
}

function onSidebarChangeImage(img: any) {
  // Open image editor flow - placeholder: emit event so parent app can intercept
  // We'll select the image first
  onSidebarImageClick(img)
  window.dispatchEvent(new CustomEvent("open-image-editor", { detail: { image: img } }))
}

function onSidebarChangeDesignClick(img: any) {
  try {
    pendingImageAction.value = "replace"
    showImageManager.value = true
    onSidebarImageClick(img)
  } catch (e) {
    console.warn("onSidebarChangeDesignClick failed", e)
  }
}

function onSidebarShapeClick(shape: any) {
  const id = shape.id || shape.ID || shape.objectId || null
  if (!id) return
  programmaticSelect(String(id))
}

// Reload when api finished loading or face changes
watch(
  () => [editorData.loading.value, editorData.selectedFace.value],
  ([loading, face], [prevLoading, prevFace]) => {
    if ((prevLoading && !loading) || face !== prevFace) reloadCanvasObjects()
  }
)

onMounted(async () => {
  await nextTick()
  reloadCanvasObjects()
  // Listen for selection events from canvas
  window.addEventListener("canvas-selection-changed", (ev: any) => {
    if (_suppressCanvasSelectionEvents) {
      // ignore events emitted as a result of our own programmatic selection
      return
    }
    const detail = ev instanceof CustomEvent ? ev.detail : null
    // Derive id either from event detail or from canvas active object to handle cases where canvas emits no id
    let idRaw: any = null
    let labelRaw: any = null
    if (detail) {
      idRaw = detail.id ?? null
      labelRaw = detail.label ?? null
    }
    // Dedupe repeated identical selection events that can be emitted rapidly
    try {
      const key = `${String(idRaw || "")}::${String(labelRaw || "")}`
      const now = Date.now()
      if (_lastSelectionKey === key && now - _lastSelectionTs < 200) {
        // ignore duplicate selection events within 200ms
        return
      }
      _lastSelectionKey = key
      _lastSelectionTs = now
    } catch (e) {}
    if ((!idRaw || idRaw === null) && canvasComponent.value && typeof canvasComponent.value.getActiveObject === "function") {
      try {
        const act: any = canvasComponent.value.getActiveObject()
        if (act) {
          idRaw = idRaw || act.id || act.ID || act.ImgID || act.objectId || act.ObjectID || null
          labelRaw = labelRaw || act.ObjectName || act.label || (act.text && String(act.text).substring?.(0, 40)) || null

          // EXTRA FALLBACK: if still no id, try to match the active object to sidebar data
          // by URL or label. This covers custom images that didn't receive an ID property.
          if (!idRaw) {
            try {
              const urlCandidate = act && (act.url || act.src || (act._element && act._element.currentSrc) || (act._element && act._element.src))
              // images
              if (urlCandidate) {
                const imgMatch = (editorData.images.value || []).find((f: any) => {
                  try {
                    if (!f) return false
                    const fUrl = f.url || f.thumb || f.src || f.imageUrl || null
                    if (!fUrl) return false
                    // exact match or endsWith (strip query strings)
                    if (String(fUrl) === String(urlCandidate)) return true
                    try {
                      const aStr = fUrl ? String(fUrl) : ""
                      const bStr = urlCandidate ? String(urlCandidate) : ""
                      const cleanA = aStr.split("?")[0]
                      const cleanB = bStr.split("?")[0]
                      if (cleanA === cleanB) return true
                      if (cleanA && cleanB && (cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA))) return true
                    } catch (e) {}
                    return false
                  } catch (e) {
                    return false
                  }
                })
                if (imgMatch) {
                  idRaw = idRaw || imgMatch.id || imgMatch.ID || imgMatch.ImgID || imgMatch.objectId || imgMatch.ObjectID || null
                  labelRaw = labelRaw || imgMatch.label || labelRaw
                }
              }
            } catch (e) {}

            // If still no id, try matching by label/text for text fields
            if (!idRaw && labelRaw) {
              try {
                const textMatch = (editorData.textFields.value || []).find(
                  (f: any) => String(f.label || f.ObjectName || f.Text || f.value || "").trim() === String(labelRaw).trim()
                )
                if (textMatch) {
                  idRaw = idRaw || textMatch.id || textMatch.ID || textMatch.objectId || null
                  labelRaw = labelRaw || textMatch.label
                }
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    }

    if (idRaw != null) {
      console.debug("[EditorRoot] canvas-selection-changed received", { idRaw, labelRaw })
      // Prefer provided label, but if missing try to derive from sidebar matches
      selectedObjectId.value = idRaw != null ? String(idRaw) : undefined
      selectedLabel.value = labelRaw || null
      // Query canvas for active object properties so menubar initializes correctly
      if (canvasComponent.value && typeof canvasComponent.value.getActiveProp === "function") {
        try {
          selectedInitials.fontFamily = canvasComponent.value.getActiveProp("fontFamily") || "Arial"
          selectedInitials.fontSize = canvasComponent.value.getActiveProp("fontSize") || 24
          selectedInitials.opacity = canvasComponent.value.getActiveProp("opacity") ?? 1
          selectedInitials.underline = canvasComponent.value.getActiveProp("underline") ?? false
          selectedInitials.fontWeight = canvasComponent.value.getActiveProp("fontWeight") || "normal"
          selectedInitials.fontStyle = canvasComponent.value.getActiveProp("fontStyle") || "normal"
          selectedInitials.textAlign = canvasComponent.value.getActiveProp("textAlign") || "left"
          // sync fill/background so menubar color swatches reflect current object
          selectedInitials.fill = canvasComponent.value.getActiveProp("fill") || null
          selectedInitials.backgroundColor = canvasComponent.value.getActiveProp("backgroundColor") || null
        } catch (e) {
          // ignore and leave defaults
        }
        // compute capability flags using canvas.getActiveProp for more accurate detection
        try {
          const get = canvasComponent.value.getActiveProp
          const hasFont = typeof get === "function" && get("fontFamily") !== undefined
          const hasSize = typeof get === "function" && get("fontSize") !== undefined
          const hasStyle = typeof get === "function" && (get("fontWeight") !== undefined || get("fontStyle") !== undefined || get("underline") !== undefined)
          const hasAlign = typeof get === "function" && get("textAlign") !== undefined
          const hasFill = typeof get === "function" && get("fill") !== undefined
          const hasBg = typeof get === "function" && get("backgroundColor") !== undefined
          const hasOpacity = typeof get === "function" && get("opacity") !== undefined
          const hasObj = !!canvasComponent.value?.getActiveObject?.()
          selectedCapabilities.canFont = !!hasFont
          selectedCapabilities.canSize = !!hasSize
          selectedCapabilities.canStyle = !!hasStyle
          selectedCapabilities.canAlign = !!hasAlign
          selectedCapabilities.canFill = !!hasFill
          selectedCapabilities.canBg = !!hasBg
          selectedCapabilities.canOpacity = !!hasOpacity || !!hasObj
          selectedCapabilities.canArrange = !!hasObj
          selectedCapabilities.canRemove = !!hasObj
        } catch (e) {}
      }
      // also open the appropriate sidebar accordion entry for this selected object
      try {
        const idStr = String(idRaw || "")
        const textMatch = (editorData.textFields.value || []).find((f: any) => String(f.id || f.ID || f.objectId || "") === idStr)
        const imgMatch = (editorData.images.value || []).find((f: any) => String(f.id || f.ID || f.objectId || f.ImgID || f.CouponID || "") === idStr)
        const couponMatch = (editorData.coupons.value || []).find((f: any) => String(f.id || f.ID || f.objectId || "") === idStr)
        const shapeMatch = (editorData.shapes.value || []).find((f: any) => String(f.id || f.ID || f.objectId || "") === idStr)
        console.debug("[EditorRoot] selection matching results", { idStr, textMatch: !!textMatch, imgMatch: !!imgMatch, couponMatch: !!couponMatch, shapeMatch: !!shapeMatch })
        if (textMatch) {
          openAccordion.value = 0
          selectedLabel.value = selectedLabel.value || textMatch.label || textMatch.ObjectName || null
          // Focus the corresponding sidebar text input so user can type immediately
          nextTick(() => {
            try {
              const elId = "sidebar_text_" + String(textMatch.id || textMatch.ID || textMatch.objectId || "")
              const el = document.getElementById(elId) as HTMLInputElement | null
              if (el) {
                el.focus()
                // place cursor at end
                const val = el.value || ""
                el.setSelectionRange(val.length, val.length)
              }
            } catch (e) {}
          })
        } else if (imgMatch) {
          openAccordion.value = 1
          selectedLabel.value = selectedLabel.value || imgMatch.label || imgMatch.ObjectName || null
        } else if (couponMatch) {
          openAccordion.value = 2
          selectedLabel.value = selectedLabel.value || couponMatch.label || null
        } else if (shapeMatch) {
          openAccordion.value = 3
          selectedLabel.value = selectedLabel.value || shapeMatch.label || null
        }
      } catch (e) {
        console.warn("selection handler failed", e)
      }
    } else {
      selectedLabel.value = null
      selectedObjectId.value = undefined
    }
  })
  // Listen for double-click events dispatched by canvas to open ImageManager in replace mode
  window.addEventListener("canvas-object-dblclick", (ev: any) => {
    try {
      const detail = ev instanceof CustomEvent ? ev.detail : null
      console.debug("[EditorRoot] canvas-object-dblclick received", { detail })
      const id = detail?.id ?? null
      if (!id) {
        console.debug("[EditorRoot] dblclick event had no id, ignoring")
        return
      }
      // select the object in the UI (so ImageManager shows Replace)
      selectedObjectId.value = String(id)
      console.debug("[EditorRoot] setting pendingImageAction=replace and opening ImageManager for id", { id })
      // set pending action to replace and open ImageManager
      pendingImageAction.value = "replace"
      showImageManager.value = true
    } catch (e) {}
  })
  // Listen for requests from ElementPropBar to open the sidebar and highlight/select item
  window.addEventListener("open-sidebar", (ev: any) => {
    const d = ev instanceof CustomEvent ? ev.detail : null
    if (!d || !d.id) return
    // try to find the id in textFields, images, coupons, shapes and open corresponding accordion
    const id = String(d.id)
    const textMatch = (editorData.textFields.value || []).find((f: any) => String(f.id || f.ID || f.objectId || "") === id)
    if (textMatch) {
      openAccordion.value = 0
      // select in canvas
      if (canvasComponent.value && typeof canvasComponent.value.selectObjectByID === "function") canvasComponent.value.selectObjectByID(id)
      return
    }
    const imgMatch = (editorData.images.value || []).find((f: any) => String(f.id || f.ID || f.objectId || f.ImgID || f.CouponID || "") === id)
    if (imgMatch) {
      openAccordion.value = 1
      if (canvasComponent.value && typeof canvasComponent.value.selectObjectByID === "function") canvasComponent.value.selectObjectByID(id)
      return
    }
    const couponMatch = (editorData.coupons.value || []).find((f: any) => String(f.id || f.ID || f.objectId || "") === id)
    if (couponMatch) {
      openAccordion.value = 2
      if (canvasComponent.value && typeof canvasComponent.value.selectObjectByID === "function") canvasComponent.value.selectObjectByID(id)
      return
    }
    const shapeMatch = (editorData.shapes.value || []).find((f: any) => String(f.id || f.ID || f.objectId || "") === id)
    if (shapeMatch) {
      openAccordion.value = 3
      if (canvasComponent.value && typeof canvasComponent.value.selectObjectByID === "function") canvasComponent.value.selectObjectByID(id)
      return
    }
  })
  // Listen for history changes from canvas to toggle undo/redo
  window.addEventListener("history-changed", (ev: any) => {
    const d = ev instanceof CustomEvent ? ev.detail : null
    if (!d) return
    try {
      canUndo.value = !!d.canUndo
      canRedo.value = !!d.canRedo
    } catch (e) {}
  })
  // Keep sidebar thumbnails in sync when canvas objects are replaced
  window.addEventListener("canvas-image-replaced", (ev: any) => {
    try {
      const d = ev instanceof CustomEvent ? ev.detail : null
      if (!d) return
      const id = d.id || null
      const url = d.url || null
      // Attempt to update matching sidebar entry by id or url
      try {
        const facesRef: any = editorData.faces
        if (facesRef && facesRef.value) {
          let found = false
          // First try current face for fast-path
          const tryKeys = [editorData.selectedFace.value, ...Object.keys(facesRef.value || {})]
          for (const fk of tryKeys) {
            try {
              const arr = facesRef.value[fk]
              if (!Array.isArray(arr)) continue
              let idx = -1
              if (id) {
                idx = arr.findIndex((it: any) => String(it.ID || it.id || it.ImgID || it.objectId || "") === String(id))
              }
              if (idx < 0 && url) {
                idx = arr.findIndex((it: any) => {
                  try {
                    const candidate = it.__customUrl || it.url || it.thumb || null
                    if (!candidate) return false
                    const a = String(candidate).split("?")[0] || ""
                    const b = String(url).split("?")[0] || ""
                    return a === b || (a && b && (a.endsWith(b) || b.endsWith(a)))
                  } catch (e) {
                    return false
                  }
                })
              }
              if (idx >= 0) {
                const entry = { ...(arr[idx] || {}) }
                entry.__customUrl = url || entry.__customUrl
                entry.url = url || entry.url
                entry.thumb = url || entry.thumb
                if (id) entry.ImgID = id
                facesRef.value[fk].splice(idx, 1, entry)
                // ensure sidebar selection highlights and canvas selection remains in sync
                nextTick(() => {
                  try {
                    const canonicalId = String(entry.ID || entry.id || entry.ImgID || id || "")
                    if (canonicalId) {
                      selectedObjectId.value = canonicalId
                      selectedLabel.value = entry.label || entry.ObjectName || selectedLabel.value
                      // programmatically select on canvas to re-trigger selection handling
                      try {
                        programmaticSelect(canonicalId)
                      } catch (e) {}
                    }
                    openAccordion.value = 1
                  } catch (e) {}
                })
                found = true
                break
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    } catch (e) {}
  })
  // Forward element-prop-change events to canvas
  window.addEventListener("element-prop-change", (ev: any) => {
    const d = ev instanceof CustomEvent ? ev.detail : null
    if (!d || !canvasComponent.value) return
    try {
      // Standard props that map directly to Fabric object's properties
      const directProps = ["opacity", "fontFamily", "fontSize", "textAlign"]
      if (directProps.includes(d.prop) && typeof canvasComponent.value.setActiveProp === "function") {
        canvasComponent.value.setActiveProp(d.prop, d.value)
        return
      }
      // Color props
      if ((d.prop === "fill" || d.prop === "backgroundColor") && typeof canvasComponent.value.setActiveProp === "function") {
        canvasComponent.value.setActiveProp(d.prop, d.value)
        return
      }
      // Remove selected object
      if (d.prop === "remove" && typeof canvasComponent.value.removeActiveObject === "function") {
        canvasComponent.value.removeActiveObject()
        return
      }
      // Z-order operations
      if (d.prop === "bringForward" && typeof canvasComponent.value.bringForward === "function") {
        canvasComponent.value.bringForward()
        return
      }
      if (d.prop === "sendBackward" && typeof canvasComponent.value.sendBackward === "function") {
        canvasComponent.value.sendBackward()
        return
      }
      if (d.prop === "bringToFront" && typeof canvasComponent.value.bringToFront === "function") {
        canvasComponent.value.bringToFront()
        return
      }
      if (d.prop === "sendToBack" && typeof canvasComponent.value.sendToBack === "function") {
        canvasComponent.value.sendToBack()
        return
      }
      // Style toggles: bold / italic /underline
      if (d.prop === "bold" && typeof canvasComponent.value.setActiveProp === "function") {
        // Toggle fontWeight between 'bold' and 'normal'
        const current = canvasComponent.value.getActiveProp ? canvasComponent.value.getActiveProp("fontWeight") : undefined
        const newVal = current === "bold" ? "normal" : "bold"
        canvasComponent.value.setActiveProp("fontWeight", newVal)
        return
      }
      if (d.prop === "italic" && typeof canvasComponent.value.setActiveProp === "function") {
        const current = canvasComponent.value.getActiveProp ? canvasComponent.value.getActiveProp("fontStyle") : undefined
        const newVal = current === "italic" ? "normal" : "italic"
        canvasComponent.value.setActiveProp("fontStyle", newVal)
        return
      }
      if (d.prop === "underline" && typeof canvasComponent.value.setActiveProp === "function") {
        // Fabric stores underline as boolean on text objects
        const current = canvasComponent.value.getActiveProp ? canvasComponent.value.getActiveProp("underline") : undefined
        const newVal = !!current ? false : true
        canvasComponent.value.setActiveProp("underline", newVal)
        return
      }
    } catch (e) {
      console.warn("element-prop-change forward failed", e)
    }
  })
  // Listen for font variant availability broadcasts from ElementPropBar
  window.addEventListener("font-variant-availability", (ev: any) => {
    const d = ev instanceof CustomEvent ? ev.detail : null
    if (!d || !d.id) return
    try {
      fontVariantAvailability.value = {
        ...fontVariantAvailability.value,
        [String(d.id)]: { italic: !!d.italic, bold: !!d.bold },
      }
    } catch (e) {
      // ignore
    }
  })
})
</script>
