import { e5Canvas } from "../editor/e5Canvas";
import { messages } from "../messages";
import { orderVars } from "../orderVars";
import { appConfig } from "../appConfig";
import { editor } from "../editor/editor";
import { TemplateObject } from "../../interfaces/template";
import { elementProp } from "../../content/elementProp";
import { templateOrder } from "./templateOrder";
import { OrderObject } from "../../interfaces/orderObject";
import { ProductSizes } from "../../enums/productSizes";

export class TemplateCoupons {
    private static _instance = new TemplateCoupons();

    static get instance(): TemplateCoupons {
        return this._instance;
    }

    /**
     * Used to update coupon size from large to small or use a logo instead
     * @param cSize The size of the coupon requested
     */
    updateCouponSize(cSize: string): void {
        orderVars.currentCouponSize = cSize;

        $.ajax({
            url: appConfig.webAPIURL + 'UpdateCouponSize',
            type: 'POST',
            data: {
                couponSize: cSize,
                orderNumber: orderVars.orderNumber
            },
            success: function (_result) {
                console.log('Update Coupon Size result: ' + _result);
                templateCoupons.updateCouponObjects(cSize);
            },
            error: function (request, _status, error) {
                messages.Msg('Error invoking the web method! ' + request.responseText, 'UpdateCouponSize', 'error');
                editor.reportError(error, 'Error invoking the UpdateCouponSize web method! ' + request.responseText);
            }
        });
    }

    /**
     * Used to update the front coupon objects
     * @param val Requested front coupon value
     */
    updateFrontCoupon(val: string): void {
        $('#btnDefaultCoupon').removeClass('active');
        $('#btnUseCallToday').removeClass('active');
        $('#btnUseSixMonths').removeClass('active');
        $('#btnUseOneYear').removeClass('active');

        let selectedObjectID = 0;
        let orgFontSize = 0;

        // @ts-expect-error its works
        e5Canvas.canvas.forEachObject(function (object: TemplateObject) {
            if (object.ObjectGroup == 'FrontCoupon') {
                console.log('Checking: Name: ' + object.ObjectName + ' Group:' + object.ObjectGroup + ' Type: ' + object.ResourceType);

                let updateObject = false;

                object.WordBreak = false;

                switch (val) {
                    case 'Default':
                        object.visible = true;
                        if (object.ObjectName === 'Offer Amount') {
                            selectedObjectID = object.ID;
                            object.text = '$XXX OFF';
                            updateObject = true;
                            orgFontSize = object.orgFontSize;

                            if (object.orgHeight) {
                                object.height = object.orgHeight;
                            }
                        }

                        $('#btnDefaultCoupon').addClass('active');
                        break;
                    case 'CallToday':
                        if (object.ObjectName != 'Offer Amount') {
                            object.visible = false;
                        }
                        else {
                            object.text = 'Call Today!';
                            updateObject = true;
                            selectedObjectID = object.ID;
                            orgFontSize = object.orgFontSize;

                            if (orderVars.productSize === ProductSizes.SmallDoorHanger) {
                                object.WordBreak = true;
                                object.autoFontSize = true;
                                object.text = 'Call\r\nToday!';
                            }
                        }

                        $('#btnUseCallToday').addClass('active');
                        break;
                    case 'SixMonths':
                        if (object.ObjectName != 'Offer Amount') {
                            object.visible = false;
                        }
                        else {
                            object.text = '6 Months Same as Cash!';
                            object.autoFontSize = true;
                            updateObject = true;
                            selectedObjectID = object.ID;

                            if (orderVars.productSize === ProductSizes.MediumDoorHanger) {
                                object.WordBreak = true;
                                object.text = '6 Months\r\nSame as Cash!';
                                orgFontSize = 15;
                            }
                            else if (orderVars.productSize === ProductSizes.SmallDoorHanger) {
                                object.WordBreak = true;
                                object.text = '6 Months\r\nSame as Cash!';
                                orgFontSize = 9;
                            }
                            else if (orderVars.productSize === ProductSizes.GAFStandardPostcard) {
                                object.WordBreak = true;
                                object.text = '6 Months\r\nSame as\r\nCash!';
                                orgFontSize = 16;
                            }
                            else {
                                orgFontSize = 23;
                            }
                        }

                        $('#btnUseSixMonths').addClass('active');
                        break;
                    case 'OneYear':
                        if (object.ObjectName != 'Offer Amount') {
                            object.visible = false;
                        }
                        else {
                            object.text = '1 Year Same as Cash!';
                            updateObject = true;
                            object.autoFontSize = true;
                            selectedObjectID = object.ID;

                            if (orderVars.productSize === ProductSizes.MediumDoorHanger) {
                                object.WordBreak = true;
                                object.text = '1 Year\r\nSame as Cash!';
                                orgFontSize = 15;
                            }
                            else if (orderVars.productSize === ProductSizes.SmallDoorHanger) {
                                object.WordBreak = true;
                                object.text = '1 Year\r\nSame as Cash!';
                                orgFontSize = 9;
                            }
                            else if (orderVars.productSize === ProductSizes.GAFStandardPostcard) {
                                object.WordBreak = true;
                                object.text = '1 Year\r\nSame as\r\nCash!';
                                orgFontSize = 16;
                            }
                            else {
                                orgFontSize = 23;
                            }
                        }

                        $('#btnUseOneYear').addClass('active');
                        break;
                }

                if (updateObject) {
                    e5Canvas.canvas.renderAll();
                    e5Canvas.canvas.renderAll();
                    const ResetFontSize = <number>e5Canvas.setFontSize(orgFontSize);
                    elementProp.setActiveStyle('fontSize', ResetFontSize, object, false);

                    elementProp.setActiveStyle('fill', object.fill, object, false);
                    elementProp.setActiveStyle('fontWeight', 'bold', object, false);
                }
            }
        });

        if (selectedObjectID !== 0) {
            elementProp.selectObjectByID(selectedObjectID);
        }

        e5Canvas.canvas.renderAll();
        editor.loadSideBar('Coupon');
    }

    replaceCoupon(couponID: number): void {
        console.log('replaceCoupon = ' + couponID);
        //e5Canvas.removeObject(e5Canvas.getActiveObject(), true);

        $.ajax({
            url: appConfig.webAPIURL + 'GetCoupon',
            data: {
                couponID: couponID
            },
            contentType: 'application/json',
            success: function (result) {
                templateCoupons.loadCoupon(couponID, result);
            },
            error: function (request, _status, _error) {
                messages.Msg('Error invoking the web method! ' + request.responseText, 'GetCoupon', 'error');
                console.log('getCoupon: Error invoking the web method! ' + request.responseText);
            }
        });
    }

    updateCouponObjects(cSize: string): void {
        $('#btnUseOneCoupon').removeClass('active');
        $('#btnUseTwoCoupons').removeClass('active');
        $('#btnUseLogoCoupon').removeClass('active');

        if (e5Canvas.canvas.getActiveObjects()) {
            e5Canvas.canvas.discardActiveObject().renderAll();
        }

        let selectedObjectID = 0;

        // @ts-expect-error its fine
        e5Canvas.canvas.forEachObject(function (object: TemplateObject) {
            //Only need to check object group of coupon
            if (object.ObjectGroup == 'Coupon') {
                console.log('Checking: Name: ' + object.ObjectName + ' Group:' + object.ObjectGroup + ' Type: ' + object.ResourceType);

                if (object.ResourceType == 'BC') {
                    //Delete old coupon objects
                    e5Canvas.removeObject(object, false, false);
                }
                else if (object.ResourceType == 'C') {
                    //Reset coupons
                    object.text = '[Offer Area]';
                }

                //Hide logo if coupon is small or large
                if ((cSize == 'S' || cSize == 'L') && object.ObjectName == '(L)') {
                    object.visible = false;
                }

                //Hide large coupon if small is set
                if ((cSize == 'S' || cSize == 'Logo') && object.ObjectName == 'LargeCoupon') {
                    object.visible = false;
                }

                if ((cSize == 'L' || cSize == 'Logo') && (object.ObjectName == 'SmallCoupon1' || object.ObjectName == 'SmallCoupon2')) {
                    //Hide small coupons if large is set
                    object.visible = false;
                }
                else if (cSize == 'S' && (object.ObjectName == 'SmallCoupon1' || object.ObjectName == 'SmallCoupon2')) {
                    //Show small coupons
                    object.visible = true;

                    if (object.ObjectName == 'SmallCoupon1') {
                        selectedObjectID = object.ID;
                    }

                    $('#btnUseTwoCoupons').addClass('active');
                    object.text = '[Offer Area]';
                    templateCoupons.resetCoupon(object, 100000);
                }
                else if (cSize == 'L' && object.ObjectName == 'LargeCoupon') {
                    //Show large coupon
                    object.visible = true;
                    selectedObjectID = object.ID;
                    $('#btnUseOneCoupon').addClass('active');
                    templateCoupons.resetCoupon(object, 100000);
                }
                else if (cSize == 'Logo' && object.ObjectName == '(L)') {
                    //Show Logo
                    object.visible = true;
                    selectedObjectID = object.ID;
                    $('#btnUseLogoCoupon').addClass('active');
                }
            }
        });

        //e5Canvas.canvas.renderAll();
        editor.loadSideBar('Coupon');
        elementProp.selectObjectByID(selectedObjectID);
    }

    resetCoupon(object: TemplateObject, couponID: number): void {
        console.log('Reset Coupon: ' + object.ID);

        const activeObject = e5Canvas.getObjectById(object.ID);

        if (activeObject) {
            activeObject.text = couponID.toString();
            activeObject.ImageAlign = 'IAMIDDLECENTER';

            activeObject.setSrc(appConfig.WebData + 'Coupons/' + couponID + 't.png', function () {
                activeObject.set({
                    align: 'center',
                    // @ts-expect-error figure out if this is correct
                    scale: 'fill',
                    ImageAlign: 'IAMIDDLECENTER',
                    dirty: true,
                    width: activeObject.orgWidth,
                    height: activeObject.orgHeight,
                    text: couponID + 't',
                    isDirty: true
                });

                setTimeout(function () {
                    e5Canvas.canvas.renderAll();
                    e5Canvas.canvas.calcOffset();
                    //editor.loadSideBar('Coupon');
                    editor.activeAccordion = 2;
                    $('.ui.accordion').accordion('open', 2);
                }, 500);
            });
        }
        else {
            messages.Msg('Coupon not found', 'Reset Coupon', 'error');
        }
    }

    loadCoupon(couponID: number, jsonStr: string): void {
        console.log('Coupon Load: ' + jsonStr);
        if (jsonStr.length <= 0) {
            alert('No Template Data. Please report this error!');
            return;
        }

        const jsonObj = JSON.parse(jsonStr);
        const activeObject = e5Canvas.getActiveObject();
        activeObject.text = couponID.toString();
        activeObject.ImageAlign = 'IAMIDDLECENTER';

        activeObject.setSrc(appConfig.WebData + 'Coupons/' + couponID + '.png', function () {
            activeObject.set({
                align: 'center',
                // @ts-expect-error figure out if this is correct
                scale: 'best-fit',
                ImageAlign: 'IAMIDDLECENTER',
                dirty: true,
                //scaleX: e5Canvas.canvasScale,
                //scaleY: e5Canvas.canvasScale,
                width: activeObject.orgWidth,
                height: activeObject.orgHeight,
                text: couponID.toString()
            });

            e5Canvas.canvas.renderAll();
            e5Canvas.canvas.calcOffset();

            //Delete old objects
            // @ts-expect-error its works
            e5Canvas.canvas.forEachObject(function (object: TemplateObject) {
                console.log('Checking: Name: ' + object.ObjectName + ' Group:' + object.ObjectGroup + ' Type: ' + object.ResourceType);

                if (object.ResourceType == 'BC') {
                    if (object.LinkedObject == activeObject.ID) {
                        console.log('Delete old coupon object');
                        e5Canvas.removeObject(object, false, false);
                    }
                }
            });

            $.each(jsonObj, function (i: number, orderObj) {
                //orderObj.zIndex = i;
                if (orderObj.zIndex == 0) {
                    orderObj.zIndex = i + 1;
                }

                if (orderObj.ImageAlign === 'IASTRETCH') {
                    orderObj.ImageAlign = 'IACROP';
                }

                orderObj.LinkedObject = activeObject.ID;
                templateOrder.addFaceObject(orderObj);
            });

            //e5Canvas.editMode(false);
            e5Canvas.canvas.renderAll();

            // @ts-expect-error exists
            e5Canvas.canvas.forEachObject(function (object: TemplateObject) {
                console.log('Moving: ' + object.ObjectName + ' to ' + object.zIndex);
                e5Canvas.canvas.moveTo(object, object.zIndex);
            });

            //e5Canvas.canvas.renderAll();

            e5Canvas.setCanvasSelection();

            setTimeout(function () {
                editor.loadSideBar('Coupon');
            }, 500);
        });
    }

    /*
    addCoupon: function(couponID) {
        console.log(couponID);
        var productSize;
        var orderObj;

        switch(couponID) {
            case 100101:
                productSize = 100100;
                break;
        }
        this.addCoupon(productSize, orderObj);
    },
    */
    newCoupon(): void {
        const cWidth = 514;
        const cHeight = 227;
        //@ts-expect-error known
        const obj: OrderObject = {
            X: 20,
            Y: 20,
            Width: cWidth,
            Height: cHeight,
            PageNumber: orderVars.currentPage
            //ID: 'newCoupon_' + Math.floor((Math.random() * 1000) + 1)
        };

        this.addCoupon(orderVars.productSize, obj);

        e5Canvas.canvas.renderAll().renderAll();
        e5Canvas.canvas.calcOffset();
    }

    addCoupon(productSize: number, orderObj: OrderObject): void {
        console.log('add coupon productSize ' + productSize);
        //Changed from ITextBox
        const couponTextBox = new fabric.Textbox('SPECIAL OFFER\n$XXX OFF\nANY COMPLETE PROJECT\nCoupon cannot be combined with any other offer.\nOffer expires XX/XX/XX.', {
            scaleX: e5Canvas.canvasScale,
            scaleY: e5Canvas.canvasScale,
            // @ts-expect-error known
            originalScales: [e5Canvas.canvasScale, e5Canvas.canvasScale],
            left: orderObj.X,
            top: orderObj.Y,
            width: orderObj.Width,
            height: orderObj.Height,
            orgHeight: orderObj.Height,
            fontSize: 12,
            fontFamily: 'Arial',
            textAlign: 'center',
            vAlign: 'middle',
            angle: 0,
            fill: '#ee1c23',
            backgroundColor: 'yellow',
            fontWeight: 'bold',
            textPadding: 1,
            strokeStyle: 'transparent',
            originX: 'left',
            hasRotatingPoint: true,
            centeredScaling: false,
            centeredRotation: true,
            lockScalingX: false,
            lockScalingY: false,
            selectable: true,
            PageNumber: orderObj.PageNumber,
            ObjectName: 'Special Offer',
            ObjectType: 116,
            ObjectGroup: 'Coupon',
            ResourceType: 'BC',
            LinkedObject: orderObj.ID,
            //boxPath: orderObj.boxPath,
            autoFontSize: false,
            autoBoxHeight: false,
            boxStroke: '#ee1c23',
            boxStrokeWidth: 3,
            boxStrokeDashArray: [10, 5]
            //boxFill: 'yellow'
            //styles: couponTextStyle
        });
        e5Canvas.canvas.add(couponTextBox).bringToFront(couponTextBox);

        couponTextBox.setSelectionStart(0);
        couponTextBox.setSelectionEnd(13);

        let _fontSize = 6;

        switch (productSize) {
            case 100001:
                _fontSize = 14;
                break;
            case 100002:
                _fontSize = 24;
                break;
        }
        couponTextBox.setSelectionStyles({ fontSize: _fontSize });

        couponTextBox.setSelectionStart(14);
        couponTextBox.setSelectionEnd(22);

        switch (productSize) {
            case 100001:
                _fontSize = 36;
                break;
            case 100002:
                _fontSize = 48;
                break;
        }
        couponTextBox.setSelectionStyles({ fontSize: _fontSize });

        couponTextBox.setSelectionStart(23);
        couponTextBox.setSelectionEnd(43);
        switch (productSize) {
            case 100001:
                _fontSize = 12;
                break;
            case 100002:
                _fontSize = 16;
                break;
        }
        couponTextBox.setSelectionStyles({ fontSize: _fontSize });

        couponTextBox.setSelectionStart(44);
        couponTextBox.setSelectionEnd(117);
        switch (productSize) {
            case 100001:
                _fontSize = 6;
                break;
            case 100002:
                _fontSize = 8;
                break;
        }
        couponTextBox.setSelectionStyles({ fontSize: _fontSize });
    }
}

export const templateCoupons = TemplateCoupons.instance;