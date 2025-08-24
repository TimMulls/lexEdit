// CustomTextbox.ts
// Ported from legacy fabric.js customizations by TMullins
// Supports minHeight, allowCuttedWords, autoFontSize, and legacy wrapping logic
import { Textbox, Observable } from "fabric"

export class CustomTextbox extends Textbox {
  minHeight: number = 10
  allowCuttedWords: boolean = false
  autoFontSize: boolean = false
  // Preserve the original fontSize requested by API/props; we'll apply _fontSizeMult to the displayed size
  _rawFontSize?: number
  // Legacy fabric properties used in text measurement
  override _fontSizeMult: number = 1.13
  override _fontSizeFraction: number = 0.222
  // Legacy ID property for compatibility with old code
  ID?: string

  constructor(text: string, options: any = {}) {
    // Read multiplier overrides from options so we can apply them before Fabric initializes measurements
    // cannot access 'this' before super(); use class-default fallbacks here
    const localMult = options && typeof options._fontSizeMult === "number" ? options._fontSizeMult : 1.13
    const localFraction = options && typeof options._fontSizeFraction === "number" ? options._fontSizeFraction : 0.222
    // Determine raw font size requested (default to 24 if not provided)
    const rawFont = options && typeof options.fontSize === "number" ? options.fontSize : 24
    // Apply multiplier to the fontSize that will be used by fabric during initialization
    const appliedFont = Math.max(1, Math.round(rawFont * localMult * 100) / 100)
    // Ensure options is an object we can mutate safely
    options = { ...(options || {}), fontSize: appliedFont }
    // Keep original raw size for serialization
    options._rawFontSize = rawFont
    // Call Textbox constructor with modified options so fabric initializes with multiplied font
    super(text, options)
    // Store effective legacy settings on the instance
    this._fontSizeMult = localMult
    this._fontSizeFraction = localFraction
    this._rawFontSize = options._rawFontSize
    // allow overriding other properties
    if (typeof options.minHeight === "number") this.minHeight = options.minHeight
    if (typeof options.allowCuttedWords === "boolean") this.allowCuttedWords = options.allowCuttedWords
    if (typeof options.autoFontSize === "boolean") this.autoFontSize = options.autoFontSize
    // Debug: log construction-time sizing parameters so we can verify behavior at runtime
    try {
      console.debug("[CustomTextbox] constructed", {
        text: text?.slice?.(0, 40),
        fontSize: (this as any).fontSize,
        _rawFontSize: (this as any)._rawFontSize,
        autoFontSize: (this as any).autoFontSize,
        _fontSizeMult: (this as any)._fontSizeMult,
        _fontSizeFraction: (this as any)._fontSizeFraction,
        height: (this as any).height,
        width: (this as any).width,
      })
    } catch (e) {
      // ignore
    }
  }

  // Override initDimensions to support minHeight and autoFontSize
  override initDimensions() {
    if ((this as any).__skipDimension) return
    if ((this as any).isEditing && typeof (this as any).initDelayedCursor === "function") (this as any).initDelayedCursor()
    if (typeof (this as any).clearContextTop === "function") (this as any).clearContextTop()
    if (typeof (this as any)._clearCache === "function")
      (this as any)._clearCache()
      // clear dynamicMinWidth as it will be different after we re-wrap line
    ;(this as any).dynamicMinWidth = 0
    // wrap lines
    ;(this as any)._styleMap = (this as any)._generateStyleMap((this as any)._splitText())

    // Legacy: autoFontSize logic
    if ((this as any).autoFontSize && (this as any).fontSize > 12) {
      try {
        console.debug("[CustomTextbox] initDimensions autoFontSize start", {
          fontSize: (this as any).fontSize,
          height: (this as any).height,
          calcTextHeight: (this as any).calcTextHeight(),
          _fontSizeMult: (this as any)._fontSizeMult,
        })
      } catch (e) {}
      let txtHeight = (this as any).calcTextHeight()
      while (txtHeight > ((this as any).height ?? 0) && (this as any).fontSize > 12) {
        ;(this as any).fontSize = (this as any).fontSize - 0.5
        ;(this as any)._styleMap = (this as any)._generateStyleMap((this as any)._splitText())
        if (typeof (this as any)._clearCache === "function") (this as any)._clearCache()
        txtHeight = (this as any).calcTextHeight()
      }
      try {
        console.debug("[CustomTextbox] initDimensions autoFontSize finish", {
          fontSize: (this as any).fontSize,
          finalCalcTextHeight: (this as any).calcTextHeight(),
        })
      } catch (e) {}
      ;(this as any).autoFontSize = false
    }

    if ((this as any).height < (this as any).minHeight) {
      ;(this as any).height = (this as any).minHeight
    } else if ((this as any).height > (this as any).calcTextHeight() && (this as any).calcTextHeight() < (this as any).minHeight) {
      ;(this as any).height = (this as any).minHeight
    }
    if ((this as any).calcTextHeight() > (this as any).height) {
      ;(this as any).height = (this as any).calcTextHeight()
    }
    if (typeof (this as any).saveState === "function") (this as any).saveState({ propertySet: "_dimensionAffectingProps" })
  }

  // Optionally, override _wrapLine to support allowCuttedWords if needed
  // (Fabric.js v6 may have changed internals, so this is a minimal port)

  // Use legacy font-size multiplier when measuring line height
  override getHeightOfLine(lineIndex: number) {
    const anyThis: any = this as any
    anyThis.__lineHeights = anyThis.__lineHeights || []
    if (anyThis.__lineHeights[lineIndex]) return anyThis.__lineHeights[lineIndex]

    const line = anyThis._textLines ? anyThis._textLines[lineIndex] : []
    let maxHeight = this.getHeightOfChar(lineIndex, 0)
    if (line) {
      for (let i = 1; i < line.length; i++) {
        maxHeight = Math.max(this.getHeightOfChar(lineIndex, i), maxHeight)
      }
    }

    anyThis.__lineHeights[lineIndex] = maxHeight * (this.lineHeight as number) * this._fontSizeMult
    return anyThis.__lineHeights[lineIndex]
  }

  // Use legacy calcTextHeight that relies on getHeightOfLine
  override calcTextHeight() {
    const anyThis: any = this as any
    let height = 0
    const lines = anyThis._textLines || []
    for (let i = 0, len = lines.length; i < len; i++) {
      const lineHeight = this.getHeightOfLine(i)
      height += i === len - 1 ? lineHeight / (this.lineHeight as number) : lineHeight
    }
    return height
  }

  // Provide SVG line offset calculation that matches legacy math
  _getSVGLineTopOffset(lineIndex: number) {
    let lineTop = 0
    for (let i = 0; i < lineIndex; i++) {
      lineTop += this.getHeightOfLine(i)
    }
    const lastHeight = this.getHeightOfLine(lineIndex)
    const offset = ((this._fontSizeMult - this._fontSizeFraction) * lastHeight) / ((this.lineHeight as number) * this._fontSizeMult)
    return { lineTop, offset }
  }

  // Ensure autoFontSize and legacy multipliers are preserved when serializing
  override toObject(...args: any[]) {
    const base: any = (Textbox.prototype as any).toObject.apply(this, args)
    base.autoFontSize = (this as any).autoFontSize
    base._fontSizeMult = (this as any)._fontSizeMult
    base._fontSizeFraction = (this as any)._fontSizeFraction
    // Serialize the original fontSize the API provided (not the multiplied display size)
    if ((this as any)._rawFontSize) base.fontSize = (this as any)._rawFontSize
    return base
  }
}

// Register globally if needed
