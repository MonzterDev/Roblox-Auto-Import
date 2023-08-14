export const EDITOR_NAME = "Auto-Import"

export const MODULE_DIRECTORIES = [
    'Workspace',
    'ReplicatedFirst',
    'ReplicatedStorage',
    'ServerScriptService',
    'ServerStorage',
    'StarterGui',
    'StarterPack',
    'StarterPlayerScripts',
    'StarterCharacterScripts',
] as const;

export const DEFAULT_STATE: SettingsState = {
    services: [
        "Players",
        "Lighting"
    ],
    ancestors: [
        "Cmdr"
    ],
    modules: [
        "Test"
    ]
}
