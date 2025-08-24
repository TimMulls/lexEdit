import { Document } from '../../interfaces/document';
import { Element } from '../../interfaces/element';
import { ImgObj, TemplateObject } from '../../interfaces/template';
import { elementProp } from '../../content/elementProp';
import { appConfig } from '../appConfig';
import { messages } from '../messages';
import { orderVars } from '../orderVars';
import { localStorage } from '../storage';
import { templateElements } from '../template/templateElements';
import { templateOrder } from '../template/templateOrder';
import { e5Canvas } from './e5Canvas';
import { editorZoom } from './editorZoom';
import { AddCmd, MemoTransformCmd, RemoveCmd } from './history';
import { imgEditor } from './imgEditor';
import { MembershipTypes } from "../../enums/MembershipTypes";
import { ProductTypes } from '../../enums/productTypes';
import { ImageTypes } from '../../enums/imageTypes';

import NProgress from 'nprogress';
import Swal from 'sweetalert2';
import WebFont from 'webfontloader';
import html2canvas from 'html2canvas';
import { EyeDrop, IEyeDropOptions } from '../misc/EyeDrop';
import '@fancyapps/fancybox';

/**
 * Main editor class
 */
class Editor {
    //Used for copy, paste functions
    public copiedObject: any;
    public copiedObjects: any;

    //Used for double click
    public timer: number;

    //Used to keep track of open accordian
    public activeAccordion: number;

    protected static _instance: Editor;

    public static get Instance(): Editor {
        return (this._instance = this._instance = new Editor());
    }

    private constructor() {
        console.log('started editor');
        this.copiedObject = undefined;
        this.copiedObjects = [];
        this.timer = 0;
        this.activeAccordion = -1;
    }

    init(): void {
        $('#lblVerMenu').text('ver: ' + appConfig.appVersion);
        editor.hideCouponButtons();
        //elementProp.init();
        $('#pageTabs .item').tab();

        $('.ui.accordion').accordion({
            onOpening: function () {
                editor.activeAccordion = this.index('.content');
            }
        });

        $('.ui.dropdown').dropdown();

        elementProp.advButtons(e5Canvas.AdvMode);
        $('#divArrange').hide();

        $('#divSideBarText .title').off().on('click', function (e) {
            if (editor.activeAccordion !== 0) {
                e5Canvas.canvas.discardActiveObject();
                e5Canvas.canvas.renderAll();
                e.stopPropagation();
                $('#divTemplateText input:text, #divTemplateText textarea').first().focus();
                e.preventDefault();
            }
        });

        $('#divSideBarImg .title').off().on('click', function (e) {
            if (editor.activeAccordion !== 1) {
                e5Canvas.canvas.discardActiveObject();
                e5Canvas.canvas.renderAll();
                e.stopPropagation();
                $("#divTemplateImgs img").first().triggerHandler('click');
                e.preventDefault();
            }
        });

        $('#divSideBarCoupon .title').off().on('click', function (e) {
            if (editor.activeAccordion !== 2) {
                e5Canvas.canvas.discardActiveObject();
                e5Canvas.canvas.renderAll();
                e.stopPropagation();

                $('.ui.accordion').accordion('open', 2);
                editor.activeAccordion = 2;

                if ($('#divTemplateCoupon').has('input:text').length || $('#divTemplateCoupon').has('textarea').length) {
                    $('#divTemplateCoupon input:text, #divTemplateCoupon textarea').first().focus();
                }
                else {
                    $('#btnSelectDiffCoupon').focus();
                    //$("#divTemplateCoupon img").first().triggerHandler('click');
                }

                e.preventDefault();
            }
        });

        $('#divSideBarShape .title').off().on('click', function (e) {
            if (editor.activeAccordion !== 3) {
                e5Canvas.canvas.discardActiveObject();
                e5Canvas.canvas.renderAll();
                e.stopPropagation();

                $("#divTemplateShapes .ui.button").first().triggerHandler('click');
                e.preventDefault();
            }
        });

        $('#tabFront').off().on('click', function () { editor.switchSides(1); });
        $('#tabInside').off().on('click', function () { editor.switchSides(3); });
        $('#tabBack').off().on('click', function () { editor.switchSides(2); });
        $('#tabEnvelope').off().on('click', function () { editor.switchSides(4); });

        $('#btnToggleFullScreen').off().on('click', function () { editor.toggleFullScreen(); });
        $('#btnToggleCutlines').off().on('click', function () { e5Canvas.toggleCutLines(); });
        $('#btnToggleGrid').off().on('click', function () { e5Canvas.toggleGrid(); });
        if (appConfig.isBeta) {
            $('#btnEyeDrop').off().on('click', function () { editor.EyeDropper(); })
        }
        else {
            $('btnEyeDrop').hide();
            $('#colors').hide();
        }

        $('#btnPrintPreview').off().on('click', function () { editor.showPrintPreview(); });
        $('#btnSaveTemplate').off().on('click', function () {
            editor.saveAndContinue(false, function () {
                e5Canvas.showGrid(appConfig.showGrid);
                e5Canvas.showCutLines(appConfig.showCutLines);
                editorZoom.zoomFit();
            });
        });

        $('#lnkAdvEdit').off().on('click', function () { editor.toggleAdvEdit(); });
        $('#btnToggleAdvEdit').off().on('click', function () { editor.toggleAdvEdit(); });
        $('#btnHelpKeys').off().on('click', function () { editor.showHelpKeys(); });

        $('#btnAddText').off().on('click', function () { templateElements.addText(); });
        $('#btnAddImg').off().on('click', function () { editor.showImgMan(); });
        $('#mAddCircle').off().on('click', function () { templateElements.addShape('Circle') });
        $('#mAddSquare').off().on('click', function () { templateElements.addShape('Square') });
        $('#mAddLine').off().on('click', function () { templateElements.addShape('Line') });

        $('#btnShowPrintPreview').off().on('click', function () { editor.showPrintPreview(); });

        $('#btnZoomIn').off().on('click', function () { editorZoom.zoomIn() });
        $('#btnZoomFit').off().on('click', function () { editorZoom.zoomFit() });
        $('#btnZoomOut').off().on('click', function () { editorZoom.zoomOut() });

        $('#btnNext').off().on('click', function () {
            $('#btnNext').prop('disabled', true).html('<font color="red"><b>Please wait...</b></font>');
            const val = editor.saveAndContinue(true, function () {
                if (val === false) {
                    $('#btnNext').prop('disabled', false).html('Done Editing');
                }
            });
        })

        const fullScreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'];
        fullScreenEvents.forEach(eventType => document.addEventListener(eventType, this.afterToggleFullScreen, false));

        $('#btnAllowNotification').off().on('click', function () {
            editor.askForNPerm();
        });

        $('#lblSplash').html('Loading fonts');
    }

    public askForNPerm(): void {
        Notification.requestPermission(function (result) {
            console.log("User choice", result);

            if (result !== "granted") {
                console.log("No notification permission granted!");
            } else {
                //configurePushSub();// Write your custom function that pushes your message
            }
        });
    }

    EyeDropper(): void {
        // Take "screenshot" using HTML2Canvas
        setTimeout(() => { this.InitEyeDropper(); }, 10);
    }

    InitEyeDropper() {
        const screenDiv = document.getElementById('lexEditorMain');

        if (!screenDiv) {
            return;
        }
        html2canvas(screenDiv, { scrollY: -window.scrollY }).then(function (canvas: HTMLCanvasElement) {
            //var imgData = canvas.toDataURL("image/png");
            canvas.style.position = 'absolute';
            canvas.style.top = '0px';
            canvas.style.left = '0px';
            canvas.style.display = 'inline';
            //canvas.style.opacity = '0';
            //canvas.style.zIndex = '-2147483647';

            screenDiv.classList.add('EyeDropCursor');
            screenDiv.appendChild(canvas);
            //$('#lexEditorMain').append(canvas);
            //document.body.appendChild(canvas);
            const eyeDropOptions: IEyeDropOptions = {
                onPreview: function (color: string) {
                    const previewDiv = $('#preview');
                    previewDiv.css('background-color', color);
                    previewDiv.text(color);
                },
                onSelect: function (color: string) {
                    const selectedDiv = $('#selected');
                    selectedDiv.css('background-color', color);
                    selectedDiv.text(color);
                }
            }

            const colorSampler: EyeDrop = new EyeDrop(canvas, eyeDropOptions);
            colorSampler.enable(true);
        });
    }
    hideCouponButtons(): void {
        $('#mnuCoupon').hide();
        $('#divFrontCouponSelection').hide();
        $('#divBackCouponSelection').hide();
    }

    showCouponButtons(): void {
        $('#divTopDesignMsg').hide();
        $('#mnuCoupon').hide();
        $('#divFrontCouponSelection').hide();
        $('#divBackCouponSelection').hide();

        if (orderVars.currentPage === 1) {
            $('#mnuCoupon').show();
            $('#divFrontCouponSelection').show();
            elementProp.setFrontCouponBtnActive();
        }
        else if (orderVars.currentPage === 2) {
            if (orderVars.productType !== ProductTypes.DoorHangers &&
                orderVars.productType !== ProductTypes.SmallDoorHangers &&
                orderVars.productType !== ProductTypes.MediumDoorHangers &&
                orderVars.productType !== ProductTypes.SelfMailers) {
                $('#mnuCoupon').show();
                $('#divBackCouponSelection').show();
                elementProp.setBackCouponBtnActive();
            }
        }        
    }

    loadFonts(): void {
        //Load Fonts
        //ToDo: Show loading and only load fonts needed.

        console.log('Fonts: ' + orderVars.loadedFonts);

        WebFont.load({
            custom: {
                families: orderVars.loadedFonts,
                urls: [appConfig.fontsCssFile]
            },
            loading: function () {
                $('#lblSplash').html('Loading fonts...');
            },
            fontloading: function (fontFamily: string, fontDescription: string) {
                console.log('Loading Font: ' + fontFamily + ' : ' + fontDescription);
                $('#lblSplash').html('Loading font: ' + fontFamily + ' : ' + fontDescription);
            },
            fontactive: function (fontFamily: string, fontDescription: string) {
                let fontStyle = '';

                switch (fontDescription) {
                    case 'i4':
                        fontStyle = ' text-decoration: underline;';
                        break;
                    case 'n7':
                        fontStyle = ' font-weight: bold;';
                        break;
                    case 'i7':
                        fontStyle = ' text-decoration: underline;font-weight: bold;';
                        break;
                }

                $('#lblSplash').html('<span style="font-family: ' + fontFamily + '; ' + fontStyle + '">Font loaded: ' + fontFamily + ' : ' + fontDescription + '</span>');
                $('#divFonts').append('<span style="font-family: ' + fontFamily + '; ' + fontStyle + '">' + fontFamily + ' : ' + fontDescription + '</span>');

                let addToDDL = true;
                $('#pFontFamily .menu > div').each(function () {
                    if ((this).getAttribute('data-value') == fontFamily.toLowerCase()) {
                        addToDDL = false;
                        return;
                    }
                })

                if (addToDDL) {
                    $('#pFontFamily .menu').append($('<div>').addClass('item').attr('data-value', fontFamily.toLowerCase()).attr('style', 'font-family:"' + fontFamily + '" !important; font-size:12pt !important;').text(fontFamily));
                }
            },
            fontinactive: function (font: string, fvd: string) {
                if (appConfig.isBeta) {
                    console.log('Could not load font: ' + font + ' : ' + fvd);
                }
                $('#lblSplash').html('Could not load font: ' + font + ' : ' + fvd);
            },
            inactive: function () {
                messages.Msg('All fonts failed loading..\n\rPlease contact support..');
                // Refresh entire page and try again after 2 secs
                setTimeout(function () {
                    location.reload();
                }, 2000);
            },
            active: function () {
                editor._sortList($('#pFontFamily .menu').children(), 'asc');

                $('#pFontFamily').dropdown('refresh');
                $('#lblSplash').html('Loading app...');
                editor.init2();
            }
        });
    }

    loadAllFonts(): void {
        console.log('All Fonts: ' + orderVars.allFonts);

        //Put all the fonts in the drop down now so user can still pick if loading
        orderVars.allFonts.forEach(function (fontFamily) {
            fontFamily = fontFamily.substr(0, fontFamily.indexOf(':'));
            let addToDDL = true;
            $('#pFontFamily .menu > div').each(function () {
                if ((this).getAttribute('data-value') == fontFamily.toLowerCase()) {
                    addToDDL = false;
                    return;
                }
            })

            if (addToDDL) {
                $('#pFontFamily .menu').append($('<div>').addClass('item').attr('data-value', fontFamily.toLowerCase()).attr('style', 'font-family:"' + fontFamily + '" !important; font-size:12pt !important;').text(fontFamily));
            }
        });

        editor._sortList($('#pFontFamily .menu').children(), 'asc');
        /*
        WebFont.load({
            custom: {
                families: orderVars.allFonts,
                urls: [appConfig.fontsCssFile]
            },
            loading: function () {
                //$('#lblSplash').html('Loading fonts...');
            },
            fontloading: function (fontFamily: string, fontDescription: string) {
                console.log('Loading Font: ' + fontFamily + ' : ' + fontDescription);
                //$('#lblSplash').html('Loading font: ' + fontFamily + ' : ' + fontDescription);
            },
            fontactive: function (fontFamily: string, fontDescription: string) {
                let fontStyle = '';

                switch (fontDescription) {
                    case 'i4':
                        fontStyle = ' text-decoration: underline;';
                        break;
                    case 'n7':
                        fontStyle = ' font-weight: bold;';
                        break;
                    case 'i7':
                        fontStyle = ' text-decoration: underline;font-weight: bold;';
                        break;
                }

                //$('#lblSplash').html('<span style="font-family: ' + fontFamily + '; ' + fontStyle + '">Font loaded: ' + fontFamily + ' : ' + fontDescription + '</span>');
                $('#divFonts').append('<span style="font-family: ' + fontFamily + '; ' + fontStyle + '">' + fontFamily + ' : ' + fontDescription + '</span>');

                let addToDDL = true;
                $('#pFontFamily .menu > div').each(function () {
                    if ((this).getAttribute('data-value') == fontFamily.toLowerCase()) {
                        addToDDL = false;
                        return;
                    }
                })

                if (addToDDL) {
                    $('#pFontFamily .menu').append($('<div>').addClass('item').attr('data-value', fontFamily.toLowerCase()).attr('style', 'font-family:"' + fontFamily + '" !important; font-size:12pt !important;').text(fontFamily));
                }
            },
            fontinactive: function (font: string, fvd: string) {
                if (appConfig.isBeta) {
                    console.log('Could not load font: ' + font + ' : ' + fvd);
                }
                $('#lblSplash').html('Could not load font: ' + font + ' : ' + fvd);
            },
            inactive: function () {
                messages.Msg('All fonts failed loading..\n\rPlease contact support..');
            },
            active: function () {
                editor._sortList($('#pFontFamily .menu').children(), 'asc');

                $('#pFontFamily').dropdown('refresh');
            }
        });
        */
    }

    _sortList = function (list: any, ord: string) {
        const $parent = list.parent();
        if (ord.toLowerCase() == 'asc') {
            list.sort(asc_sort);
        } else {
            list.sort(desc_sort);
        }

        // ascending sort
        function asc_sort(a: any, b: any) {
            return ($(b).text()) < ($(a).text()) ? 1 : -1;
        }

        // descending sort
        function desc_sort(a: any, b: any) {
            return ($(b).text()) > ($(a).text()) ? 1 : -1;
        }

        list.appendTo($parent);
    }

    init2(): void {
        NProgress.set(0.25);
        //BUG::this is needed for a bug in the ipad ios7, height and width is just a bit off without it
        /*
         if (navigator.userAgent.match(/iPad;.*CPU.*OS 6_\d/i) && window.innerHeight !== document.documentElement.clientHeight) {
         var fixViewportHeight = function () {
         document.documentElement.style.height = window.innerHeight + 'px';
         if (document.body.scrollTop !== 0) {
         window.scrollTo(0, 0);
         }
         }.bind(this);

         window.addEventListener('scroll', fixViewportHeight, false);
         window.addEventListener('orientationchange', fixViewportHeight, false);
         fixViewportHeight();

         document.body.style.webkitTransform = 'translate3d(0,0,0)';
         }
         */

        /*
         var setViewportHeight = (function(){
         function debounced(){
         document.documentElement.style.height = window.innerHeight + "px";
         if (document.body.scrollTop !== 0) {
         window.scrollTo(0, 0);
         }
         }
         var cancelable = null;

         return function(){
         cancelable && clearTimeout(cancelable);
         cancelable = setTimeout(debounced, 100);
         };

         //ipad safari
         if(/iPad/.test(navigator.platform) && /Safari/i.test(navigator.userAgent)){
         window.addEventListener("resize", setViewportHeight, false);
         window.addEventListener("scroll", setViewportHeight, false);
         window.addEventListener("orientationchange", setViewportHeight, false);
         setViewportHeight();
         }
         */

        // disable the default browser's context menu.
        $(document).on('contextmenu', function () {
            return false;
        });

        window.addEventListener('dragover', function (e: DragEvent) { e.preventDefault(); }, false);
        window.addEventListener('drop', function (e) { e.preventDefault(); }, false);
        document.body.addEventListener('drop', function (e) { e.preventDefault(); }, false);

        $(document).bind('fullscreenchange MSFullscreenChange mozfullscreenchange webkitfullscreenchange', function () {
            if (document.fullscreenElement ||
                (document as Document).webkitFullscreenElement ||
                (document as Document).mozFullScreenElement ||
                (document as Document).msFullscreenElement
            ) {
                let height = screen.height - 220;
                const sideBarHeight = screen.height - 160;
                if (e5Canvas.AdvMode) {
                    height = height - 60;
                }

                $('#canvasContainer').attr('style', 'height: ' + height + 'px !important;');

                $('#divSideBar').attr('style', 'height: ' + sideBarHeight + 'px !important; overflow: auto;');
            } else {
                $('#canvasContainer').attr('style', 'height: 525px !important');
                $('#divSideBar').attr('style', 'height: 580px !important; overflow: auto;');
            }
        });

        //Load the template
        this.getTemplateData(orderVars.orderNumber, orderVars.userId, orderVars.sessionId);

        //Set up canvas events
        this.SetupCanvasEvents();

        //Setup keyboard events
        document.onkeydown = this.onKeyDownHandler;

        elementProp.init();
        /*
        $.feedback({
            ajaxURL: appConfig.webAPIURL + 'SendFeedback',
            //html2canvasURL: '/lexEdit/scripts/vendor/feedback/html2canvas.js',
            html2canvasURL: '/lexEdit/scripts/app/screenshot.js',
            initButtonText: 'Send Feedback',
            //feedbackButton: '#tb_mnuTop_item_btnSendFeedback'
            feedbackButton: '#btnBottomFeedback'
        });
        */
        /*
         var s = document.createElement("script");
         s.type = "text/javascript";
         s.async = true;
         s.src = '//d2wy8f7a9ursnm.cloudfront.net/bugsnag-2.min.js';
         s.setAttribute('data-apikey', '2538a10bbe54e72d4be91ab8782d9d41');
         var x = document.getElementsByTagName('script')[0];
         x.parentNode.insertBefore(s, x);
         */
    }

    onKeyDownHandler(event: KeyboardEvent): any {
        //If in a text box then just allow the key press
        if (event.target && (event.target as Element).tagName) {
            const inputs = ['input', 'textarea', 'select'];

            if (inputs.indexOf((event.target as Element).tagName.toLowerCase()) > -1) {
                return event.keyCode;
            }
        }

        //console.log('Key Press: ' + (event.ctrlKey ? 'Ctrl' : '') + (event.keyCode !== '17' ? '+' + event.keyCode : ''));
        switch (event.keyCode) {
            case 8: //Prevent back button in browser
                event.preventDefault();
                break;
            case 37: //left arrow key
                if (editor.ableToShortcut()) {
                    event.preventDefault();
                    e5Canvas.moveObject('left', event.ctrlKey ? 10 : 1);
                }
                break;
            case 38: //up arrow key
                if (editor.ableToShortcut()) {
                    event.preventDefault();
                    e5Canvas.moveObject('up', event.ctrlKey ? 10 : 1);
                }
                break;
            case 39: //right arrow key
                if (editor.ableToShortcut()) {
                    event.preventDefault();
                    e5Canvas.moveObject('right', event.ctrlKey ? 10 : 1);
                }
                break;
            case 40: //down arrow key
                if (editor.ableToShortcut()) {
                    event.preventDefault();
                    e5Canvas.moveObject('down', event.ctrlKey ? 10 : 1);
                }
                break;
            case 46: //delete key
                if (editor.ableToShortcut()) {
                    editor.handleDelete();
                }
                break;
            /*
            case 65: //Select All (Ctrl+A)
                if (event.ctrlKey) {
                    event.preventDefault();
                    e5Canvas.canvas.selectAllObjects(event);
                }
                break;
            */
            case 67: // Copy (Ctrl+C)
                if (editor.ableToShortcut()) {
                    if (event.ctrlKey) {
                        event.preventDefault();
                        editor.copyObject();
                    }
                }
                break;
            case 83: //Save Design (Ctrl + S)
                if (event.ctrlKey) {
                    event.preventDefault();
                    editor.saveAndContinue(false, function () {
                        e5Canvas.showGrid(appConfig.showGrid);
                        e5Canvas.showCutLines(appConfig.showCutLines);
                        editorZoom.zoomFit();
                    });
                }
                break;
            case 86: // Paste (Ctrl+V)
                if (event.ctrlKey) {
                    event.preventDefault();
                    editor.pasteObject();
                }
                break;

            case 120: //F9 print preview (also way to swich to beta mode if ctrl and shift are pressed)
                if (event.ctrlKey && event.shiftKey) {
                    localStorage.set('betaMode', !appConfig.isBeta);
                    location.reload();
                }
                else {
                    editor.showPrintPreview();
                }
                break;
            case 121: //F10
                if (event.ctrlKey) {
                    Swal.fire({
                        title: 'LexEdit Version: ' + appConfig.appVersion
                    });
                }
                break;
            case 122: //F11 Full Screen
                event.preventDefault();
                editor.toggleFullScreen();
                break;
            case 187: // Zoom In (Ctrl+ +)
                if (event.ctrlKey) {
                    event.preventDefault();
                    editorZoom.zoomIn();
                    //$('#btnZoomIn').click();
                }
                break;

            case 189: // Zoom Out (Ctrl+ -)
                if (event.ctrlKey) {
                    event.preventDefault();
                    //$('#btnZoomOut').click();
                    editorZoom.zoomOut();
                }
                break;
            // Reset Zoom (Ctrl+ 0)
            case 45 || 48 || 96: // Ctrl+ 0 (numpad)
                if (editor.ableToShortcut()) {
                    if (event.ctrlKey) {
                        event.preventDefault();
                        $('#btnResetZoom').click();
                    }
                }
                break;
            case 112: //F1
                alert('put help here');
                event.preventDefault();
                break;
            default:
                // TODO
                break;
        }
    }

    public handleDelete(): void {
        //Don't allow delete if not in Adv mode
        if (!e5Canvas.AdvMode) {
            return;
        }

        //Delete here is for text object in Adv mode
        if (e5Canvas.getActiveObject().isEditing) {
            return;
        }

        //Don't allow anything to be deleted from envelope.
        if (orderVars.currentPage === 4) {
            return;
        }

        const activeObjects = e5Canvas.getActiveObjects();

        Swal.fire({
            title: 'Confirmation Needed',
            text: "Are you sure you want to delete this object from the template?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.value) {
                e5Canvas.canvas.discardActiveObject().requestRenderAll();
                activeObjects.forEach(function (obj: TemplateObject) {
                    e5Canvas.removeObject(obj, true);
                });
            }
        });
    }

    getTemplateData(orderNumber: number, userId: number, sessionId: string): void {
        //Reset canvasScale on order load
        e5Canvas.canvasScale = 1;

        NProgress.set(0.5);
        $('#lblSplash').html('Getting template data...');
        console.log('getTemplateData: orderNumber = ' + orderNumber + ', userId = ' + userId + ', sessionId = ' + sessionId);

        $.ajax({
            url: appConfig.webAPIURL + 'GetOrderData',
            type: 'GET',
            data: {
                orderNumber: orderNumber,
                userId: userId,
                sessionId: sessionId
            },
            contentType: 'application/json',
            success: function (result) {
                console.log('getTemplateData: ' + result);
                templateOrder.loadTemplateData(result);
            },
            error: function (request, _status, _error) {
                editor.reportError('getTemplateData', request.responseText);
            }
        });
    }

    SetupCanvasEvents(): void {
        /*
        var $contextMenu = $('#contextMenu');
        var $contextObject;

        $contextMenu.off().on('click', 'a', function (e) {
            e.preventDefault();
            var message = 'You clicked on the object number "' + $contextObject + '"\n';
            message += 'And selected the menu item "' + $(this).text() + '"';
            alert(message);
            $contextMenu.hide();
        });

        $(document).click(function () {
            $contextMenu.hide();
        });
        */

        //$('body').on('contextmenu', 'canvas', function (env) {
        //    //$rowClicked = $(this);
        //    var x = env.offsetX;
        //    var y = env.offsetY;
        //    $.each(e5Canvas.canvas._objects, function (i, e) {
        //        // e.left and e.top are the middle of the object use some 'math' to find the outer edges
        //        var d = <number>e.width * <number>e.scaleX / 2;
        //        var h = <number>e.height * <number>e.scaleY / 2;
        //        //var d = e.width / 2;
        //        //var h = e.height / 2;
        //        if (x >= (<number>e.left - d) && x <= (<number>e.left + d)) {
        //            if (y >= (<number>e.top - h) && y <= (<number>e.top + h)) {
        //                $contextObject = i;

        //                $.contextMenu({
        //                    selector: '.context-menu-one',
        //                    callback: function (key, options) {
        //                        var m = 'clicked: ' + key;
        //                        window.console && console.log(m) || alert(m);
        //                    },
        //                    items: {
        //                        'edit': { name: 'Edit', icon: 'edit' },
        //                        'cut': { name: 'Cut', icon: 'cut' },
        //                        'copy': { name: 'Copy', icon: 'copy' },
        //                        'paste': { name: 'Paste', icon: 'paste' },
        //                        'delete': { name: 'Delete', icon: 'delete' },
        //                        'sep1': '---------',
        //                        'quit': { name: 'Quit', icon: 'quit' }
        //                    }
        //                });

        //                $('.context-menu-one').on('click', function (e) {
        //                    console.log('clicked', this);
        //                });

        //                /*
        //                 //TODO show custom menu at x, y
        //                 $contextMenu.css({
        //                 display: 'block',
        //                 left: env.pageX,
        //                 top: env.pageY
        //                 });
        //                 */
        //                //return false; //in case the icons are stacked only take action on one.
        //            }
        //        }
        //    });

        //    //return false;
        //});

        //canvasGuidelines(window.fabric);
        //this.initCenteringGuidelines(e5Canvas.canvas);
        //this.initAligningGuidelines(e5Canvas.canvas);
        //lexEdit.editor.AligningGuidelines.initialize(e5Canvas.canvas);
        fabric.util.initGuides(e5Canvas.canvas);
        e5Canvas.canvas.calcOffset();

        $(window).resize(function () {
            e5Canvas.canvas.calcOffset();
            editorZoom.zoomFit();
        });
    }

    // CANVAS CENTER SNAPPING & ALIGNMENT GUIDELINES
    /**
     * Augments canvas by assigning to `onObjectMove` and `onAfterRender`.
     * This kind of sucks because other code using those methods will stop functioning.
     * Need to fix it by replacing callbacks with pub/sub kind of subscription model.
     * (or maybe use existing fabric.util.fire/observe (if it won't be too slow))
     */
    /*
    initCenteringGuidelines(canvas: fabric.Canvas) {
        let canvasWidth = canvas.getWidth(),
            canvasHeight = canvas.getHeight(),
            canvasWidthCenter = canvasWidth / 2,
            canvasHeightCenter = canvasHeight / 2,
            canvasWidthCenterMap:any = {},
            canvasHeightCenterMap:any = {},
            centerLineMargin = 4,
            centerLineColor = 'purple',
            centerLineWidth = 2,
            ctx = canvas.getSelectionContext(),
            viewportTransform: any;

        for (let i = canvasWidthCenter - centerLineMargin, len = canvasWidthCenter + centerLineMargin; i <= len; i++) {
            canvasWidthCenterMap[Math.round(i)] = true
        }

        for (let i = canvasHeightCenter - centerLineMargin, len = canvasHeightCenter + centerLineMargin; i <= len; i++) {
            canvasHeightCenterMap[Math.round(i)] = true
        }

        function showVerticalCenterLine() {
            showCenterLine(canvasWidthCenter + 0.5, 0, canvasWidthCenter + 0.5, canvasHeight)
        }

        function showHorizontalCenterLine() {
            showCenterLine(0, canvasHeightCenter + 0.5, canvasWidth, canvasHeightCenter + 0.5)
        }

        function showCenterLine(x1:number, y1:number, x2:number, y2:number) {
            ctx.save()
            ctx.strokeStyle = centerLineColor
            ctx.lineWidth = centerLineWidth
            ctx.beginPath()
            ctx.moveTo(x1 * viewportTransform[0], y1 * viewportTransform[3])
            ctx.lineTo(x2 * viewportTransform[0], y2 * viewportTransform[3])
            ctx.stroke()
            ctx.restore()
        }

        let isInVerticalCenter: boolean,
            isInHorizontalCenter: boolean;

        canvas.on('mouse:down', () => {
            isInVerticalCenter = isInHorizontalCenter = false;
            //this.centerLine_horizontal = "";
            //this.centerLine_vertical = "";
            //updateInfo()
            viewportTransform = canvas.viewportTransform
        })

        canvas.on('object:moving', function (e) {
            let object = e.target,
                objectCenter = object!.getCenterPoint(),
                // @ts-expect-error
                transform = canvas._currentTransform;

            if (!transform) {
                return;
            }

            isInVerticalCenter = Math.round(objectCenter.x) in canvasWidthCenterMap,
                isInHorizontalCenter = Math.round(objectCenter.y) in canvasHeightCenterMap

            if (isInHorizontalCenter || isInVerticalCenter) {
                // @ts-expect-error
                object.setPositionByOrigin(new fabric.Point((isInVerticalCenter ? canvasWidthCenter : objectCenter.x), (isInHorizontalCenter ? canvasHeightCenter : objectCenter.y)), 'center', 'center')
            }
        })

        canvas.on('before:render', function () {
            // @ts-expect-error
            canvas.clearContext(canvas.contextTop)
        })

        canvas.on('after:render', () => {
            if (isInVerticalCenter) {
                showVerticalCenterLine()
                //this.centerLine_horizontal = ""
                //this.centerLine_vertical = (canvasWidthCenter + 0.5) + ", " + 0 + ", " + (canvasWidthCenter + 0.5) + ", " + canvasHeight
            }

            if (isInHorizontalCenter) {
                showHorizontalCenterLine()
                //this.centerLine_horizontal = (canvasWidthCenter + 0.5) + ", " + 0 + ", " + (canvasWidthCenter + 0.5) + ", " + canvasHeight
                //this.centerLine_vertical = ""
            }

            //updateInfo();
        })

        canvas.on('mouse:up', function () {
            // clear these values, to stop drawing guidelines once mouse is up
            canvas.renderAll()
        })
    }

    // OBJECT SNAPPING & ALIGNMENT GUIDELINES
    initAligningGuidelines(canvas: fabric.Canvas) {
        let ctx = canvas.getSelectionContext(),
            aligningLineOffset = 5,
            aligningLineMargin = 4,
            aligningLineWidth = 2,
            aligningLineColor = 'lime',
            viewportTransform: any,
            verticalLines: any = [],
            horizontalLines: any = [];

        function drawVerticalLine(coords:any) {
            drawLine(
                coords.x + 0.5, coords.y1 > coords.y2 ? coords.y2 : coords.y1,
                coords.x + 0.5, coords.y2 > coords.y1 ? coords.y2 : coords.y1
            )
        }

        function drawHorizontalLine(coords:any) {
            drawLine(
                coords.x1 > coords.x2 ? coords.x2 : coords.x1, coords.y + 0.5,
                coords.x2 > coords.x1 ? coords.x2 : coords.x1, coords.y + 0.5
            )
        }

        function drawLine(x1: number, y1: number, x2: number, y2: number) {
            var originXY = fabric.util.transformPoint(new fabric.Point(x1, y1), canvas.viewportTransform as number[]),
                dimmensions = fabric.util.transformPoint(new fabric.Point(x2, y2), canvas.viewportTransform as number[]);

            ctx.save()
            ctx.lineWidth = aligningLineWidth
            ctx.strokeStyle = aligningLineColor
            ctx.beginPath()
            //console.log("x1 :" + x1)
            //console.log("viewportTransform[4] :" + viewportTransform[4])
            //console.log("zoom :" + zoom)
            ctx.moveTo(
                ((originXY.x)),
                ((originXY.y))
            )
            //console.log("-------")
            //console.log("x1 :" + x1)
            //console.log("viewportTransform[4] :" + viewportTransform[4])
            //console.log("zoom :" + zoom)
            //console.log("x :" + (x1 + canvas.viewportTransform[4]) * zoom)

            ctx.lineTo(
                ((dimmensions.x)),
                ((dimmensions.y))
            )
            ctx.stroke()
            ctx.restore()
        }

        function isInRange(value1:number, value2:number) {
            value1 = Math.round(value1)
            value2 = Math.round(value2)
            for (var i = value1 - aligningLineMargin, len = value1 + aligningLineMargin; i <= len; i++) {
                if (i === value2) {
                    return true
                }
            }
            return false;
        }

        canvas.on('mouse:down', function () {
            verticalLines.length = horizontalLines.length = 0;
            viewportTransform = canvas.viewportTransform;
            //zoom = canvas.getZoom()
        })

        canvas.on('object:moving', (e) => {
            verticalLines.length = horizontalLines.length = 0

            let activeObject = e.target!,
                canvasObjects = canvas.getObjects(), //.filter(obj => obj.myType == "box"),
                activeObjectCenter = activeObject.getCenterPoint(),
                activeObjectLeft = activeObjectCenter.x,
                activeObjectTop = activeObjectCenter.y,
                activeObjectBoundingRect = activeObject.getBoundingRect(),
                activeObjectHeight = activeObjectBoundingRect.height / viewportTransform[3],
                activeObjectWidth = activeObjectBoundingRect.width / viewportTransform[0],
                horizontalInTheRange = false,
                verticalInTheRange = false,
                // @ts-expect-error
                transform = canvas._currentTransform;

            if (!transform) {
                return;
            }

            // It should be trivial to DRY this up by encapsulating (repeating) creation of x1, x2, y1, and y2 into functions,
            // but we're not doing it here for perf. reasons -- as this a function that's invoked on every mouse move
            for (let i = canvasObjects.length; i--;) {
                if (canvasObjects[i] === activeObject) {
                    continue;
                }

                let objectCenter = canvasObjects[i].getCenterPoint(),
                    objectLeft = objectCenter.x,
                    objectTop = objectCenter.y,
                    objectBoundingRect = canvasObjects[i].getBoundingRect(),
                    objectHeight = objectBoundingRect.height / viewportTransform[3],
                    objectWidth = objectBoundingRect.width / viewportTransform[0]

                // snap by the horizontal center line
                if (isInRange(objectLeft, activeObjectLeft)) {
                    verticalInTheRange = true
                    verticalLines.push({
                        x: objectLeft,
                        y1: (objectTop < activeObjectTop)
                            ? (objectTop - objectHeight / 2 - aligningLineOffset)
                            : (objectTop + objectHeight / 2 + aligningLineOffset),
                        y2: (activeObjectTop > objectTop)
                            ? (activeObjectTop + activeObjectHeight / 2 + aligningLineOffset)
                            : (activeObjectTop - activeObjectHeight / 2 - aligningLineOffset)
                    })

                    activeObject.setPositionByOrigin(new fabric.Point(objectLeft, activeObjectTop), 'center', 'center');
                }

                // snap by the left edge
                if (isInRange(objectLeft - objectWidth / 2, activeObjectLeft - activeObjectWidth / 2)) {
                    verticalInTheRange = true
                    verticalLines.push({
                        x: objectLeft - objectWidth / 2,
                        y1: (objectTop < activeObjectTop)
                            ? (objectTop - objectHeight / 2 - aligningLineOffset)
                            : (objectTop + objectHeight / 2 + aligningLineOffset),
                        y2: (activeObjectTop > objectTop)
                            ? (activeObjectTop + activeObjectHeight / 2 + aligningLineOffset)
                            : (activeObjectTop - activeObjectHeight / 2 - aligningLineOffset)
                    })
                    activeObject.setPositionByOrigin(new fabric.Point(objectLeft - objectWidth / 2 + activeObjectWidth / 2, activeObjectTop), 'center', 'center')
                }

                // snap by the right edge
                if (isInRange(objectLeft + objectWidth / 2, activeObjectLeft + activeObjectWidth / 2)) {
                    verticalInTheRange = true
                    verticalLines.push({
                        x: objectLeft + objectWidth / 2,
                        y1: (objectTop < activeObjectTop)
                            ? (objectTop - objectHeight / 2 - aligningLineOffset)
                            : (objectTop + objectHeight / 2 + aligningLineOffset),
                        y2: (activeObjectTop > objectTop)
                            ? (activeObjectTop + activeObjectHeight / 2 + aligningLineOffset)
                            : (activeObjectTop - activeObjectHeight / 2 - aligningLineOffset)
                    })
                    activeObject.setPositionByOrigin(new fabric.Point(objectLeft + objectWidth / 2 - activeObjectWidth / 2, activeObjectTop), 'center', 'center')
                }

                // snap by the vertical center line
                if (isInRange(objectTop, activeObjectTop)) {
                    horizontalInTheRange = true;
                    horizontalLines.push({
                        y: objectTop,
                        x1: (objectLeft < activeObjectLeft)
                            ? (objectLeft - objectWidth / 2 - aligningLineOffset)
                            : (objectLeft + objectWidth / 2 + aligningLineOffset),
                        x2: (activeObjectLeft > objectLeft)
                            ? (activeObjectLeft + activeObjectWidth / 2 + aligningLineOffset)
                            : (activeObjectLeft - activeObjectWidth / 2 - aligningLineOffset)
                    })
                    activeObject.setPositionByOrigin(new fabric.Point(activeObjectLeft, objectTop), 'center', 'center')
                }

                // snap by the top edge
                if (isInRange(objectTop - objectHeight / 2, activeObjectTop - activeObjectHeight / 2)) {
                    horizontalInTheRange = true
                    horizontalLines.push({
                        y: objectTop - objectHeight / 2,
                        x1: (objectLeft < activeObjectLeft)
                            ? (objectLeft - objectWidth / 2 - aligningLineOffset)
                            : (objectLeft + objectWidth / 2 + aligningLineOffset),
                        x2: (activeObjectLeft > objectLeft)
                            ? (activeObjectLeft + activeObjectWidth / 2 + aligningLineOffset)
                            : (activeObjectLeft - activeObjectWidth / 2 - aligningLineOffset)
                    })
                    activeObject.setPositionByOrigin(new fabric.Point(activeObjectLeft, objectTop - objectHeight / 2 + activeObjectHeight / 2), 'center', 'center');
                }

                // snap by the bottom edge
                if (isInRange(objectTop + objectHeight / 2, activeObjectTop + activeObjectHeight / 2)) {
                    horizontalInTheRange = true
                    horizontalLines.push({
                        y: objectTop + objectHeight / 2,
                        x1: (objectLeft < activeObjectLeft)
                            ? (objectLeft - objectWidth / 2 - aligningLineOffset)
                            : (objectLeft + objectWidth / 2 + aligningLineOffset),
                        x2: (activeObjectLeft > objectLeft)
                            ? (activeObjectLeft + activeObjectWidth / 2 + aligningLineOffset)
                            : (activeObjectLeft - activeObjectWidth / 2 - aligningLineOffset)
                    })
                    activeObject.setPositionByOrigin(new fabric.Point(activeObjectLeft, objectTop + objectHeight / 2 - activeObjectHeight / 2), 'center', 'center')
                }
            }

            if (!horizontalInTheRange) {
                horizontalLines.length = 0
            }

            if (!verticalInTheRange) {
                verticalLines.length = 0
            }
        })

        canvas.on('mouse:wheel', (opt) => {
            verticalLines.length = horizontalLines.length = 0
        })

        canvas.on('before:render', function () {
            // @ts-expect-error
            canvas.clearContext(canvas.contextTop)
        })

        canvas.on('after:render', () => {
            for (let i = verticalLines.length; i--;) {
                drawVerticalLine(verticalLines[i])
            }
            for (let i = horizontalLines.length; i--;) {
                drawHorizontalLine(horizontalLines[i])
            }

            //this.alignmentLines_horizontal = JSON.stringify(horizontalLines, null, 4)
            //this.alignmentLines_vertical = JSON.stringify(verticalLines, null, 4)
            //updateInfo()

            // console.log("activeObject left edge x is: " + canvas.getActiveObject().left)

            //verticalLines.length = horizontalLines.length = 0

            canvas.calcOffset()
        })

        canvas.on('mouse:up', () => {
            //verticalLines.length = horizontalLines.length = 0
            canvas.renderAll()
            //this.alignmentLines_horizontal = horizontalLines
            //this.alignmentLines_vertical = verticalLines
            //updateInfo()
        })
    }
    */

    ableToShortcut(): boolean {
        const activeObject = e5Canvas.getActiveObject();

        if (activeObject && /text/.test(activeObject.type as string)) {
            if (activeObject.isEditing) {
                return false;
            }
        }
        /*
        if ($('#taText').is(':focus')) {
            return false;
        }
        */

        return true;
    }

    async changeImage(imgType?: string): Promise<void> {
        console.info('ChangeImage: ' + imgType);

        if (imgType === undefined) {
            imgType = ImageTypes.Logos;
        }

        if ($('#ImgMan').is(':visible')) {
            await this.hideImgMan();
            this.showImgMan(imgType);
        }
        else {
            this.showImgMan(imgType);
        }
    }

    showImgMan(imgType?: string): void {
        if (imgType === undefined) {
            imgType = ImageTypes.Logos;
        }

        if (imgType === ImageTypes.Coupons) {
            $('#divTemplateCoupon').hide();
            $('#divSelectDiffCoupon').show();
        }

        $('#canvasContainer').css({ 'overflow': 'hidden' });

        $('#ImgMan').height($('#canvasContainer').height() as number);

        $('#ImgMan').slideDown(500,
            function () {
                imgEditor.init().then(() => imgEditor.getImages(imgType));
            }
        );

        $('#btnNext').hide();
    }

    hideImgMan(): void {
        //$('#divTemplateCoupon').removeAttr("style");
        $('#divSelectDiffCoupon').hide();
        this.hideCropImg();
        $('#canvasContainer').css({ 'overflow': 'auto' });
        $('#ImgMan').slideUp(500);
        $('#btnNext').show();
    }

    hideCropImg(): void {
        $('#CropImage').slideUp(500);
    }

    hideCreateQRCode(): void {
        $('#divGenQRCode').slideUp(500);
    }

    advEditAllowed(): boolean {
        if (appConfig.DEBUG) {
            return true;
        }

        if (orderVars.membershiptype === 0 ||
            orderVars.membershiptype === MembershipTypes.JamesHardie ||
            orderVars.membershiptype === MembershipTypes.GAF ||
            orderVars.membershiptype === MembershipTypes.LPBuildsmart ||
            orderVars.membershiptype === MembershipTypes.LifeWay) {
            return false;
        }

        return true;
    }

    hideAdvEdit(): void {
        if (!this.advEditAllowed()) {
            $('#lnkAdvEdit').hide();
            $('#btnToggleAdvEdit').hide();
        }
    }

    toggleAdvEdit(goAdv?: boolean): void {
        if (goAdv === false) {
            $('#lnkAdvEdit').text('Go To Advanced Editing');
            $('#btnToggleAdvEdit').text('Go To Advanced Editing');
            goAdv = false;
        }
        else if (goAdv === true || $('#lnkAdvEdit').text() === 'Go To Advanced Editing') {
            $('#lnkAdvEdit').text('Exit Advanced Editing');
            $('#btnToggleAdvEdit').text('Exit Advanced Editing');
            goAdv = true;
        } else {
            $('#lnkAdvEdit').text('Go To Advanced Editing');
            $('#btnToggleAdvEdit').text('Go To Advanced Editing');
            goAdv = false;
        }

        e5Canvas.editMode(goAdv);
        $('#divArrange').toggle(goAdv);

        //ToDo: Make textboxs layers if go to Adv
        /*
        if (goAdv) {
            $('#divTemplateText input:text, #divTemplateText textarea').hide();
            $('div.textItem').addClass('sideBarAdv');
        }
        else {
            $('#divTemplateText input:text, #divTemplateText textarea').show();
            $('div.textItem').removeClass('sideBarAdv');
        }
        */

        //Resize screen if already in full screen mode
        if (document.fullscreenElement ||
            (document as Document).webkitFullscreenElement ||
            (document as Document).mozFullScreenElement ||
            (document as Document).msFullscreenElement
        ) {
            let height = screen.height - 220;

            //if (e5Canvas.AdvMode) {
            height = height - 60;
            //}

            $('#canvasContainer').attr('style', 'height: ' + height + 'px !important');
        }
    }

    toggleFullScreen(): void {
        // if already full screen; exit
        // else go fullscreen
        if (document.fullscreenElement ||
            (document as Document).webkitFullscreenElement ||
            (document as Document).mozFullScreenElement ||
            (document as Document).msFullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if ((document as Document).webkitExitFullscreen) {
                (document as Document).webkitExitFullscreen();
            } else if ((document as Document).mozCancelFullScreen) {
                (document as Document).mozCancelFullScreen();
            } else if ((document as Document).msExitFullscreen) {
                (document as Document).msExitFullscreen();
            } else {
                console.log('Fullscreen API is not supported.');
            }
        } else {
            const element = $('#lexEditorMain').get(0);
            if (element && element.requestFullscreen) {
                element.requestFullscreen();
            } else if ((element as Element).mozRequestFullScreen) {
                (element as Element).mozRequestFullScreen();
            } else if ((element as Element).webkitRequestFullscreen) {
                (element as Element).webkitRequestFullscreen((Element as any).ALLOW_KEYBOARD_INPUT);
            } else if ((element as Element).msRequestFullscreen) {
                (element as Element).msRequestFullscreen();
            }
        }
    }

    afterToggleFullScreen(): void {
        editorZoom.zoomFit(true);
        this.toggleAdvEdit(e5Canvas.AdvMode);
    }

    confirmExit(): string {
        return 'You have attempted to leave this page.  If you have made any changes to the fields without clicking the Save button, your changes will be lost.  Are you sure you want to exit this page?';
    }

    showLoading(msg: string, callBack: () => void): void {
        NProgress.start();

        $('#lblSplash').html(msg);

        if (typeof callBack === 'function') {
            $('#divStartLoad').fadeIn(500, function () {
                callBack();
            });
        }
        else {
            $('#divStartLoad').fadeIn(500);
        }
    }

    hideLoading(autoZoom: boolean): void {
        $('#lblSplash').html('');

        $('#divStartLoad').fadeOut(500, function () {
            if (autoZoom === true)
                editorZoom.zoomFit();
        });

        NProgress.done(true);
    }

    reportError(sErr: string, rErr: string): void {
        this.hideLoading(false);

        $('#divReportError').html(
            '<div class="ui modal noSelText">' +
            '   <div class="header">Something went wrong. Let us know about it.</div>' +
            '   <div class="content">' +
            '       <div class="ui warning message">Your work has been saved if possible.  Clicking "Report" will send us the report and refresh the application.</div>' +
            '       <div class="ui top attached tabular menu">' +
            '           <a class="item active" data-tab="report-tab">Report</a>' +
            '           <a class="item" data-tab="details-tab">Details</a>' +
            '       </div>' +
            '       <div class="ui bottom attached active tab segment" data-tab="report-tab">' +
            '       <div class="description">' +
            '           <div class="ui form">' +
            '               <div class="field">' +
            '                  <label>Enter any steps that might help to resolve issue faster.</label>' +
            '                  <textarea id="taErrorSteps" class="ui fluid"></textarea>' +
            '               </div>' +
            '               <div class="field">' +
            '                  <label>E-Mail:</label>' +
            '                   <input id="errEmail" type="email" placeholder="your@email.com">' +
            '               </div>' +
            '               <div class="ui label">Optionally enter your email address and we\'ll contact you when the problem is resolved</div>' +
            '           </div>' +
            '       </div>' +
            '       </div>' +
            '       <div class="ui bottom attached tab segment" data-tab="details-tab">' +
            '           <div class="ui message">' +
            '               <div class="header">' +
            '                   rErr' +
            '               </div>' +
            '               <p>' + sErr + ' | ' + rErr + '</p>' +
            '           </div>' +
            '       </div>' +
            '   </div>' +
            '   <div class="actions noSelText">' +
            '      <a id="btnSendBugReport" class="ui button positive">Report</button>' +
            '   </div>' +
            '</div>');

        $('.tabular.menu .item').tab();

        //ToDo: Add Error Reporting back in.
        /*
        $('#divReportError').modal({
            closable: false,
            onHidden: function () {
                var config = {
                    name: sErr,
                    innerException: '<br /><b>Steps:</b> ' + $('#taErrorSteps').val() + '<br/><b>EMail:</b> ' + $('#errEmail').val()
                };
                new ex.Exception(rErr, config).report();
                //window.onbeforeunload = null;
                //location.reload(true);
            }
        }).modal('show');
        */
    }

    checkCutLines(): void {
        const objects = e5Canvas.getObjects();
        const cutWidth = appConfig.cutLineWidth * e5Canvas.canvasScale;
        const canvasWidth = e5Canvas.canvas.getWidth() / e5Canvas.canvasScale;
        const canvasHeight = e5Canvas.canvas.getHeight() / e5Canvas.canvasScale;

        for (const i in objects) {
            if ((objects[i].selectable) && ($.inArray(objects[i].ResourceType, ['T', 'BT', 'I']) !== -1)) {
                objects[i].setCoords();

                const isInGroup = objects[i].group;
                const ow = objects[i].getWidth();
                const oh = objects[i].getHeight();
                const ot = Math.round(isInGroup ? isInGroup.top as number : objects[i].top as number); //objects[i].getTop();
                const ol = Math.round(isInGroup ? isInGroup.left as number : objects[i].left as number); //objects[i].getLeft();

                //Check top
                if (ot < cutWidth) {
                    console.log('TOP | object: ' + objects[i].ObjectName + ' | ot: ' + ot + ' | cutWidth: ' + cutWidth);
                    messages.Msg('Object ' + objects[i].ObjectName + ' TOP is outside Cut Lines!', 'Outside Cut');
                }

                //Check Right
                if ((ot + oh) > (canvasHeight - cutWidth)) {
                    console.log('BOTTOM | object: ' + objects[i].ObjectName + ' | ot: ' + ot + ' | oh: ' + oh + ' | cutWidth: ' + cutWidth + ' | canvasWidth: ' + canvasHeight);
                    messages.Msg('Object ' + objects[i].ObjectName + ' BOTTOM is outside Cut Lines!', 'Outside Cut');
                }

                //Check Left
                if (ol < cutWidth) {
                    console.log('LEFT | object: ' + objects[i].ObjectName + ' | ol: ' + ol + ' | cutWidth: ' + cutWidth);
                    messages.Msg('Object ' + objects[i].ObjectName + ' LEFT is outside Cut Lines!', 'Outside Cut');
                }

                //Check Right
                if ((ol + ow) > (canvasWidth - cutWidth)) {
                    console.log('RIGHT | object: ' + objects[i].ObjectName + ' | ol: ' + ol + ' | ow: ' + ow + ' | cutWidth: ' + cutWidth + ' | canvasWidth: ' + canvasWidth);
                    messages.Msg('Object ' + objects[i].ObjectName + ' RIGHT is outside Cut Lines!', 'Outside Cut');
                }
            }
        }
    }

    showPrintPreview(): void {
        this.saveAndContinue(false, function () {
            $.fancybox.close();
            $.fancybox.defaults.parentEl = '#canvasContainer';
            $.fancybox.defaults.buttons = ['close', 'zoom'];
            $.fancybox.open({
                src: appConfig.webAPIURL + '/GetProofImage?orderNumber=' + orderVars.orderNumber + '&pageNumber=' +
                    orderVars.currentPage + '&cutLines=' + orderVars.allowCutLines + '&portalID=' + orderVars.portalId + '&D=' + Date.now(),
                type: 'image',
                opts: {
                    afterClose: function () {
                        e5Canvas.showGrid(appConfig.showGrid);
                        e5Canvas.showCutLines(appConfig.showCutLines);
                        editorZoom.zoomFit();
                    }
                }
            });
        });
    }

    showHelpKeys(): void {
        Swal.fire('F9: Print Preview<br/>F11: Full Screen<br/>Ctrl++: Zoom In<br/>Ctrl--: Zoom Out<br/>');
    }

    loadSideBar(openAcc?: string, clickDefault?: boolean): void {
        //console.log((new Error).stack);

        if (clickDefault === undefined) {
            clickDefault = true;
        }

        templateOrder.wait(function () {
            $('#divTemplateImgs').empty();
            $('#divTemplateText').empty();
            $('#divTemplateShapes').empty();
            $('#divTemplateCoupon').empty();
            //$('#divTemplateCoupon').removeAttr("style");

            $('#divSideBarImg').hide();
            $('#divSideBarText').hide();
            $('#divSideBarShape').hide();
            $('#divSideBarCoupon').hide();

            editor.activeAccordion = -1;
            $('.ui.accordion').accordion('close', 0);
            $('.ui.accordion').accordion('close', 1);
            $('.ui.accordion').accordion('close', 2);
            $('.ui.accordion').accordion('close', 3);

            let coupon1ID = 0;
            let coupon2ID = 0;

            e5Canvas.canvas.renderAll().forEachObject(function (element: any, _index: number, _array: unknown) {
                const o: TemplateObject = element;
                const oType = o.ResourceType;
                const oSelectable = e5Canvas.isEditableObject(o);

                if (oType && oSelectable && o.visible) {
                    switch (oType.toUpperCase()) {
                        case 'BT':
                        case 'FC':
                        case 'T': {
                            let textVal = o.text;
                            if ($.trim(textVal).length <= 0) {
                                textVal = '{Enter your ' + o.ObjectName + ' here.}';
                            }

                            let textItem = "";

                            if (o.WordBreak) {
                                //Envelope Addressee
                                if (o.ObjectType === 151) {
                                    textItem = '<div class="textItem" onclick="lexEdit.selectObjectByID(' + o.ID + ');" ><span class="disOrd">' + o.DisplayOrder + '</span><b>' + o.ObjectName +
                                        '</b><div class="ui fluid input"><textarea id="' + o.ObjectGroup + '_' + o.ID +
                                        '" rows="5" style="width: 100%" onclick="this.focus();" readonly="readonly" onfocus="lexEdit.selectObjectByID(' + o.ID +
                                        ');" onkeyup="lexEdit.setTextByID(' + o.ID + ', this.value);" autocomplete="field' + Date.now() + '">' +
                                        textVal + '</textarea></div></div>';
                                }
                                else {
                                    textItem = '<div class="textItem" onclick="lexEdit.selectObjectByID(' + o.ID + ');" ><span class="disOrd">' + o.DisplayOrder + '</span><b>' + o.ObjectName +
                                        '</b><div class="ui fluid input"><textarea id="' + o.ObjectGroup + '_' + o.ID +
                                        '" rows="5" style="width: 100%" onfocus="lexEdit.selectObjectByID(' + o.ID +
                                        ');" onkeyup="lexEdit.setTextByID(' + o.ID + ', this.value);" autocomplete="field' + Date.now() + '">' +
                                        textVal + '</textarea></div></div>';
                                }
                            }
                            else {
                                textItem =
                                    '<div class="textItem" onclick="lexEdit.selectObjectByID(' + o.ID + ');"><span class="disOrd">' + o.DisplayOrder + '</span><b>' + o.ObjectName + '</b>' +
                                    '<div class="ui fluid input"><input id="' + o.ObjectGroup + '_' + o.ID + '" type="text" value="' + textVal +
                                    '" onkeydown="lexEdit.preventEnterKey(event);" onfocus="lexEdit.selectObjectByID(' + o.ID + ');" ' +
                                    ' onkeyup="lexEdit.setTextByID(' + o.ID + ', this.value);" autocomplete="field' + Date.now() + '" /> </div></div > ';
                            }

                            if (o.ObjectGroup == 'FrontCoupon') {
                                $('#divSideBarCoupon').show();
                                $('#divTemplateCoupon').append(textItem);
                            }
                            else {
                                $('#divSideBarText').show();
                                $('#divTemplateText').append(textItem);
                            }
                            break;
                        }
                        case 'S':
                            if (o.ObjectName !== 'Mat Color') {
                                $('#divSideBarShape').show();
                                $('#divTemplateShapes').append('<div class="textItem"><span class="disOrd">' + o.DisplayOrder + '</span><div class="ui button" id="' + o.ObjectGroup + '_' + o.ID + '" onclick="lexEdit.selectObjectByID(' + o.ID +
                                    ');">' + o.ObjectName + '</div></div>');
                            }
                            
                            break;
                        case 'C': {
                            $('#divSideBarCoupon').show();

                            const CImgObj = {
                                imgFull: appConfig.WebData + 'Coupons/' + o.text + '-100.png',
                                imgType: '',
                                selectable: true
                            }

                            if (o.ObjectName === 'LargeCoupon' ||
                                (orderVars.productType === ProductTypes.DoorHangers ||
                                    orderVars.productType === ProductTypes.SmallDoorHangers ||
                                    orderVars.productType === ProductTypes.MediumDoorHangers ||
                                    orderVars.productType === ProductTypes.SelfMailers)) {
                                CImgObj.imgFull = appConfig.WebData + 'Coupons/100000t.png';
                            }
                            else if (o.ObjectName === 'SmallCoupon1' || o.ObjectName === 'SmallCoupon2') {
                                CImgObj.imgFull = appConfig.WebData + 'Coupons/101101.png';
                            }

                            //templateElements.replaceImage(o, 100000, CImgObj.imgFull);

                            /*
                            templateOrder.addLoadingArray(CImgObj.imgFull);

                            let img = new Image();
                            img.onload = function () {
                                e5Canvas.canvas.set
                            }
                            // @ts-expect-error exists
                            fabric.Img.fromURL(CImgObj.imgFull, function (image: fabric.Img) {
                                e5Canvas.canvas.sendToBack(image);
                                e5Canvas.canvas.renderAll();
                                templateOrder.deleteLoadingArray(CImgObj.imgFull);
                            });
                            */

                            let couponDisplayOrder = o.DisplayOrder;

                            if (o.ObjectName.substr(-1, 1) == '1') {
                                coupon1ID = o.ID;
                                couponDisplayOrder = 100;
                            }
                            else if (o.ObjectName.substr(-1, 1) == '2') {
                                coupon2ID = o.ID;
                                couponDisplayOrder = 200;
                            }

                            let couponName = o.ObjectName;

                            if (coupon1ID > 0 || coupon2ID > 0) {
                                couponName = o.ObjectName.substr(5, o.ObjectName.length - 6) + ' ' + o.ObjectName.substr(-1, 1);
                            }

                            $('#divTemplateCoupon').append(
                                '<div style="padding-bottom: 5px" class="textItem"><span class="disOrd">' + couponDisplayOrder + '</span>' +
                                '  <b>' + couponName + '</b><br/>' +
                                '  <img style="height: 0px; width: 0px; float: left;" id="' + o.ObjectGroup + '_' + o.ID + '" src="' + CImgObj.imgFull + '" class="ui image"  onclick="lexEdit.selectObjectByID(' + o.ID + ');"/>' +
                                '  <div class="ui button float right" onclick="lexEdit.selectObjectByID(' + o.ID + '); lexEdit.changeImage(\'Coupon\');">Select Coupon</div>' +
                                '<br/><br/>' +
                                '<div id="divCoupon' + o.ID + '"></div><hr/></div>');
                            break;
                        }
                        case 'BC': {
                            let textVal = o.text;
                            if ($.trim(textVal).length <= 0) {
                                textVal = '{Enter your ' + o.ObjectName + ' here.}';
                            }

                            let classItem = 'textItem';

                            if (coupon1ID > 0 || coupon2ID > 0) {
                                classItem = 'subTextItem';
                            }

                            classItem = 'subTextItem';

                            if (o.WordBreak) {
                                $('#divCoupon' + o.LinkedObject).append('<div class="' + classItem + '"><span class="disOrd">' +
                                    o.top + '</span><b>' + o.ObjectName +
                                    '</b><div class="ui fluid input"><textarea id="' + o.ObjectGroup + '_' + o.ID +
                                    '" rows="5" style="width: 100%" onfocus="lexEdit.selectObjectByID(' + o.ID +
                                    ');" onkeyup="lexEdit.setTextByID(' +
                                    o.ID + ', this.value);">' + textVal + '</textarea></div></div>');
                            }
                            else {
                                $('#divCoupon' + o.LinkedObject).append('<div class="' + classItem + '"><span class="disOrd">' + o.top + '</span><b>' + o.ObjectName + '</b>' +
                                    '<div class="ui fluid input"><input id="' + o.ObjectGroup + '_' + o.ID + '" type="text" value="' + textVal +
                                    '" onkeydown="lexEdit.preventEnterKey(event);" onfocus="lexEdit.selectObjectByID(' + o.ID + ');"' +
                                    ' onkeyup="lexEdit.setTextByID(' + o.ID + ', this.value);" /> </div></div > ');
                            }
                            break;
                        }
                        case 'I': {
                            //Check to see if it is a coupon logo
                            if (o.ObjectGroup === 'Coupon') {
                                $('#divSideBarCoupon').show();

                                const CImgObj = {
                                    imgFull: appConfig.imgsURL,
                                    imgType: '',
                                    selectable: true
                                }

                                if (o.text === '' || o.text === '[Offer area]') {
                                    CImgObj.imgFull += 'Logos/M3/1.png?v=' + appConfig.appVersion;
                                }
                                else {
                                    editor.setImgObj(o.ObjectType, CImgObj);
                                    CImgObj.imgFull += o.text.toString().replace('\\', '/') + '-300.png';
                                }

                                $('#divTemplateCoupon').append(
                                    '<div style="padding-bottom: 5px" class="textItem"><span class="disOrd">' + o.DisplayOrder + '</span>' +
                                    '  <b>' + o.ObjectName + '</b><br/>' +
                                    '  <img style="height: 60px; float: left;" id="' + o.ObjectGroup + '_' + o.ID + '" src="' + CImgObj.imgFull + '" class="ui image"  onclick="lexEdit.selectObjectByID(' + o.ID + ');"/>' +
                                    '  <div class="ui button float right" onclick="lexEdit.selectObjectByID(' + o.ID + '); lexEdit.changeImage(\'Logos\');">Change</div>' +
                                    '<br/><br/><hr/>' +
                                    '</div>'
                                );

                                break;
                            }

                            //Not a coupon so go ahead and show image
                            $('#divSideBarImg').show();

                            const ImgObj = {
                                imgFull: appConfig.imgsURL,
                                imgType: '',
                                selectable: true
                            }

                            editor.setImgObj(o.ObjectType, ImgObj);

                            if (o.text === '') {
                                if (ImgObj.imgType === 'QRCodes') {
                                    ImgObj.imgFull += 'Default/1.png?v=' + appConfig.appVersion;
                                }
                                else if (ImgObj.imgType === 'Logos') {
                                    ImgObj.imgFull += 'M3/1.png?v=' + appConfig.appVersion;
                                }
                            }
                            else if (o.text === '[Offer area]' ||
                                o.text == 'Click here to add Coupon One' ||
                                o.text == 'Click here to add Coupon Two') {
                                //Quick Fix for coupons
                                break;
                                //imgFull += '../../Coupons/100000.png';
                                //orderObj.Text = '100000';
                            }
                            else {
                                if (o.text) {
                                    ImgObj.imgFull += o.text.toString().replace('\\', '/') + '-300.png';
                                }
                                else {
                                    console.error('Something wrong with Image: ' + o);
                                }
                            }

                            let imgTypeDisplay;

                            switch (ImgObj.imgType) {
                                case 'Signatures':
                                    imgTypeDisplay = 'Signature';
                                    break;
                                case 'PersonalPhotos':
                                    imgTypeDisplay = 'Personal Photo';
                                    break;
                                case 'QRCodes':
                                    imgTypeDisplay = 'QR Code';
                                    break;
                                case 'Logos':
                                    imgTypeDisplay = 'Logo';
                                    break;
                                case 'Artwork':
                                    imgTypeDisplay = 'Photo';
                                    break;
                                case 'OwnDesigns':
                                    imgTypeDisplay = 'Design';
                                    break;
                            }

                            $('#divTemplateImgs').append(
                                '<div style="padding-bottom: 5px" class="textItem">' +
                                '  <span class="disOrd">' + o.DisplayOrder + '</span>' +
                                '  <div style="font-weight: bold; padding-bottom: 5px;">' + o.ObjectName + '</div>' +
                                '  <img style="height: 100px; float: left;" id="' + o.ObjectGroup + '_' + o.ID + '" src="' + ImgObj.imgFull + '"  onclick="lexEdit.selectObjectByID(' + o.ID + ');"/>' +
                                '  <div class="ui button float right" onclick="lexEdit.selectObjectByID(' + o.ID + '); lexEdit.changeImage(\'' + ImgObj.imgType + '\');">Change ' + imgTypeDisplay + '</div>' +                                
                                '  <div>&nbsp;</div><hr />' +
                                '</div>'

                            );                            
                            break;
                        }
                    }
                }
            });

            $('.ui.accordion').accordion('refresh');

            if ($('#divSideBarText').is(':visible')) {
                const sortedArray = $('#divTemplateText .textItem').toArray().sort(function (a, b) {
                    return parseInt($(a).find('.disOrd').text(), 10) - parseInt($(b).find('.disOrd').text(), 10);
                });

                $('#divTemplateText').empty().append(sortedArray);
            }

            if ($('#divSideBarImg').is(':visible')) {
                const sortedArray = $('#divTemplateImgs .textItem').toArray().sort(function (a, b) {
                    return parseInt($(a).find('.disOrd').text(), 10) - parseInt($(b).find('.disOrd').text(), 10);
                });

                $('#divTemplateImgs').empty().append(sortedArray);
            }

            if ($('#divSideBarCoupon').is(':visible')) {
                const sortedArray = $('#divTemplateCoupon .textItem').toArray().sort(function (a, b) {
                    return parseInt($(a).find('.disOrd').text(), 10) - parseInt($(b).find('.disOrd').text(), 10);
                });

                $('#divTemplateCoupon').empty().append(sortedArray);
            }

            if ($('#divCoupon' + coupon1ID).length > 0) {
                const sortedArray = $('#divCoupon' + coupon1ID + ' .subTextItem').toArray().sort(function (a, b) {
                    return parseInt($(a).find('.disOrd').text(), 10) - parseInt($(b).find('.disOrd').text(), 10);
                });

                $('#divCoupon' + coupon1ID).empty().append(sortedArray);
            }

            if ($('#divCoupon' + coupon2ID).length > 0) {
                const sortedArray = $('#divCoupon' + coupon2ID + ' .subTextItem').toArray().sort(function (a, b) {
                    return parseInt($(a).find('.disOrd').text(), 10) - parseInt($(b).find('.disOrd').text(), 10);
                });

                $('#divCoupon' + coupon2ID).empty().append(sortedArray);
            }

            if ($('#divSideBarShape').is(':visible')) {
                const sortedArray = $('#divTemplateShapes .textItem').toArray().sort(function (a, b) {
                    return parseInt($(a).find('.disOrd').text(), 10) - parseInt($(b).find('.disOrd').text(), 10);
                });

                $('#divTemplateShapes').empty().append(sortedArray);
            }

            if ($('#divSideBarText').is(':visible') && (!openAcc || openAcc === 'Text')) {
                $('.ui.accordion').accordion('open', 0);
                editor.activeAccordion = 0;
                const firstBox = $('#divTemplateText input:text, #divTemplateText textarea').first();

                const firstBoxID = firstBox.attr('id')?.replace(/\D/g, '');
                const firstID = Number(firstBoxID);
                if (firstID) {
                    setTimeout(function () {
                        //firstBox.focus();
                        elementProp.selectObjectByID(firstID);
                    }, 500);
                }
            }
            else if ($('#divSideBarImg').is(':visible') && (!openAcc || openAcc === 'Img')) {
                $('.ui.accordion').accordion('open', 1);
                editor.activeAccordion = 1;

                if (clickDefault) {
                    setTimeout(function () {
                        $("#divTemplateImgs img").first().triggerHandler('click');
                    }, 500);
                }
            }
            else if ($('#divSideBarCoupon').is(':visible') && (!openAcc || openAcc === 'Coupon')) {
                editor.activeAccordion = 2;
                $('.ui.accordion').accordion('open', 2);

                if ($('#divTemplateCoupon').has('input:text').length || $('#divTemplateCoupon').has('textarea').length) {
                    const firstBox = $('#divTemplateCoupon input:text, #divTemplateCoupon textarea').first();

                    const firstBoxID = firstBox.attr('id')?.replace(/\D/g, '');
                    const firstID = Number(firstBoxID);
                    if (firstID) {
                        setTimeout(function () {
                            //firstBox.focus();
                            elementProp.selectObjectByID(firstID);
                        }, 1000);
                    }
                }
                else {
                    //$("#divTemplateCoupon img").first().triggerHandler('click');
                }
            }
            else if ($('#divSideBarShape').is(':visible') && (!openAcc || openAcc === 'Shape')) {
                $('.ui.accordion').accordion('open', 3);
                editor.activeAccordion = 3;
                $("#divTemplateShapes .ui.button").first().triggerHandler('click');
            }
        });
    }

    public setImgObj(objectType: number, imgObj: ImgObj): void {
        switch (objectType) {
            case 5: //Signatures
            case 42: //Signatures
                imgObj.imgType = 'Signatures';
                imgObj.imgFull += 'Signatures/';
                break;
            case 6://PersonalPhotos
                imgObj.imgType = 'PersonalPhotos';
                imgObj.imgFull += 'PersonalPhotos/';
                break;
            case 124: //QRCodes
                imgObj.imgType = 'QRCodes';
                imgObj.imgFull += 'QRCodes/';
                break;
            case 122: //Static Logo
                imgObj.selectable = false;
                imgObj.imgType = 'Logos';
                imgObj.imgFull += 'Logos/';
                break;
            case 7: //Logos
                imgObj.imgType = 'Logos';
                imgObj.imgFull += 'Logos/';
                break;
            case 103:
            case 57: //DesignPhotos
                imgObj.imgType = 'OwnDesigns';
                imgObj.imgFull += 'OwnDesigns/';
                break;
            case 123: //Artwork
                imgObj.imgType = 'Artwork';
                imgObj.imgFull += 'Artwork/';
                break;
            case 143: //Driving Map
                imgObj.imgType = 'Artwork';
                imgObj.imgFull += 'Artwork/';
                imgObj.selectable = false;
                break;
            default:
                imgObj.imgType = 'Unknown';
                imgObj.imgFull += 'Unknown Object Type: (' + objectType + ')';
                break;
        }
    }

    public setSideEdit(side: number): void {
        if (side === 2) {
            orderVars.backEdited = true;
            if ($('#tabInside').is(':hidden')) {
                orderVars.allSidesEdited = true;
            }
        }
        else if (side === 3) {
            orderVars.insideEdited = true;

            if ($('#tabBack').is(':hidden')) {
                orderVars.allSidesEdited = true;
            }
        }

        if (orderVars.backEdited && orderVars.insideEdited) {
            orderVars.allSidesEdited = true;
        }
    }

    getCurrentProductID(): number {
        switch (orderVars.currentPage) {
            case 1:
                return orderVars.frontTemplateID;
            case 2:
                return orderVars.backTemplateID;
            case 3:
                return orderVars.insideTemplateID;
            case 4:
                return orderVars.envelopeTemplateID;
        }

        return 0;
    }

    allowProof(): boolean {
        if (orderVars.allSidesEdited) {
            return true;
        }

        if (orderVars.currentPage === 1) {
            if ($('#tabBack').is(':hidden') && $('#tabInside').is(':hidden')) {
                return true;
            }
        }
        else if (orderVars.currentPage === 2) {
            if ($('#tabInside').is(':hidden') || orderVars.insideEdited) {
                return true;
            }
        }
        else if (orderVars.currentPage === 3) {
            if ($('#tabBack').is(':hidden') || orderVars.backEdited) {
                return true;
            }
        }

        return false;
    }

    /**
     * Saves all pages to the database
     * @param {Boolean} proof Should it go to the proof page after done
     * @param {function} callBack optional callback function, ignored if proof is set to true.
     * @returns {Boolean} false if not allowed to go to proof.
     */
    saveAndContinue(proof: boolean, callBack?: () => void): boolean {
        if (proof !== false) {
            proof = true;
        }

        if (proof === true) {
            if (!this.allowProof()) {
                messages.Msg('Please edit all sides of the card before continuing!', 'Edit All Sides');
                $('#btnNext').prop('disabled', false).html('Done Editing');
                return false;
            }
            window.onbeforeunload = null;
        }

        //this.showLoading('Saving. Please wait...', function () {
        e5Canvas.showGrid(false);
        e5Canvas.showCutLines(false);

        editorZoom.setCanvasZoom(1, function () {
            $('#divStartLoad').fadeIn(300, 'linear');

            NProgress.start();
            //didYouKnow.startTips();
            $('#lblSplash').html('Saving work...');

            //Remove background image before getting JSON, then put it back.
            const bgImg = e5Canvas.canvas.backgroundImage;
            e5Canvas.canvas.backgroundImage = '';

            const jsonData = JSON.stringify(e5Canvas.canvas.toDatalessJSON(appConfig.extraKeys));
            e5Canvas.canvas.backgroundImage = bgImg;

            console.log(jsonData);
            const productID = editor.getCurrentProductID();

            $('#lblSplash').html('Saving Page: ' + orderVars.currentPage);
            $.ajax({
                url: appConfig.webAPIURL + 'SaveData',
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
                    if (orderVars.backTemplateID === 0 || orderVars.currentPage === 4) {
                        if (proof === true) {
                            localStorage.clean();

                            let proofURL = '';

                            if (orderVars.marketingSeries) {
                                proofURL = appConfig.proofMarketingSeriesURL;
                            }
                            else if (orderVars.currentPage === 4) {
                                proofURL = appConfig.proofEnvURL;
                            }
                            else {
                                proofURL = appConfig.proofURL;
                            }

                            if (top!.location.search.length > 0) {
                                proofURL += top!.location.search;
                            }

                            top!.location.replace(proofURL);
                        }
                        else {
                            //didYouKnow.stopTips();
                            $('#divStartLoad').fadeOut(1600, 'linear');

                            if (typeof callBack === 'function') {
                                callBack();
                            }
                        }
                    }
                    else {
                        editor.finishContinue(proof, callBack);
                    }
                },
                error: function (request, status, error) {
                    console.log('Error: PageNumber: ' + orderVars.currentPage + ' jsonData: ' + jsonData, status);
                    editor.reportError(error, 'Error invoking the SaveData web method! ' + request.responseText);
                }
            });
        });
        //});

        return true;
    }

    insideContinue(side: number, proof: boolean, callBack?: () => void): void {
        console.log('insideContinue called');

        let jsonData, productID;

        //Inside does not exist so save back and be done
        if (side === 2) {
            console.log('saving back now');
            side = 2;
            jsonData = orderVars.backJSON;
            productID = orderVars.backTemplateID;
        }
        else if (side === 1) {
            console.log('saving front now');
            side = 1;
            jsonData = orderVars.frontJSON;
            productID = orderVars.frontTemplateID;
        }
        else {
            alert('do not know what to do');
        }

        $('#lblSplash').html('Now Saving Page: ' + side);
        NProgress.set(0.5);

        $.ajax({
            url: appConfig.webAPIURL + 'SaveData',
            type: 'POST',
            data: {
                jsonData: jsonData,
                orderNumber: orderVars.orderNumber,
                sessionID: orderVars.sessionId,
                pageNumber: side,
                productID: productID
            },
            success: function (result) {
                console.log('Save Result: ' + result);

                if (proof === true) {
                    localStorage.clean();
                    
                    let proofURL = appConfig.proofURL;
                    if (top!.location.search.length > 0) {
                        proofURL += top!.location.search;
                    }

                    top!.location.replace(proofURL);
                }
                else {
                    editorZoom.zoomFit();
                    //didYouKnow.stopTips();
                    $('#divStartLoad').fadeOut(1600, 'linear');

                    if (typeof callBack === 'function') {
                        callBack();
                    }
                }
            },
            error: function (request, status, err) {
                console.log('something went wrong', status, err);
                messages.Msg('Error invoking the web method! ' + request.responseText, 'SaveData');
            }
        });
    }

    finishContinue(proof: boolean, callBack?: () => void): void {
        console.log('finishContinue called. Proof = ' + proof + ' currentPage = ' + orderVars.currentPage);
        let side: number;
        let jsonData: string;
        let productID: number;
        let needToSave: number;

        if (orderVars.currentPage === 4) {
            side = 4;
            jsonData = orderVars.envelopeJSON;
            productID = orderVars.envelopeTemplateID;
            needToSave = 0;
        }
        else if (orderVars.insideTemplateID <= 0) { //Inside does not exist then save other side and be done
            side = orderVars.currentPage === 1 ? 2 : 1;
            jsonData = side === 2 ? orderVars.backJSON : orderVars.frontJSON;
            productID = side === 2 ? orderVars.backTemplateID : orderVars.frontTemplateID;
            needToSave = 0; //lexEdit.currentPage;
        }
        else if ((orderVars.currentPage === 2 || orderVars.currentPage === 1) && orderVars.insideTemplateID > 0) {
            console.log('saving inside now');
            side = 3;
            jsonData = orderVars.insideJSON;
            productID = orderVars.insideTemplateID;
            needToSave = (orderVars.currentPage === 1) ? 2 : 1;
            console.log('need to save: ' + needToSave);
        }
        else if (orderVars.currentPage === 3) {
            console.log('saving front now');
            side = 1;
            jsonData = orderVars.frontJSON;
            productID = orderVars.frontTemplateID;
            needToSave = 2;
        }
        else {
            alert('Does not meet anything something happened');
            return;
        }

        $('#lblSplash').html('Now Saving Page: ' + side);
        console.log('Now Saving Page: ' + side);
        NProgress.set(0.5);

        $.ajax({
            url: appConfig.webAPIURL + 'SaveData',
            type: 'POST',
            data: {
                jsonData: jsonData,
                orderNumber: orderVars.orderNumber,
                sessionID: orderVars.sessionId,
                pageNumber: side,
                productID: productID
            },
            success: function (result) {
                console.log('Save Result: ' + result);
                console.log('needToSave: ' + needToSave);
                if (needToSave > 0) {
                    console.log('Continuing to save page: ' + needToSave);
                    editor.insideContinue(needToSave, proof, callBack);
                }
                else {
                    if (proof === true) {
                        $('#lblSplash').html('Creating Proof');
                        localStorage.clean();

                        let proofURL = '';

                        if (orderVars.marketingSeries) {
                            proofURL = appConfig.proofMarketingSeriesURL;
                        }
                        else if (orderVars.currentPage === 4) {
                            proofURL = appConfig.proofEnvURL;
                        }
                        else {
                            proofURL = appConfig.proofURL;
                        }

                        if (top!.location.search.length > 0) {
                            proofURL += top!.location.search;
                        }

                        top!.location.replace(proofURL);

                    }
                    else {
                        editorZoom.zoomFit();
                        $('#divStartLoad').fadeOut(1600, 'linear');

                        if (typeof callBack === 'function') {
                            callBack();
                        }
                    }
                }
            },
            error: function (request, status, err) {
                console.log('something went wrong', status, err);
                messages.Msg('Error invoking the web method! ' + request.responseText, 'SaveData');
            }
        });
    }

    switchSides(side: number): void {
        this.setSideEdit(side);

        //For now Envelope is by it self so never switch.
        if (side === 4) {
            //Just ignore the click.
            return;
        }

        $('ui.accordion').accordion('destroy');

        this.showLoading('Switching sides. Please wait...', function () {
            editor.hideImgMan();
            e5Canvas.showGrid(false);
            e5Canvas.showCutLines(false);

            editorZoom.setCanvasZoom(1, function () {
                if (side === 1) {
                    $('#pageTabs').find('.item').tab('change tab', 'front');
                    if (orderVars.currentPage === 1) {
                        orderVars.frontJSON = e5Canvas.getJSON();
                        localStorage.set('frontJSON', orderVars.frontJSON);

                        e5Canvas.showGrid(appConfig.showGrid);
                        e5Canvas.showCutLines(appConfig.showCutLines);
                        editor.hideLoading(true);
                        return;
                    }

                    if (orderVars.currentPage === 2) {
                        orderVars.backJSON = e5Canvas.getJSON();
                        localStorage.set('backJSON', orderVars.backJSON);
                    }
                    else if (orderVars.currentPage === 3) {
                        orderVars.insideJSON = e5Canvas.getJSON();
                        localStorage.set('insideJSON', orderVars.insideJSON);
                    }

                    orderVars.currentPage = 1;

                    e5Canvas.canvas.clear();

                    templateOrder.loadBackgroundImage('front', function () {
                        e5Canvas.canvas.loadFromJSON(orderVars.frontJSON, function () {
                            editor.loadSideBar();
                            e5Canvas.showGrid(appConfig.showGrid);
                            e5Canvas.showCutLines(appConfig.showCutLines);
                            e5Canvas.memo.clear();
                            e5Canvas.setCanvasSelection();
                            editor.hideLoading(true);
                        });
                    });
                }
                else if (side === 2) {
                    $('#pageTabs').find('.item').tab('change tab', 'back');
                    if (orderVars.currentPage === 2) {
                        orderVars.backJSON = e5Canvas.getJSON();
                        localStorage.set('backJSON', orderVars.backJSON);

                        e5Canvas.showGrid(appConfig.showGrid);
                        e5Canvas.showCutLines(appConfig.showCutLines);
                        editorZoom.zoomFit();
                        e5Canvas.setCanvasSelection();
                        editor.hideLoading(false);
                        return;
                    }

                    if (orderVars.currentPage === 1) {
                        orderVars.frontJSON = e5Canvas.getJSON();
                        localStorage.set('frontJSON', orderVars.frontJSON);
                    }
                    else if (orderVars.currentPage === 3) {
                        orderVars.insideJSON = e5Canvas.getJSON();
                        localStorage.set('insideJSON', orderVars.insideJSON);
                    }

                    orderVars.currentPage = 2;
                    e5Canvas.canvas.clear();

                    e5Canvas.canvas.loadFromJSON(orderVars.backJSON, function () {
                        templateOrder.loadBackgroundImage('back', function () {
                            e5Canvas.canvas.renderAll();
                            $('#lblFaceEdit').text('Editing Back');

                            e5Canvas.memo.clear();
                            editorZoom.zoomFit();
                            editor.loadSideBar();
                            e5Canvas.showGrid(appConfig.showGrid);
                            e5Canvas.showCutLines(appConfig.showCutLines);
                            e5Canvas.setCanvasSelection();
                            editor.hideLoading(true);
                        });
                    });
                }
                else if (side === 3) {
                    $('#pageTabs').find('.item').tab('change tab', 'inside');
                    if (orderVars.currentPage === 3) {
                        orderVars.insideJSON = e5Canvas.getJSON();
                        localStorage.set('insideJSON', orderVars.insideJSON);

                        e5Canvas.showGrid(appConfig.showGrid);
                        e5Canvas.showCutLines(appConfig.showCutLines);
                        e5Canvas.setCanvasSelection();
                        editorZoom.zoomFit();
                        editor.hideLoading(false);
                        return;
                    }

                    if (orderVars.currentPage === 1) {
                        orderVars.frontJSON = e5Canvas.getJSON();
                        localStorage.set('frontJSON', orderVars.frontJSON);
                    }
                    else if (orderVars.currentPage === 2) {
                        orderVars.backJSON = e5Canvas.getJSON();
                        localStorage.set('backJSON', orderVars.backJSON);
                    }

                    orderVars.currentPage = 3;

                    e5Canvas.canvas.clear();
                    templateOrder.loadBackgroundImage('inside', function () {
                        e5Canvas.canvas.loadFromJSON(orderVars.insideJSON, function () {
                            e5Canvas.showGrid(appConfig.showGrid);
                            e5Canvas.showCutLines(appConfig.showCutLines);

                            e5Canvas.memo.clear();
                            editorZoom.zoomFit();
                            editor.loadSideBar();
                            e5Canvas.showGrid(appConfig.showGrid);
                            e5Canvas.showCutLines(appConfig.showCutLines);
                            e5Canvas.setCanvasSelection();
                            editor.hideLoading(true);
                        });
                    });
                }
            });
        });
    }

    copyObject(): void {
        if (!e5Canvas.AdvMode) {
            return;
        }

        this.copiedObject = null;
        this.copiedObjects = [];
        const activeObjects = e5Canvas.canvas.getActiveObjects();

        if (activeObjects.length > 1) {
            // @ts-expect-error private function exists
            const group = e5Canvas.canvas._activeGroup();
            const items = group.objects;

            for (const i in items) {
                this.copiedObject = fabric.util.object.clone(items[i]);
                group._restoreObjectState(this.copiedObject);
                this.copiedObject.set('top', this.copiedObject.top + 5);
                this.copiedObject.set('left', this.copiedObject.left + 5);
                this.copiedObject.set('ID', '');
                this.copiedObjects[i] = this.copiedObject;
            }
        }
        else if (activeObjects.length > 0) {
            //this.copiedObject = fabric.util.object.clone(e5Canvas.getActiveObject());
            e5Canvas.getActiveObject().clone(function (clone: any) {
                console.log('Copy ID: ' + clone.ID);
                clone.set({
                    'ObjectName': 'Copy of ' + clone.ObjectName,
                    'top': clone.top + 5,
                    'left': clone.left + 5,
                    'ID': ''
                });

                editor.copiedObject = clone;
            }, ['ObjectName', 'ObjectType', 'ObjectGroup', 'ResourceType']);
        } else {
            messages.Msg('Nothing to copy', 'Copy', 'info');
        }
    }

    pasteObject(): void {
        if (this.copiedObjects.length > 0) {
            console.log('More than one thing to paste.');
            for (const i in this.copiedObjects) {
                this.copiedObjects[i].set('PageNumber', orderVars.currentPage);
                e5Canvas.canvas.add(this.copiedObjects[i]);
            }
        }
        else if (this.copiedObject) {
            console.log('Adding pasted object ID=' + this.copiedObject.ID);
            this.copiedObject.set('PageNumber', orderVars.currentPage);

            e5Canvas.addObject(this.copiedObject, true, true);
        } else {
            messages.Msg('Nothing to paste', 'Paste', 'info');
        }

        this.copiedObject = null;
        this.copiedObjects = [];

        e5Canvas.canvas.renderAll();
    }

    addMemoTransformCmd(obj: TemplateObject): void {
        e5Canvas.memo.add(new MemoTransformCmd(obj));
    }

    addMemoAddCmd(obj: TemplateObject): void {
        e5Canvas.memo.add(new AddCmd(obj));
    }

    removeMemoCmd(obj: TemplateObject): void {
        e5Canvas.memo.add(new RemoveCmd(obj));
    }
}

export const editor = Editor.Instance;