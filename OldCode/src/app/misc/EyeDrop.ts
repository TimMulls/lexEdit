export interface IEyeDropOptions {
    onPreview: (color: string) => void;
    onSelect: (color: string) => void;
}

export declare class EyeDropOptions implements IEyeDropOptions {
    KEY: string;
    SELECTOR: string;
    INACCURACY: string;
    onPreview: (color: string) => void;
    onSelect: (color: string) => void;

    constructor(options?: IEyeDropOptions);
}

interface Bounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export class EyeDrop {
    ratio: number = window.devicePixelRatio || 1;
    KEY = 'color-sampler';
    SELECTOR = ':' + this.KEY;
    INACCURACY = 5;
    init = false;
    preview: HTMLElement;
    previewPixels: Array<HTMLElement> = [];
    previewing = false;
    interval = 200;
    timer: NodeJS.Timer | undefined;
    observations = $();
    bounds: Bounds;
    canvas: HTMLCanvasElement;
    options: IEyeDropOptions;
    enabled = true;
    context: CanvasRenderingContext2D | null;
    color: string;

    constructor(scanvas: HTMLCanvasElement, options: IEyeDropOptions) {
        this.canvas = scanvas;
        this.options = options || {};
        this.enabled = true;
        this.color = '';
        this.context = scanvas.getContext('2d');
        this.bounds = { left: 0, top: 0, right: 0, bottom: 0 };
        const div = document.createElement('div');
        div.classList.add('EyeDropPreview');
        this.preview = div;
        this.resize();
        this.canvas.addEventListener('mousemove', this.onMousemove.bind(this));
        this.canvas.addEventListener('mouseout', this.onMouseout.bind(this));
        this.canvas.addEventListener('click', this.onClick.bind(this));

        if (!this.init) {
            this.init = true;
            this.createPreview();
            //$(document).ready(function () {
            //  $(window).bind('resize', this.resize);
            //});
        }

        //this.observations = this.observations.add(this);
        if (this.interval && !this.timer) {
            this.timer = global.setInterval(this.detect, this.interval);
        }
    }

    resize(): void {
        const canvas = this.canvas;
        this.bounds = {
            left: parseInt($(canvas).css('padding-left')) * this.ratio || 0,
            top: parseInt($(canvas).css('padding-top')) * this.ratio || 0,
            right: ($(canvas).width() as number * this.ratio),
            bottom: ($(canvas).height() as number * this.ratio)
        };
    }

    onMouseout(): void {
        this.hidePreview();
    }

    onMousemove(e: MouseEvent): void {
        if (!this.enabled) {
            return;
        }

        const x = this.ratio * (e.offsetX - this.bounds.left);
        const y = this.ratio * (e.offsetY - this.bounds.top);

        if (!this.checkInRange(x, y)
            && (x < - this.INACCURACY || y < - this.INACCURACY || x >= this.bounds.right + this.INACCURACY || y >= this.bounds.bottom + this.INACCURACY)) {
            this.hidePreview();
            return;
        }

        $(this.preview).css({
            left: (this.ratio * (e.pageX + 5)) + 'px',
            top: (this.ratio * (e.pageY + 5)) + 'px'
        });

        this.setupPreview(x, y);
        this.showPreview();

        this.color = $(this.previewPixels[60]).css('background-color');

        if ($.isFunction(this.options.onPreview)) {
            this.options.onPreview(this.color);
        }

        $(this.canvas).trigger('sampler:preview', this.color);
    }

    setupPreview(centralX: number, centralY: number): void {
        if (!this.context) {
            return;
        }

        const startX = centralX - 5;
        const startY = centralY - 5;
        const data = this.context.getImageData(startX, startY, 11, 11).data;

        for (let i = 0, j = 0; i < data.length; i += 4, ++j) {
            const y = (j / 11) + startY;
            const x = j % 11 + startX;
            if (!this.checkInRange(x, y)) {
                $(this.previewPixels[j]).css('background-color', 'white');
            } else {
                const color = Array.prototype.slice.call(data, i, i + 4);
                color[3] = Math.min(color[3] / 100, 1);
                this.color = 'rgba(' + color.join(',') + ')';
                $(this.previewPixels[j]).css('background-color', this.color);
            }
        }
    }

    checkInRange(x: number, y: number): boolean {
        return x >= 0 && y >= 0 && x < this.bounds.right && y < this.bounds.bottom;
    }

    onClick(e: MouseEvent): void {
        const x = e.offsetX - this.bounds.left;
        const y = e.offsetY - this.bounds.top;

        if (!this.color || !this.enabled || !this.checkInRange(x, y)) {
            return;
        }

        if ($.isFunction(this.options.onSelect)) {
            this.options.onSelect(this.color);
        }

        $(this.canvas).trigger('sampler:select', this.color);

        this.hidePreview();

        const screenDiv = document.getElementById('lexEditorMain');
        screenDiv?.removeChild(this.canvas);
        screenDiv?.classList.remove('EyeDropCursor');
        document.body.removeChild(this.preview);
        //document.body.removeChild(this.canvas);
    }

    detect(): void {
        if (!this.bounds) {
            return;
        }

        if ($(this.canvas).width() != this.bounds.right || $(this.canvas).height() != this.bounds.bottom) {
            this.resize();
        }
    }

    enable(enabled: boolean): void {
        if (enabled === undefined) {
            enabled = true;
        }
        this.enabled = enabled;
    }

    disable(disabled: boolean): void {
        if (disabled === undefined) {
            disabled = true;
        }
        this.enabled = !disabled;
        this.hidePreview();
    }

    /*
    resize() {
        $(SELECTOR).each(function () {
            $(this).data(KEY).resize();
        });
    }
    */

    createPreview(): void {
        const table = document.createElement('table');
        const tableBody = document.createElement('tbody');

        for (let yy = 0; yy < 11; ++yy) {
            const tr = document.createElement('tr');

            for (let xx = 0; xx < 11; ++xx) {
                const td = document.createElement('td');
                td.setAttribute('x', xx.toString());
                td.setAttribute('y', yy.toString());
                this.previewPixels.push(td);
                tr.append(td);
            }

            table.append(tr);
        }

        table.appendChild(tableBody);

        this.preview.append(table);

        $('body').append(this.preview);
    }

    showPreview(): void {
        if (this.previewing) {
            return;
        }
        this.previewing = true;
        $(this.preview).addClass('active');
    }

    hidePreview(): void {
        if (!this.previewing) {
            return;
        }
        this.previewing = false;
        $(this.preview).removeClass('active');
    }

    /*
    detect() {
        observations = observations.filter(SELECTOR);
        observations.each(function () {
            $(this).data(KEY).detect();
        });
        if (observations.length === 0) {
            timer = clearInterval(timer);
        }
    }
    */
}

/*
(function ($, window, document) {
    'use strict';

    $.expr[':'][KEY] = function (element) {
        return $(element).data(KEY) !== undefined;
    };

    var PublicMethods = ['enable', 'disable', 'resize'];
    $.fn.colorSampler = function (method, options) {
        var sampler, isString = typeof (method) == 'string';
        this.filter('canvas').each(function () {
            if (isString) {
                if ($.inArray(method, PublicMethods) != -1) {
                    sampler = $(this).data(KEY);
                    if (sampler) {
                        sampler[method].apply(sampler, options);
                    }
                }
            } else {
                options = method;
                sampler = new Sampler(this, options);
                $(this).data(KEY, sampler);

                if (!init) {
                    init = true;
                    createPreview();
                    $(document).ready(function () {
                        $(window).bind('resize', resize);
                    });
                }

                observations = observations.add(this);
                if (interval && !timer) {
                    timer = setInterval(detect, interval);
                }
            }
        });
        return this;
    };

    $.colorSamper = {};

    $.colorSamper.setInterval = function (v) {
        if (v == interval || !$.isNumeric(v) || v < 0) {
            return;
        }
        interval = v;
        timer = clearInterval(timer);
        if (interval > 0) {
            timer = setInterval(detect, interval);
        }
    };
})(jQuery, window, document);
*/