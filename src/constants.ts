export const EDITOR_NAME = "Auto-Import"

export const MODULE_DIRECTORIES = [
    'Workspace',
    'ReplicatedFirst',
    'ReplicatedStorage',
    'ServerScriptService',
    'ServerStorage',
    'StarterGui',
    'StarterPack',
    'StarterPlayer',
] as const;

export const DEFAULT_SERVICES = [
    "AssetService",
    "CollectionService",
    "ContextActionService",
    "DataStoreService",
    "Debris",
    "HttpService",
    "Lighting",
    "MarketplaceService",
    "MemoryStoreService",
    "MessagingService",
    "PathfindingService",
    "PhysicsService",
    "Players",
    "PolicyService",
    "ProximityPromptService",
    "ReplicatedFirst",
    "ReplicatedStorage",
    "RunService",
    "ServerScriptService",
    "ServerStorage",
    "StarterGui",
    "StarterPack",
    "StarterPlayer",
    "Teams",
    "TeleportService",
]

export const DEFAULT_STATE: SettingsState = {
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
