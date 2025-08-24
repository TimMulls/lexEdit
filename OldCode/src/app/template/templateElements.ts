import { e5Canvas } from "../editor/e5Canvas";
import { orderVars } from "../orderVars";
import { imgEditor } from "../editor/imgEditor";
import { editor } from "../editor/editor";
import { appConfig } from "../appConfig";
import { editorZoom } from "../editor/editorZoom";
import { templateOrder } from "./templateOrder";
import { TemplateObject } from "../../interfaces/template";

export class TemplateElements {
    private static _instance = new TemplateElements();

    static get instance(): TemplateElements {
        return this._instance;
    }

    public getObjectType(selectedObjectType?: number): number {
        switch (imgEditor.imgType) {
            case 'Artwork':
                return 123;
            case 'Logo':
            case 'Logos':
                return 7;
            case 'Signatures':
                return 42;
            case 'PersonalPhotos':
                return 6;
            case 'OwnDesigns':
                return 57;
            case 'QRCodes':
                return 124;
        }

        if (selectedObjectType) {
            return selectedObjectType;
        }

        return 0;
    }

    public addImage(imgID: number, imgFull: string): void {
        editorZoom.setCanvasZoom(1, function () {
            // @ts-expect-error exists
            fabric.Img.fromURL(appConfig.baseURL + imgFull, function (image: fabric.Img) {
                const imgSize = image.getOriginalSize();
                let iWidth = imgSize.width ? imgSize.width : 200;
                let iHeight = imgSize.height ? imgSize.height : 200;

                const canvasHeight = e5Canvas.canvas.getHeight() / e5Canvas.canvasScale;
                const canvasWidth = e5Canvas.canvas.getWidth() / e5Canvas.canvasScale;
                console.log('add image:', iWidth, iHeight, canvasWidth, canvasHeight);

                if (iWidth > canvasWidth) {
                    console.log('width too much');
                    iWidth = canvasWidth - 40;
                }

                if (iHeight > canvasHeight) {
                    console.log('height too much');
                    iHeight = canvasHeight - 40;
                }

                const objectType = templateElements.getObjectType();

                image.set({
                    left: 20,
                    top: 20,
                    x: 20,
                    y: 20,
                    width: iWidth,
                    height: iHeight,
                    centeredScaling: false,
                    centeredRotation: true,
                    angle: 0,
                    scaleX: e5Canvas.canvasScale,
                    scaleY: e5Canvas.canvasScale,
                    text: imgID,

                    align: 'center',
                    scale: 'best-fit',
                    debug: 3,

                    orgLeft: 20,
                    orgTop: 20,
                    orgWidth: iWidth,
                    orgHeight: iHeight,

                    //originalScales: [e5Canvas.canvasScale, e5Canvas.canvasScale],

                    PageNumber: orderVars.currentPage,
                    ObjectName: 'Added Image ' + imgEditor.imgType,
                    ObjectType: objectType,
                    ObjectGroup: imgEditor.imgType,
                    ResourceType: 'I',
                    //ImageAlign: 'IAMIDDLECENTER',
                    ImageAlign: 'BEST_FIT',
                    lockScalingFlip: true,
                    imgType: imgEditor.imgType,
                    src: imgFull,
                    requiredObject: 0,
                    initiallyVisible: 1,
                    SuppressPrinting: false,
                    zIndex: 0,
                    DisplayOrder: 0,
                    lineIndex: 0,
                    strokeWidth: 0,
                    KeepOnProof: true,
                    dirty: true,
                });

                e5Canvas.addObject(image, true, true);

                editorZoom.zoomFit();

                // Wait for image to load and then render all
                setTimeout(() => {
                    e5Canvas.canvas.calcOffset();
                    e5Canvas.canvas.requestRenderAll();
                }, 500);
            });
        });
    }

    replaceImage(selectedObj: TemplateObject, imgID: number, imgFull: string): void {
        if (selectedObj.ImageAlign === 'IACROP') {
            this.replaceImageCrop(selectedObj, imgID, imgFull);
            return;
        }

        templateOrder.addLoadingArray(appConfig.baseURL + imgFull);

        selectedObj.setSrc(appConfig.baseURL + imgFull, function () {
            const objectType = templateElements.getObjectType();

            selectedObj.set({
                align: 'center',
                // @ts-expect-error figure out if this is correct
                scale: 'best-fit',
                ImageAlign: 'IAMIDDLECENTER',
                dirty: true,
                //scaleX: e5Canvas.canvasScale,
                //scaleY: e5Canvas.canvasScale,
                width: selectedObj.orgWidth,
                height: selectedObj.orgHeight,
                text: imgID.toString(),
                ObjectType: objectType,
                imgType: imgEditor.imgType
            });

            if (selectedObj.ObjectGroup !== 'Coupon') {
                selectedObj.set({
                    //ObjectName: 'Image ' + imgEditor.imgType,
                    ObjectGroup: imgEditor.imgType
                });
            }

            editorZoom.setCanvasZoom(e5Canvas.canvasScale, function () {
                e5Canvas.canvas.setActiveObject(selectedObj);
                editor.loadSideBar('Img');
                templateOrder.deleteLoadingArray(appConfig.baseURL + imgFull);
            });
        });
    }

    replaceImageCrop(selectedObj: TemplateObject, imgID: number, imgFull: string): void {
        templateOrder.addLoadingArray(appConfig.baseURL + imgFull);

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function () {
            const oldWidth = selectedObj.getScaledWidth();
            const oldHeight = selectedObj.getScaledHeight();

            selectedObj.setElement(img);

            const objectType = templateElements.getObjectType(selectedObj.ObjectType);

            selectedObj.set({
                align: 'center',
                // @ts-expect-error figure out if this is correct
                scale: 'best-fit',
                text: imgID.toString(),
                ObjectType: objectType,
                ObjectGroup: imgEditor.imgType,
                imgType: imgEditor.imgType,
                orgSrc: img.src,
                //centeredScaling: false,
                //centeredRotation: true,
                //debug: 3,
                //scaleX: oldScaleX,
                //scaleY: oldScaleY,
                width: oldWidth,
                height: oldHeight,
                lockScalingFlip: true
            });

            if (selectedObj.ImageAlign !== 'IACROP') {
                selectedObj.set({
                    align: 'center',
                    // @ts-expect-error figure out if this is correct
                    scale: 'best-fit',
                    ImageAlign: 'IAMIDDLECENTER'
                });
            }

            editorZoom.setCanvasZoom(e5Canvas.canvasScale, function () {
                e5Canvas.canvas.setActiveObject(selectedObj);
                editor.loadSideBar('Img');
                templateOrder.deleteLoadingArray(appConfig.baseURL + imgFull);
            });
        };

        img.src = appConfig.baseURL + imgFull;
    }

    addText(): void {
        //@ts-expect-error I know
        const txtObj: TemplateObject = new fabric.Textbox('Double click to edit this text.', {
            left: 100,
            top: 100,
            width: 200,
            height: 100,
            fontSize: <number>e5Canvas.setFontSize(12),
            fontFamily: 'Arial',
            textAlign: 'left',
            // @ts-expect-error exists
            vAlign: 'middle',
            angle: 0,
            fill: '#000000',
            textPadding: 0,
            strokeStyle: 'transparent',
            originX: 'left',
            hasRotatingPoint: true,
            centeredScaling: false,
            centeredRotation: true,
            lockScalingX: false,
            lockScalingY: false,
            selectable: true,
            PageNumber: orderVars.currentPage,
            ObjectName: 'Added Text Box ' + Math.floor((Math.random() * 1000) + 1),
            ObjectType: 120,
            ObjectGroup: 'BackgroundText',
            ResourceType: 'T',
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
        });

        e5Canvas.addObject(txtObj, true, true);
    }

    addShape(shapeToAdd: string): void {
        let objShape;

        const activeFigure: TemplateObject = e5Canvas.getActiveObject();
        let left = 100,
            top = 100;

        if (activeFigure) {
            left = <number>activeFigure.left + 10;
            top = <number>activeFigure.top + 10;
        }

        switch (shapeToAdd) {
            case 'Circle':
                objShape = new fabric.Circle({
                    left: left,
                    top: top,
                    radius: 50,
                    fill: '#000000',
                    // @ts-expect-error exists
                    PageNumber: orderVars.currentPage,
                    ObjectName: 'Added Shape Circle',
                    ObjectType: 125,
                    ObjectGroup: 'Shape',
                    ResourceType: 'S',
                    centeredScaling: true,
                    centeredRotation: true,
                    requiredObject: 0,
                    initiallyVisible: 1,
                    SuppressPrinting: false,
                    zIndex: 0,
                    DisplayOrder: 0,
                    lineIndex: 0,
                    strokeWidth: 0,
                    KeepOnProof: true
                });
                break;
            case 'Ellipse':
                objShape = new fabric.Ellipse({
                    left: left,
                    top: top,
                    width: 100,
                    height: 50,
                    rx: 100,
                    ry: 50,
                    // @ts-expect-error exists
                    radius: 50,
                    fill: '#000000',
                    scaleX: e5Canvas.canvasScale,
                    scaleY: e5Canvas.canvasScale,
                    PageNumber: orderVars.currentPage,
                    ObjectName: 'Added Shape Ellipse',
                    ObjectType: 125,
                    ObjectGroup: 'Shape',
                    ResourceType: 'S',
                    centeredScaling: false,
                    centeredRotation: true,
                    requiredObject: 0,
                    initiallyVisible: 1,
                    SuppressPrinting: false,
                    zIndex: 0,
                    DisplayOrder: 0,
                    lineIndex: 0,
                    strokeWidth: 0,
                    KeepOnProof: true
                });
                break;
            case 'Triangle':
                objShape = new fabric.Triangle({
                    left: left,
                    top: top,
                    fill: '#000000',
                    width: 150,
                    height: 150,
                    opacity: 1,
                    scaleX: e5Canvas.canvasScale,
                    scaleY: e5Canvas.canvasScale,
                    centeredScaling: false,
                    centeredRotation: true,
                    // @ts-expect-error exists
                    ResourceType: 'S',
                    ObjectGroup: 'Shape',
                    requiredObject: 0,
                    initiallyVisible: 1,
                    SuppressPrinting: false,
                    zIndex: 0,
                    DisplayOrder: 0,
                    lineIndex: 0,
                    strokeWidth: 0,
                    KeepOnProof: true
                });
                break;
            case 'Square':
                objShape = new fabric.Rect({
                    left: left,
                    top: top,
                    fill: '#000000',
                    width: 50,
                    height: 50,
                    opacity: 1,
                    scaleX: e5Canvas.canvasScale,
                    scaleY: e5Canvas.canvasScale,
                    // @ts-expect-error exists
                    PageNumber: orderVars.currentPage,
                    ObjectName: 'Added Shape Square',
                    ObjectType: 45,
                    ObjectGroup: 'Shape',
                    ResourceType: 'S',
                    centeredScaling: false,
                    centeredRotation: true,
                    requiredObject: 0,
                    initiallyVisible: 1,
                    SuppressPrinting: false,
                    zIndex: 0,
                    DisplayOrder: 0,
                    lineIndex: 0,
                    strokeWidth: 0,
                    KeepOnProof: true
                });
                break;
            case 'Line':
                objShape = new fabric.Line([50, 200, 200, 200], {
                    left: left,
                    top: top,
                    fill: '#000000',
                    stroke: '#000000',
                    height: 1,
                    scaleX: e5Canvas.canvasScale,
                    scaleY: e5Canvas.canvasScale,
                    // @ts-expect-error exists
                    PageNumber: orderVars.currentPage,
                    ObjectName: 'Added Shape Line',
                    ObjectType: 25,
                    ObjectGroup: 'Shape',
                    ResourceType: 'S',
                    centeredScaling: false,
                    centeredRotation: true,
                    requiredObject: 0,
                    initiallyVisible: 1,
                    SuppressPrinting: false,
                    zIndex: 0,
                    DisplayOrder: 0,
                    lineIndex: 0,
                    strokeWidth: 1,
                    KeepOnProof: true
                });
                break;
        }

        if (objShape !== null) {
            e5Canvas.addObject(<TemplateObject>objShape, true, true);
        } else {
            alert('Shape not found: ' + shapeToAdd);
        }
    }

    showLogoQR(): void {
        $('#divBackLogoQRSelection').show();

        let qrShown = "false";

        // @ts-expect-error its fine
        e5Canvas.canvas.forEachObject(function (object: TemplateObject) {
            if (qrShown === "false") {
                if (object.ObjectName === 'QRCodeWLogo') {
                    qrShown = "true";
                }
            }
        });

        console.log('showLogoQR', qrShown);

        $('#btnUseLogo').removeClass('active');
        $('#btnUseQRLogo').removeClass('active');

        if (qrShown === "true") {
            $('#btnUseQRLogo').addClass('active');
        }
        else {
            $('#btnUseLogo').addClass('active');
        }

    }

    updateLogoQR(cSize: string): void {
        $('#btnUseLogo').removeClass('active');
        $('#btnUseQRLogo').removeClass('active');

        if (cSize === 'Logo') {
            $('#btnUseLogo').addClass('active');
            templateElements.updateLogoQRImg('LogoOnly');
        }
        else if (cSize == 'LogoQR') {
            $('#btnUseQRLogo').addClass('active');
            templateElements.updateLogoQRImg('QR');
        }
    }

    public deleteAddedQR(): void {
        let activeObject: TemplateObject | undefined = e5Canvas.getActiveObject();

        if (activeObject.ObjectType !== 7) {
            activeObject = e5Canvas.getObjectById(activeObject.LinkedObject);
        }

        if (activeObject == undefined) {
            console.log('Active object not found');
            return;
        }

        // @ts-expect-error its fine
        e5Canvas.canvas.forEachObject(function (object: TemplateObject) {
            console.log('Checking: ID: ' + object.ID + ' Name: ' + object.ObjectName + ' Group:' + object.ObjectGroup + ' Type: ' + object.ResourceType + ' LinkedID: ' + object.LinkedObject);

            if (activeObject != undefined && object.ResourceType == 'I' && object.LinkedObject == activeObject.ID) {
                console.log('Delete QR object');
                e5Canvas.removeObject(object, false, false);
                activeObject.LinkedObject = -1;
            }           
        });
    }

    public updateLogoQRImg(selectType: string): void {
        //const activeFigure: TemplateObject = e5Canvas.getActiveObject();

        let activeFigure: TemplateObject | undefined = e5Canvas.getActiveObject();

        if (activeFigure.ObjectType !== 7) {
            activeFigure = e5Canvas.getObjectById(activeFigure.LinkedObject);
        }

        if (!activeFigure) {
            return;
        }

        console.log("updateLogoQRImg", selectType, activeFigure.ObjectName, activeFigure.ObjectGroup);

        if (selectType === 'LogoOnly') {
            if (activeFigure.ObjectName === 'LogoWqrCode') {
                activeFigure.set({
                    width: activeFigure.width + activeFigure.height + 10,
                    orgWidth: activeFigure.width + activeFigure.height + 10,
                    dirty: true,
                    ObjectName: "Logo"
                });

                templateElements.deleteAddedQR();
                e5Canvas.canvas.requestRenderAll();
                editor.loadSideBar('Img', false);
            }

            return;
        }
        else if (activeFigure.ObjectName === 'LogoWqrCode') {
            // The logo with QR already exists so don't add it again.
            console.log('LogoWqrCode already exists');
            return;
        }

        let qrLeft = 100,
            qrTop = 100,
            qrWidth = 100,
            qrHeight = 100;

        const qrLinkedObject = activeFigure.ID;


        if (activeFigure) {
            qrLeft = <number>activeFigure.left + activeFigure.width - activeFigure.height + 10;
            qrTop = <number>activeFigure.top;
            qrHeight = <number>activeFigure.height;
            qrWidth = <number>activeFigure.height;
        }

        activeFigure.set({
            width: activeFigure.width - activeFigure.height - 10,
            orgWidth: activeFigure.width - activeFigure.height - 10,
            dirty: true,
            ObjectName: "LogoWqrCode"
        });

        editorZoom.setCanvasZoom(1, function () {
            const imgFull = '/ASRWebData/Images/QRCodes/Default/81.png';
            const imgID = 'Default/81';
            // @ts-expect-error exists
            fabric.Img.fromURL(appConfig.baseURL + imgFull, function (image: fabric.Img) {
                //const imgSize = image.getOriginalSize();
                //let iWidth = imgSize.width ? imgSize.width : 200;
                //let iHeight = imgSize.height ? imgSize.height : 200;

                /*
                const canvasHeight = e5Canvas.canvas.getHeight() / e5Canvas.canvasScale;
                const canvasWidth = e5Canvas.canvas.getWidth() / e5Canvas.canvasScale;
                //console.log('add image:', iWidth, iHeight, canvasWidth, canvasHeight);

                if (qrWidth > canvasWidth) {
                    console.log('width too much');
                    //iWidth = canvasWidth - 40;
                }

                if (qrHeight > canvasHeight) {
                    console.log('height too much');
                    //iHeight = canvasHeight - 40;
                }
                */

                //const objectType = templateElements.getObjectType();

                image.set({
                    LinkedObject: qrLinkedObject,
                    left: qrLeft,
                    top: qrTop,
                    x: qrLeft,
                    y: qrTop,
                    width: qrWidth,
                    height: qrHeight,
                    centeredScaling: false,
                    centeredRotation: true,
                    angle: 0,
                    scaleX: e5Canvas.canvasScale,
                    scaleY: e5Canvas.canvasScale,
                    text: imgID,

                    align: 'center',
                    scale: 'best-fit',
                    debug: 3,

                    orgLeft: 20,
                    orgTop: 20,
                    orgWidth: qrWidth,
                    orgHeight: qrHeight,

                    //originalScales: [e5Canvas.canvasScale, e5Canvas.canvasScale],

                    PageNumber: orderVars.currentPage,
                    ObjectName: 'QRCodeWLogo',
                    ObjectType: 124,
                    ObjectGroup: 'QRCode',
                    ResourceType: 'I',
                    //ImageAlign: 'IAMIDDLECENTER',
                    ImageAlign: 'BEST_FIT',
                    lockScalingFlip: true,
                    imgType: 'QRCodes',
                    src: imgFull,
                    requiredObject: 0,
                    initiallyVisible: 1,
                    SuppressPrinting: false,
                    zIndex: 0,
                    DisplayOrder: 0,
                    lineIndex: 0,
                    strokeWidth: 0,
                    KeepOnProof: true,
                    dirty: true,
                });

                e5Canvas.addObject(image, false, false);

                editorZoom.zoomFit();

                e5Canvas.canvas.discardActiveObject();
                //e5Canvas.canvas.renderAll();
                //editor.loadSideBar('Img',true);

                // Wait for image to load and then render all
                setTimeout(() => {
                //editorZoom.setCanvasZoom(e5Canvas.canvasScale, function () {
                //e5Canvas.canvas.calcOffset();
                e5Canvas.canvas.requestRenderAll();

                editor.loadSideBar('Img', true);
                //});

                //e5Canvas.canvas.calcOffset();
                //e5Canvas.canvas.requestRenderAll();
                }, 800);

                //if (activeFigure != undefined) {
                  //  e5Canvas.canvas.setActiveObject(activeFigure);
                //}
            });
        });
    }
}

export const templateElements = TemplateElements.instance;