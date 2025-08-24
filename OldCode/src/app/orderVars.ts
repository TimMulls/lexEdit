export class OrderVars {
    private static _instance = new OrderVars();

    static get instance(): OrderVars {
        return this._instance;
    }

    orderNumber: number;
    userId: number;
    portalId: number;
    membershiptype: number;
    sessionId: string;
    defaultSide: string;
    marketingSeries: boolean;

    frontJSON: string;
    insideJSON: string;
    backJSON: string;
    envelopeJSON: string;

    frontTemplateID: number;
    insideTemplateID: number;
    backTemplateID: number;
    envelopeTemplateID: number;

    frontEditAllowed: boolean;
    insideEditAllowed: boolean;
    backEditAllowed: boolean;

    productSize: number;
    productType: number;

    allowCutLines: boolean;

    currentPage: number;
    hasCoupons: boolean;
    currentCouponSize: string;
    isLoadingTemplate: boolean;

    allSidesEdited: boolean;
    backEdited: boolean;
    insideEdited: boolean;

    loadedFonts: Array<string>;
    allFonts: Array<string>;

    constructor() {
        this.orderNumber = 0;
        this.userId = 0;
        this.portalId = 0;

        this.membershiptype = 0;
        this.sessionId = '';
        this.defaultSide = '';
        this.marketingSeries = false;

        this.frontJSON = '';
        this.insideJSON = '';
        this.backJSON = '';
        this.envelopeJSON = '';

        this.frontTemplateID = 0;
        this.insideTemplateID = 0;
        this.backTemplateID = 0;
        this.envelopeTemplateID = 0;

        this.frontEditAllowed = false;
        this.insideEditAllowed = false;
        this.backEditAllowed = false;

        this.productSize = 0;
        this.productType = 0;

        this.allowCutLines = true;

        this.currentPage = 0;
        this.hasCoupons = false;
        this.currentCouponSize = '';

        this.isLoadingTemplate = false;

        this.allSidesEdited = false;
        this.backEdited = false;
        this.insideEdited = false;

        this.loadedFonts = [];
        this.allFonts = [];
    }
}

export const orderVars = OrderVars.instance;