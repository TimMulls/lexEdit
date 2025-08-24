import { e5Canvas } from "./e5Canvas";
import { messages } from "../messages";

export class EditorZoom {
    private static _instance = new EditorZoom();

    static get instance(): EditorZoom {
        return this._instance;
    }

    private constructor() {
        $(() => {
            const editorMain = $('#lexEditorMain').get(0);
            if (editorMain) { 
                editorMain.addEventListener('wheel', editorZoom.zoomWheel, false);
                //editorMain.addEventListener('mousewheel', editorZoom.zoomWheel, false);
                //editorMain.addEventListener('DOMMouseScroll', editorZoom.zoomWheel, false);
            }
        });
    }

    /**
     * Zoom in on wheel + ctrl 
     * @param evt
     */
    zoomWheel(evt: WheelEvent): void {
        if (evt.ctrlKey) {
            if (evt.preventDefault) {
                evt.preventDefault();
            }

            evt.returnValue = false;

            const delta = ((evt.deltaY ||  evt.detail) >> 10) || 1;

            if (delta === -1) {
                editorZoom.zoomIn();
            }
            else {
                editorZoom.zoomOut();
            }
        }
    }

    setCanvasZoom(SCALE_FACTOR: number, callBack?: () => void) : void {
        //Will not zoom with objects selected.
        if (e5Canvas.canvas.getActiveObjects()) {
            e5Canvas.canvas.discardActiveObject().renderAll();
        }

        //Get Unzoomed height/width
        const canvasHeight = e5Canvas.canvas.getHeight() / e5Canvas.canvasScale;
        const canvasWidth = e5Canvas.canvas.getWidth() / e5Canvas.canvasScale;

        //Set New Zoom Height/Width
        e5Canvas.canvas.setHeight(canvasHeight * SCALE_FACTOR);
        e5Canvas.canvas.setWidth(canvasWidth * SCALE_FACTOR);

        //Set New Canvas zoom
        e5Canvas.canvasScale = SCALE_FACTOR;
        e5Canvas.canvas.setZoom(SCALE_FACTOR);

        e5Canvas.canvas.renderAll();
        e5Canvas.canvas.calcOffset();

        this.setCanvasDisplay();

        if (typeof callBack === 'function') {
            callBack();
        }
    }

    runZoomForSave() : void {
        const scaleFactor = (1 / e5Canvas.canvasScale);
        
        e5Canvas.canvas.setHeight(e5Canvas.canvas.getHeight() * (1 / e5Canvas.SCALE_FACTOR));
        e5Canvas.canvas.setWidth(e5Canvas.canvas.getWidth() * (1 / e5Canvas.SCALE_FACTOR));

        const obj = e5Canvas.canvas.getObjects();

        for (const i in obj) {
            const scaleX: number = <number>obj[i].get('scaleX');
            const scaleY: number = <number>obj[i].get('scaleY');
            const left: number = <number>obj[i].get('left');
            const top: number = <number>obj[i].get('top');

            const tempScaleX = scaleX * scaleFactor;
            const tempScaleY = scaleY * scaleFactor;
            const tempLeft = left * scaleFactor;
            const tempTop = top * scaleFactor;

            obj[i].set('scaleX', tempScaleX);
            obj[i].set('scaleY', tempScaleY);
            obj[i].set('left', tempLeft);
            obj[i].set('top', tempTop);

            obj[i].setCoords();
        }
    }

    // Zoom In
    zoomIn(): void {
        $('#canvasContainer').css('display', 'inline-block');

        if (e5Canvas.canvasScale < 2) {
            editorZoom.setCanvasZoom(e5Canvas.canvasScale * e5Canvas.SCALE_FACTOR);
        } else {
            messages.Msg('Max Zoom In Reached.', 'Zoom', 'info');
        }
    }

    // Zoom Out
    zoomOut(): void {        
        if (e5Canvas.canvasScale > 0.1) {
            editorZoom.setCanvasZoom(e5Canvas.canvasScale / e5Canvas.SCALE_FACTOR);
        } else {
            messages.Msg('Max Zoom Out Reached.', 'Zoom', 'info');
        }
    }

    setCanvasDisplay(): void {
        const canvasWidth = e5Canvas.canvas.getWidth(),
            canvasHeight = e5Canvas.canvas.getHeight();

        const windowWidth = <number>$('#canvasContainer').width() - 5,
              windowHeight = <number>$('#canvasContainer').height() - 5;

        if (canvasWidth >= windowWidth || canvasHeight >= windowHeight) {
            $('#canvasContainer').css('display', 'inline-block');
        }
        else {
            $('#canvasContainer').css('display', 'flex');
        }
    }

    zoomFit(resetZoom?: boolean): void {
        if (resetZoom !== false) {
            resetZoom = true;
        }

        let canvasWidth = e5Canvas.canvas.getWidth(),
            canvasHeight = e5Canvas.canvas.getHeight();

        const windowWidth = <number>$('#canvasContainer').width() - 5,
              windowHeight = <number>$('#canvasContainer').height() - 5;

        let new_zoom = resetZoom ? 1 : e5Canvas.canvasScale;

        editorZoom.setCanvasZoom(new_zoom, function () {
            canvasHeight = e5Canvas.canvas.getHeight() / e5Canvas.canvasScale;
            canvasWidth = e5Canvas.canvas.getWidth() / e5Canvas.canvasScale;
            new_zoom = e5Canvas.canvasScale;

            if (canvasWidth > windowWidth || canvasHeight > windowHeight) {
                if (canvasHeight > canvasWidth || windowHeight < windowWidth) {
                    while ((canvasHeight * new_zoom) > windowHeight) {
                        new_zoom = new_zoom - 0.01;
                        new_zoom = Math.round(new_zoom * 1000) / 1000;
                    }

                    while ((canvasWidth * new_zoom) > windowWidth) {
                        new_zoom = new_zoom - 0.01;
                        new_zoom = Math.round(new_zoom * 1000) / 1000;
                    }

                    new_zoom = Math.round(new_zoom * 1000) / 1000;

                    editorZoom.setCanvasZoom(new_zoom);
                }
                else {
                    while ((canvasWidth * new_zoom) > windowWidth) {
                        new_zoom = new_zoom - 0.01;
                        new_zoom = Math.round(new_zoom * 1000) / 1000;
                    }

                    new_zoom = Math.round(new_zoom * 1000) / 1000;

                    editorZoom.setCanvasZoom(new_zoom);
                }                
            }
            else {
                let i = 0;

                while (((canvasHeight * new_zoom) < windowHeight) && i < 100) {
                    new_zoom = (new_zoom + 0.01);
                    new_zoom = Math.round(new_zoom * 1000) / 1000;
                    i++;
                }

                new_zoom = (new_zoom - 0.01);
                new_zoom = Math.round(new_zoom * 1000) / 1000;

                editorZoom.setCanvasZoom(new_zoom, function () {
                    canvasHeight = e5Canvas.canvas.getHeight() / e5Canvas.canvasScale;
                    canvasWidth = e5Canvas.canvas.getWidth() / e5Canvas.canvasScale;

                    let i = 0;
                    while (((canvasWidth * new_zoom) > windowWidth) && i < 100) {
                        new_zoom = new_zoom - 0.01;
                        i++;
                    }

                    editorZoom.setCanvasZoom(new_zoom);
                });
            }
        });
    }
}

export const editorZoom = EditorZoom.instance;