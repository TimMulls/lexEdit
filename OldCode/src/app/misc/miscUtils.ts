export class MiscUtils {
    /**
     * Capitalizes a string
     * @memberOf miscUtils
     * @param {String} strToCap String to capitalize
     * @param {Boolean} [firstLetterOnly] If true only first letter is capitalized
     * and other letters stay untouched, if false first letter is capitalized
     * and other letters are converted to lowercase.
     * @return {String} Capitalized version of a string
     */
    public capitalize(strToCap: string, firstLetterOnly: boolean): string {
        return (strToCap.charAt(0).toUpperCase() + (firstLetterOnly ? strToCap.slice(1) : strToCap.slice(1).toLowerCase()));
    }

    public sleep(milliseconds: number): void {
        var start = new Date().getTime();
        for (var i = 0; i < 1e7; i++) {
            if ((new Date().getTime() - start) > milliseconds) {
                break;
            }
        }
    }

    public isNullOrWhiteSpace(str: string): boolean {
        return str === null || str.replace(/\s/g, '').length < 1;
    }

    public getParameterByName(name: string): string {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);

        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    /**
     * Get color (black/white) depending on forColor so it would be clearly seen.
     * @param {string} forColor The forcolor you are using
     * @returns {string} Best background color to use
    */
    public getBestBgColor(forColor: string): string {
        if (!forColor) {
            return '#fff';
        }

        var color = (forColor.charAt(0) === '#') ? forColor.substring(1, 7) : forColor;
        var r = parseInt(color.substring(0, 2), 16); // hexToR
        var g = parseInt(color.substring(2, 4), 16); // hexToG
        var b = parseInt(color.substring(4, 6), 16); // hexToB
        var uicolors = [r / 255, g / 255, b / 255];
        var c = uicolors.map(function (col) {
            if (col <= 0.03928) {
                return col / 12.92;
            }
            return Math.pow((col + 0.055) / 1.055, 2.4);
        });
        var L = (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
        return (L > 0.179) ? '#000' : '#fff';
    }
}

export const miscUtils = new MiscUtils();