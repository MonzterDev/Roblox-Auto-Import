import { DEFAULT_SERVICES } from "./imports";

export type SettingsModule = ModuleScript & SettingsState

export type ImportLine = {
    newLine: "Above" | "Below";
    start: { line: number; character: number };
    finish: { line: number; character: number };
}

export interface SettingsState {
    toggle: {
        caseSensitive: boolean,
    },
    exclude: {
        ancestors: Array<string>;
        modules: Array<string>;
    },
    include: {
        services: Array<string>;
    }
    importLines: {
        services: ImportLine,
        modules: ImportLine,
    },
}

export const DEFAULT_STATE: SettingsState = {
    toggle: {
        caseSensitive: false,
    },
    exclude: {
        ancestors: [
            "Cmdr"
        ],
        modules: [
            "Test"
        ]
    },
    include: {
        services: [...DEFAULT_SERVICES]
    },
    importLines: {
        services: {
            newLine: "Below",
            start: {
                line: 1,
                character: 1
            },
            finish: {
                line: 0,
                character: 0
            }
        },
        modules: {
            newLine: "Above",
            start: {
                line: 2,
                character: 1
            },
            finish: {
                line: 0,
                character: 0
            }
        },
    }
}
