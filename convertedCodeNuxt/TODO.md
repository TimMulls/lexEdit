# Editor Conversion TODO

This file tracks the conversion work and immediate next steps. I will update this file with concise deltas as I make edits or needs for more conversion issues.

## Current checklist

- [ ] Implement a short debug log to help map sidebar IDs to canvas objects (e.g. console.debug in `onSidebarImageClick` / `onSidebarShapeClick`).
  - [ ] Fix sidebar shape-click selection mapping.
- [ ] Wire the Image Manager integration (open-image-editor flow, replaceImage/select semantics).
- Opacity slider: currently works but is it is on the right side of the screen so it does not show the slider correctly, also needs debouncing added.
- Bold, Italic and Underline buttons: are still not grouped together with no spacing and needs more padding to look like the original version
- Bold button: currently toggles but does not update the button state correctly, also is not updated on load correctly

## In Progress

- Eyedropper: native API + canvas-pixel fallback implemented in `app/components/ElementPropBar.vue` — needs HiDPI/transform fixes and UX polish (cursor restore, preview while sampling). I did not implement a full fabric.toDataURL fallback, nor race against cross-origin tainting—those are larger, higher-effort fixes if you later want total reliability across all scenarios.
- Image Manager wiring: `open-image-editor` now opens `ImageManager` and passes an `initialImage` to preselect/guess the correct type; ImageManager now highlights and scrolls to the initial image after load. Next: add direct "Replace selected canvas object" flow and improve selection highlighting reliability.

## Done ✓

- Ported `ElementPropBar.vue` menubar UI and capability gating (compact Edit button, popovers, swatches).
- Debounced color picker inputs (100ms) to avoid heavy update rates during dragging.
- Added Eyedropper button + fallback sampling (native API where available; fallback samples `#e5Canvas`).
- Fixed `zoomFit` invocation bug in zoom composable and reduced noisy zoom diagnostics.
- Scoped temporary suppression of noisy logs inside `createCustomImage`.
- Hardened image `ObjectGroup` normalization and safe URL composition in `useEditorData.ts` (fixes singular `/Logo/` → `Logos` mapping and duplicate-slash issues).
- Exposed imperative canvas API in `EditorCanvas.vue` (selectObjectByID, setActiveProp, getActiveProp, undo/redo, replaceImage, etc.).
- Sidebar clicks now select corresponding canvas objects (`EditorRoot.vue`).
- History suppression during bulk loads to avoid noisy undo entries on initial population.

## Next actions (pick one or I'll proceed in order)

1. Wire Image Manager flow: `open-image-editor` → select/replace image → update canvas & history. (Estimate: 2–4 hours)
1. Very low priory for that lenght of time. Finish Eyedropper polishing: handle HiDPI/canvas transforms, ensure sampling accurate across scaled canvases, add a small visual preview while sampling. (Estimate: 2–3 hours)

1. Low priority for now. Add smoke tests / manual QA checklist and a short README entry describing developer test steps. (Estimate: 30–60 minutes)
