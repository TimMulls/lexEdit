// Full LexAppConfig singleton composable, ported from legacy code
class LexAppConfig {
  static _instance: LexAppConfig | null = null
  static get instance() {
    if (!this._instance) this._instance = new LexAppConfig()
    return this._instance
  }

  appType: string
  baseURL: string
  lexEditURL: string
  proofURL: string
  proofEnvURL: string
  proofMarketingSeriesURL: string
  WebData: string
  webAPIURL: string
  imgsURL: string
  templateURL: string
  appVersion: string
  showTextOutline: boolean
  isBeta: boolean
  DEBUG: boolean
  showGrid: boolean
  showCutLines: boolean
  cutLineWidth: number
  ImageClass: any
  ImageClassType: string
  extraKeys: Array<string>
  defaultPalette: Array<Array<string>>
  goldPalette: Array<string>
  silverPalette: Array<string>
  fontsCssFile: string
  AutoSaveDuration: number

  constructor() {
    this.appType = "ASR"
    // Use agentzmarketing.com in dev, else use current hostname
    let baseURL: string
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
      baseURL = "https://agentzmarketing.com/"
    } else {
      const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost"
      baseURL = "//" + hostname + "/"
    }
    this.baseURL = baseURL
    this.lexEditURL = this.baseURL + "DesktopModules/LexinetCustMod/WebControls/lexEdit2/"
    this.proofURL = this.baseURL + "Products/EditCard/Proof.aspx"
    this.proofEnvURL = this.baseURL + "Products/EditCard/ProofEnvelope.aspx"
    this.proofMarketingSeriesURL = this.baseURL + "Products/MarketingSeries/ProofSeries.aspx"
    this.WebData = this.baseURL + "ASRWebData/"
    this.webAPIURL = this.baseURL + "DesktopModules/EditorServices/API/LexEditor/"
    this.imgsURL = this.WebData + "Images/"
    this.templateURL = this.WebData + "Templates/"
    this.appVersion = "10.25.3.2346"
    this.showTextOutline = false
    this.isBeta = false
    this.DEBUG = false
    this.showGrid = false
    this.showCutLines = true
    this.cutLineWidth = 18
    // Fabric.js ImageClass: assign at runtime if needed
    this.ImageClass = null
    this.ImageClassType = "img"
    this.AutoSaveDuration = 30
    this.extraKeys = [
      // Canonical image metadata keys preserved for legacy SaveData (ensure serializer includes them)
      "ImgFull",
      "imgFull",
      "originalSrc",
      "_origSrc",
      "imgType",
      "ID",
      "LinkedObject",
      "PageNumber",
      "ObjectName",
      "ObjectType",
      "ObjectGroup",
      "ImageAlign",
      "autoFontSize",
      "WordBreak",
      "allowCuttedWords",
      "zIndex",
      "DisplayOrder",
      "minHeight",
      "ResourceType",
      "lockScalingX",
      "lockScalingY",
      "lockScalingFlip",
      "angle",
      "text",
      "orgWidth",
      "orgHeight",
      "orgLeft",
      "orgTop",
      "orgFontSize",
      "scale",
      "align",
      "SuppressPrinting",
      "textLines",
      "_styleMap",
      "left",
      "top",
      "width",
      "height",
    ]
    this.defaultPalette = [
      ["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)", "rgb(204, 204, 204)", "rgb(217, 217, 217)", "rgb(255, 255, 255)"],
      [
        "rgb(152, 0, 0)",
        "rgb(255, 0, 0)",
        "rgb(255, 153, 0)",
        "rgb(255, 255, 0)",
        "rgb(0, 255, 0)",
        "rgb(0, 255, 255)",
        "rgb(74, 134, 232)",
        "rgb(0, 0, 255)",
        "rgb(153, 0, 255)",
        "rgb(255, 0, 255)",
      ],
      [
        "rgb(230, 184, 175)",
        "rgb(244, 204, 204)",
        "rgb(252, 229, 205)",
        "rgb(255, 242, 204)",
        "rgb(217, 234, 211)",
        "rgb(208, 224, 227)",
        "rgb(201, 218, 248)",
        "rgb(207, 226, 243)",
        "rgb(217, 210, 233)",
        "rgb(234, 209, 220)",
        "rgb(221, 126, 107)",
        "rgb(234, 153, 153)",
        "rgb(249, 203, 156)",
        "rgb(255, 229, 153)",
        "rgb(182, 215, 168)",
        "rgb(162, 196, 201)",
        "rgb(164, 194, 244)",
        "rgb(159, 197, 232)",
        "rgb(180, 167, 214)",
        "rgb(213, 166, 189)",
        "rgb(204, 65, 37)",
        "rgb(224, 102, 102)",
        "rgb(246, 178, 107)",
        "rgb(255, 217, 102)",
        "rgb(147, 196, 125)",
        "rgb(118, 165, 175)",
        "rgb(109, 158, 235)",
        "rgb(111, 168, 220)",
        "rgb(142, 124, 195)",
        "rgb(194, 123, 160)",
        "rgb(166, 28, 0)",
        "rgb(204, 0, 0)",
        "rgb(230, 145, 56)",
        "rgb(241, 194, 50)",
        "rgb(106, 168, 79)",
        "rgb(69, 129, 142)",
        "rgb(60, 120, 216)",
        "rgb(61, 133, 198)",
        "rgb(103, 78, 167)",
        "rgb(166, 77, 121)",
        "rgb(91, 15, 0)",
        "rgb(102, 0, 0)",
        "rgb(120, 63, 4)",
        "rgb(127, 96, 0)",
        "rgb(39, 78, 19)",
        "rgb(12, 52, 61)",
        "rgb(28, 69, 135)",
        "rgb(7, 55, 99)",
        "rgb(32, 18, 77)",
        "rgb(76, 17, 48)",
      ],
    ]
    this.goldPalette = ["rgb(133, 117, 78)"]
    this.silverPalette = ["rgb(140, 143, 144)"]
    this.fontsCssFile = this.WebData + "fonts/fonts.css?v=" + this.appVersion
  }
}

// Nuxt composable to access the singleton LexAppConfig
export function useLexAppConfig() {
  return LexAppConfig.instance
}
