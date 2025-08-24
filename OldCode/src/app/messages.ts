import Swal, { SweetAlertIcon } from "sweetalert2";

/**
 * This class is used to override the alert into a toast
 */
export class Messages {
    private static _instance = new Messages();

    static get instance(): Messages {
        return this._instance;
    }

    _alert: any = null;

    initMessages() : void {
        if (this._alert)
            return;

        this._alert = window.alert;

        window.alert = function (message) {
            const Toast = Swal.mixin({
                toast: true,
                icon: 'info',
                title: message,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 1000,
                target: $('#lexEditorMain').get(0)
            });

            Toast.fire();
        };
    }

    /**
     * Show alert style message at bottom of application.
     * @param {string} sText - The message itself.
     * @param {string} sTitle - The title of the message.
     * @param {string} sType - Type of message (notice, error, info, success).
     */
    Msg(sText: string, sTitle?: string, sType?: SweetAlertIcon): void {
        let showFor = 3000;

        if (!sType) {
            sType = 'error';
        }

        if (sType == 'error') {
            showFor = 6000;
        }

        const Toast = Swal.mixin({
            toast: true,
            icon: sType,
            title: sTitle,
            text: sText,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: showFor,
            target: $('#lexEditorMain').get(0)
        });

        Toast.fire();
    }
}

export const messages = Messages.instance;