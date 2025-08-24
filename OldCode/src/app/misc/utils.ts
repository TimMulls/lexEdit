import { fabric } from 'fabric';

/**
 * Extend an exiting method.
 *
 * @param shape
 * @param methodName
 * @param callback
 */
export function extendMethod<
    T extends typeof fabric.StaticCanvas | typeof fabric.Object | typeof fabric.Text,
    M extends MethodsName<T['prototype']>
>(shape: T, methodName: M, callback: (this: InstanceType<T>, ...args: any) => any) {
    const prototype = shape.prototype as T['prototype']
    const original = prototype[methodName] as unknown as Function
    return function (this: InstanceType<T>) {
        const result = original.apply(this, arguments)
        callback.call(this, result)
        return result
    }
}

/**
 * Create an extension.
 * @param callback
 */
export function extension(name: string, callback: (instance: typeof fabric) => void) {
    return function (instance: typeof fabric = window.fabric) {
        instance.util.installedExtensions = instance.util.installedExtensions || {}

        if (!instance.util.installedExtensions[name]) {
            callback(instance)
            instance.util.installedExtensions[name] = true
        }
    }
}

/**
 * Normalize the key combinations of shortcuts.
 *
 * @param keyCombination
 */
export const normalizeShortcutKey = (keyCombination: string) => {
    const keys = keyCombination
        .toLowerCase()
        .split('+')
        .map((a) => a.trim())
        .filter((a) => a)

    return normalizeEventKey({
        ctrlKey: keys.includes('ctrl'),
        metaKey: keys.includes('meta'),
        shiftKey: keys.includes('shift'),
        altKey: keys.includes('alt'),
        key: keys.find((key) => !['ctrl', 'shift', 'meta', 'alt'].includes(key)),
    })
}

/**
 * Normalize the key combinations of keyboard events.
 *
 * @param keyCombination
 */
export const normalizeEventKey = (event: {
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    altKey: boolean
    key?: string
}) => {
    return [
        event.ctrlKey || event.metaKey ? 'ctrl' : '',
        event.shiftKey ? 'shift' : '',
        event.altKey ? 'alt' : '',
        event.key || '',
    ]
        .filter((a) => a)
        .join('+')
        .toLowerCase()
        .trim()
}

declare module 'fabric' {
    namespace fabric {
        interface IUtil {
            installedExtensions: { [key: string]: boolean }
            initGuides(canvas: Canvas): void;
        }
    }
}

declare type PropsName<T> = Exclude<{ [K in keyof T]: T[K] extends Function ? never : K }[keyof T], undefined>
declare type OnlyProps<T> = Pick<T, PropsName<T>>
declare type MethodsName<T> = Exclude<{ [K in keyof T]: T[K] extends Function ? K : never }[keyof T], undefined>
declare type OnlyMethods<T> = Pick<T, MethodsName<T>>