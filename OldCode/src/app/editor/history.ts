import { e5Canvas } from "./e5Canvas";
import { messages } from "../messages";
import { elementProp } from "../../content/elementProp";
import { TemplateObject } from "../../interfaces/template";
import each from 'lodash/each';
import { editor } from "./editor";

export interface HistCmd {
    obj: TemplateObject;
    execute(): Promise<void>;
    undo(): Promise<void>;
}

export class MemoCmd {
    commands: Array<HistCmd> = [];
    index = 0;
    backTrigger: JQuery;
    forwardTrigger: JQuery;

    constructor(undoBtn: JQuery, redoBtn: JQuery) {
        this.backTrigger = undoBtn;
        this.forwardTrigger = redoBtn;
        this._refreshTriggers();
    }

    getIndex(): number {
        return this.index;
    }

    async back(): Promise<MemoCmd> {
        if (this.index > 0) {
            const t = this.commands[--this.index];

            await t.undo();
            $(document).trigger('memo:changed');
            e5Canvas.canvas.renderAll().renderAll().calcOffset();
            editor.loadSideBar();
        }
        else {
            messages.Msg('Nothing to Undo');
        }

        this._refreshTriggers();

        return this;
    }

    async forward(): Promise<MemoCmd> {
        if (this.index < this.commands.length) {
            const t = this.commands[this.index++];

            await t.execute();
            $(document).trigger('memo:changed');

            e5Canvas.canvas.renderAll().renderAll().calcOffset();
            editor.loadSideBar();
        }
        else {
            messages.Msg('Nothing to Redo');
        }

        this._refreshTriggers();

        return this;
    }

    add(t: HistCmd): MemoCmd {
        this.commands.length && this.commands.splice(this.index, this.commands.length - this.index);
        this.commands.push(t);
        this.index++;
        this._refreshTriggers();
        $(document).trigger('memo:changed', 'history:add');
        return this;
    }

    clear(): MemoCmd {
        this.commands.length = 0;
        this.index = 0;
        this._refreshTriggers();

        return this;
    }

    /**
     * Disables the button
     * @param btn
     */
    private _disableTrigger(btn: JQuery): void {
        btn.prop('disabled', true).addClass('disabled');
    }

    /**
     * Enabled the button
     * @param btn
     */
    private _enableTrigger(btn: JQuery): void {
        btn.removeAttr('disabled').removeClass('disabled');
    }

    /**
     * Updates the button
     */
    private _refreshTriggers(): void {
        this.index < 1 ? this._disableTrigger(this.backTrigger) : this._enableTrigger(this.backTrigger);
        this.index === this.commands.length ? this._disableTrigger(this.forwardTrigger) : this._enableTrigger(this.forwardTrigger);

        const undoCnt = (this.index === this.commands.length ? this.commands.length : this.index);
        const redoCnt = this.commands.length - this.index;

        this.backTrigger.html('<i class="undo icon"></i>Undo');
        this.forwardTrigger.html('<i class="redo icon"></i>Redo');

        if (undoCnt > 0) {
            this.backTrigger.html('<i class="undo icon"></i>Undo (' + undoCnt + ')');
        }

        if (redoCnt > 0) {
            this.forwardTrigger.html('<i class="redo icon"></i>Redo (' + redoCnt + ')');
        }
    }
}

export class AddCmd implements HistCmd {
    obj: TemplateObject;

    constructor(t: TemplateObject) {
        this.obj = t;
    }

    async execute(): Promise<void> {
        await e5Canvas.addObject(this.obj, true, true);
    }

    async undo(): Promise<void> {
        await e5Canvas.removeObject(this.obj, false);
    }
}

export class RemoveCmd implements HistCmd {
    obj: TemplateObject;

    constructor(t: TemplateObject) {
        this.obj = t;
    }
    async execute(): Promise<void> {
        await e5Canvas.removeObject(this.obj, false);
    }
    async undo(): Promise<void> {
        await e5Canvas.addObject(this.obj, true, false);
    }
}

export class MemoTransformCmd implements HistCmd {
    state: Array<TemplateObject>;
    originalState: Array<TemplateObject>;
    stateProperties: any;
    styleStateProperties: Array<string> = [
        'fontStyle', 'fontWeight', 'textDecoration', 'strokeWidth', 'opacity', 'fontFamily', 'fontSize',
        'fill', 'textBackgroundColor', 'stroke', 'scaleX'
    ];

    obj: TemplateObject;

    constructor(t: TemplateObject) {
        this.obj = t;
        this.state = [];
        this.originalState = [];

        this.initStateProperties();
        this.saveState();
        this.saveOriginalState();
    }

    async execute(): Promise<void> {
        await this.restoreState();
    }

    async undo(): Promise<void> {
        await this.restoreOriginalState();
    }

    private initStateProperties() {
        this.stateProperties = this.obj.stateProperties;
        //t.stateProperties && t.stateProperties.length && this.stateProperties.push.apply(this.stateProperties, t.stateProperties);
    }

    private restoreState() {
        each(this.stateProperties, (t: any) => {
            //console.log('RestoreState: t=' + t + ' value: ' + self.state[t]);

            if (this.styleStateProperties.indexOf(t) > -1) {
                elementProp.setActiveStyle(t, this.state[t], this.obj, false);
            }
            else {
                this.obj.set(t, this.state[t]);
            }
        });
    }

    private restoreOriginalState() {
        each(this.stateProperties, (t: any) => {
            if (this.obj.get(t) !== this.originalState[t]) {
                //console.log('ROS: ' + t + ' old: ' + self.obj.get(t) + ' new: ' + self.originalState[t]);
            }

            if (this.styleStateProperties.indexOf(t) > -1) {
                elementProp.setActiveStyle(t, this.originalState[t], this.obj, false);
            }
            else {
                this.obj.set(t, this.originalState[t]);
            }
        });

        //e5Canvas.canvas.renderAll().renderAll();
    }

    private saveState() {
        each(this.stateProperties, (t: any) => {
            this.state[t] = this.obj.get(t);
        });
        /*
        var self = this;
        this.stateProperties.forEach(function (t: any) {
            //self.state[t] = self.obj.get(t);
            self.state[t] = self.obj._stateProperties[t];
        });
        */
    }

    private saveOriginalState() {
        each(this.stateProperties, (t: any) => {
            // @ts-expect-error I know
            this.originalState[t] = this.obj._stateProperties[t];
        });
        /*
        var self = this;
        this.stateProperties.forEach(function (t: any) {
            self.originalState[t] = self.obj._stateProperties[t];
        });
        */
    }
}