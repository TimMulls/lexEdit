//import { fabric } from 'fabric';
import { elementProp } from "../../content/elementProp";
import { ImgObj, TemplateObject } from "../../interfaces/template";
import { appConfig } from "../appConfig";
import { e5Canvas } from "../editor/e5Canvas";
import { editor } from "../editor/editor";
import { messages } from "../messages";
import { miscUtils } from "../misc/miscUtils";
import { orderVars } from "../orderVars";
import { localStorage } from '../storage';
import { OrderObject } from "../../interfaces/orderObject";
import { ProductTypes } from "../../enums/productTypes";

import NProgress from 'nprogress';

export class TemplateOrder {
    private static _instance = new TemplateOrder();

    static get instance(): TemplateOrder {
        return this._instance;
    }

    imgsLoading = false;
    private imgArray: Array<string> = [];
    jsonObj: any = undefined;

    addLoadingArray(url: string): void {
        this.imgArray.push(url);
    }

    deleteLoadingArray(val: any): void {
        for (let i = 0; i < this.imgArray.length; i++) {
            if (this.imgArray[i] === val) {
                this.imgArray.splice(i, 1);
                break;
            }
        }
    }

    wait(callBack: () => void): void {
        if (this.imgArray.length > 0) {
            setTimeout(function () {
                templateOrder.wait(callBack);
            }, 500);
        } else {
            callBack();
        }
    }

    /**
     * Gets called one time after getTemplateData loaded
     * @param jsonStr
     */
    public loadTemplateData(jsonStr: string): void {
        NProgress.set(0.5);
        //console.log('Jason LoadTemplateData: ' + jsonStr);
        $('#lblSplash').html('Loading template data...');

        console.log('loadTemplateData: ' + jsonStr);

        if (jsonStr.length <= 0) {
            alert('No Template Data. Please report this error!');
            return;
        }

        this.jsonObj = JSON.parse(jsonStr);

        //Setup JSON for edit orders
        const regex = /\\\\/g;
        orderVars.frontJSON = this.jsonObj.frontJSON.replace(regex, '\\');
        orderVars.insideJSON = this.jsonObj.insideJSON.replace(regex, '\\');
        orderVars.backJSON = this.jsonObj.backJSON.replace(regex, '\\');
        orderVars.envelopeJSON = this.jsonObj.envelopeJSON.replace(regex, '\\');

        //Setup Template ID's
        orderVars.frontTemplateID = this.jsonObj.FrontTemplateID;
        orderVars.insideTemplateID = this.jsonObj.InsideTemplateID;
        orderVars.backTemplateID = this.jsonObj.BackTemplateID;
        orderVars.envelopeTemplateID = this.jsonObj.EnvelopeTemplateID;

        orderVars.productSize = this.jsonObj.ProductSize;
        orderVars.productType = this.jsonObj.ProductType;

        //Remove Cutlines for Magnets
        if (orderVars.productType === ProductTypes.Magnet) {
            orderVars.allowCutLines = false;
        }

        orderVars.isLoadingTemplate = true;

        if (orderVars.defaultSide === 'envelope' && orderVars.envelopeTemplateID !== 0) {
            $('#tabFront').hide();
            $('#tabEnvelope').show();
            orderVars.allowCutLines = false;

            this.loadEnvelopeFace(this.frontFaceCallback);
        }
        else if (orderVars.backTemplateID !== 0) {//Checked for back template
            $('#tabBack').show();
            //If no inside then load back template
            if (orderVars.insideTemplateID <= 0) {
                this.loadBackFace(this.backFaceCallback);
            }
            else {
                $('#tabInside').show();
                this.loadInsideFace(this.insideFaceCallback);
            }
        } else {
            //No back template so no inside template either.
            this.loadFrontFace(this.frontFaceCallback);
        }
    }

    private frontFaceCallback(): void {
        $('#lblSplash').html('Finishing up...');
        templateOrder.wait(function () {
            orderVars.frontJSON = e5Canvas.getJSON();
            localStorage.set('frontJSON', orderVars.frontJSON);

            orderVars.isLoadingTemplate = false;

            e5Canvas.canvas.renderAll().calcOffset();

            e5Canvas.editMode(e5Canvas.AdvMode);

            let hideSide = false;
            const numOfObjects = e5Canvas.canvas.getObjects().length;

            if (numOfObjects <= 0) {
                hideSide = true;
            }
            else {
                orderVars.frontEditAllowed = true;
            }

            if (!editor.advEditAllowed() && hideSide) {
                $('#tabFront').hide();
            }

            if (orderVars.productType === ProductTypes.Calendar) {
                orderVars.allSidesEdited = true;

                if (orderVars.sessionId == 'BackOfficeEdit') {
                    hideSide = false;
                    orderVars.frontEditAllowed = true;
                }
                else {
                    hideSide = true;
                    orderVars.frontEditAllowed = false;
                    $('#tabFront').hide();
                }

                editor.switchSides(2);
            }
            else if (!miscUtils.isNullOrWhiteSpace(orderVars.defaultSide)) { //Check if coming from proof page and has default side set
                orderVars.allSidesEdited = true;

                if (orderVars.defaultSide === 'Front' && hideSide) {
                    if (orderVars.insideTemplateID > 0) {
                        editor.switchSides(3);
                    }
                    else {
                        editor.switchSides(2);
                    }
                }
                else if (orderVars.defaultSide === 'Back') {
                    editor.switchSides(2);
                }
                else if (orderVars.defaultSide === 'Inside') {
                    editor.switchSides(3);
                }
                else if (orderVars.defaultSide === 'Envelope') {
                    editor.switchSides(4);
                }
            }
            else if (!editor.advEditAllowed() && hideSide) {
                if (orderVars.currentPage === 1) {
                    if (orderVars.insideTemplateID > 0 && orderVars.insideEditAllowed) {
                        orderVars.insideEdited = true;
                        editor.switchSides(3);
                    }
                    else {
                        orderVars.backEdited = true;
                        editor.switchSides(2);
                    }
                }
            }

            editor.loadSideBar();
            e5Canvas.memo.clear();

            editor.hideLoading(true);
            editor.loadAllFonts();
        });
    }

    insideFaceCallback(): void {
        templateOrder.wait(function () {
            orderVars.insideJSON = e5Canvas.getJSON();
            localStorage.set('insideJSON', orderVars.insideJSON);

            let hideSide = false;
            const numOfObjects = e5Canvas.canvas.getObjects().length;

            if (numOfObjects <= 0) {
                hideSide = true;
            }
            else {
                orderVars.insideEditAllowed = true;
            }

            if (!editor.advEditAllowed() && hideSide) {
                $('#tabInside').hide();
            }

            if (orderVars.productType === ProductTypes.Calendar) {
                if (orderVars.sessionId == 'BackOfficeEdit') {
                    // Empty is fine
                }
                else {
                    $('#tabInside').hide();
                }              
            }

            templateOrder.loadBackFace(templateOrder.backFaceCallback);
        });
    }

    backFaceCallback(): void {
        templateOrder.wait(function () {
            orderVars.backJSON = e5Canvas.getJSON();
            localStorage.set('backJSON', orderVars.backJSON);

            let hideSide = false;
            const numOfObjects = e5Canvas.canvas.getObjects().length;

            if (numOfObjects <= 0) {
                hideSide = true;
            }
            else {
                orderVars.backEditAllowed = true;
            }

            if (!editor.advEditAllowed() && hideSide) {
                $('#tabBack').hide();
            }

            templateOrder.loadFrontFace(templateOrder.frontFaceCallback);
        });
    }

    loadEnvelopeFace(callBack: () => void): void {
        $('#lblSplash').html('Loading Envelope template...');

        orderVars.currentPage = 4;
        e5Canvas.canvas.clear();

        if (orderVars.envelopeJSON.length > 0) {
            console.log('Envelope JSON: ' + orderVars.envelopeJSON);
            e5Canvas.canvas.loadFromJSON(orderVars.envelopeJSON, function () {
                templateOrder.loadBackgroundImage('envelope', callBack);
            });
        } else {
            this.loadBackgroundImage('envelope', function () {
                console.log('loading from objects');
                $.each(templateOrder.jsonObj.EnvelopeFace, function (_i, orderObj) {
                    //orderObj.zIndex = i;
                    if (orderObj.ImageAlign === 'IASTRETCH') {
                        orderObj.ImageAlign = 'IACROP';
                    }
                    templateOrder.addFaceObject(orderObj);
                });
                e5Canvas.editMode(false);
                e5Canvas.canvas.renderAll();

                // @ts-expect-error exists
                e5Canvas.canvas.forEachObject(function (obj: TemplateObject) {
                    console.log('Moving: ' + obj.ObjectName + ' to ' + obj.zIndex);
                    e5Canvas.canvas.moveTo(obj, obj.zIndex);
                });
                e5Canvas.canvas.renderAll();
                callBack();
            });
        }
    }

    loadFrontFace(callBack: () => void): void {
        $('#lblSplash').html('Loading front template...');

        orderVars.currentPage = 1;
        e5Canvas.canvas.clear();

        if (orderVars.frontJSON.length > 0) {
            console.log('Front JSON: ' + orderVars.frontJSON);
            e5Canvas.canvas.loadFromJSON(orderVars.frontJSON, function () {
                templateOrder.loadBackgroundImage('front', callBack);
            });
        } else {
            this.loadBackgroundImage('front', function () {
                console.log('loading from objects');
                $.each(templateOrder.jsonObj.FrontFace, function (_i, orderObj) {
                    //orderObj.zIndex = i;
                    if (orderObj.ImageAlign === 'IASTRETCH') {
                        orderObj.ImageAlign = 'IACROP';
                    }
                    templateOrder.addFaceObject(orderObj);
                });
                e5Canvas.editMode(false);
                e5Canvas.canvas.renderAll();

                // @ts-expect-error exists
                e5Canvas.canvas.forEachObject(function (obj: TemplateObject) {
                    console.log('Moving: ' + obj.ObjectName + ' to ' + obj.zIndex);
                    e5Canvas.canvas.moveTo(obj, obj.zIndex);
                });
                e5Canvas.canvas.renderAll();
                callBack();
            });
        }
    }

    /**
     * Loads the back template face
     * @param {function} callBack  Required function to continue next step
     */
    loadBackFace(callBack: () => void): void {
        $('#lblSplash').html('Loading Back Template Img...');

        orderVars.currentPage = 2;
        e5Canvas.canvas.clear();

        const overrideJSON = false; //used to test only

        this.loadBackgroundImage('back', function () {
            $('#lblSplash').html('Loading Back Template Obj...');
            if (!overrideJSON && orderVars.backJSON.length > 0) {
                e5Canvas.canvas.loadFromJSON(orderVars.backJSON, callBack);
            } else {
                console.log('Loading Back from Objects');
                $.each(templateOrder.jsonObj.BackFace, function (_i, orderObj) {
                    //orderObj.zIndex = i;
                    if (orderObj.ImageAlign === 'IASTRETCH') {
                        orderObj.ImageAlign = 'IACROP';
                    }
                    templateOrder.addFaceObject(orderObj);
                });

                e5Canvas.editMode(false);
                e5Canvas.canvas.renderAll();

                // @ts-expect-error exists
                e5Canvas.canvas.forEachObject(function (object: TemplateObject) {
                    console.log('Moving: ' + object.ObjectName + ' to ' + object.zIndex);
                    e5Canvas.canvas.moveTo(object, object.zIndex);
                });

                e5Canvas.canvas.renderAll();

                callBack();
            }
        });
    }

    /**
     * Loads the inside template face
     * @param {function} callBack  Required function to continue next step
     */
    loadInsideFace(callBack: () => void): void {
        $('#lblSplash').html('Loading Inside Template...');
        orderVars.currentPage = 3;
        e5Canvas.canvas.clear();

        this.loadBackgroundImage('inside', function () {
            if (orderVars.insideJSON.length > 0) {
                e5Canvas.canvas.loadFromJSON(orderVars.insideJSON, callBack);
            } else {
                $.each(templateOrder.jsonObj.InsideFace, function (_i, orderObj) {
                    //orderObj.zIndex = i;
                    if (orderObj.ImageAlign === 'IASTRETCH') {
                        orderObj.ImageAlign = 'IACROP';
                    }
                    templateOrder.addFaceObject(orderObj);
                });

                e5Canvas.editMode(false);
                e5Canvas.canvas.renderAll();

                // @ts-expect-error exists
                e5Canvas.canvas.forEachObject(function (object: TemplateObject) {
                    console.log('Moving: ' + object.ObjectName + ' to ' + object.zIndex);
                    //e5Canvas.canvas.getObjects().forEach(function (object) {
                    e5Canvas.canvas.moveTo(object, object.zIndex);
                });
                e5Canvas.canvas.renderAll();

                callBack();
            }
        });
    }

    getObjectByID(id: number): TemplateObject | null {
        const objs = e5Canvas.getObjects();

        for (const obj of objs) {
            if (obj.ID && obj.ID === id) {
                return obj;
            }
        }

        return null;
    }

    /**
     * Used to load from objects, if JSON is already defined for the order then this is not used.
     * @param OrderObject orderObj the object to load
     */

    addFaceObject(orderObj: OrderObject): void {
        const selectable = !orderObj.SuppressPrinting;

        switch (orderObj.ResourceType.toUpperCase()) {
            case 'BT':
            case 'FC':
            case 'T':
                switch (orderObj.ObjectType) {
                    //case 2: //Non Editable Text
                    //case 43: //MessageBlock
                    //case 105: //Greeting
                    //case 120: //Background Text
                    default: {
                        let textVal = orderObj.Text;

                        if ($.trim(textVal).length <= 0 && orderVars.currentPage !== 4) {
                            textVal = '{Enter your ' + orderObj.ObjectName + ' here.}';
                        }

                        if (orderObj.ObjectType === 151) {
                            textVal = textVal.replace(/\n\s*\n/g, '\n');
                        }

                        let fontWeight = '';

                        if (orderObj.FontStyle) {
                            fontWeight = orderObj.FontStyle.indexOf('fsBold,') !== -1 ? 'bold' : '';
                        }

                        //@ts-expect-error i know
                        const textObject: TemplateObject = new fabric.Textbox(textVal, {
                            left: orderObj.X,
                            top: orderObj.Y,
                            width: orderObj.Width,
                            height: orderObj.Height,
                            //@ts-expect-error known
                            orgWidth: orderObj.Width,
                            orgHeight: orderObj.Height,
                            minHeight: orderObj.Height,
                            fontSize: <number>e5Canvas.setFontSize(orderObj.FontSize),
                            fontFamily: orderObj.Font,
                            textAlign: orderObj.TextAlign.substr(2).toLowerCase(),
                            vAlign: 'bottom',
                            //scaleX: e5Canvas.canvasScale,
                            //scaleY: e5Canvas.canvasScale,
                            originalScales: [e5Canvas.canvasScale, e5Canvas.canvasScale],
                            textPadding: 0,
                            centeredScaling: false,
                            centeredRotation: true,
                            fill: orderObj.FontColor,
                            fontWeight: fontWeight,
                            strokeStyle: 'transparent',
                            originX: 'left',
                            hasRotatingPoint: true,
                            lockScalingX: false,
                            lockScalingY: false,
                            selectable: selectable,
                            ID: orderObj.ID,
                            PageNumber: orderObj.PageNumber,
                            ObjectName: orderObj.ObjectName,
                            ObjectType: orderObj.ObjectType,
                            ObjectGroup: orderObj.ObjectGroup,
                            ResourceType: orderObj.ResourceType,
                            autoFontSize: orderObj.FlagResize,
                            WordBreak: orderObj.FlagWordBreak,
                            SuppressPrinting: orderObj.SuppressPrinting,
                            orgFontSize: orderObj.OrgFontSize,
                            autoBoxHeight: true,
                            visible: orderObj.FlagVisible,
                            DisplayOrder: orderObj.DisplayOrder,
                            zIndex: orderObj.zIndex,
                            opacity: orderObj.Alpha,
                            backgroundColor: orderObj.BackgroundColor
                        });

                        if (orderObj.Font.toLowerCase() == 'baginda script') {
                            // @ts-expect-error i know
                            textObject.lineHeight = textObject.lineHeight - 0.5
                        }

                        e5Canvas.canvas.insertAt(textObject, orderObj.DisplayOrder, false);
                        textObject.rotate(orderObj.Angle);

                        elementProp.setActiveStyle('fontFamily', orderObj.Font, textObject, false);

                        //This is needed to set the style to bold, if not then
                        //it does not show up on proof corectly if the user never edits the text.
                        if (fontWeight === 'bold' && textObject.setSelectionStyles) {
                            textObject.selectionStart = 0;
                            textObject.selectionEnd = textObject.text.length;

                            const style = {
                                fontWeight: 'bold'
                            };

                            textObject.setSelectionStyles(style);
                            textObject.setCoords();

                            textObject.set('fontWeight', 'bold');
                        }
                        break;
                    }
                }
                break;
            case 'S':
                switch (orderObj.ObjectType) {
                    case 25: { //Line
                        //startX, startY, endX, endY
                        const objLine = new fabric.Line([orderObj.X, orderObj.Y, orderObj.X + orderObj.Width, orderObj.Y + orderObj.Height], {
                            // @ts-expect-error exists
                            ID: orderObj.ID,
                            left: orderObj.X,
                            top: orderObj.Y,
                            fill: orderObj.FontColor,
                            stroke: orderObj.FontColor,
                            height: orderObj.Height,
                            //scaleX: e5Canvas.canvasScale,
                            //scaleY: e5Canvas.canvasScale,
                            PageNumber: orderObj.PageNumber,
                            ObjectName: orderObj.ObjectName,
                            ObjectType: orderObj.ObjectType,
                            ObjectGroup: orderObj.ObjectGroup,
                            ResourceType: orderObj.ResourceType,
                            SuppressPrinting: orderObj.SuppressPrinting,
                            DisplayOrder: orderObj.DisplayOrder,
                            zIndex: orderObj.zIndex,
                            centeredScaling: false,
                            centeredRotation: true
                        });

                        e5Canvas.canvas.insertAt(objLine, orderObj.zIndex, false);
                        e5Canvas.canvas.renderAll();

                        break;
                    }
                    case 125: {
                        //Circle
                        //@ts-expect-error I know
                        const circle: TemplateObject = new fabric.Circle({
                            left: orderObj.X,
                            top: orderObj.Y,
                            fill: orderObj.FontColor,
                            stroke: orderObj.FontColor,
                            height: orderObj.Height,
                            width: orderObj.Width,
                            radius: orderObj.Radius,
                            opacity: orderObj.Alpha,
                            centeredScaling: true,
                            centeredRotation: true
                        });

                        circle.ID = orderObj.ID;
                        circle.PageNumber = orderObj.PageNumber;
                        circle.ObjectName = orderObj.ObjectName;
                        circle.ObjectType = orderObj.ObjectType;
                        circle.ObjectGroup = orderObj.ObjectGroup;
                        circle.ResourceType = orderObj.ResourceType;
                        circle.SuppressPrinting = orderObj.SuppressPrinting;
                        circle.DisplayOrder = orderObj.DisplayOrder;
                        circle.zIndex = orderObj.zIndex;
                        circle.rotate(orderObj.Angle);

                        e5Canvas.canvas.insertAt(circle, orderObj.zIndex, false);
                        e5Canvas.canvas.renderAll();
                        break;
                    }
                    case 45: //Rectangle
                    case 150: //Static Rectangle
                        {
                            // add red rectangle
                            //@ts-expect-error I know
                            const rect: TemplateObject = new fabric.Rect({
                                width: orderObj.Width,
                                height: orderObj.Height,
                                left: orderObj.X,
                                top: orderObj.Y,
                                fill: orderObj.FontColor,
                                selectable: selectable,
                                opacity: orderObj.Alpha,
                                rx: orderObj.Radius,
                                ry: orderObj.Radius,
                            });

                            rect.ID = orderObj.ID;
                            rect.ObjectName = orderObj.ObjectName;
                            rect.ObjectType = orderObj.ObjectType;
                            rect.ObjectGroup = orderObj.ObjectGroup;
                            rect.ResourceType = orderObj.ResourceType;
                            rect.SuppressPrinting = orderObj.SuppressPrinting;
                            rect.DisplayOrder = orderObj.DisplayOrder;
                            rect.zIndex = orderObj.zIndex;
                            rect.PageNumber = orderObj.PageNumber;
                            rect.rotate(orderObj.Angle);

                            e5Canvas.canvas.insertAt(rect, orderObj.zIndex, false);
                            e5Canvas.canvas.renderAll();
                            break;
                        }
                }
                break;
            case 'I': {
                const ImgObj: ImgObj = {
                    imgFull: appConfig.imgsURL,
                    imgType: '',
                    selectable: selectable
                }

                editor.setImgObj(orderObj.ObjectType, ImgObj);

                if (orderObj.Text === '') {
                    if (orderObj.ObjectType == 124) {
                        ImgObj.imgFull += 'Default/1.png';
                    }
                    else {
                        ImgObj.imgFull += 'M3/1.png?v=' + appConfig.appVersion;
                    }
                }
                else if (orderObj.Text === '[Offer area]' ||
                    orderObj.Text == 'Click here to add Coupon One' ||
                    orderObj.Text == 'Click here to add Coupon Two') { //Quick Fix for coupons
                    ImgObj.imgFull += 'M3/1.png?v=' + appConfig.appVersion;
                }
                else {
                    ImgObj.imgFull += orderObj.Text.replace('\\', '/') + '-300.png';
                }

                this.addLoadingArray(ImgObj.imgFull);

                let imgScale = 'best-fit';

                if (orderObj.ImageAlign === 'IACROP') {
                    imgScale = 'fill';
                }

                // @ts-expect-error exists
                fabric.Img.fromURL(ImgObj.imgFull, function (image: fabric.Img) {
                    image.set({
                        left: orderObj.X,
                        top: orderObj.Y,
                        width: orderObj.Width,
                        height: orderObj.Height,
                        centeredScaling: false,
                        centeredRotation: true,
                        //scaleX: e5Canvas.canvasScale,
                        //scaleY: e5Canvas.canvasScale,
                        text: orderObj.Text,
                        align: 'center',
                        scale: imgScale,
                        orgLeft: orderObj.X,
                        orgTop: orderObj.Y,
                        orgWidth: orderObj.Width,
                        orgHeight: orderObj.Height,
                        ID: orderObj.ID,
                        imgType: ImgObj.imgType,
                        selectable: ImgObj.selectable,
                        visible: orderObj.FlagVisible,
                        SuppressPrinting: orderObj.SuppressPrinting,
                        PageNumber: orderObj.PageNumber,
                        ObjectName: orderObj.ObjectName,
                        ObjectType: orderObj.ObjectType,
                        ObjectGroup: orderObj.ObjectGroup,
                        ResourceType: orderObj.ResourceType,
                        ImageAlign: orderObj.ImageAlign,
                        lockScalingFlip: true,
                        DisplayOrder: orderObj.DisplayOrder,
                        zIndex: orderObj.zIndex,
                        opacity: orderObj.Alpha
                    });

                    e5Canvas.canvas.insertAt(image, orderObj.zIndex, false);

                    image.rotate(orderObj.Angle);

                    if (!selectable) {
                        e5Canvas.canvas.sendToBack(image);
                    }

                    e5Canvas.canvas.renderAll();
                    templateOrder.deleteLoadingArray(ImgObj.imgFull);
                });

                break;
            }
            case 'C': {
                let couponText = orderObj.Text.replace(/(\r\n|\n|\r)/gm, " ");
                couponText = couponText.replace("  ", " ");
                couponText = couponText.replace("  ", " ");

                if (couponText.toUpperCase() === '[OFFER AREA]' ||
                    couponText === 'Click here to add Coupon One' ||
                    couponText === 'Click here to add Coupon Two') {
                    couponText = '100000t';
                }

                const ImgObj: ImgObj = {
                    imgFull: appConfig.WebData + 'Coupons/' + couponText + '.png',
                    imgType: 'Coupon',
                    selectable: selectable
                }

                orderVars.hasCoupons = true;

                if (orderObj.ObjectName === 'LargeCoupon' ||
                    (orderVars.productType === ProductTypes.DoorHangers ||
                        orderVars.productType === ProductTypes.SmallDoorHangers ||
                        orderVars.productType === ProductTypes.MediumDoorHangers ||
                        orderVars.productType === ProductTypes.SelfMailers)) {
                    orderVars.currentCouponSize = 'L';
                }
                else if (orderObj.ObjectName === 'SmallCoupon1' || orderObj.ObjectName === 'SmallCoupon2') {
                    //ImgObj.imgFull += '../Coupons/101101.png';
                    //orderObj.Text = '[Offer area]';
                    orderVars.currentCouponSize = 'S';
                }
                else {
                    messages.Msg('Unknown Coupon Type', 'Error', 'error');
                    //  ImgObj.imgFull += orderObj.Text.replace('\\', '/') + '-300.png';
                }

                templateOrder.addLoadingArray(ImgObj.imgFull);

                let imgScale = 'best-fit';

                if (orderObj.ImageAlign === 'IACROP') {
                    imgScale = 'fill';
                }

                imgScale = 'fill';

                // @ts-expect-error exists
                fabric.Img.fromURL(ImgObj.imgFull, function (image: fabric.Img) {
                    image.set({
                        left: orderObj.X,
                        top: orderObj.Y,
                        width: orderObj.Width,
                        height: orderObj.Height,
                        centeredScaling: false,
                        centeredRotation: true,
                        text: orderObj.Text,
                        align: 'center',
                        scale: imgScale,
                        orgLeft: orderObj.X,
                        orgTop: orderObj.Y,
                        orgWidth: orderObj.Width,
                        orgHeight: orderObj.Height,
                        ID: orderObj.ID,
                        imgType: ImgObj.imgType,
                        selectable: ImgObj.selectable,
                        visible: orderObj.FlagVisible,
                        SuppressPrinting: orderObj.SuppressPrinting,
                        PageNumber: orderObj.PageNumber,
                        ObjectName: orderObj.ObjectName,
                        ObjectType: orderObj.ObjectType,
                        ObjectGroup: orderObj.ObjectGroup,
                        ResourceType: orderObj.ResourceType,
                        ImageAlign: orderObj.ImageAlign,
                        lockScalingFlip: true,
                        DisplayOrder: orderObj.DisplayOrder,
                        zIndex: orderObj.zIndex,
                        opacity: orderObj.Alpha
                    });

                    e5Canvas.canvas.insertAt(image, orderObj.zIndex, false);

                    image.rotate(orderObj.Angle);

                    if (!selectable) {
                        e5Canvas.canvas.sendToBack(image);
                    }

                    e5Canvas.canvas.renderAll();
                    templateOrder.deleteLoadingArray(ImgObj.imgFull);
                });
                break;
            }
            case 'BC': {
                const couponObj = this.getObjectByID(orderObj.LinkedObject);

                if (couponObj == null) {
                    messages.Msg('Error Loading Coupon.  Selected Coupon Not Found', 'Error', 'error');
                    return;
                }

                let textVal = orderObj.Text;

                if ($.trim(textVal).length <= 0 && orderVars.currentPage !== 4) {
                    textVal = '{Enter your ' + orderObj.ObjectName + ' here.}';
                }

                if (orderObj.ObjectType === 151) {
                    textVal = textVal.replace(/\n\s*\n/g, '\n');
                }

                let fontWeight = '';

                if (orderObj.FontStyle) {
                    fontWeight = orderObj.FontStyle.indexOf('fsBold,') !== -1 ? 'bold' : '';
                }

                const textObject = new fabric.Textbox(textVal, {
                    left: couponObj.left + orderObj.X,
                    top: couponObj.top + orderObj.Y,
                    width: orderObj.Width,
                    height: orderObj.Height,
                    //@ts-expect-error known
                    orgWidth: orderObj.Width,
                    orgHeight: orderObj.Height,
                    minHeight: orderObj.Height,
                    fontSize: <number>e5Canvas.setFontSize(orderObj.FontSize),
                    fontFamily: orderObj.Font,
                    textAlign: orderObj.TextAlign.substr(2).toLowerCase(),
                    vAlign: 'bottom',
                    originalScales: [e5Canvas.canvasScale, e5Canvas.canvasScale],
                    textPadding: 0,
                    centeredScaling: false,
                    centeredRotation: true,
                    fill: orderObj.FontColor,
                    fontWeight: fontWeight,
                    //lineHeight: 1,
                    strokeStyle: 'transparent',
                    originX: 'left',
                    hasRotatingPoint: true,
                    lockScalingX: false,
                    lockScalingY: false,
                    selectable: selectable,
                    ID: orderObj.ID,
                    LinkedObject: couponObj.ID,
                    PageNumber: orderObj.PageNumber,
                    ObjectName: orderObj.ObjectName,
                    ObjectType: orderObj.ObjectType,
                    ObjectGroup: orderObj.ObjectGroup,
                    ResourceType: orderObj.ResourceType,
                    autoFontSize: orderObj.FlagResize,
                    WordBreak: orderObj.FlagWordBreak,
                    SuppressPrinting: orderObj.SuppressPrinting,
                    orgFontSize: orderObj.OrgFontSize,
                    autoBoxHeight: true,
                    visible: orderObj.FlagVisible,
                    DisplayOrder: orderObj.DisplayOrder,
                    zIndex: orderObj.zIndex,
                    opacity: orderObj.Alpha == null ? 1 : orderObj.Alpha,
                    backgroundColor: orderObj.BackgroundColor,
                    ProductID: orderObj.CouponID
                });

                textObject.rotate(orderObj.Angle);

                // @ts-expect-error exists
                elementProp.setActiveStyle('fontFamily', orderObj.Font, textObject, false);

                //This is needed to set the style to bold, if not then
                //it does not show up on proof corectly if the user never edits the text.
                if (fontWeight === 'bold' && textObject.setSelectionStyles) {
                    textObject.selectionStart = 0;
                    // @ts-expect-error exists
                    textObject.selectionEnd = textObject.text.length;

                    const style = {
                        fontWeight: 'bold'
                    };

                    textObject.setSelectionStyles(style);
                    textObject.setCoords();

                    textObject.set('fontWeight', 'bold');
                }

                // @ts-expect-error I know
                if (textObject.ID <= 0) {
                    // @ts-expect-error I know
                    e5Canvas.addObject(textObject, false, false);
                }
                else {
                    e5Canvas.canvas.insertAt(textObject, orderObj.zIndex, false);
                }

                break;
            }
        }
    }

    loadBackgroundImage(side: string, callBack?: () => void): void {
        let imgID = 0;

        switch (side) {
            case 'front':
                imgID = orderVars.frontTemplateID;
                break;
            case 'back':
                imgID = orderVars.backTemplateID;
                break;
            case 'inside':
                imgID = orderVars.insideTemplateID;
                break;
            case 'envelope':
                imgID = orderVars.envelopeTemplateID;
                break;
        }

        if (imgID === 0) {
            alert('Error Loading Background, Template ID not found.');
            return;
        }

        let templateURL = appConfig.templateURL;

        //Fix images location for production
        if ((window.location.hostname.toUpperCase().indexOf('M3TOOLBOX.COM') >= 0) ||
            (window.location.hostname.toUpperCase().indexOf('AGENTZMARKETING.COM') >= 0) ||
            (window.location.hostname.toUpperCase().indexOf('LEXINETPRINTS.COM') >= 0) ||
            (window.location.hostname.toUpperCase().indexOf('LEXINET.NET') >= 0) ||
            (window.location.hostname.toUpperCase().indexOf('LIFEWAYSTORES.COM') >= 0)) {
            templateURL = appConfig.WebData + 'NewTemplates/';
        }

        const img = new Image();
        img.crossOrigin = "anonymous";  // important - set crossOrigin before src!
        img.src = templateURL + imgID + 'p.jpg?v=' + appConfig.appVersion;
        img.onload = function () {
            e5Canvas.canvas.setBackgroundImage(new fabric.Image(img, {
                originX: 'left',
                originY: 'top',
                left: 0,
                top: 0
            }),
                function () {
                    // @ts-expect-error exists
                    e5Canvas.canvas.originX = 'left';
                    // @ts-expect-error exists
                    e5Canvas.canvas.originY = 'top';
                    // @ts-expect-error exists
                    e5Canvas.canvas.setHeight(e5Canvas.canvas.backgroundImage.height * e5Canvas.canvasScale);
                    // @ts-expect-error exists
                    e5Canvas.canvas.setWidth(e5Canvas.canvas.backgroundImage.width * e5Canvas.canvasScale);

                    e5Canvas.canvas.renderAll();

                    if (typeof callBack === 'function') {
                        callBack();
                    }
                });
        };
    }
}

export const templateOrder = TemplateOrder.instance;