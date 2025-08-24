import { fabric } from 'fabric';

export interface ImgObj {
    imgFull: string;
    imgType: string;
    selectable: boolean;
}

export interface TemplateObject extends fabric.Object {    
    ID: number;
    LinkedObject: number;
    imgType: string;
    PageNumber: number;
    ObjectName: string;
    ObjectType: number;
    ObjectGroup: string;
    ImageAlign: string;
    autoFontSize: boolean;
    WordBreak: boolean,
    allowCuttedWords: boolean,
    zIndex: number;
    DisplayOrder: number;
    minHeight: number;
    ResourceType: string;
    lockScalingX: boolean;
    lockScalingY: boolean;
    lockScalingFlip: boolean;
    angle: number;
    text: string;
    orgWidth: number;
    orgHeight: number;
    orgLeft: number;
    orgTop: number;
    orgFontSize: number;
    //scale: number;
    align: string;
    SuppressPrinting: boolean;
    textLines: string;
    _styleMap: string;
    isEditing: boolean;
    fontFamily: string;
    editable: boolean;
    fontWeight: string;
    selectionStart: number;
    selectionEnd: number;
    fontStyle: string;
    styles: unknown;
    initDimensions(): void;
    setSelectionStyles(styles: unknown, startIndex?: number, endIndex?: number): unknown;
    getSelectionStyles(startIndex?: number, endIndex?: number, complete?: boolean): any[];
    setSrc(arg0: string, arg1: () => void): unknown;
    setElement(element: HTMLImageElement, options?:unknown): fabric.Image;
    _clearCache(): void;
    getWidth(): number;
    getHeight(): number;
    height: number,
    width: number,
    left: number,
    top: number
}