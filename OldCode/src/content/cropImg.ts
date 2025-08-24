import { editor } from "../app/editor/editor";
import { e5Canvas } from "../app/editor/e5Canvas";
import { appConfig } from "../app/appConfig";
import { imgEditor } from "../app/editor/imgEditor";
import { orderVars } from "../app/orderVars";
import { TemplateObject } from "../interfaces/template";
import '../vendor/JCrop/css/jquery.Jcrop.css';
import '../vendor/JCrop/js/jquery.Jcrop.js';
import { MembershipTypes } from "../enums/MembershipTypes";

class CropImg {
    jcrop_api: any;
    imgID: number;
    defaultImg: boolean;

    constructor() {
        this.jcrop_api = null;
        this.imgID = 0;
        this.defaultImg = false;
    }

    init() {
        //if (!appConfig.isBeta) {
        $('#divDimensions').hide();
        $('#btnToolFlip').hide();
        $('#btnToolRotate').hide();
        $('#btnToolBW').hide();
        //}

        $('#btnHideCropImg').off().on('click', function () { editor.hideCropImg(); });
        $('#btnCropImg').prop('disabled', false);

        $('#btnCropImg').off('click').click(function (e) {
            $(this).prop('disabled', true);
            cropImg.cropImage();

            e.stopImmediatePropagation();
            return false;
        });
    }

    loadJCrop(imgFull: string, imgID: number, defaultImg: boolean) {
        $('#divKeepRatio').show();
        this.imgID = imgID;
        this.defaultImg = defaultImg;

        // Create variables (in this scope) to hold the Jcrop API and image size
        let imgWidth = 0;
        let imgHeight = 0;

        // destroy Jcrop if it is existed
        if ((typeof cropImg.jcrop_api !== 'undefined') && (cropImg.jcrop_api !== null)) {
            cropImg.jcrop_api.destroy();
        }

        const selectedObject = e5Canvas.getActiveObject();

        if (selectedObject !== null) {
            imgWidth = Math.round(selectedObject.getScaledWidth());
            imgHeight = Math.round(selectedObject.getScaledHeight());
            if (selectedObject.ImageAlign === 'IACROP') {
                if (orderVars.membershiptype !== MembershipTypes.LexinetPrints) {
                    $('#divKeepRatio').hide();
                }
            }

            $('#chkKeepRatio').prop('checked', (imgWidth / imgHeight) > 0);
        }

        const bWidth = <number>$('#ImgMan').innerWidth() - 50;
        const bHeight = <number>$('#ImgMan').innerHeight() - 150;

        // initialize Jcrop
        $('#imgCrop').Jcrop({
            minSize: [32, 32], // min crop size
            aspectRatio: (imgWidth / imgHeight), // keep aspect ratio 1:1
            bgFade: true, // use fade effect
            bgOpacity: 0.3, // fade opacity
            onChange: cropImg.updateInfo,
            onSelect: cropImg.updateInfo,
            //onRelease: clearInfo,
            //boxWidth: appConfig.leftWide - 10,
            //boxHeight: 400
            boxWidth: bWidth,
            boxHeight: bHeight
        }, function () {
            // Store the Jcrop API in the jcrop_api variable
            cropImg.jcrop_api = this;

            // use the Jcrop API to get the real image size
            //var bounds = cropImg.jcrop_api.getBounds();
            //var boundX: number = bounds[0];
            //var boundY: number = bounds[1];

            if (imgFull.substr(0, 4) !== 'http') {
                imgFull = appConfig.baseURL + imgFull;
            }

            cropImg.jcrop_api.setImage(imgFull, function () {
                const dim = cropImg.jcrop_api.getBounds();

                console.log('Org size: ' + imgWidth + ':' + imgHeight);
                console.log('dim size: ' + dim[0] + ':' + dim[1]);

                if (imgWidth <= dim[0] && imgHeight <= dim[1]) {
                    console.log('using image for size');
                    const cropLeft = (dim[0] - imgWidth) / 2;
                    const cropTop = (dim[1] - imgHeight) / 2;

                    cropImg.jcrop_api.animateTo([cropLeft, cropTop, imgWidth + cropLeft, imgHeight + cropTop]);
                }
                else {
                    console.log('using dim for size');
                    cropImg.jcrop_api.animateTo([25, 25, dim[0] - 25, dim[1] - 25]);
                }
            });
        });

        $('#chkKeepRatio').off('change').change((ev) => {
            const selectedObject: TemplateObject = e5Canvas.getActiveObject();
            const imgWidth = Math.round(selectedObject.getScaledWidth());
            const imgHeight = Math.round(selectedObject.getScaledHeight());
            cropImg.jcrop_api.setOptions(ev.target.getAttribute('checked') ? { aspectRatio: (imgWidth / imgHeight) } : { aspectRatio: 0 });
            cropImg.jcrop_api.focus();
        });
    }

    // update info by cropping (onChange and onSelect events handler)
    updateInfo(e: any) {
        $('#X').val(e.x);
        $('#Y').val(e.y);
        $('#X2').val(e.x2);
        $('#Y2').val(e.y2);
        $('#W').val(e.w);
        $('#H').val(e.h);
    }

    cropImage() {
        console.log('cropImage: ' + this.imgID);
        $.ajax({
            url: appConfig.webAPIURL + 'CropImage',
            dataType: 'json',
            data: {
                imgID: cropImg.imgID,
                userId: orderVars.userId,
                sessionId: orderVars.sessionId,
                w: $('#W').val(),
                h: $('#H').val(),
                x: $('#X').val(),
                y: $('#Y').val(),
                defaultImg: cropImg.defaultImg
            },
            type: 'GET',
            cache: false,
            contentType: 'application/json',
            success: function (result) {
                console.log('cropImage loading leftAddImage done.');
                const selectedObject = e5Canvas.getActiveObject();
                if (selectedObject && (appConfig.ImageClassType === selectedObject.type)) {
                    console.log('cropImage replacing image');
                    const jsonObj = JSON.parse(result);
                    const img = jsonObj[0];

                    imgEditor.selectImg(img.ImgID, img.ImgFull);
                    //imgEditor.getImages(selectedObject.imgType);
                }
                else {
                    console.log('no image found repopulating images');
                    imgEditor.loadImages(result);
                }
            },
            error: function (request, status, error) {
                alert('cropImage: Error invoking the web method! ' + request.responseText);
                console.log('cropImage: Error invoking the web method! ' + request.responseText, status, error);
            },
            // Code to run regardless of success or failure
            complete: function (_xhr, _status) {
                editor.hideCropImg();
            }
        });
    }
}

export const cropImg = new CropImg();