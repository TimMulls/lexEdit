import { editor } from "../app/editor/editor";
import { imgEditor } from "../app/editor/imgEditor";
import { orderVars } from "../app/orderVars";
import { appConfig } from "../app/appConfig";
import { elementProp } from "./elementProp";
import { } from 'googlemaps';
import { messages } from "../app/messages";

class QrCode {
    qrColor: string;
    qrData: string;
    qrType: string;
    latlng!: google.maps.LatLng;
    map!: google.maps.Map;
    autoCompleteMap!: google.maps.places.Autocomplete;

    private static _instance = new QrCode();

    static get instance(): QrCode {
        return this._instance;
    }

    constructor() {
        this.qrColor = '';
        this.qrData = '';
        this.qrType = '';
    }

    init(): void {
        console.log('qrCode init');
        $('#qrURL').val('');
        $('#qrEMailAddress').val('');
        $('#qrPhoneNumber').val('');
        this.qrColor = '000';
        $('#divCode').html('');
        $('#tbCodeName').val('');

        this.hideDataTypes();

        $('#mnuQRWebsiteURL').off().on('click', function () { qrCode.qrSelectType('WebsiteURL'); });
        $('#mnuQREMailAddress').off().on('click', function () { qrCode.qrSelectType('EMailAddress'); });
        $('#mnuQRTelephoneNumber').off().on('click', function () { qrCode.qrSelectType('PhoneNumber'); });
        $('#mnuQRGoogleMap').off().on('click', function () { qrCode.qrSelectType('GoogleMap'); });

        $('#btnCloseCreateQR').off().on('click', function () { editor.hideCreateQRCode(); });
        $('#qrURL').off().on('blur', function () { qrCode.reloadImage(); });
        $('#rbWebsiteEmbed').off().on('click', function () { qrCode.reloadImage(); });
        $('#rbWebsiteShortCode').off().on('click', function () { qrCode.reloadImage(); });
        $('#qrEMailAddress').off().on('blur', function () { qrCode.reloadImage(); });
        $('#qrPhoneNumber').off().on('blur', function () { qrCode.reloadImage(); });
        $('#btnSaveQRCode').prop('disabled', false);
        $('#btnSaveQRCode').off().on('click', function () { qrCode.saveQRCode(); return false; });

        this.qrSelectType('WebsiteURL');

        $('#qrCodeColor').spectrum({
            color: '#00000',
            showPalette: true,
            preferredFormat: 'hex',
            flat: false,
            showInput: true,
            showButtons: true,
            appendTo: '#divGenQRCode',
            move: function (color: any) {
                qrCode.qrColor = color.toHexString().replace('#', '');
                qrCode.reloadImage();
                //elementProp.changeFontColor(color.toHexString());
            },
            palette: elementProp.getColorPalette()
        });

        this.reloadImage();
    }

    qrSelectType(_qrType: string) {
        this.hideDataTypes();
        this.qrType = _qrType;

        switch (this.qrType) {
            case 'WebsiteURL':
                $('#divWebsite').show();
                break;
            case 'EMailAddress':
                $('#divEMail').show();
                break;
            case 'PhoneNumber':
                $('#divPhoneNumber').show();
                break;
            case 'GoogleMap':
                $('#divGoogleMap').show();
                this.initMap();
                this.initAutocomplete();
                break;
        }

        this.reloadImage();
    }
    
    initMap(): void {               
        const center: google.maps.LatLngLiteral = { lat: 30, lng: -110 };
        this.map = new google.maps.Map(document.getElementById("map_canvas") as HTMLElement, {
            center,
            zoom: 8
        });

        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };

                    //infoWindow.setPosition(pos);
                    //infoWindow.setContent("Location found.");
                    //infoWindow.open(map);
                    qrCode.map.setCenter(pos);
                },
                () => {
                    messages.Msg('Browser does not support Geolocation', 'Error', 'error');
                }
            );
        } else {
            messages.Msg('Browser does not support Geolocation', 'Error', 'error');
        }

        const geocoder = new google.maps.Geocoder();

        $('#btnGeocode').on('click', () => {
            qrCode.geocodeAddress(geocoder, qrCode.map);
        });

        $('#qrGoogleMap').off().on('blur', function () { qrCode.geocodeAddress(geocoder, qrCode.map); });
    }        

    initAutocomplete() {
        // Create the autocomplete object, restricting the search predictions to geographical location types.
        this.autoCompleteMap = new google.maps.places.Autocomplete(document.getElementById('qrGoogleMap') as HTMLInputElement, { types: ['geocode'] });
    
        // Avoid paying for data that you don't need by restricting the set of
        // place fields that are returned to just the address components.
        this.autoCompleteMap.setFields(['address_component']);
    
        // When the user selects an address from the drop-down, populate the
        // address fields in the form.
        this.autoCompleteMap.addListener('place_changed', ()=>$('#qrGoogleMap').blur());
    }

    geocodeAddress(geocoder: google.maps.Geocoder, resultsMap: google.maps.Map) {
        const address = (document.getElementById("qrGoogleMap") as HTMLInputElement).value;
        geocoder.geocode({ address: address }, (results, status) => {
            if (status === "OK") {
                resultsMap.setCenter(results[0].geometry.location);
                new google.maps.Marker({
                    map: resultsMap,
                    position: results[0].geometry.location,
                });

                qrCode.latlng = results[0].geometry.location;
                resultsMap.setZoom(16);
                qrCode.reloadImage();
            } else {
                alert("Geocode was not successful for the following reason: " + status);
            }
        });
    }
    
    getData() {
        switch (this.qrType) {
            case 'WebsiteURL':
                this.qrData = <string>$('#qrURL').val();
                break;
            case 'EMailAddress':
                this.qrData = 'MAILTO:' + $('#qrEMailAddress').val();
                break;
            case 'PhoneNumber':
                this.qrData = 'TEL:' + $('#qrPhoneNumber').val();
                break;
            case 'GoogleMap':
                if (this.latlng) {
                    this.qrData = 'https://maps.google.com/maps?q=' + this.latlng.lat() + ',' + this.latlng.lng();
                }
                /*
                var address = $('#qrGoogleMap').val();
                geocoder.geocode({ 'address': address }, function (results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        map.setCenter(results[0].geometry.location);
                        document.forms[0].<% =LatLong.ClientID %>.value = results[0].geometry.location.lat() + ',' + results[0].geometry.location.lng();
                        ReloadImage();
                        var marker = new google.maps.Marker({
                            map: map,
                            position: results[0].geometry.location
                        });
                    } else {
                        alert("Geocode was not successful for the following reason: " + status);
                    }
                });
                this.qrData = 'https://maps.google.com/maps?q=' + LatLong.Value;
                */
                break;
        }

        if (qrCode.qrData === '') {
            qrCode.qrData = 'BLANK';
        }
    }

    reloadImage() {
        if (this.qrColor === '') {
            this.qrColor = '000';
        }

        qrCode.getData();

        const img = $('<img/>', {
            src: appConfig.webAPIURL + 'GetQRCodeImage?QRCodeData=' + qrCode.qrData + '&QRCodeColor=' + qrCode.qrColor,
            width: '200px'
        });

        //@ts-expect-error being a pain
        $('#divCode').html(img);
    }

    private hideDataTypes(): void {
        $('#divWebsite').hide();
        $('#divEMail').hide();
        $('#divPhoneNumber').hide();
        $('#divGoogleMap').hide();
    }

    private ValidateForm(): boolean {
        $('#qrURL').removeClass('formError');        
        $('#qrEMailAddress').removeClass('formError');
        $('#qrPhoneNumber').removeClass('formError');
        $('#tbCodeName').removeClass('formError');
        $('#qrGoogleMap').removeClass('formError');

        switch (this.qrType) {
            case 'WebsiteURL':
                if (!$('#qrURL').val()) {
                    alert('Please enter a URL');
                    $('#qrURL').addClass('formError');
                    return false;
                }
                break;
            case 'EMailAddress':
                if (!$('#qrEMailAddress').val()) {
                    alert('Please enter EMail');
                    $('#qrEMailAddress').addClass('formError');
                    return false;
                }
                break;
            case 'PhoneNumber':
                if (!$('#qrPhoneNumber').val()) {
                    alert('Please enter Phone');
                    $('#qrPhoneNumber').addClass('formError');
                    return false;
                }
                break;
            case 'GoogleMap':
                if (!qrCode.latlng) {
                    alert('Please enter address');
                    $('#qrGoogleMap').addClass('formError');
                    return false;
                }
                break;
        }

        if (!$('#tbCodeName').val()) {
            messages.Msg('Please name QR Code');
            $('#tbCodeName').addClass('formError');
            return false;
        }

        return true;
    }

    saveQRCode(): void {
        if (!this.ValidateForm()) {
            return;
        }
        $('#btnSaveQRCode').off();
        $('#btnSaveQRCode').prop('disabled', true);

        $.ajax({
            url: appConfig.webAPIURL + 'SaveQRCode',
            type: 'POST',
            data: {
                mode: 0,
                qrCodeName: $('#tbCodeName').val(),
                qrCodeData: qrCode.qrData,
                qrCodeColor: qrCode.qrColor,
                userID: orderVars.userId,
                sessionID: orderVars.sessionId
            },
            success: function () {
                editor.hideCreateQRCode();
                imgEditor.getImages('QRCodes');
            },
            error: function (request, status, error) {
                console.log(request, status, error);
                editor.reportError(error, 'Error invoking the SaveQRCode web method! ' + request.responseText);
            }
        });
    }
}

export const qrCode = QrCode.instance;