declare namespace chrome {
    export namespace runtime {
        export function sendMessage(message: any, callback?: (response: any) => void): void;
        export const onMessage: {
            addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void | boolean): void;
        };
        export const onInstalled: {
            addListener(callback: () => void): void;
        };
    }
    export namespace alarms {
        export function create(name: string, alarmInfo: any): void;
        export const onAlarm: {
            addListener(callback: (alarm: any) => void): void;
        };
    }
    export namespace storage {
        export const local: {
            get(keys: string | string[] | Object | null, callback: (items: { [key: string]: any }) => void): void;
            set(items: Object, callback?: () => void): void;
        };
    }
}
