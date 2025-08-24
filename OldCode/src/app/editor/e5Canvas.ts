//import { Line, Circle, Ellipse, Triangle, Rect, Point } from "fabric/fabric-impl";
import { elementProp } from "../../content/elementProp";
import { TemplateObject } from "../../interfaces/template";
import { appConfig } from "../appConfig";
import { orderVars } from "../orderVars";
import { editor } from "./editor";
import { editorZoom } from "./editorZoom";
import { MemoCmd } from "./history";

interface PositionResult {
    centerX: boolean
    centerY: boolean
    guidesX: number[]
    guidesY: number[]
}

class E5Canvas {
    canvas!: fabric.Canvas;
    canvasScale = 1.0;
    SCALE_FACTOR = 1.2;
    gridGroup: any = null;
    cutLinesGroup: any = null;
    memo!: MemoCmd;
    AdvMode = false;

    protected static _instance = new E5Canvas();

    static get instance(): E5Canvas {
        return this._instance;
    }

    init() {
        // @ts-expect-error DPI exists just not in type file
        fabric.DPI = 144;

        this.canvas = new fabric.Canvas('e5Canvas', {
            width: 1875,
            height: 1275,
            backgroundColor: '#FFF',
            // @ts-expect-error centerTransform Exists
            centerTransform: true,
            showTextOutline: appConfig.showTextOutline,
            selection: false,
            stateful: true,
            preserveObjectStacking: true,
            crossOrigin: 'Anonymous',
            renderOnAddRemove: true
        });

        this.canvas.clear();
        this.initHistory();
        this.bindEvents();
    }

    /**
     * Used to set font size becuase pdf and browser do not use the same size
     * @param {any} size Browser font size to fix for pdf font size
     * @return {String} Capitalized version of a string
     */
    setFontSize(size: number) {
        return fabric.util.parseUnit(size + 'pt');
    }

    getFontSize(size: number) {
        // @ts-expect-error DBI exists
        return (size / fabric.DPI * 72);
    }

    /**
     * Used to set up Adv Editing Mode
     * @param {boolean} enabled If true then will set editor to Adv Mode
     */
    editMode(enabled: boolean) {
        this.AdvMode = enabled;
        elementProp.hideMsg(false);
        elementProp.advButtons(this.AdvMode);
        this.setCanvasSelection();
    }

    isEditableObject(obj: TemplateObject) {
        if (orderVars.sessionId == 'BackOfficeEdit') {
            return true;
        }

        //Envelope Addressee
        if (obj.ObjectType === 151) {
            return true;
        }

        if (obj.SuppressPrinting) {
            return false;
        }

        switch (obj.ObjectType) {
            case 2: //Non Editable Text
            case 103: //Postal Image
            case 122: //No editable logo
            case 143: //Driving Map
            case 149: //Order Number
            case 150: //Static Rectangle
                return false;
        }

        return true;
    }

    setCanvasSelection() {
        if (this.canvas) {
            this.canvas.discardActiveObject().renderAll();
            //ToDo: reenable after geting groups to work
            //e5Canvas.canvas.selection = e5Canvas.AdvMode;

            const objs = this.getObjects();
            for (const obj of objs) {
                if (e5Canvas.isEditableObject(obj)) {
                    obj.selectable = true;
                    obj.editable = e5Canvas.AdvMode;
                }
                else {
                    obj.selectable = false;
                    obj.editable = false;
                }
            }

            this.canvas.requestRenderAll().calcOffset();
        }
    }

    initHistory() {
        this.memo = new MemoCmd($('#btnUndo'), $('#btnRedo'));

        this.canvas.on('text:editing:exited', function (t) {
            editor.addMemoTransformCmd(<TemplateObject>t.target);
        });

        this.canvas.on('text:changed', elementProp.onTextChanged);

        $('#btnUndo').off().on('click', function (t) {
            t.preventDefault();
            e5Canvas.memo.back();
        });

        $('#btnRedo').off().on('click', function (t) {
            t.preventDefault();
            e5Canvas.memo.forward();
        });
    }

    get centerX() {
        return this.canvas.getWidth() / 2
    }

    get centerY() {
        return this.canvas.getHeight() / 2
    }
    /*
    get state() {
        if (this.signState && (!this.signState.widthPx || !this.signState.heightPx)) {
            this.calcState(this.signState)
        }

        return this.signState
    }

    set state(newState) {
        this.calcState(newState)
        this.signState = newState
        this.drawables.setState(newState)
    }
    */

    get scale() {
        return this.canvas ? this.canvas.getZoom() : 1
    }

    /*
    private addGuideLines(horizontal: boolean, vertical: boolean, objGuidesX: number[], objGuidesY: number[]) {
        const stroke = "#ccccff"
        const coords = []

        if (horizontal) {
            coords.push([this.centerX, 0, this.centerX, 0])
        }

        if (vertical) {
            coords.push([0, this.centerY, 0, this.centerY])
        }

        for (const guide of objGuidesX) {
            coords.push([guide, 0, guide, 0]);
        }

        for (const guide of objGuidesY) {
            coords.push([0, guide, 0, guide])
        }

        for (const coordset of coords) {
            const line = new fabric.Line(coordset, {
                stroke,
                strokeWidth: 2 / this.scale,
                selectable: false,
                name: "guideline",
            })

            this.guidelines.push(line)
            this.canvas.add(line)
        }
    }

    private removeGuidelines() {
        while (this.guidelines.length > 0) {
            const line = this.guidelines.pop()

            if (line) {
                this.canvas.remove(line)
            }
        }
    }
    */

    bindEvents() {
        this.canvas.on('mouse:over', function (e) {
            e5Canvas.canvas.hoverCursor = 'default';

            if (!e.target || !e.target.selectable) {
                return;
            }

            if (!e5Canvas.AdvMode) {
                e5Canvas.canvas.hoverCursor = 'pointer';
            }
            else {
                e5Canvas.canvas.hoverCursor = 'pointer';

                const tar = e.target;
                const atar = e.target.canvas;

                if (atar && (tar === atar.getActiveObject())) {
                    e5Canvas.canvas.hoverCursor = 'move';
                }
            }
        });

        /*
        this.canvas.on({
            'object:moving': e => {
                if (e.target) {
                    //this.objects.keepWithinBounds(e.target)
                    const result = e5Canvas.handleMoving(e.target)

                    this.removeGuidelines();

                    if (result) {
                        this.addGuideLines(result.centerX, result.centerY, result.guidesX, result.guidesY);
                    }
                }
            }
        });
        */

        /*
        this.canvas.on('object:moving', function (options) {
            options.target.set({
                left: Math.round(options.target.left),
                top: Math.round(options.target.top)
            });

            var el = event.target;
            var cutLineArea = 18 * e5Canvas.canvasScale;
            // supposed coords is center based
            //el.left = el.left < el.getBoundingRectWidth() / 2 ? el.getBoundingRectWidth() / 2 : el.left;
            //el.top = el.top < el.getBoundingRectHeight () / 2 ? el.getBoundingRectHeight() / 2 : el.top;

            var right = el.left + el.getBoundingRectWidth();
            var bottom = el.top + el.getBoundingRectHeight();

            //el.left = right > this.canvas.width - el.getBoundingRectWidth() / 2 ? this.canvas.width - el.getBoundingRectWidth() / 2 : el.left;
            //el.top = bottom > e5Canvas.height - el.getBoundingRectHeight() / 2 ? e5Canvas.height - el.getBoundingRectHeight() / 2 : el.top;

            el.left = right > e5Canvas.canvas.width ? e5Canvas.canvas.width - el.getBoundingRectWidth() - cutLineArea : el.left;
            el.top = bottom > e5Canvas.canvas.height ? e5Canvas.canvas.height - el.getBoundingRectHeight() - cutLineArea : el.top;

            if (el.left < cutLineArea) {
                el.left = cutLineArea;
            }

            if (el.top < cutLineArea) {
                el.top = cutLineArea;
            }

            e5Canvas.canvas.renderAll().calcOffset();
        });
        */

        this.canvas.on('selection:created', function (e) { e5Canvas.handleObjectSelection(e); });
        this.canvas.on('selection:updated', function (e) { e5Canvas.handleObjectSelection(e); });

        this.canvas.on('selection:cleared', function () {
            if (elementProp) {
                elementProp.hideMsg(false);
            }
        });

        this.canvas.on('object:modified', function (e) {
            e5Canvas.canvas.calcOffset();

            editor.addMemoTransformCmd(e.target as TemplateObject);

            //editor.checkCutLines();
        });

        /*
         var object = e.target;
         //console.log('object:modified');
         if (lexEdit.history.memo.action === true) {
         lexEdit.history.memo.state = [lexEdit.history.memo.state[lexEdit.history.memo.index2]];
         lexEdit.history.memo.list = [lexEdit.history.memo.list[lexEdit.history.memo.index2]];

         lexEdit.history.memo.action = false;
         //console.log(state);
         lexEdit.history.memo.index = 1;
         }
         object.saveState();

         //console.log(object.originalState);
         lexEdit.history.memo.state[lexEdit.history.memo.index] = JSON.stringify(object.originalState);
         lexEdit.history.memo.list[lexEdit.history.memo.index] = object;
         lexEdit.history.memo.index++;
         lexEdit.history.memo.index2 = lexEdit.history.memo.index - 1;

         lexEdit.history.memo.refresh = true;
         */
        //});

        /*
        e5Canvas.canvas.on("object:selected", function (e) {
            if (e.target) {
                e.target.bringToFront();
                e5Canvas.canvas.renderAll();
            }
        });

        let _prevActive:unknown;
        let _layer = 0;

        //@ts-expect-error known
        fabric.util.addListener(e5Canvas.canvas.upperCanvasEl, "dblclick", function (e) {
            const _canvas = e5Canvas.canvas;
            //current mouse position
            //@ts-expect-error known
            const _mouse:Point = _canvas.getPointer(e);
            //active object (that has been selected on click)
            const _active = _canvas.getActiveObject();
            //possible dblclick targets (objects that share mousepointer)
            const _targets = _canvas.getObjects().filter(function (_obj) {
                return _obj.containsPoint(_mouse); // && !_canvas.isTargetTransparent(_obj, _mouse.x, _mouse.y);
            });

            _canvas.discardActiveObject();

            //new top layer target
            if (_prevActive !== _active) {
                //try to go one layer below current target
                _layer = Math.max(_targets.length - 2, 0);
            }
            //top layer target is same as before
            else {
                //try to go one more layer down
                _layer = --_layer < 0 ? Math.max(_targets.length - 2, 0) : _layer;
            }

            //get obj on current layer
            const _obj = _targets[_layer];

            if (_obj) {
                _prevActive = _obj;
                _obj.bringToFront();
                _canvas.setActiveObject(_obj).renderAll();
            }
        });
        */
        /*
        console.log('Object Not Selectable');
        //Used to fix unselectable object under another one
        let _layer = 0;
        //current mouse position

        //@ts-expect-error I know
        const _mouse: any = e5Canvas.canvas.getPointer(options);

        const _targets = e5Canvas.canvas.getObjects().filter(function (_obj) {
            return _obj.containsPoint(_mouse); // && !e5Canvas.canvas.isTargetTransparent(_obj, _mouse.x, _mouse.y);
        });

        _layer = --_layer < 0 ? Math.max(_targets.length - 2, 0) : _layer;

        ///get obj on current layer
        const _obj = _targets[_layer];

        if (_obj) {
            console.log('Object Found under image', _obj);
            //_prevActive = _obj;
            _obj.bringToFront();
            e5Canvas.canvas.setActiveObject(_obj).renderAll();
        }
        else {
*/
        //Double click fix.
        this.canvas.on('mouse:down', function (options) {
            if (options.target) {
                // @ts-expect-error isEditing exists
                if (options.target.isEditing) {
                    return;
                }

                // start the timer
                const date = new Date();
                const timeNow = date.getTime();
                if (timeNow - editor.timer < 500) {
                    console.log('DblClick: ' + options.target.type);
                    if (appConfig.ImageClassType === options.target.type) {
                        if (options.target.selectable === false) {
                            return;
                        }

                        // @ts-expect-error imgType exists
                        editor.changeImage(options.target.imgType);
                    }
                }

                editor.timer = timeNow;
            }
        });
    }

    //@throttle(16, { trailing: true })
    handleMoving(obj: fabric.Object): PositionResult | null {
        //if (this.isSignObject(obj)) {
        const result: PositionResult = {
            centerX: false,
            centerY: false,
            guidesX: [],
            guidesY: [],
        }

        const centerDiff = this.canvas.getWidth(); // this.state.widthPx * 0.01
        const snapDiff = centerDiff / 2
        const objTop = (obj.top || 0) - obj.getScaledHeight() / 2
        const objBottom = (obj.top || 0) + obj.getScaledHeight() / 2
        const objLeft = (obj.left || 0) - obj.getScaledWidth() / 2
        const objRight = (obj.left || 0) + obj.getScaledWidth() / 2

        // snap to sign center
        const diffLeft = this.centerX - (obj.left || 0)
        const diffTop = this.centerY - (obj.top || 0)

        if (diffLeft < centerDiff && diffLeft > -centerDiff) {
            obj.left = this.centerX
            result.centerX = true
        }

        if (diffTop < centerDiff && diffTop > -centerDiff) {
            obj.top = this.centerY
            result.centerY = true
        }

        // snap to other objects
        for (const other of this.getObjects()) {
            if (other === obj) {
                continue
            }

            const otherTop = (other.top || 0) - other.getScaledHeight() / 2
            const otherBottom = (other.top || 0) + other.getScaledHeight() / 2
            const otherLeft = (other.left || 0) - other.getScaledWidth() / 2
            const otherRight = (other.left || 0) + other.getScaledWidth() / 2

            if (!result.centerY) {
                if ((other.top || 0) - (obj.top || 0) < snapDiff && (other.top || 0) - (obj.top || 0) > -snapDiff) {
                    obj.top = other.top
                }

                if (otherTop - objTop < snapDiff && otherTop - objTop > -snapDiff) {
                    obj.top = otherTop + obj.getScaledHeight() / 2
                }

                if (otherBottom - objBottom < snapDiff && otherBottom - objBottom > -snapDiff) {
                    obj.top = otherBottom - obj.getScaledHeight() / 2
                }

                if (obj.top === other.top && other.top) {
                    result.guidesY.push(other.top)
                }

                if (obj.top === otherTop + obj.getScaledHeight() / 2) {
                    result.guidesY.push(otherTop)
                }

                if (obj.top === otherBottom - obj.getScaledHeight() / 2) {
                    result.guidesY.push(otherBottom)
                }
            }

            if (!result.centerX) {
                if ((other.left || 0) - (obj.left || 0) < snapDiff && (other.left || 0) - (obj.left || 0) > -snapDiff) {
                    obj.left = other.left
                }

                if (otherLeft - objLeft < snapDiff && otherLeft - objLeft > -snapDiff) {
                    obj.left = otherLeft + obj.getScaledWidth() / 2
                }

                if (otherRight - objRight < snapDiff && otherRight - objRight > -snapDiff) {
                    obj.left = otherRight - obj.getScaledWidth() / 2
                }

                if (obj.left === other.left && other.left) {
                    result.guidesX.push(other.left)
                }

                if (obj.left === otherLeft + obj.getScaledWidth() / 2) {
                    result.guidesX.push(otherLeft)
                }

                if (obj.left === otherRight - obj.getScaledWidth() / 2) {
                    result.guidesX.push(otherRight)
                }
            }
        }

        // stick single object on autosized sign to center
        /*
            if (this.state.widthAuto && this.objects.length === 1) {
                obj.left = this.centerX
            }

            if (this.state.heightAuto && this.objects.length === 1) {
                obj.top = this.centerY
            }
            */

        // update object state with current coordinates
        //const left = (obj.left || 0) - this.centerX
        //const top = (obj.top || 0) - this.centerY

        //this.updateState(obj, { left, top })
        return result
        //}

        //return null
    }

    handleObjectSelection(e: any) {
        if (e.selected[0].isEditing) {
        //if (e.target.isEditing) {
            return;
        }

        if (elementProp) {
            elementProp.onObjectSelected();
        }
    }

    /*
     * Gets template json data
     */
    getJSON(): string {
        return JSON.stringify(this.canvas.toDatalessJSON(appConfig.extraKeys));
    }

    /**
     * Gets the selected object and returns in a TemplateObject typing
     */
    getActiveObject(): TemplateObject {
        return <TemplateObject>this.canvas.getActiveObject();
    }
    getActiveObjects(): TemplateObject[] {
        return <TemplateObject[]>this.canvas.getActiveObjects();
    }
    getObjects(): TemplateObject[] {
        return <TemplateObject[]>this.canvas.getObjects();
    }

    getObjectById(id: number): TemplateObject | undefined {
        const objs = e5Canvas.getObjects();

        for (const obj of objs) {
            if (obj.ID && obj.ID === id) {
                return obj;
            }
        }

        return undefined;
    }

    getActiveObjectsCoords() {
        const object: TemplateObject = this.getActiveObject() || null;

        if (!object) {
            return;
        }

        object.setCoords();

        const objCoords = {
            height: 0,
            width: 0,
            left: 0,
            top: 0,
            isGroup: false
        };

        //Left/Top values of objects in groups are relative to groups' centers. This behavior can not be changed.
        // @ts-expect-error getActiveGroup exists
        if (this.canvas.getActiveGroup()) {
            if (object) {
                objCoords.height = (object.height.toFixed(0) as unknown as number / 2);
                objCoords.width = (object.width.toFixed(0) as unknown as number / 2);
                objCoords.left = (object?.left?.toFixed(0) as unknown as number - (object.width.toFixed(0) as unknown as number / 2));
                objCoords.top = (<number><unknown>object?.top?.toFixed(0) - (object.height.toFixed(0) as unknown as number / 2));
                objCoords.isGroup = true;
            }
        }
        else if (this.canvas.getActiveObject()) {
            objCoords.height = object.getHeight();
            objCoords.width = object.getWidth();
            objCoords.left = <number>object.left * e5Canvas.canvasScale;
            objCoords.top = <number>object.top * e5Canvas.canvasScale;
        }

        return objCoords;
    }

    /**
     * Moves object or group using keyboard
     * @param direction Direction to move object
     * @param pxls Number of pixels to move object
     */
    moveObject(direction: string, pxls: number) {
        if (!e5Canvas.AdvMode) {
            return;
        }

        const object = this.canvas.getActiveObject();

        if (object !== undefined) {
            const left = <number>object.left;
            const top = <number>object.top;

            switch (direction) {
                case 'left':
                    object.set('left', left - pxls);
                    break;
                case 'right':
                    object.set('left', left + pxls);
                    break;
                case 'up':
                    object.set('top', top - pxls);
                    break;
                case 'down':
                    object.set({ top: top + pxls });
                    break;
            }

            this.canvas.requestRenderAll();
            //this.canvas._fire('moving', object);
        }
    }

    toggleCutLines() {
        if (appConfig.showCutLines === true) {
            appConfig.showCutLines = false;
        }
        else {
            appConfig.showCutLines = true;
        }
        e5Canvas.showCutLines(appConfig.showCutLines);
    }

    showCutLines(bShow: boolean) {
        if (this.cutLinesGroup) {
            this.canvas.remove(this.cutLinesGroup);
        }

        if (orderVars.allowCutLines !== true || bShow !== true) {
            return;
        }

        editorZoom.setCanvasZoom(1, function () {
            const cutLinesWidth = 18 / e5Canvas.canvasScale;
            const canvasWidth = e5Canvas.canvas.getWidth() / e5Canvas.canvasScale;
            const canvasHeight = e5Canvas.canvas.getHeight() / e5Canvas.canvasScale;

            const cutProps = {
                stateful: false,
                scaleX: e5Canvas.canvasScale,
                scaleY: e5Canvas.canvasScale,
                ObjectType: 'CutLine',
                stroke: '#8B0000',
                opacity: 0.9,
                strokeWidth: 1,
                selectable: false,
                strokeDashArray: [1, 1]
            };

            const topLine = new fabric.Line([0, cutLinesWidth, canvasWidth, cutLinesWidth], cutProps);
            const rightLine = new fabric.Line([cutLinesWidth, 0, cutLinesWidth, canvasHeight], cutProps);
            const bottomLine = new fabric.Line([0, canvasHeight - cutLinesWidth, canvasWidth, canvasHeight - cutLinesWidth], cutProps);
            const leftLine = new fabric.Line([canvasWidth - cutLinesWidth, 0, canvasWidth - cutLinesWidth, canvasHeight], cutProps);

            e5Canvas.cutLinesGroup = new fabric.Group([topLine, rightLine, bottomLine, leftLine]);
            e5Canvas.cutLinesGroup.zIndex = 10000;
            e5Canvas.cutLinesGroup.stateful = false;
            e5Canvas.cutLinesGroup.selectable = false;
            e5Canvas.cutLinesGroup.evented = false;
            e5Canvas.canvas.add(e5Canvas.cutLinesGroup);
            e5Canvas.canvas.bringToFront(e5Canvas.cutLinesGroup);
            e5Canvas.canvas.requestRenderAll().calcOffset();

            editorZoom.zoomFit();
        });
    }

    toggleGrid() {
        if (appConfig.showGrid === true) {
            appConfig.showGrid = false;
        }
        else {
            appConfig.showGrid = true;
        }
        e5Canvas.showGrid(appConfig.showGrid);
    }

    showGrid(bShow: boolean) {
        if (this.gridGroup) {
            this.canvas.remove(this.gridGroup);
        }

        if (bShow !== true) {
            return;
        }

        editorZoom.setCanvasZoom(1, function () {
            const gridSize = 40 * e5Canvas.canvasScale;
            const cutLinesWidth = 18 * e5Canvas.canvasScale;
            const canvasWidth = e5Canvas.canvas.getWidth();
            const canvasHeight = e5Canvas.canvas.getHeight();

            e5Canvas.gridGroup = new fabric.Group();
            e5Canvas.gridGroup.stateful = false;
            e5Canvas.gridGroup.selectable = false;
            e5Canvas.gridGroup.evented = false;

            const gridProps = {
                scaleX: e5Canvas.canvasScale,
                scaleY: e5Canvas.canvasScale,
                ObjectType: 'GridLine',
                stroke: '#999',
                opacity: 0.8,
                strokeWidth: 1,
                stateful: false,
                selectable: false,
                strokeDashArray: [5, 5]
            };

            for (let i = gridSize; i < canvasWidth - cutLinesWidth; i += gridSize) {
                e5Canvas.gridGroup.addWithUpdate(new fabric.Line([i, 0, i, canvasHeight], gridProps));
            }

            for (let ii = gridSize; ii < canvasHeight - cutLinesWidth; ii += gridSize) {
                e5Canvas.gridGroup.addWithUpdate(new fabric.Line([0, ii, canvasWidth, ii], gridProps));
            }

            e5Canvas.canvas.add(e5Canvas.gridGroup);
            e5Canvas.canvas.bringToFront(e5Canvas.gridGroup);
            e5Canvas.canvas.requestRenderAll().calcOffset();

            editorZoom.zoomFit();
        });
    }
    // | Line | Circle | Ellipse | Triangle | Rect
    addObject(obj: TemplateObject, reloadSideBar: boolean, addHistory: boolean) {
        console.log('Add Obj: ' + obj);
        this.canvas.add(obj);
        editorZoom.setCanvasZoom(e5Canvas.canvasScale);
        const productID = editor.getCurrentProductID();

        const myObj = obj;
        myObj.toJSON = function () {
            const o: any = {};

            for (const prop in this) {
                // convert RegExp to string
                // @ts-expect-error exists
                if (this[prop] && this[prop].constructor === RegExp) {
                    // @ts-expect-error exists
                    o[prop] = this[prop].toString();
                } else if (prop === 'm') { // function pointer
                    o[prop] = 'fn'; // would be removed by stringify otherwise
                }
                // @ts-expect-error exists
                else if (typeof this[prop] === 'undefined') {
                    o[prop] = 'undefined'; // would be removed by stringify otherwise
                } else if (prop === 'bool') {
                    continue; // don't send to stringify
                } else { // to pass value unchanged
                    // @ts-expect-error exists
                    o[prop] = this[prop];
                }
            }

            return o; // passed to stringify
        };

        const jsonData = JSON.stringify(myObj, appConfig.extraKeys);
        console.log('AddObject: ' + jsonData);
        $.ajax({
            url: appConfig.webAPIURL + 'AddObject',
            type: 'POST',
            data: {
                jsonData: jsonData,
                orderNumber: orderVars.orderNumber,
                sessionID: orderVars.sessionId,
                pageNumber: orderVars.currentPage,
                productID: productID
            },
            success: function (result) {
                console.log(result);

                obj.ID = result;
                e5Canvas.canvas.setActiveObject(obj);

                if (addHistory) {
                    editor.addMemoAddCmd(obj);
                }

                if (reloadSideBar) {
                    editor.loadSideBar();
                }
            },
            error: function (request, _status, error) {
                console.log('Error: PageNumber: ' + orderVars.currentPage + ' jsonData: ' + jsonData);
                editor.reportError(error, 'Error invoking the AddObject web method! ' + request.responseText);
            }
        });
    }

    removeObject(obj: TemplateObject, addHistory: boolean, reloadSideBar = true) {
        const ret = !('name' in obj);

        if (!ret) {
            return;
        }

        if (addHistory !== false) {
            editor.removeMemoCmd(obj);
        }

        this.canvas.remove(obj);
        this.canvas.calcOffset();

        if (reloadSideBar) {
            editor.loadSideBar();
        }
    }
}

export const e5Canvas = E5Canvas.instance;