/*
 * LexEdit - HTML5 Template Editor
 * Copyright(c) 2010-2025 Lexinet Corporation.  All rights reserved.
 * Licensed under the Lexinet Commercial License. Unauthorized use is prohibited.
*/
'use strict';
import NProgress from 'nprogress';

import { appConfig } from './app/appConfig';
import { localStorage } from './app/storage';
import { editor } from './app/editor/editor';
import { messages } from './app/messages';
import { e5Canvas } from './app/editor/e5Canvas';
import { miscUtils } from './app/misc/miscUtils';
import { orderVars } from './app/orderVars';
import { elementProp } from './content/elementProp';
import { imgEditor } from './app/editor/imgEditor';
import { templateElements } from './app/template/templateElements';

declare global {
    interface Window {
        console: Console;
    }
}

export class LexEdit {
    constructor() {
        console.log('started LexEdit');
        console.log('BaseURL: ' + appConfig.baseURL);
    }

    public Start(): void {
        /*
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register(appConfig.lexEditURL + 'dist/service-worker.js').then(registration => {
                    // Registration was successful
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }).catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
            });
        }
        else {
            console.log('No service worker found!');
        }
        */

        /*
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
                try {
                    await navigator.serviceWorker.register(appConfig.lexEditURL + 'dist/sw.js', {
                        scope: appConfig.lexEditURL + 'dist/'
                    });

                    console.info('SW registered');
                } catch (error) {
                    console.error('SW registration failed: ' + error);
                }
            });
        }
        else {
            console.log('No service worker found!');
        }
        */

        editor.init();

        if (!localStorage.isSupported()) {
            alert('Local storage is not supported by your browser. Please disable "Private Mode", or upgrade to a modern browser.');
            return;
        }

        localStorage.clean();

        messages.initMessages();

        appConfig.isBeta = localStorage.get('betaMode', false);
        appConfig.DEBUG = localStorage.get('DebugMode', false);
        appConfig.showTextOutline = localStorage.get('showTextOutline', false);
        appConfig.showGrid = localStorage.get('showGrid', false);
        appConfig.showCutLines = localStorage.get('showCutLines', true);

        if (document.referrer) {
            //Check if in IFrame
            if (top!.location !== self.location) {
                localStorage.set('docReferrer', parent.document.referrer);
            }
            else {
                localStorage.set('docReferrer', document.referrer);
            }
        }

        //appConfig.baseURL = '//' + window.location.hostname + '/';

        //Fix images location for production
        //ToDo::Need to come up with a better way for this
        if ((window.location.hostname.toUpperCase().indexOf('M3TOOLBOX.COM') >= 0) ||
            (window.location.hostname.toUpperCase().indexOf('AGENTZMARKETING.COM') >= 0) ||
            (window.location.hostname.toUpperCase().indexOf('LEXINETPRINTS.COM') >= 0) ||
            (window.location.hostname.toUpperCase().indexOf('LEXINET.NET') >= 0) ||
            (window.location.hostname.toUpperCase().indexOf('LIFEWAYSTORES.COM') >= 0)) {
            appConfig.imgsURL = appConfig.WebData;
        }

        if (!appConfig.DEBUG) {
            //Don't display debug info to user
            const fooConsole = function (): void {
                //Do Nothing
            };

            window.console = ({
                debug: () => fooConsole,
                error: () => fooConsole,
                info: () => fooConsole,
                log: () => fooConsole,
                warn: () => fooConsole
            }) as unknown as Console;

            window.onbeforeunload = editor.confirmExit;
        }

        //Protect against a burst of exceptions
        /*
        ex.handler.guard(new ex.Guard()
            .protectAgainstBurst({ count: 10, seconds: 2 })
            .protectAgainst(function (o, exception) {
                o.DOMDump(false);
            }));

        ex.handler.reportCallback(afterErrReport);
        ex.handler.reportPost({ url: appConfig.webAPIURL + 'ReportError' });
        */

        const splashHtml =
            '<div class="splash">' +
            '  <div style="width: 100%;">' +
            '    <div id="lblSplashLoading">Please wait...</div> ' +
            '    <div id="lblSplashVer" style="display: none;">Ver:' + appConfig.appVersion + '</div> ' +
            '  </div>' +
            '  <div style="clear: both"></div>' +
            '  <div class="progress"> ' +
            '    <div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>' +
            '  </div>' +
            '  <div id="lblSplash">Starting editor...</div> ' +
            '</div>';

        NProgress.configure({
            trickle: false,
            template: splashHtml,
            parent: '#divStartLoad'
        });

        NProgress.start();
        this.loadView();

        //Auto Save Feature
        let idleTimeout: NodeJS.Timeout; // variable to hold the timeout

        const resetIdleTimeout = function (): void {
            // Clears the existing timeout
            if (idleTimeout) {
                clearInterval(idleTimeout);
            }

            // Set a new idle timeout to load the redirectUrl after idleDurationSecs
            idleTimeout = setInterval(function () {
                return editor.saveAndContinue(false, function () {
                    alert('Auto Saved Template');
                    console.log('Auto Saved ' + Date.now());
                    $('input').blur(); //Remove focus from inputs, not doing this will cause an error if they try to type when returning

                    e5Canvas.showGrid(appConfig.showGrid);
                    e5Canvas.showCutLines(appConfig.showCutLines);
                    resetIdleTimeout(); //Start the timer again
                });
            }, appConfig.AutoSaveDuration * 60 * 1000);
        };

        resetIdleTimeout();

        // Reset the idle timeout on any of the events listed below
        ['click', 'touchstart', 'mousemove', 'keydown'].forEach(function (evt) {
            return document.addEventListener(evt, resetIdleTimeout, false);
        });
    }

    public AppVersion(): string {
        return appConfig.appVersion;
    }

    loadView(): void {
        $('#lblSplash').html('Loading View...');
        $('#lblSplash').html('Checking for IPAD...');
        if (/iPad/.test(navigator.platform)) { //} && /Safari/i.test(navigator.userAgent)) {
            console.log('This is an IPAD');
            $('#lblSplash').html('IPAD Fixing Screen...');
            const fixViewportHeight = function (): void {
                document.documentElement.style.height = window.innerHeight + 'px';
                if (document.body.scrollTop !== 0) {
                    window.scrollTo(0, 0);
                }
            }.bind(this);

            window.addEventListener('scroll', fixViewportHeight, false);
            window.addEventListener('orientationchange', fixViewportHeight, false);
            fixViewportHeight();

            //ToDo: I don't know why this next line is here.  Look to see if it can be removed
            document.body.style.webkitTransform = 'translate3d(0,0,0)';

            // IOS >= 10 no longer supports fullscreen so no need for the following code
            /*
            if (!document.fullscreenElement && !document.msFullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement) {
                if (document.body.requestFullscreen) {
                    document.body.requestFullscreen();
                } else if (document.body.msRequestFullscreen) {
                    document.body.msRequestFullscreen();
                } else if (document.body.mozRequestFullScreen) {
                    document.body.mozRequestFullScreen();
                } else if (document.body.webkitRequestFullscreen) {
                    document.body.webkitRequestFullscreen();
                }
            }
            */
        }

        $('#lblSplash').html('Loading Order...');

        const enc: string = <string>$('#encURL').val();

        if (miscUtils.isNullOrWhiteSpace(enc)) {
            console.log('Error Loading Order');
            $('#lblSplash').html('Error Loading Order!');
            //lexEdit.editor.reportError('Order Not Found!', 'No Query String Found');
            return;
        }
        else {
            this.setOrderVariables(enc);
        }
    }

    setOrderVariables(enc: string): void {
        console.log('setOrderVariables');
        $.ajax({
            url: appConfig.webAPIURL + 'GetOrderVars',
            type: 'GET',
            data: { enc: enc },
            contentType: 'application/json',
            success: function (data, textStatus, jqXHR) {
                console.log('jqXHR: ' + jqXHR);
                console.log('textStatus: ' + textStatus);
                console.log('setOrderVar data: ' + data);

                if (data.length <= 0) {
                    alert('No Order Data');
                    return;
                }

                const jsonObj = JSON.parse(data); //  $.parseJSON(data);

                orderVars.orderNumber = jsonObj.OrderNumber;
                orderVars.userId = jsonObj.UserID;
                orderVars.portalId = jsonObj.PortalID;
                orderVars.membershiptype = jsonObj.MembershipType;
                orderVars.productType = jsonObj.ProductType;
                orderVars.sessionId = jsonObj.SessionID;
                orderVars.defaultSide = jsonObj.Side;
                orderVars.marketingSeries = jsonObj.MarketingSeries;
                orderVars.loadedFonts = jsonObj.LoadedFonts;
                orderVars.allFonts = jsonObj.AllFonts;

                localStorage.set('orderNumber', orderVars.orderNumber);
                localStorage.set('userId', orderVars.userId);
                localStorage.set('portalId', orderVars.portalId);
                localStorage.set('sessionId', orderVars.sessionId);
                localStorage.set('appVer', appConfig.appVersion);

                //Check for membershiptype and hide adv editor controls for membership types not allowed.
                editor.hideAdvEdit();

                if (orderVars.marketingSeries === true) {
                    //If Marketing Series remove buttons at bottom.
                    $('#divBottomBtns').hide();
                }

                editor.loadFonts();
                e5Canvas.init();
            },
            /*jqXHR jqXHR, String textStatus, String errorThrown */
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(appConfig.webAPIURL + 'GetOrderVars');
                console.log('Enc: ' + enc);
                console.log('textStatus: ' + textStatus);
                console.log('ErrorThrown: ' + errorThrown);

                //new ex.Exception('status code: '+jqXHR.status+' | errorThrown: ' + errorThrown + ' | jqXHR.responseText: ' + jqXHR.responseText).report();
                //alert('No Order Data');
                //return;
                console.log('status code: ' + jqXHR.status + ' | errorThrown: ' + errorThrown + '| responseText:' + jqXHR.responseText);
                const opts = {
                    title: 'GetOrderVars',
                    message: 'Error invoking the web method! ' + errorThrown
                };

                alert(opts);
            }
        });
    }

    //External functions to reach internal functions from rendered source
    //ToDo: try to refactor code so not as many of these functions are needed.
    public preventEnterKey(event: KeyboardEvent): boolean {
        return elementProp.preventEnterKey(event);
    }

    public selectObjectByID(id: number): void {
        elementProp.selectObjectByID(id);
    }

    public setTextByID(id: number, newText: string): void {
        elementProp.setTextByID(id, newText);
    }

    public selectCoupon(couponID: number): void {
        imgEditor.selectCoupon(couponID);
    }

    public selectImg(imgID: number, imgFull: string): void {
        imgEditor.selectImg(imgID, imgFull);
    }

    public editImgName(imgID: number, imgType: string): void {
        return imgEditor.editImgName(imgID, imgType);
    }

    public editImg(imgID: number, imgFull: string): void {
        imgEditor.editImg(imgID, imgFull);
    }

    public downloadImg(imgID: string): void {
        imgEditor.downloadImg(imgID);
    }

    public deleteImg(imgID: number, imgType: string): void {
        imgEditor.deleteImg(imgID, imgType);
    }

    public getImages(imgType: string): void {
        imgEditor.getImages(imgType);
    }

    public createQRCode(): void {
        imgEditor.createQRCode();
    }

    public hideCropImg(): void {
        editor.hideCropImg();
    }

    public changeImage(imgType?: string): void {
        editor.changeImage(imgType);
    }

    public addShape(shapeToAdd: string): void {
        templateElements.addShape(shapeToAdd);
    }

    public addText(): void {
        templateElements.addText();
    }

    public showImgMan(): void {
        editor.showImgMan();
    }

    public allowProof(): boolean {
        return editor.allowProof();
    }

    public Msg(msgStr: string): void {
        messages.Msg(msgStr);
    }

    public saveAndContinue(proof: boolean, callBack?: () => void): boolean {
        return editor.saveAndContinue(proof, callBack);
    }
    //End of External functions
}