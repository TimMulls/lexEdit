import { extendMethod, extension } from '../misc/utils'
// @ts-expect-error missing d file
import initCenteringGuidelines from 'fabric/lib/centering_guidelines'
// @ts-expect-error missing d file
import initAligningGuidelines from 'fabric/lib/aligning_guidelines'

export default extension('canvas.guidelines', (fabric) => {
    fabric.util.object.extend(fabric.Canvas.prototype, {
        // @ts-expect-error initialize exists just not in type file
        initialize: extendMethod(fabric.Canvas, 'initialize', function () {
            initAligningGuidelines(this)
            initCenteringGuidelines(this)
        }),
        setDimensions: extendMethod(fabric.Canvas, 'setDimensions', function () {
            this.fire('after:dimensions', {})
        }),
        setZoom: extendMethod(fabric.Canvas, 'setZoom', function () {
            this.fire('after:dimensions', {})
        }),
    })
})