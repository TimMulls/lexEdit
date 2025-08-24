export type StorageType = 'session' | 'local';

export interface StorageItem {
    key: string;
    value: unknown;
}

export class Storage {
    private storageSource!:
        | WindowLocalStorage["localStorage"]
        | WindowSessionStorage["sessionStorage"];

    constructor(storageType: StorageType) {
        if (storageType === 'session') {
            this.storageSource = window.sessionStorage;
            return;
        }

        if (storageType === 'local') {
            this.storageSource = window.localStorage;
            return;
        }
    }

    public set(key: string, rawValue: any): void {
        const value = typeof rawValue === "string" ? rawValue : JSON.stringify(rawValue);
        this.storageSource.setItem(key, value);
    }

    public get(key: string, defaultVal?: any): any {
        const val = this.storageSource.getItem(key);

        if (typeof val !== 'string') {
            return val;
        }

        try {
            return JSON.parse(val);
        }
        catch (e) {
            return defaultVal;
        }
    }

    public remove(key: string): void {
        this.storageSource.removeItem(key);
    }

    public clear(): void {
        this.storageSource.clear();
    }

    public clean(): void {
        this.storageSource.removeItem('frontJSON');
        this.storageSource.removeItem('backJSON');
        this.storageSource.removeItem('insideJSON');
        this.storageSource.removeItem('docReferrer');
        this.storageSource.removeItem('orderNumber');
        this.storageSource.removeItem('sessionId');
        this.storageSource.removeItem('userId');
        this.storageSource.removeItem('frontThumb');
        this.storageSource.removeItem('backThumb');
        this.storageSource.removeItem('insideThumb');
    }

    public isSupported(): boolean {
        const key = "_simple-storage_test-key";

        try {
            // Disabling cookies can cause access to window.sessionStorage or window.localStorage to throw an exception
            if (typeof window === 'undefined' ||
                !window.sessionStorage ||
                !window.localStorage
            ) {
                return false;
            }

            // iOS in private mode causes exceptions when trying to write a new storage object, see
            // https://stackoverflow.com/questions/14555347/html5-localstorage-error-with-safari-quota-exceeded-err-dom-exception-22-an
            window.sessionStorage.setItem(key, "1");
            window.sessionStorage.removeItem(key);
        } catch (error) {
            return false;
        }

        return true;
    }
}

export const sessionStorage = new Storage('session');
export const localStorage = new Storage('local');