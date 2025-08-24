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
                  <div v-for="field in editorData.textFields.value || []" :key="field.label" class="flex items-center py-1.5 px-2.5">
                    <Icon name="material-symbols:edit" class="mr-2 text-gray-400 text-base" />
                    <span class="text-xs font-medium text-gray-700 flex-1">{{ field.label }}</span>
                    <input
                      v-model="field.value"
                      class="ml-2 border border-gray-300 rounded px-1.5 py-0.5 text-xs w-28 focus:ring-2 focus:ring-primary-400"
                      @focus="onSidebarFieldFocus(field)"
                      @click="onSidebarFieldFocus(field)" />
                  </div>
                </div>
              </AccordionSection>
              <AccordionSection v-if="(editorData.images.value || []).length > 0" :open="openAccordion === 1" @toggle="setAccordion(1)">
                <template #title>
                  <span class="flex items-center font-bold text-sm py-2"><Icon name="material-symbols:image" class="mr-2 text-lg text-gray-500" />Image(s)</span>
                </template>
                <div class="divide-y divide-gray-100">
                  <div v-for="img in editorData.images.value || []" :key="img.label" class="flex items-center py-1.5 px-2.5">
                    <Icon name="material-symbols:image" class="mr-2 text-gray-400 text-base" />
                    <img :src="img.thumb || img.url" class="w-16 h-10 object-cover rounded mr-2 border" @click="() => onSidebarImageClick(img)" />
                    <span class="text-xs font-medium text-gray-700 flex-1" @click="() => onSidebarImageClick(img)">{{ img.label }}</span>
                    <button class="ml-2 border border-gray-300 rounded px-2 py-0.5 text-xs bg-white hover:bg-gray-100 transition" @click="() => onSidebarChangeImage(img)">
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
                  <div v-for="coupon in editorData.coupons.value || []" :key="coupon.label" class="flex items-center py-1.5 px-2.5">
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
                  <div v-for="shape in editorData.shapes.value || []" :key="shape.label" class="flex items-center py-1.5 px-2.5">
                    <Icon name="material-symbols:category" class="mr-2 text-gray-400 text-base" />
                    <span class="text-xs font-medium text-gray-700 flex-1" @click="() => onSidebarShapeClick(shape)">{{ shape.label }}</span>
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
            <ImageManager v-if="showImageManager" @close="showImageManager = false" @select-image="onImageSelected" />
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
import { ref, watch, onMounted, nextTick } from "vue"
import { fetchOrderVars } from "../composables/useOrderVars"
import ElementPropBar from "./ElementPropBar.vue"
import ImageManager from "./ImageManager.vue"
// No import for Icon needed; use <Icon> directly in template

const editorData = useEditorData()
const canvasComponent = ref<any>(null)
const showShapeMenu = ref(false)
const showImageManager = ref(false)
// expose component so template can use it
const components = { ElementPropBar }
const selectedLabel = ref<string | null>(null)
const selectedObjectId = ref<string | undefined>(undefined)
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
  const img = editorData.images.value?.[0]
  if (img && canvasComponent.value?.addImage) canvasComponent.value.addImage(img.url || "")
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

// Handle image selection from ImageManager
function onImageSelected(payload: { id: any; url: string }) {
  // If an object is selected and it's an image, replace it; otherwise add new if advMode
  try {
    const selectedObj = canvasComponent.value?.getActiveObject?.()
    const isImageSelected = selectedObj && selectedObj.type && selectedObj.type.toLowerCase().includes("image")
    if (isImageSelected && typeof canvasComponent.value.replaceImage === "function") {
      canvasComponent.value.replaceImage(selectedObj, payload.id, payload.url)
    } else if ((advMode.value || advEditAllowed) && typeof canvasComponent.value.addImage === "function") {
      canvasComponent.value.addImage(payload.url, { ImgID: payload.id })
    } else {
      // not allowed
      console.debug("[EditorRoot] image selection ignored (no adv mode or canvas handler)")
    }
  } catch (e) {
    console.error("onImageSelected error", e)
  }
  showImageManager.value = false
}

function onSidebarFieldFocus(field: any) {
  // When a text field in the sidebar is focused, select the corresponding canvas object by id
  const id = field.id || field.ID || field.objectId || null
  if (!id) return
  if (canvasComponent.value && typeof canvasComponent.value.selectObjectByID === "function") {
    canvasComponent.value.selectObjectByID(String(id))
  }
  // If the user wants to immediately edit text, attempt to enter text editing mode
  if (canvasComponent.value && typeof canvasComponent.value.setActiveTextEditing === "function") {
    canvasComponent.value.setActiveTextEditing(String(id))
  }
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
    })
  }
}

function onSidebarImageClick(img: any) {
  const id = img.id || img.ID || img.objectId || img.ID || img.ObjectId || img.ObjectID || null
  if (!id) return
  if (canvasComponent.value && typeof canvasComponent.value.selectObjectByID === "function") canvasComponent.value.selectObjectByID(String(id))
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
  if (canvasComponent.value && typeof canvasComponent.value.selectObjectByID === "function") canvasComponent.value.selectObjectByID(String(id))
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
    const detail = ev instanceof CustomEvent ? ev.detail : null
    if (detail && detail.label) {
      selectedLabel.value = detail.label
      selectedObjectId.value = detail.id
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
        const idStr = String(detail.id || "")
        if ((editorData.textFields.value || []).find((f: any) => String(f.id || f.ID || f.objectId || "") === idStr)) openAccordion.value = 0
        else if ((editorData.images.value || []).find((f: any) => String(f.id || f.ID || f.objectId || "") === idStr)) openAccordion.value = 1
        else if ((editorData.coupons.value || []).find((f: any) => String(f.id || f.ID || f.objectId || "") === idStr)) openAccordion.value = 2
        else if ((editorData.shapes.value || []).find((f: any) => String(f.id || f.ID || f.objectId || "") === idStr)) openAccordion.value = 3
      } catch (e) {}
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
    const imgMatch = (editorData.images.value || []).find((f: any) => String(f.id || f.ID || f.objectId || "") === id)
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
