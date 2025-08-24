/** Stores config vars for the lexEdit app */
export class AppConfig {
    private static _instance = new AppConfig();

    static get instance(): AppConfig {
        return this._instance;
    }

    /** Not used right now but could be used if we try to keep pmc and asr code together */
    public appType: string;

    /** The current site base URL */
    public baseURL: string;

    /** Path to the lexEdit Directory */
    public lexEditURL: string;

    /** Define the Proof page to go to when the editor is done */
    public proofURL: string;

    /** Define the Envelope proof page if the page is an envelope */
    public proofEnvURL: string;

    /** Define the Marketing Series proof page */
    public proofMarketingSeriesURL: string;

    /** The base WebData url (defined in IIS as a virtual directory) */
    public WebData: string;

    /** The url to the webAPI */
    public webAPIURL: string;

    /** The base images directory.  This is needed since corp and live images are stored in different folder structures */
    public imgsURL: string;

    /** Location of the Templates Directory */
    public templateURL: string;

    /** The version defined in the package.json file */
    public appVersion: string;

    /** Add text outline to canvas */
    public showTextOutline: boolean;

    /** Add new features to code but not show them unless they are in beta mode. */
    public isBeta: boolean;

    /** Turn off console logs and some other features if not in debug mode. */
    public DEBUG: boolean;

    /** Define if the grid on the canvas should be shown by default */
    public showGrid: boolean;

    /** Define if cut lines in the editor should be shown by default */
    public showCutLines: boolean;

    /** The width of the cut lines in pixels. */
    public cutLineWidth: number;

    //** This is the image class for the fabric.js lib since I created my own version of it */
    //@ts-expect-error I know
    public ImageClass: fabric.Img;

    //** Just a string rep of the image class for the new lib type */
    public ImageClassType: string;

    /** This stores the extra keys for the fabric objects that are lexEdit specific */
    public extraKeys: Array<string>;

    /** The colors that will load in the editor color drop down */
    public defaultPalette: Array<Array<string>>;

    /** Metalic Gold Color */
    public goldPalette: Array<string>;

    /** Metalic Silver Color */
    public silverPalette: Array<string>;

    /** The path to the fonts CSS file */
    public fontsCssFile: string;

    /** The number of idle mins before auto saving the template */
    public AutoSaveDuration: number;

    constructor() {
        this.appType = 'ASR';

        this.baseURL = '//' + window.location.hostname + '/';
        this.lexEditURL = this.baseURL + '/DesktopModules/LexinetCustMod/WebControls/lexEdit2/';
        this.proofURL = this.baseURL + '/Products/EditCard/Proof.aspx';
        this.proofEnvURL = this.baseURL + '/Products/EditCard/ProofEnvelope.aspx';
        this.proofMarketingSeriesURL = this.baseURL + '/Products/MarketingSeries/ProofSeries.aspx';
        this.WebData = this.baseURL + '/ASRWebData/';
        this.webAPIURL = this.baseURL + '/DesktopModules/EditorServices/API/LexEditor/';
        this.imgsURL = this.WebData + 'Images/';
        this.templateURL = this.WebData + 'Templates/';
        this.appVersion = process.env.AppVersion as string;
        this.showTextOutline = false;
        this.isBeta = false;
        this.DEBUG = false;
        this.showGrid = false;
        this.showCutLines = true;
        this.cutLineWidth = 18;
        // @ts-expect-error exists
        this.ImageClass = fabric.Img;
        this.ImageClassType = 'img';
        this.AutoSaveDuration = 30;
        this.extraKeys = ['imgType', 'ID', 'LinkedObject', 'PageNumber', 'ObjectName', 'ObjectType', 'ObjectGroup', 'ImageAlign', 'autoFontSize',
            'WordBreak', 'allowCuttedWords', 'zIndex', 'DisplayOrder', 'minHeight', 'ResourceType', 'lockScalingX', 'lockScalingY',
            'lockScalingFlip', 'angle', 'text', 'orgWidth', 'orgHeight', 'orgLeft', 'orgTop', 'orgFontSize', 'scale', 'align',
            'SuppressPrinting', 'textLines', '_styleMap', 'left', 'top', 'width', 'height'];

        this.defaultPalette = [
            ['rgb(0, 0, 0)', 'rgb(67, 67, 67)', 'rgb(102, 102, 102)', 'rgb(204, 204, 204)', 'rgb(217, 217, 217)', 'rgb(255, 255, 255)'],
            ['rgb(152, 0, 0)', 'rgb(255, 0, 0)', 'rgb(255, 153, 0)', 'rgb(255, 255, 0)', 'rgb(0, 255, 0)', 'rgb(0, 255, 255)', 'rgb(74, 134, 232)', 'rgb(0, 0, 255)', 'rgb(153, 0, 255)', 'rgb(255, 0, 255)'],
            ['rgb(230, 184, 175)', 'rgb(244, 204, 204)', 'rgb(252, 229, 205)', 'rgb(255, 242, 204)', 'rgb(217, 234, 211)',
                'rgb(208, 224, 227)', 'rgb(201, 218, 248)', 'rgb(207, 226, 243)', 'rgb(217, 210, 233)', 'rgb(234, 209, 220)',
                'rgb(221, 126, 107)', 'rgb(234, 153, 153)', 'rgb(249, 203, 156)', 'rgb(255, 229, 153)', 'rgb(182, 215, 168)',
                'rgb(162, 196, 201)', 'rgb(164, 194, 244)', 'rgb(159, 197, 232)', 'rgb(180, 167, 214)', 'rgb(213, 166, 189)',
                'rgb(204, 65, 37)', 'rgb(224, 102, 102)', 'rgb(246, 178, 107)', 'rgb(255, 217, 102)', 'rgb(147, 196, 125)',
                'rgb(118, 165, 175)', 'rgb(109, 158, 235)', 'rgb(111, 168, 220)', 'rgb(142, 124, 195)', 'rgb(194, 123, 160)',
                'rgb(166, 28, 0)', 'rgb(204, 0, 0)', 'rgb(230, 145, 56)', 'rgb(241, 194, 50)', 'rgb(106, 168, 79)',
                'rgb(69, 129, 142)', 'rgb(60, 120, 216)', 'rgb(61, 133, 198)', 'rgb(103, 78, 167)', 'rgb(166, 77, 121)',
                'rgb(91, 15, 0)', 'rgb(102, 0, 0)', 'rgb(120, 63, 4)', 'rgb(127, 96, 0)', 'rgb(39, 78, 19)',
                'rgb(12, 52, 61)', 'rgb(28, 69, 135)', 'rgb(7, 55, 99)', 'rgb(32, 18, 77)', 'rgb(76, 17, 48)']
        ];

        this.goldPalette = ['rgb(133, 117, 78)'];
        this.silverPalette = ['rgb(140, 143, 144)'];
        this.fontsCssFile = this.WebData + 'fonts/fonts.css?v=' + this.appVersion;
    }
}

export const appConfig = AppConfig.instance;