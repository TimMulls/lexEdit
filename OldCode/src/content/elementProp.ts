import { e5Canvas } from "../app/editor/e5Canvas";
import { editor } from "../app/editor/editor";
import { appConfig } from "../app/appConfig";
import { miscUtils } from "../app/misc/miscUtils";
import { orderVars } from "../app/orderVars";
import { TemplateObject } from "../interfaces/template";
import { MembershipTypes } from "../enums/MembershipTypes";
import { templateCoupons } from "../app/template/templateCoupons";
import { messages } from "../app/messages";
import FontFaceObserver from 'fontfaceobserver';
import { ArrangeObjDirection } from "../enums/arrangeObjDirection";
import { ProductTypes } from "../enums/productTypes";
import { templateElements } from "../app/template/templateElements";

export class ElementProp {
    private static _instance = new ElementProp();

    static get instance(): ElementProp {
        return this._instance;
    }

    init(): void {
        //Setup Font Family
        $('#pFontFamily').dropdown({
            action: 'hide',
            allowReselection: true,
            onChange: function (value, text, _selectedItem) {
                elementProp.setFontFamily(value, text);
            }
        }).attr('tabindex', '-1');

        $('#pFontSize').on('keyup input', function () {
            elementProp.setFontSize(<number>$('#pFontSize').val());
        });

        $('#btnBold').click(function () {
            $('#btnBold').removeClass('active');
            elementProp.toggleBold();
            if (elementProp.isBold()) {
                $('#btnBold').addClass('active');
            }
        });

        $('#btnItalic').click(function () {
            $('#btnItalic').removeClass('active');
            elementProp.toggleItalic();
            if (elementProp.isItalic()) {
                $('#btnItalic').addClass('active');
            }
        });

        $('#btnUnderline').click(function () {
            $('#btnUnderline').removeClass('active');
            elementProp.toggleUnderline();
            if (elementProp.isUnderline()) {
                $('#btnUnderline').addClass('active');
            }
        });

        $('#btnLeftAlign').click(function () {
            $('#btnLeftAlign').removeClass('active');
            $('#btnCenterAlign').removeClass('active');
            $('#btnRightAlign').removeClass('active');
            elementProp.setActiveProp('textAlign', 'left');
            $('#btnLeftAlign').addClass('active');
        });

        $('#btnCenterAlign').click(function () {
            $('#btnLeftAlign').removeClass('active');
            $('#btnCenterAlign').removeClass('active');
            $('#btnRightAlign').removeClass('active');
            elementProp.setActiveProp('textAlign', 'center');
            $('#btnCenterAlign').addClass('active');
        });

        $('#btnRightAlign').click(function () {
            $('#btnLeftAlign').removeClass('active');
            $('#btnCenterAlign').removeClass('active');
            $('#btnRightAlign').removeClass('active');
            elementProp.setActiveProp('textAlign', 'right');
            $('#btnRightAlign').addClass('active');
        });

        $('#bgColor').spectrum({
            showPaletteOnly: true,
            togglePaletteOnly: true,
            togglePaletteMoreText: 'more',
            togglePaletteLessText: 'less',
            preferredFormat: 'name',
            showInput: true,
            hideAfterPaletteSelect: true,
            move: function (color) {
                if (color !== null) {
                    elementProp.changeBackgroundColor(color.toHexString());
                }
                else {
                    elementProp.changeBackgroundColor('');
                }
            },
            palette: elementProp.getColorPalette(),
            allowEmpty: true,
            appendTo: $('#canvasContainer')
        });

        $('#textColor').spectrum({
            showPaletteOnly: true,
            togglePaletteOnly: true,
            togglePaletteMoreText: 'more',
            togglePaletteLessText: 'less',
            preferredFormat: 'name',
            hideAfterPaletteSelect: true,
            showInput: true,
            move: function (color) {
                if (color !== null) {
                    elementProp.changeShapeColor(color.toHexString());
                }
            },
            palette: elementProp.getColorPalette(),
            appendTo: $('#canvasContainer')
        });

        $('#pOpacitySlider').on('change input', function () {
            elementProp.setActiveStyle('opacity', (parseInt(<string>$('#pOpacitySlider').val(), 10) / 100));
        });

        $('#btnChangeCoupon').off('click').click(function () {
            /*
                        if (lexEdit.leftLayout !== 'leftCoupons') {
                            lexEdit.leftLayout = 'leftCoupons';
                            w2ui.insideLayout.load('right', 'content/left/leftCoupons.html', 'slide-right', function () {
                                //imgEditor.getImages(imgType);
                            });
                        } else {
                            //imgEditor.getImages(imgType);
                        }
            */
        });

        $('#mnuRemoveObject').click(() => editor.handleDelete());

        $('#mnuMoveBackward').click(() => elementProp.arrangeObj(ArrangeObjDirection.Backward));
        $('#mnuMoveForward').click(() => elementProp.arrangeObj(ArrangeObjDirection.Forward));
        $('#mnuMoveToFront').click(() => elementProp.arrangeObj(ArrangeObjDirection.Front));
        $('#mnuMoveToBack').click(() => elementProp.arrangeObj(ArrangeObjDirection.Back));

        $("#btnUseOneCoupon").off().on('click', function () { templateCoupons.updateCouponSize('L'); });
        $("#btnUseTwoCoupons").off().on('click', function () { templateCoupons.updateCouponSize('S'); });
        $("#btnUseLogoCoupon").off().on('click', function () { templateCoupons.updateCouponSize('Logo'); });
        
        $("#btnDefaultCoupon").off().on('click', function () { templateCoupons.updateFrontCoupon('Default'); });
        $("#btnUseCallToday").off().on('click', function () { templateCoupons.updateFrontCoupon('CallToday'); });
        $("#btnUseSixMonths").off().on('click', function () { templateCoupons.updateFrontCoupon('SixMonths'); });
        $("#btnUseOneYear").off().on('click', function () { templateCoupons.updateFrontCoupon('OneYear'); });

        $("#btnUseLogo").off().on('click', function () { { templateElements.updateLogoQR('Logo'); } })
        $("#btnUseQRLogo").off().on('click', function () { { templateElements.updateLogoQR('LogoQR'); } })

        elementProp.hideMsg(false);
    }

    getColorPalette(): Array<Array<string>> {
        const defaultPalette: Array<Array<string>> = [];
        const defaultColors: Array<string> = ['rgb(0, 0, 0)', 'rgb(255, 255, 255)', 'rgb(255, 0, 0)', 'rgb(0, 0, 255)', 'rgb(255, 255, 0)', 'rgb(0, 128, 0)', 'rgb(128, 128, 128)', 'rgb(128, 0, 128)', 'rgb(255, 165, 0)', 'rgb(165,42,42)'];

        //Gold and silver
        //if (orderVars.currentPage === 1) {
        if (orderVars.productSize === 100103 ||
            orderVars.productSize === 100104 ||
            orderVars.productSize === 100107 ||
            orderVars.productSize === 100108 ||
            orderVars.productSize === 100111 ||
            orderVars.productSize === 100112 ||
            orderVars.productSize === 100113) {
            defaultPalette.push(['#85754e']);
        }
        else if (orderVars.productSize === 100105 ||
            orderVars.productSize === 100106 ||
            orderVars.productSize === 100109 ||
            orderVars.productSize === 100110 ||
            orderVars.productSize === 100114 ||
            orderVars.productSize === 100115 ||
            orderVars.productSize === 100116) {
            defaultPalette.push(['#8c8f90']);
        }
        //}

        if (orderVars.membershiptype === MembershipTypes.JamesHardie) {
            defaultPalette.push(['#008752', '#797a7d']);
        }
        else if (orderVars.membershiptype === MembershipTypes.GAF) {
            defaultPalette.push(['#004990', '#ee1c23', '#fbee23']);
        }
        else if (orderVars.membershiptype === MembershipTypes.LPBuildsmart) {
            defaultPalette.push(['#005284', '#f48024']);
        }
        else if (orderVars.membershiptype === MembershipTypes.LifeWay) {
            defaultPalette.push(['#23408f', '#d23f3a', '#bf202f', '#72c264', '#d36a29', '#732f8e']);
        }
        else if (orderVars.membershiptype === MembershipTypes.LexinetPrints) {
            defaultPalette.push(['#262d66', '#deb506']);
        }
        /*
        else {
            defaultPalette = [
                ['rgb(0, 0, 0)', 'rgb(67, 67, 67)', 'rgb(102, 102, 102)', 'rgb(204, 204, 204)', 'rgb(217, 217, 217)', 'rgb(255, 255, 255)'],
                ['rgb(152, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 153, 0)', 'rgb(255, 255, 0)', 'rgb(0, 255, 0)', 'rgb(0, 255, 255)', 'rgb(74, 134, 232)', 'rgb(0, 0, 255)', 'rgb(153, 0, 255)', 'rgb(255, 0, 255)'],
                ['rgb(230, 184, 175)', 'rgb(244, 204, 204)', 'rgb(252, 229, 205)', 'rgb(255, 242, 204)', 'rgb(217, 234, 211)',
                    'rgb(208, 224, 227)', 'rgb(201, 218, 248)', 'rgb(207, 226, 243)', 'rgb(217, 210, 233)', 'rgb(234, 209, 220)',
                    'rgb(221, 126, 107)', 'rgb(234, 153, 153)', 'rgb(249, 203, 156)', 'rgb(255, 229, 153)', 'rgb(182, 215, 168)',
                    'rgb(162, 196, 201)', 'rgb(164, 194, 244)', 'rgb(159, 197, 232)', 'rgb(180, 167, 214)', 'rgb(213, 166, 189)',
                    'rgb(204, 65, 37)', 'rgb(224, 102, 102)', 'rgb(246, 178, 107)', 'rgb(255, 217, 102)', 'rgb(147, 196, 125)',
                    'rgb(118, 165, 175)', 'rgb(109, 158, 235)', 'rgb(111, 168, 220)', 'rgb(142, 124, 195)', 'rgb(194, 123, 160)',
                    'rgb(166, 28, 0)', 'rgb(204, 0, 0)', 'rgb(230, 145, 56)', 'rgb(241, 194, 50)', 'rgb(106, 168, 79)',
                    'rgb(69, 129, 142)', 'rgb(60, 120, 216)', 'rgb(61, 133, 198)', 'rgb(103, 78, 167)', 'rgb(166, 77, 121)',
                    'rgb(91, 15, 0)', 'rgb(102, 0, 0)', 'rgb(120, 63, 4)', 'rgb(127, 96, 0)', 'rgb(39, 78, 19)',
                    'rgb(12, 52, 61)', 'rgb(28, 69, 135)', 'rgb(7, 55, 99)', 'rgb(32, 18, 77)', 'rgb(76, 17, 48)']
            ];
        }
        */

        defaultPalette.push(defaultColors);

        return defaultPalette;
    }

    arrangeObj(pos: string): void {
        const activeObjects = e5Canvas.canvas.getActiveObjects();
        e5Canvas.canvas.discardActiveObject().renderAll();

        activeObjects.forEach(function (obj) {
            //ToDo:: Why am I using lock rotaion?  It means nothing to why it would not be allowed to be put in another layer
            if (obj.lockRotation !== true) {
                switch (pos) {
                    case ArrangeObjDirection.Backward:
                        e5Canvas.canvas.sendBackwards(obj);
                        break;
                    case ArrangeObjDirection.Forward:
                        e5Canvas.canvas.bringForward(obj);
                        break;
                    case ArrangeObjDirection.Front:
                        e5Canvas.canvas.bringToFront(obj);
                        break;
                    case ArrangeObjDirection.Back:
                        e5Canvas.canvas.sendToBack(obj);
                        break;
                }
            }
        });

        //Not sure if this is needed but was used before creating this function
        let zIndex = 0;
        e5Canvas.canvas.getObjects().forEach((object) => {
            // @ts-expect-error i know
            object.set("zIndex", zIndex);
            zIndex++;
        });

        e5Canvas.canvas.requestRenderAll();
    }

    preventEnterKey(e: KeyboardEvent): boolean {
        if (e.keyCode === 13) {
            e.preventDefault();
            return false;
        }

        return true;
    }

    selectObjectByID(id: number): void {
        e5Canvas.canvas.discardActiveObject();
        e5Canvas.canvas.renderAll();

        const objs: TemplateObject[] = e5Canvas.getObjects();

        for (const obj of objs) {
            if (obj.ID && obj.ID === id) {
                e5Canvas.canvas.setActiveObject(obj);

                if (orderVars.productType !== ProductTypes.EntrywayMat) {
                    if (obj.ResourceType.toUpperCase() === 'S') {
                        setTimeout(function () {
                            $("#bgColor").spectrum("show");
                        }, 800);
                    }
                }
            }
        }

        e5Canvas.canvas.renderAll();
    }

    setTextByID(id: number, newText: string): void {
        let activeObj: TemplateObject | undefined = e5Canvas.getActiveObject();

        if (activeObj?.ID !== id) {
            activeObj = e5Canvas.getObjectById(id);
        }

        if (activeObj === undefined) {
            console.log('setTextByID: id=' + id + ' not found');
            return;
        }

        if (newText === activeObj.text) {
            console.log('text same returning');
            return;
        }

        const oldAutoResize = activeObj.autoFontSize;

        //If not in adv mode then force font to shrink
        if (!e5Canvas.AdvMode) {
            activeObj.autoFontSize = true;
            //activeObj.splitByGrapheme = true;
            activeObj.allowCuttedWords = true;
            activeObj.styles = {};
        }

        activeObj.set('text', newText);
        //e5Canvas.canvas.renderAll();

        if (!e5Canvas.AdvMode) {
            //elementProp.setFontSize(activeObj.fontSize);
        }

        //Update styles, since we are typing on the side the styles will be the same for everything in the box
        this.setActiveStyle('fontWeight', this.getActiveStyle('fontWeight') === 'bold' ? 'bold' : '', e5Canvas.getActiveObject(), false);
        this.setActiveStyle('fontStyle', this.getActiveStyle('fontStyle') === 'italic' ? 'italic' : '', e5Canvas.getActiveObject(), false);

        const value = this.isUnderline() ? this.getActiveStyle('textDecoration') + ' underline' : (<string>this.getActiveStyle('textDecoration')).replace('underline', '');
        this.setActiveStyle('textDecoration', value, e5Canvas.getActiveObject(), false);
        this.setActiveStyle('underline', elementProp.getActiveStyle('underline'), e5Canvas.getActiveObject(), false);

        //activeObj._styleMap = activeObj._generateStyleMap(activeObj._splitText());
        //activeObj._clearCache();
        e5Canvas.canvas.renderAll();

        //Update font size box
        $('#pFontSize').val(this.getFontSize());

        activeObj.autoFontSize = oldAutoResize;
        activeObj.allowCuttedWords = false;
        //activeObj.splitByGrapheme = false;

        editor.addMemoTransformCmd(activeObj);
    }

    setHandles(activeObject: TemplateObject): void {
        if (activeObject.isEditing) {
            return;
        }
        activeObject.setControlsVisibility({
            bl: e5Canvas.AdvMode,
            br: e5Canvas.AdvMode,
            mb: e5Canvas.AdvMode,
            ml: e5Canvas.AdvMode,
            mr: e5Canvas.AdvMode,
            mt: e5Canvas.AdvMode,
            tl: e5Canvas.AdvMode,
            tr: e5Canvas.AdvMode,
            mtr: e5Canvas.AdvMode
        });

        activeObject.lockMovementX = !e5Canvas.AdvMode;
        activeObject.lockMovementY = !e5Canvas.AdvMode;

        if (e5Canvas.AdvMode === false) {
            return;
        }

        switch (activeObject.type) {
            case 'textbox':
                activeObject.hasRotatingPoint = true;
                activeObject.transparentCorners = false;
                activeObject.setControlsVisibility({
                    bl: false,
                    br: false,
                    tl: false,
                    tr: false,
                    mt: false,
                    mb: false,
                    ml: false,
                    mr: true
                });
                break;
            case appConfig.ImageClassType:
                if (activeObject.ImageAlign !== 'IACROP') {
                    activeObject.setControlsVisibility({
                        bl: true,
                        br: true,
                        tl: true,
                        tr: true,
                        mt: false,
                        mb: false,
                        ml: false,
                        mr: false
                    });
                }
                break;
            case 'circle':
            case 'rect':
            case 'ellipse':
            case 'line':
                break;
        }

        if (e5Canvas.AdvMode) {
            e5Canvas.canvas.hoverCursor = 'default';
        }
        else {
            e5Canvas.canvas.hoverCursor = 'hand';
        }
    }

    fixFontStyleBtns(): void {
        const activeObject = e5Canvas.getActiveObject();

        if (!activeObject) {
            return;
        }

        $('#btnBold').prop('disabled', false);
        $('#btnItalic').prop('disabled', false);

        const fontToFind = activeObject.fontFamily.toUpperCase() + ':';

        console.log('Trying to find Font: ' + fontToFind);
        orderVars.allFonts.filter(function (windowValue) {
            if (windowValue) {
                if (windowValue.toUpperCase().substring(0, fontToFind.length) === fontToFind) {
                    console.log('Found Font: ' + windowValue);
                    if (windowValue.indexOf('n4', fontToFind.length) !== -1) {
                        console.log('Normal Font Found');
                    }

                    if (windowValue.indexOf('i4', fontToFind.length) !== -1) {
                        $('#btnItalic').prop('disabled', false);
                        console.log('Italic Font Found');
                    }
                    else {
                        $('#btnItalic').prop('disabled', true);
                        $('#btnItalic').removeClass('active');
                        elementProp.setActiveStyle('fontStyle', '', e5Canvas.getActiveObject(), false);
                    }

                    if (windowValue.indexOf('n7', fontToFind.length) !== -1) {
                        $('#btnBold').prop('disabled', false);
                        console.log('Bold Font Found');
                    }
                    else {
                        $('#btnBold').prop('disabled', true);
                        $('#btnBold').removeClass('active');

                        elementProp.setActiveStyle('fontWeight', '', e5Canvas.getActiveObject(), false);
                    }

                    //ToDo: I don't think there will ever be a font that only has bold italic but if there ever is
                    //then will have to force both buttons to be selected at same time.
                    if (windowValue.indexOf('i7', fontToFind.length) !== -1) {
                        console.log('Bold Italic Font Found');
                    }
                }
            }
        });
    }

    update(): void {
        editor.hideImgMan();
        editor.hideCouponButtons();

        const activeObject = e5Canvas.getActiveObject();

        if (activeObject === undefined) {
            return;
        }

        $('#fontName').val('');

        $('#pFontFamily').hide();
        $('#pFontSize').hide();
        $('#textColor').hide();
        $('#bgColor').hide();
        $('#textStyleBtns').hide();
        $('#textAlignBtns').hide();
        $('#divFrontCouponSelection').hide();
        $('#divBackCouponSelection').hide();
        $('#divBackLogoQRSelection').hide();

        elementProp.setHandles(activeObject);

        switch (activeObject.type) {
            case 'textbox': {
                if (activeObject.ObjectGroup == 'FrontCoupon') {
                    if (editor.activeAccordion !== 2 || !$('#divSideBarCoupon div.title:first').hasClass('active')) {
                        $('.ui.accordion').accordion('open', 2);
                    }

                    editor.showCouponButtons();
                    /*
                    $('#mnuCoupon').show();
                    $('#divFrontCouponSelection').show();

                    //Set Active button
                    // @ts-expect-error its works
                    e5Canvas.canvas.forEachObject(function (object: TemplateObject) {
                        if (object.ObjectGroup == 'FrontCoupon') {
                            if (object.ObjectName === 'Offer Amount') {
                                if (object.text.includes("$", 0) || object.text.includes("%", 0)) {
                                    $("#btnDefaultCoupon").addClass('active');
                                }
                                else if (object.text.includes('Call Today')) {
                                    $("#btnUseCallToday").addClass('active');
                                }
                                else if (object.text.includes('6 Months')) {
                                    $("#btnUseSixMonths").addClass('active');
                                }
                                else if (object.text.includes('1 Year')) {
                                    $("#btnUseOneYear").addClass('active');
                                }
                            }
                        }
                    });
                    */
                }
                else if (activeObject.ResourceType == 'BC') {
                    //if (editor.activeAccordion !== 2 || !$('#divSideBarCoupon div.title:first').hasClass('active')) {
                    $('.ui.accordion').accordion('open', 2);
                    //}

                    editor.showCouponButtons();
                    /*
                    $('#mnuCoupon').show();
                    $('#divBackCouponSelection').show();
                    elementProp.setBackCouponBtnActive();
                    */
                }
                else {
                    if (editor.activeAccordion !== 0 || !$('#divSideBarText div.title:first').hasClass('active')) {
                        $('.ui.accordion').accordion('open', 0);
                    }
                }

                $('#pFontFamily').show();
                $('#pFontSize').show();
                $('#textColor').show();
                $('#bgColor').show();
                $('#textStyleBtns').show();
                $('#textAlignBtns').show();
                $('#divTransparency').show();

                activeObject.off('editing:entered').on('editing:entered', function () {
                    elementProp.textEditMode(activeObject);
                });
                //console.log('elementProp update textbox');
                //This is needed again for some reason, if not included it no longer allows on change function to run.
                $('#pFontFamily').dropdown({
                    allowReselection: true,
                    onChange: function (value, text, _selectedItem) {
                        elementProp.setFontFamily(value, text);
                    }
                }).attr('tabindex', '-1');

                //$('#fontName').val(activeObject.fontFamily.toLowerCase());
                //console.log('Font: ' + activeObject.fontFamily);
                const itemFont = $('#pFontFamily').dropdown('get item', activeObject.fontFamily.toLowerCase());
                $('#fontName').val(activeObject.fontFamily);
                if (itemFont[0]) {
                    $('#pFontFamily').dropdown('set text', itemFont[0].innerText);
                    $('#pFontFamily').dropdown('set selected', itemFont[0].innerText);
                }
                else {
                    console.log('font not found: ' + activeObject.fontFamily);
                    messages.Msg('Font ' + activeObject.fontFamily + ' not found. Reloading..', 'Font not found', 'error');

                    const font = new FontFaceObserver(activeObject.fontFamily);
                    font.load().then(function () {
                        $('#divFonts').append('<span style="font-family: ' + activeObject.fontFamily + ';">' + activeObject.fontFamily + ' : Missing Font Added</span>');

                        let addToDDL = true;
                        $('#pFontFamily .menu > div').each(function () {
                            if ((this).getAttribute('data-value') == activeObject.fontFamily.toLowerCase()) {
                                addToDDL = false;
                                return;
                            }
                        })

                        if (addToDDL) {
                            $('#pFontFamily .menu').append($('<div>').addClass('item').attr('data-value', activeObject.fontFamily.toLowerCase()).attr('style', 'font-family:"' + activeObject.fontFamily + '" !important; font-size:12pt !important;').text(activeObject.fontFamily));
                        }

                        messages.Msg(activeObject.fontFamily + ' has loaded.', 'Missing Font Loaded', 'success');
                        e5Canvas.canvas.renderAll();
                    }).catch(function () {
                        messages.Msg(activeObject.fontFamily + ' failed to load.', 'Error Reloading', 'error');
                    });
                }
                $('.fntName').css('font-family', activeObject.fontFamily);

                $('#pFontSize').val(elementProp.getFontSize());

                let fillColor: string = <string>activeObject.fill;

                if (activeObject.isEditing) {
                    fillColor = <string>elementProp.getActiveStyle('fill', activeObject);
                }

                $('#textColor').children().first().
                    css("color", fillColor).
                    css("background-color", miscUtils.getBestBgColor(fillColor));

                $('#textColor').children().first().removeClass('bordered');
                if (miscUtils.getBestBgColor(fillColor) === '#000') {
                    $('#textColor').children().first().addClass('bordered');
                }

                $('#textColor').spectrum('set', fillColor);

                //This line is needed to prevent postback on enter key
                $('input[type="text"]').keydown(function (event) {
                    if (event.keyCode === 13) {
                        event.preventDefault();
                        return false;
                    }

                    return;
                });

                $('#bgColor').children().first().
                    css("color", <string>activeObject.backgroundColor).
                    css("background-color", miscUtils.getBestBgColor(<string>activeObject.backgroundColor));

                $('#bgColor').children().first().removeClass('bordered');
                if (miscUtils.getBestBgColor(<string>activeObject.backgroundColor) === '#000') {
                    $('#bgColor').children().first().addClass('bordered');
                }

                $('#bgColor').spectrum('set', (activeObject.backgroundColor === null) ? '' : activeObject.backgroundColor);

                $('#btnBold').removeClass('active');
                $('#btnUnderline').removeClass('active');
                $('#btnItalic').removeClass('active');

                if (elementProp.isBold()) {
                    $('#btnBold').addClass('active');
                }

                if (elementProp.isUnderline()) {
                    $('#btnUnderline').addClass('active');
                }

                if (elementProp.isItalic()) {
                    $('#btnItalic').addClass('active');
                }

                //elementProp.fixFontStyleBtns();

                $('#btnLeftAlign').removeClass('active');
                $('#btnCenterAlign').removeClass('active');
                $('#btnRightAlign').removeClass('active');

                switch (elementProp.getTextAlign()) {
                    case 'left':
                        $('#btnLeftAlign').addClass('active');
                        break;
                    case 'center':
                        $('#btnCenterAlign').addClass('active');
                        break;
                    case 'right':
                        $('#btnRightAlign').addClass('active');
                        break;
                }

                $('#pOpacitySlider').val((activeObject.opacity !== undefined ? activeObject.opacity : 1) * 100);

                //Hide everything not editable for Envelope
                if (orderVars.currentPage === 4) {
                    $('#textColor').hide();
                    $('#bgColor').hide();
                    $('#divTransparency').hide();
                    $('#textAlignBtns').hide();
                }
                break;
            }

            case appConfig.ImageClassType:
                //it is a coupon
                if (activeObject.ObjectType === 114 || activeObject.ObjectGroup === 'Coupon') {
                    //if (editor.activeAccordion !== 2 || !$('#divSideBarCoupon div.title:first').hasClass('active')) {
                    editor.activeAccordion = 2;
                    $('.ui.accordion').accordion('open', 2);
                    //}

                    $('#divTopDesignMsg').show();
                    $('#mnuElementProp').hide();

                    editor.showCouponButtons();
                    /*
                    $('#mnuCoupon').show();
                    $('#divBackCouponSelection').show();
                    */

                    elementProp.setBackCouponBtnActive();
                }
                else {
                    if (orderVars.membershiptype !== MembershipTypes.LifeWay) {
                        if (orderVars.currentPage == 2 && (activeObject.ObjectType == 7 || activeObject.ObjectName == "QRCodeWLogo")) {
                            templateElements.showLogoQR();
                        }
                    }

                    if (editor.activeAccordion !== 1 || !$('#divSideBarImg div.title:first').hasClass('active')) {
                        $('.ui.accordion').accordion('open', 1);
                    }

                    $('#pOpacitySlider').val((activeObject.opacity !== undefined ? activeObject.opacity : 1) * 100);
                }
                break;

            case 'circle':
            case 'rect':
            case 'ellipse':
            case 'line':
                if (editor.activeAccordion !== 3 || !$('#divSideBarShape div.title:first').hasClass('active')) {
                    $('.ui.accordion').accordion('open', 3);
                }

                if (orderVars.productType !== ProductTypes.EntrywayMat) {
                    $('#bgColor').show();
                    $('#pOpacitySlider').val((activeObject.opacity !== undefined ? activeObject.opacity : 1) * 100);
                }
                else {
                    $('#divTransparency').hide();
                }
                break;
        }

        this.colorTextBox();
    }

    setFrontCouponBtnActive(): void {
        //Set Active button
        // @ts-expect-error its works
        e5Canvas.canvas.forEachObject(function (object: TemplateObject) {
            if (object.ObjectGroup == 'FrontCoupon') {
                if (object.ObjectName === 'Offer Amount') {
                    if (object.text.includes("$", 0) || object.text.includes("%", 0)) {
                        $("#btnDefaultCoupon").addClass('active');
                    }
                    else if (object.text.includes('Call Today')) {
                        $("#btnUseCallToday").addClass('active');
                    }
                    else if (object.text.includes('6 Months')) {
                        $("#btnUseSixMonths").addClass('active');
                    }
                    else if (object.text.includes('1 Year')) {
                        $("#btnUseOneYear").addClass('active');
                    }
                }
            }
        });
    }

    //Set Active button
    setBackCouponBtnActive(): void {
        const objs: TemplateObject[] = e5Canvas.getObjects();

        for (const object of objs) {
            if (object.ObjectGroup == 'Coupon') {
                //Check if logo
                if (object.ObjectName == '(L)') {
                    if (object.visible) {
                        $('#btnUseLogoCoupon').addClass('active');
                        orderVars.currentCouponSize = 'Logo';
                        return;
                    }
                }

                //Check if large coupon
                if (object.ObjectName == 'LargeCoupon') {
                    if (object.visible) {
                        $('#btnUseOneCoupon').addClass('active');
                        orderVars.currentCouponSize = 'L';
                        return;
                    }
                }

                //Check if small coupons
                if (object.ObjectName == 'SmallCoupon1' || object.ObjectName == 'SmallCoupon2') {
                    if (object.visible) {
                        $('#btnUseTwoCoupons').addClass('active');
                        orderVars.currentCouponSize = 'S';
                        return;
                    }
                }
            }
        }
    }

    colorTextBox(): void {
        const activeObject = e5Canvas.getActiveObject();

        if (activeObject === undefined) {
            return;
        }

        $('#divSideBar input[type=text], textarea').each(function () {
            $(this).css({ 'border-color': '', 'box-shadow': '' });
        });

        const txtID = '#' + activeObject.ObjectGroup + '_' + activeObject.ID;
        $(txtID).css({ 'border-color': '#719ECE', 'box-shadow': '0 0 10px #719ECE' });
    }

    isLinethrough(): boolean {
        return (<string>elementProp.getActiveStyle('textDecoration')).indexOf('linethrough') > -1;
    }

    isOverline(): boolean {
        return (<string>elementProp.getActiveStyle('textDecoration')).indexOf('overline') > -1;
    }

    isBold(): boolean {
        return elementProp.getActiveStyle('fontWeight') === 'bold';
    }

    isItalic(): boolean {
        return elementProp.getActiveStyle('fontStyle') === 'italic';
    }

    isUnderline(): boolean {
        return elementProp.getActiveStyle('underline') === true;
    }

    toggleBold(): void {
        elementProp.setActiveStyle('fontWeight', elementProp.getActiveStyle('fontWeight') === 'bold' ? '' : 'bold');
    }

    toggleItalic(): void {
        elementProp.setActiveStyle('fontStyle', elementProp.getActiveStyle('fontStyle') === 'italic' ? '' : 'italic');
    }

    toggleUnderline(): void {
        const value = elementProp.isUnderline() ?
            (<string>elementProp.getActiveStyle('textDecoration')).replace('underline', '') :
            elementProp.getActiveStyle('textDecoration') + ' underline';

        elementProp.setActiveStyle('textDecoration', value);
        elementProp.setActiveStyle('underline', !elementProp.getActiveStyle('underline'));
    }

    getTextAlign(): string {
        return elementProp.getActiveProp('textAlign');
    }

    setTextAlign(value: string): void {
        elementProp.setActiveProp('textAlign', value.toLowerCase());
    }

    getFontSize(): number {
        let fontSize: number = <number>elementProp.getActiveStyle('fontSize');
        fontSize = e5Canvas.getFontSize(fontSize);
        return fontSize;
    }

    setFontSize(value: number): void {
        value = <number>e5Canvas.setFontSize(value);
        this.setActiveStyle('fontSize', value);
    }

    getFontFamily(): string {
        let value: string = <string>this.getActiveStyle('fontFamily');

        if (value === '') {
            const activeObject = e5Canvas.getActiveObject();
            value = activeObject.fontFamily;
        }

        return value;
    }

    fixFontName(value: string): string {
        value = value.toLowerCase().split(' ').map(function (s) {
            return s.charAt(0).toUpperCase() + s.substring(1);
        }).join(' ');

        return value;
    }

    setFontFamily(value: string, text: string): void {
        //Check font is loaded
        const font = new FontFaceObserver(value);
        font.load().then(function () {
            e5Canvas.canvas.renderAll();
        });

        //Now set the font to the object
        elementProp.setActiveStyle('fontFamily', value, e5Canvas.getActiveObject(), true);
        $('#pFontFamily').dropdown('set text', text);
        $('.fntName').css('font-family', value);

        elementProp.fixFontStyleBtns();
    }

    hideMsg(val: boolean): void {
        if (val === true) {
            $('#divTopDesignMsg').hide();
            $('#mnuElementProp').show();
            editor.hideCouponButtons();
        }
        else {
            $('#divTopDesignMsg').show();
            $('#mnuElementProp').hide();
            $('#divBackLogoQRSelection').hide();
            //$('#mnuCoupon').hide();
            editor.hideCouponButtons();

            if (e5Canvas.AdvMode) {
                $('#TopMenuMsg').html('<b>Select an object on the card below to edit. | Or click add new text or image buttons above</b>');
            }
            else {
                if (!editor.advEditAllowed()) {
                    $('#TopMenuMsg').html('<b>Change Images or Text using left box.</b>');
                }
                else {
                    $('#TopMenuMsg').html('<b>Change Images or Text using left box.<br/>Or click "Advanced Editing" to add new text, image or move objects on card.</b>');
                }
            }
        }
    }

    /**
     * Shows or hides Adv Editor buttons
     * @param val if true it will show the Adv Buttons
     */
    advButtons(val: boolean): void {
        $('#btnAddText').hide();
        $('#btnAddImg').hide();
        $('#btnAddShape').hide();
        $('#btnAddCoupon').hide();
        $('#AdvSpacer').hide();

        if (val === true) {
            $('#btnAddText').show();
            $('#btnAddImg').show();
            $('#btnAddShape').show();
            //$('#btnAddCoupon').show();
            $('#AdvSpacer').show();
        }
    }

    textEditMode(selectedObject: TemplateObject): void {
        selectedObject.off('selection:created');
        selectedObject.off('selection:changed').on('selection:changed', elementProp.onCursorChanged);
        //selectedObject.off('text:changed').on('text:changed', elementProp.onTextChanged);
    }

    /**
     * Update side bar on canvas text change
     */
    onTextChanged(): void {
        const activeObject = e5Canvas.getActiveObject();

        if (!activeObject.isEditing) {
            return;
        }

        const leftObj = $('#' + activeObject.ObjectGroup + '_' + activeObject.ID);
        leftObj.val(activeObject.text);
    }

    onCursorChanged(): void {
        const activeObject = e5Canvas.getActiveObject();

        if (!activeObject.isEditing) {
            return;
        }

        elementProp.update();
        /*
        var cursorLocation = activeObject.get2DCursorLocation();
        var thisStyle = activeObject.getCompleteStyleDeclaration(cursorLocation.lineIndex, cursorLocation.charIndex);
        elementProp.updateProperties(thisStyle);
        */
    }

    onObjectSelected(): void {
        this.hideMsg(true);
        this.update();

        if (e5Canvas.AdvMode) {
            e5Canvas.canvas.hoverCursor = 'move';
        }
    }

    /* Style functions */
    getActiveStyle(styleName: string, object?: TemplateObject): string | boolean | number {
        object = object || e5Canvas.getActiveObject();

        if (!object) {
            console.error('getActiveStyle: object not found!');
            return '';
        }

        let value = '';

        if (object.getSelectionStyles && object.isEditing) {
            if (object.selectionStart === object.selectionEnd) {
                value = object.getSelectionStyles(object.selectionStart, object.selectionStart + 1, true)[0][styleName] || '';
            }
            else {
                value = object.getSelectionStyles(object.selectionStart, object.selectionEnd, true)[0][styleName] || '';
            }
        }
        else {
            value = object.getSelectionStyles(0, 1, true)[0][styleName] || '';
            //value = object[styleName] || '';
            //value = object.get(styleName) || '';
        }

        //console.log('getActiveStyle: ' + styleName + ' = ' + value);
        return value;
    }

    /**
     * Sets styles for TemplateObject
     * @param styleName Name of the style to set
     * @param value     Value of the style to set
     * @param object    Template Object to set, if not passed then it will try to get active object
     * @param saveState Should you create an undo state
     */
    setActiveStyle(styleName: string, value: unknown, object?: TemplateObject, saveState?: boolean): void {
        object = object || e5Canvas.getActiveObject();

        if (saveState !== false) {
            saveState = true;
        }

        if (!object) {
            console.log('setActiveStyle: no object found!');
            return;
        }

        if (saveState) {
            object.saveState();
            editor.addMemoTransformCmd(object);
        }

        const oldAutoResize = object.autoFontSize;
        //If not in adv mode then force font to shrink
        if (!e5Canvas.AdvMode) {
            object.autoFontSize = true;
            //object.splitByGrapheme = true;
            object.allowCuttedWords = true;
            //activeObj.styles = {};
        }

        if (object.setSelectionStyles) {
            if (!object.isEditing) {
                object.selectionStart = 0;
                object.selectionEnd = object.text.length;
            }
            else if (styleName === 'fontWeight') {
                object.fontWeight = '';
            }

            //console.log('selection found, ', object.selectionStart, object.selectionEnd);
            const style = {};
            // @ts-expect-error i know
            style[styleName] = value;

            object.setSelectionStyles(style);

            //If everything is selected then change box as well.
            if (object.selectionStart === 0 && object.selectionEnd === object.text.length) {
                //console.log('everthing selected');
                // @ts-expect-error i know
                object[styleName] = value;
                // @ts-expect-error i know
                object.set(styleName, value);
            }
        }
        else {
            // @ts-expect-error i know
            object.set(styleName, value);
        }

        object.dirty = true;
        if (typeof object._clearCache !== "undefined") {
            object._clearCache();
        }
        if (typeof object.initDimensions !== "undefined") {
            object.initDimensions();
        }

        object.setCoords();
        //if (object.wrapText) {
        //  object.wrapText();
        //}

        e5Canvas.canvas.renderAll();
        e5Canvas.canvas.calcOffset();
        //elementProp.update();

        object.autoFontSize = oldAutoResize;
        object.allowCuttedWords = false;
        //object.splitByGrapheme = false;
    }

    getActiveProp(name: string): string {
        const object = e5Canvas.canvas.getActiveObject();

        if (!object) {
            return '';
        }

        // @ts-expect-error i know
        return object[name] || '';
    }

    setActiveProp(name: string, value: unknown, saveState?: boolean): void {
        const object: TemplateObject = e5Canvas.getActiveObject();

        if (saveState !== false) {
            saveState = true;
        }

        if (!object) {
            console.log('no object found!');
            return;
        }

        if (saveState) {
            object.saveState();
            editor.addMemoTransformCmd(object);
        }

        // @ts-expect-error really
        object.set(name, value).setCoords();

        e5Canvas.canvas.renderAll();
    }

    changeFontColor(foreColor: string): void {
        this.setActiveStyle('fill', foreColor);
    }

    changeBackgroundColor(color: string): void {
        const object = e5Canvas.canvas.getActiveObject();
        switch (object.type) {
            case 'circle':
            case 'rect':
            case 'ellipse':
                this.setActiveStyle('fill', color);
                break;
            case 'line':
                this.setActiveStyle('stroke', color);
                break;
            default:
                //Removed Text Background Color for now since it does not render in pdf yet.
                //if (!object.isEditing) {
                this.setActiveStyle('backgroundColor', color);
                //}
                //else {
                //  this.setActiveStyle('textBackgroundColor', color);
                //}
                break;
        }
    }

    changeShapeColor(foreColor: string): void {
        if (e5Canvas.canvas.getActiveObject().type === 'line') {
            this.setActiveStyle('stroke', foreColor);
        }

        this.setActiveStyle('fill', foreColor);
    }
}

export const elementProp = ElementProp.instance;