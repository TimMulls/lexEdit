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
      <!-- Sidebar -->
      <aside class="col-span-3 bg-white border-r border-gray-200 flex flex-col min-h-0 overflow-y-auto p-0">
        <div class="p-4">
          <div class="border border-gray-300 rounded-lg shadow bg-white">
            <template v-if="editorData.loading.value || !ready">
              <div class="flex flex-col items-center justify-center py-12">
                <Icon name="material-symbols:hourglass-top" class="text-3xl text-primary-400 animate-spin mb-2" />
                <span class="text-xs text-gray-500">Loading editor data and fonts...</span>
              </div>
            </template>
            <template v-else-if="editorData.error.value">
              <div class="flex flex-col items-center justify-center py-12">
                <Icon name="material-symbols:error" class="text-3xl text-red-400 mb-2" />
                <span class="text-xs text-red-500">Failed to load editor data.</span>
                <span class="text-xs text-gray-400 mt-1">{{ editorData.error.value.message }}</span>
                <button class="mt-3 px-3 py-1 rounded bg-primary-500 text-white text-xs hover:bg-primary-600" @click="editorData.loadFromApi">Retry</button>
              </div>
            </template>
            <template v-else>
              <AccordionSection v-if="(editorData.textFields.value || []).length > 0" :open="openAccordion === 0" @toggle="setAccordion(0)">
                <template #title>
                  <span class="flex items-center font-bold text-sm py-2"><Icon name="material-symbols:text-fields" class="mr-2 text-lg text-gray-500" />Text</span>
                </template>
                <div class="divide-y divide-gray-100">
                  <div
                    v-for="field in editorData.textFields.value || []"
                    :key="field.id || field.ID || field.objectId || field.label"
                    :class="[
                      'flex items-center py-1.5 px-2.5 cursor-pointer',
                      selectedObjectId && String(selectedObjectId) === String(field.id || field.ID || field.objectId || '') ? 'bg-primary-50 border-l-2 border-primary-400' : '',
                    ]"
                    @click="onSidebarFieldFocus(field)">
                    <Icon name="material-symbols:edit" class="mr-2 text-gray-400 text-base" />
                    <span class="text-xs font-medium text-gray-700 flex-1">{{ field.label }}</span>
                    <input
                      :id="'sidebar_text_' + String(field.id || field.ID || field.objectId || '')"
                      v-model="field.value"
                      class="ml-2 border border-gray-300 rounded px-1.5 py-0.5 text-xs w-28 focus:ring-2 focus:ring-primary-400"
                      @focus="onSidebarFieldFocus(field)"
                      @click.stop="onSidebarFieldFocus(field)" />
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
                    <button class="ml-2 border border-gray-300 rounded px-2 py-0.5 text-xs bg-white hover:bg-gray-100 transition" @click="(e) => onSidebarChangeImage(img)">
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
            </template>
          </div>
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
          <button class="hover:underline" @click="$emit('done-editing')">DONE EDITING &gt;</button>
        </div>
      </main>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ ready: boolean }>()
import { ref, watch, onMounted, nextTick, computed } from "vue"
import { fetchOrderVars } from "../composables/useOrderVars"
import ElementPropBar from "./ElementPropBar.vue"
import ImageManager from "./ImageManager.vue"
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
  const defaultText = "Double click to edit this text."
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
function onImageSelected(payload: { id: any; url: string }) {
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
            facesRef.value[faceKey].push({ ResourceType: "I", ID: payload.id, __customUrl: payload.url, ObjectName: payload.id ? String(payload.id) : "Added Image" })
          }
        } catch (e) {
          console.debug("failed to update editorData.faces", e)
        }
        canvasComponent.value.addImage(payload.url, { ImgID: payload.id })
      }
    } else {
      // no forced pending action — follow previous behavior: replace if image selected, otherwise add if allowed
      const selectedObj = canvasComponent.value?.getActiveObject?.()
      const selIsImage = selectedObj && selectedObj.type && String(selectedObj.type).toLowerCase().includes("image")
      if (selIsImage && typeof canvasComponent.value.replaceImage === "function") {
        canvasComponent.value.replaceImage(selectedObj, payload.id, payload.url)
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
        canvasComponent.value.addImage(payload.url, { ImgID: payload.id })
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
function onImageReplace(payload: { id: any; url: string; raw?: any }) {
  try {
    const selectedObj = canvasComponent.value?.getActiveObject?.()
    const isImage = selectedObj && selectedObj.type && String(selectedObj.type).toLowerCase().includes("image")
    if (isImage && typeof canvasComponent.value.replaceImage === "function") {
      canvasComponent.value.replaceImage(selectedObj, payload.id, payload.url)
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
  programmaticSelect(String(id))
}

function onSidebarChangeImage(img: any) {
  // Open image editor flow - placeholder: emit event so parent app can intercept
  // We'll select the image first
  onSidebarImageClick(img)
  window.dispatchEvent(new CustomEvent("open-image-editor", { detail: { image: img } }))
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

    if (labelRaw) {
      console.debug("[EditorRoot] canvas-selection-changed received", { idRaw, labelRaw })
      selectedLabel.value = labelRaw
      selectedObjectId.value = idRaw != null ? String(idRaw) : undefined
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
        } else if (imgMatch) openAccordion.value = 1
        else if (couponMatch) openAccordion.value = 2
        else if (shapeMatch) openAccordion.value = 3
      } catch (e) {
        console.warn("selection handler failed", e)
      }
    } else {
      selectedLabel.value = null
      selectedObjectId.value = undefined
    }
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
