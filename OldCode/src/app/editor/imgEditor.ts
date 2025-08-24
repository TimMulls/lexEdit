import Dropzone, { DropzoneFile } from "dropzone";
import Swal, { SweetAlertResult } from "sweetalert2";
import { cropImg } from "../../content/cropImg";
import { qrCode } from "../../content/qrCode";
import { ImageTypes } from "../../enums/imageTypes";
import { TemplateObject } from "../../interfaces/template";
import { appConfig } from "../appConfig";
import { messages } from "../messages";
import { orderVars } from "../orderVars";
import { templateCoupons } from "../template/templateCoupons";
import { templateElements } from "../template/templateElements";
import { e5Canvas } from "./e5Canvas";
import { editor } from "./editor";

Dropzone.autoDiscover = false;

class ImgEditor {
    imgType: string;

    private static _instance = new ImgEditor();

    static get instance(): ImgEditor {
        return this._instance;
    }

    constructor() {
        this.imgType = '';
    }

    init() {
        $('#ImgMan').height(<number>$('#divRightSide').height());
        $('#btnHideImgMan').off().on('click', function () { editor.hideImgMan(); });
        $('#btnSelectDiffCoupon').off().on('click', function () { editor.hideImgMan(); });
        $('#mnuArtwork').off().on('click', function () { imgEditor.getImages(ImageTypes.Artwork); });
        $('#mnuLogos').off().on('click', function () { imgEditor.getImages(ImageTypes.Logos); });
        $('#mnuSignatures').off().on('click', function () { imgEditor.getImages(ImageTypes.Signatures); });
        $('#mnuPersonalPhotos').off().on('click', function () { imgEditor.getImages(ImageTypes.PersonalPhotos); });
        $('#mnuOwnDesigns').off().on('click', function () { imgEditor.getImages(ImageTypes.OwnDesigns); });
        $('#mnuQRCodes').off().on('click', function () { imgEditor.getImages(ImageTypes.QRCodes); });
        $('#btnCreateQRCode').off().on('click', function () { imgEditor.createQRCode() });

        return new Promise(function (resolve, _reject) {
            $.fancybox.defaults.parentEl = '#canvasContainer';
            $.fancybox.defaults.buttons = ['close'];

            $('.dropzone').each(function () {
                const dropzoneControl = $(this)[0].dropzone;
                if (dropzoneControl) {
                    dropzoneControl.destroy();
                }
            });

            const myDropzone = new Dropzone('div#my-dropzone', {
                url: 'file-upload.aspx',
                acceptedFiles: 'image/*,application/pdf',
                //dictDefaultMessage: '<i class="large copy outline icon"></i><div style="text-align: center; display: inline;">Drag and Drop File Here or Click to Upload Files</div>',
            });

            myDropzone.on('addedfile', function (_file: any) {
                myDropzone.options.url = appConfig.lexEditURL + 'file-upload.aspx?ImageType=' + imgEditor.imgType +
                    '&UserID=' + orderVars.userId +
                    '&SessionID=' + orderVars.sessionId;
            });

            myDropzone.on('success', function (_file: any) {
                imgEditor.getImages(imgEditor.imgType);
            });

            myDropzone.on('complete', function (file: DropzoneFile) {
                if (file.status === 'error') {
                    messages.Msg('Error uploading file: ' + file.name);
                }

                myDropzone.removeFile(file);
            });

            myDropzone.on('sending', function (file: any, _xhr: any, formData: any) {
                formData.append('filesize', file.size); // Will send the filesize along with the file as POST data.
                formData.append('fileName', file.name);
            });

            //The Alert is needed for Edge. If you do not include it is does not show the side bar until you go to a new window
            alert('Loading Images');
            resolve('');
        });
    }

    /**
    * Used to replace or add new image to canvas
    *
    * @param {Number} imgID The Images ID
    * @param {String} imgFull Full Image Path
    */
    selectImg(imgID: number, imgFull: string) {
        const selectedObj: TemplateObject = <TemplateObject>e5Canvas.canvas.getActiveObject();

        //Replace existing image
        if (selectedObj && (appConfig.ImageClassType === selectedObj.type)) {
            templateElements.replaceImage(selectedObj, imgID, imgFull);
        }
        else if (e5Canvas.AdvMode) {
            //adding new image
            //9/12/22 added only allow adding new image if Adv Mode is enabled.
            templateElements.addImage(imgID, imgFull);
        }

        editor.hideImgMan();
    }

    /**
     * Used to get list of images by type
     * @param {String} imgType  Image type to look up
     */
    getImages(imgType?: string): void {
        if (imgType) {
            this.imgType = imgType;
        }

        $('#imgHeader').show();
        $('#my-dropzone').show();
        $('#uploadRightsMsg').show();
        $('#mnuArtwork').show();
        $('#mnuLogos').show();
        $('#mnuSignatures').show();
        $('#mnuPersonalPhotos').show();
        $('#mnuOwnDesigns').show();
        $('#mnuQRCodes').show();

        $('#mnuArtwork').removeClass('active');
        $('#mnuLogos').removeClass('active');
        $('#mnuSignatures').removeClass('active');
        $('#mnuPersonalPhotos').removeClass('active');
        $('#mnuOwnDesigns').removeClass('active');
        $('#mnuQRCodes').removeClass('active');
        $('#mnuCoupons').removeClass('active');
        $('#divQRcode').hide();
        $('#mnuCoupons').hide();

        switch (imgType) {
            case ImageTypes.Artwork:
                $('#mnuArtwork').addClass('active');
                break;
            case ImageTypes.Logos:
                $('#mnuLogos').addClass('active');
                break;
            case ImageTypes.Signatures:
                $('#mnuSignatures').addClass('active');
                break;
            case ImageTypes.PersonalPhotos:
                $('#mnuPersonalPhotos').addClass('active');
                break;
            case ImageTypes.OwnDesigns:
                $('#mnuOwnDesigns').addClass('active');
                break;
            case ImageTypes.QRCodes:
                $('#mnuQRCodes').addClass('active');
                $('#divQRcode').show();
                break;
            case ImageTypes.Coupons:
                $('#mnuCoupons').addClass('active');
                $('#mnuCoupons').show();
        }

        $('#lblImgType').html(<string>imgType === ImageTypes.Artwork ? 'Design Photos' : <string>imgType);

        if (imgType == ImageTypes.Coupons) {
            $('#imgHeader').hide();
            $('#my-dropzone').hide();
            $('#uploadRightsMsg').hide();
            $('#mnuArtwork').hide();
            $('#mnuLogos').hide();
            $('#mnuSignatures').hide();
            $('#mnuPersonalPhotos').hide();
            $('#mnuOwnDesigns').hide();
            $('#mnuQRCodes').hide();

            let currentCouponSize = orderVars.currentCouponSize;

            if (!currentCouponSize || !currentCouponSize.trim()) {
                currentCouponSize = 'L';
            }

            const couponData: any = {
                templateID: orderVars.backTemplateID,
                couponSize: currentCouponSize
            };

            if (orderVars.membershiptype == 100000) {
                couponData.membershipType = orderVars.membershiptype;
            }

            $.ajax({
                url: appConfig.webAPIURL + 'GetCoupons',
                data: couponData,
                contentType: 'application/json',
                success: function (result) {
                    imgEditor.loadCoupons(result);
                },
                error: function (request, status, error) {
                    messages.Msg('Error invoking the web method! ' + request.responseText, 'GetImages');
                    console.log('getImages: Error invoking the web method! ' + request.responseText, status, error);
                }
            });
        }
        else {
            let templateID = 0;

            switch (orderVars.currentPage) {
                case 1:
                    templateID = orderVars.frontTemplateID;
                    break;
                case 2:
                    templateID = orderVars.backTemplateID;
                    break;
                case 3:
                    templateID = orderVars.insideTemplateID;
                    break;
                case 4:
                    templateID = orderVars.envelopeTemplateID;
                    break;
            }
            editor.showLoading('Getting Images for ' + imgType, function () {
                $.ajax({
                    url: appConfig.webAPIURL + 'GetImages',
                    data: {
                        imgType: imgType,
                        userId: orderVars.userId,
                        sessionId: orderVars.sessionId,
                        productId: templateID,
                    },
                    contentType: 'application/json',
                    success: function (result) {
                        editor.hideLoading(false);
                        imgEditor.loadImages(result);
                    },
                    error: function (request, status, error) {
                        editor.hideLoading(false);
                        messages.Msg('Error invoking the web method! ' + request.responseText, 'GetImages');
                        console.log('getImages: Error invoking the web method! ' + request.responseText, status, error);
                    }
                });
            });
        }
    }

    selectCoupon(couponID: number): void {
        templateCoupons.replaceCoupon(couponID);
        editor.hideImgMan();
    }

    /**
     * Display Coupons to user
     * @param {String} jsonStr Json String with Images
     */
    loadCoupons(jsonStr: string): void {
        const ulImages = $('#ulImages');
        ulImages.empty();
        const jsonObj = JSON.parse(jsonStr);

        //No images found
        if (jsonObj.length <= 0) {
            ulImages.append(
                "<li>" +
                "  <div class='thumbHolder'>" +
                "    <div class='insideThumbHolder'>" +
                "      <img src='" + appConfig.lexEditURL + "Images/NoImage.gif' alt='No Image' />" +
                "    </div>" +
                "  </div>" +
                "  <section class='list-left'>" +
                "    <span class='title'>" +
                "    </span>" +
                "    <div style='color: black; font-weight: bold; font-size: 11pt; padding-top: 2px;'>No coupons found for this product. Please call customer service.</div>" +
                "    <br/>" +
                "    <div class='icon-group-btn'>" +
                "    </div>" +
                "  </section>" +
                "  <section class='list-right'>" +
                "    <span class='detail'></span>" +
                "  </section>" +
                "</li>");
        }
        else {
            const selectedObject: TemplateObject = e5Canvas.getActiveObject();

            $.each(jsonObj, function (_i, img: any) {
                let imgDesc = img.CouponDescription;


                if ($.trim(imgDesc).length <= 0) {
                    imgDesc = '';
                }
                else if (imgDesc.includes('<script>')) {
                    imgDesc = imgDesc.replace('<script>', '').replace('</script>', '');
                }

                if (imgDesc.length > 28) {
                    imgDesc = imgDesc.substring(0, 27);
                }

                const imgNameLbl = "<span>" + imgDesc + "</span>";

                let ulImgHtml = "<li>" +
                    "  <div class='thumbHolder'>" +
                    "    <div class='insideThumbHolder'>" +
                    "      <a href='" + img.CouponThumb + "' data-fancybox data-fancybox='images' data-Caption='" + imgDesc + "' class='magImg'>" +
                    "           <img src='" + appConfig.lexEditURL + "images/loading.gif' data-src='" + appConfig.baseURL + img.CouponThumb + "' alt='" + img.CouponID + "' />" +
                    "       </a>" +
                    "    </div>" +
                    "  </div>" +
                    "  <section class='list-left'>" +
                    "    <span class='title'>" +
                    imgNameLbl +
                    "    </span>" +
                    "    <div class='imgDesc'>" + imgDesc + "&nbsp;</div>";

                if ((typeof selectedObject !== 'undefined' && selectedObject !== null) && selectedObject.ObjectGroup === 'Coupon') {
                    ulImgHtml += "    <button type='button' class='ui button' onclick='lexEdit.selectCoupon(" + img.CouponID + ");'>Select</button>";
                }

                ulImgHtml += "  </section></li>";

                ulImages.append(ulImgHtml);
            });
        }

        $('.insideThumbHolder img').each(function () {
            const self: HTMLImageElement = <HTMLImageElement>this;
            const src: string = $(self).data('src');  // get the data attribute
            const img = new Image(); // create a new image

            img.onload = function () {
                self.src = src; // swap the source
            };

            if (src !== undefined) {
                img.src = src;  // set source of new image
            }
        });

        $(".pusher").animate({ scrollTop: 0 }, "fast");

        $('.ui.dropdown').dropdown();
    }

    /**
     * Display Images to user
     * @param {String} jsonStr Json String with Images
     */
    loadImages(jsonStr: string): void {
        const ulImages = $('#ulImages');
        ulImages.empty();
        const jsonObj = JSON.parse(jsonStr);

        //No images found
        if (jsonObj.length <= 0) {
            ulImages.append(
                "<li>" +
                "  <div class='thumbHolder'>" +
                "    <div class='insideThumbHolder'>" +
                "      <picture>" +
                "        <source srcset='" + appConfig.lexEditURL + "Images/noImage.webp' type='image/webp'>" +
                "        <img src='" + appConfig.lexEditURL + "Images/noImage.gif' alt='No Image' />" +
                "      </picture>" +
                "    </div>" +
                "  </div>" +
                "  <section class='list-left'>" +
                "    <span class='title'>" +
                "    </span>" +
                "    <div style='color: black; font-weight: bold; font-size: 11pt; padding-top: 2px;'>No images found for this type.  Upload a new image or select a different type.</div>" +
                "    <br/>" +
                "    <div class='icon-group-btn'>" +
                "    </div>" +
                "  </section>" +
                "  <section class='list-right'>" +
                "    <span class='detail'></span>" +
                "  </section>" +
                "</li>");
        }
        else {
            const selectedObject: TemplateObject = e5Canvas.getActiveObject();

            $.each(jsonObj, function (i, img) {
                let imgName = img.ImgName;
                let imgDesc = img.ImgDescription;
                let imgPreText = $.trim(img.ImgPreText);

                if ($.trim(imgName).length <= 0) {
                    imgName = 'Click to edit name';
                }
                else if (imgName.includes('<script>')) {
                    imgName = imgName.replace('<script>', '').replace('</script>', '');
                }

                if (imgName.length > 19) {
                    imgName = imgName.substring(0, 18);
                }

                if (imgDesc.length > 28) {
                    imgDesc = imgDesc.substring(0, 27);
                }

                let liClass = '';

                let imgNameLbl = "      <a title='Edit Image Name' href='javascript:void(0);' onclick='lexEdit.editImgName(" + jsonObj[i].ImgID + ",\"" + img.ImgType + "\");'>" + imgName + "</a>";
                if (imgPreText.length > 0) {
                    imgPreText = imgPreText.replace('\\', '\\\\');
                    imgNameLbl = " <span>" + imgName + "</span>";
                    liClass = " style='border: 0.5px solid yellow;'";
                }

                let ulImgHtml = "<li " + liClass + ">" +
                    "  <div class='thumbHolder'>" +
                    "    <div class='insideThumbHolder'>" +
                    "      <a href='" + img.ImgFull + "' data-fancybox data-fancybox='images' data-Caption='" + imgName + "' class='magImg'>" +
                    "        <picture>" +
                    //"          <source srcset='" + appConfig.lexEditURL + "images/Loading.webp' data-srcset='" + appConfig.baseURL + img.ImgThumb + "' type='image/webp'>" +
                    "          <img src='" + appConfig.lexEditURL + "images/loading.gif' data-src='" + appConfig.baseURL + img.ImgThumb + "' alt='" + img.ImgID + "' />" +
                    "        <picture>" +
                    "       </a>" +
                    "    </div>" +
                    "  </div>" +
                    "  <section class='list-left'>" +
                    "    <span class='title'>" +
                    imgNameLbl +
                    "    </span>" +
                    "    <div class='imgDesc'>" + imgDesc + "&nbsp;</div>" +
                    "    <div class='ui icon top left pointing dropdown button'> " +
                    "        <i class='wrench icon'></i>" +
                    "        <div class='menu'>" +
                    "            <div class='item' onclick='lexEdit.downloadImg(\"" + img.ImgFull + "\");'>Download Image</div>";

                if (!img.ImgFull.includes('gaf/') && !img.ImgFull.includes('Default/')) {
                    ulImgHtml += " <div class='item' onclick='lexEdit.deleteImg(" + jsonObj[i].ImgID + ",\"" + img.ImgType + "\");'>Delete Image</div>";
                }

                ulImgHtml += "        </div>" +
                    "    </div>";

                if (liClass === '' && img.ImgType !== ImageTypes.QRCodes) {
                    ulImgHtml += "    <div class='ui icon buttons'>" +
                        "      <button type='button' class='ui button' title='Edit Image' onclick='lexEdit.editImg(" + img.ImgID + ",\"" + img.ImgFull + "\");'>" +
                        "        <i class='ui edit blue icon'></i> Edit" +
                        "      </button>" +
                        "    </div>";
                }


                if (!selectedObject && !e5Canvas.AdvMode) {
                    messages.Msg('Please select an image to update first.');
                    console.log('Image not selected and not in AdvMode');
                    editor.hideImgMan();
                }

                if ((typeof selectedObject !== 'undefined' && selectedObject !== null) && selectedObject.ImageAlign === 'IACROP') {
                    ulImgHtml += "    <button type='button' class='ui button' onclick='lexEdit.editImg(" + img.ImgID + ",\"" + img.ImgFull + "\");'>" + ((selectedObject && (appConfig.ImageClassType === selectedObject.type)) ? 'Select' : 'Add') + "</button>";
                }
                else {
                    ulImgHtml += "    <button type='button' class='ui button' onclick='lexEdit.selectImg(\"" + imgPreText + img.ImgID + "\",\"" + img.ImgFull + "\");'>" + ((selectedObject && (appConfig.ImageClassType === selectedObject.type)) ? 'Select' : 'Add') + "</button>";
                }

                ulImgHtml += "  </section></li>";

                ulImages.append(ulImgHtml);
            });
        }

        $('.insideThumbHolder img').each(function () {
            const self: HTMLImageElement = <HTMLImageElement>this;
            const src: string = $(self).data('src');  // get the data attribute
            const img = new Image(); // create a new image

            img.onload = function () {
                self.src = src; // swap the source
            };

            if (src !== undefined) {
                img.src = src;  // set source of new image
            }
        });

        $(".pusher").animate({ scrollTop: 0 }, "fast");

        $('.ui.dropdown').dropdown();
    }

    /**
     * Allows user to download full image to there computer.
     * @param {string} imgID The ID of the image to change
     */
    downloadImg(imgID: string): void {
        imgID = imgID.replace('-300', '');
        window.open(appConfig.lexEditURL + 'SaveImage.ashx?fileName=' + imgID);
    }

    createQRCode() {
        $('#canvasContainer').css({ 'overflow': 'hidden' });
        //$('#divGenQRCode').height($('#ImgMan').height() as number);
        //$('#divGenQRCode').height(<number>$('#divRightSide').height() - 10);

        $('#divGenQRCode').slideDown(500,
            function () {
                qrCode.init();
            }
        );
    }

    editImgName(imgID: number, imgType: string): void {
        Swal.fire({
            title: 'What image name would you like?',
            input: 'text',
            inputPlaceholder: 'Enter a name for this image',
            showCancelButton: true,
            inputValidator: ((imgName: string) => {
                return new Promise((resolve) => {
                    if (imgName) {
                        $.ajax({
                            url: appConfig.webAPIURL + 'RenameImage',
                            type: "GET",
                            data: {
                                imageId: imgID,
                                imageName: imgName,
                                imageType: imgType,
                                userId: orderVars.userId,
                                sessionId: orderVars.sessionId
                            },
                            //dataType: "json",
                            contentType: "application/json",
                            success: function (result) {
                                alert("Image Renamed");
                                imgEditor.loadImages(result);
                            },
                            error: function (request, _status, _error) {
                                messages.Msg('Error invoking the web method! ' + request.responseText, 'RenameImage');
                                console.log("RenameImage: Error invoking the web method! " + request.responseText);
                            }
                        });

                        resolve('');
                    } else {
                        resolve('Name is required')
                    }
                })
            })
        });
    }

    /**
     * Delete Image from Users Account
     * @param {Number} imgID The images ID
     * @param {String} imgType Image Type
     */
    deleteImg(imgID: number, imgType: string) {
        Swal.fire({
            title: 'Confirmation Needed',
            text: "Are you sure you want to permanently delete this image from My Image Library?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then(function (result: SweetAlertResult) {
            if (result.value) {
                $.ajax({
                    url: appConfig.webAPIURL + 'DeleteImage',
                    type: "GET",
                    data: {
                        imageId: imgID,
                        imageType: imgType,
                        userId: orderVars.userId,
                        sessionId: orderVars.sessionId
                    },
                    //dataType: "json",
                    contentType: "application/json",
                    success: function (result) {
                        alert("Image ID: " + imgID + " deleted.");
                        imgEditor.loadImages(result);
                    },
                    error: function (request, _status, _error) {
                        messages.Msg('Error invoking the web method! ' + request.responseText, 'DeleteImg');
                        console.log("deleteImg: Error invoking the web method! " + request.responseText);
                    }
                });
            }
        });
    }

    /**
     * Rescale image to current block size if image is larger or different shape.
     *
     * @param {Number} maxW Max Width
     * @param {Number} maxH Max Height
     * @param {Number} currW Current Width
     * @param {Number} currH Current Height
     * @returns {array} currH, currW
     */
    scaleSize(maxW: number, maxH: number, currW: number, currH: number) {
        const ratio = currH / currW;

        if (currW >= maxW && ratio <= 1) {
            currW = maxW;
            currH = currW * ratio;
        } else if (currH >= maxH) {
            currH = maxH;
            currW = currH / ratio;
        }

        return [currW, currH];
    }

    /**
     * Used to set up crop window with image data
     * @param {Number} imgID The Images ID
     * @param {String} imgFull The full image path
     */
    editImg(imgID: number, imgFull: string): void {
        $('#canvasContainer').css({ 'overflow': 'hidden' });
        $('#CropImage').height($('#ImgMan').height() as number);
        //$('#CropImage').height(<number>$('#divRightSide').height());

        $('#CropImage').slideDown(500,
            function () {
                cropImg.init();
                cropImg.loadJCrop(imgFull, imgID, imgFull.includes('Default/'));
            }
        );
    }
}

export const imgEditor = ImgEditor.instance;