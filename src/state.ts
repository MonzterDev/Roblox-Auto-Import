import { t } from "@rbxts/t";
import { EDITOR_NAME } from "constants/imports";
import { DEFAULT_STATE, ImportLine, SettingsModule, SettingsState } from "constants/settings";
import { globals } from "constants/global";

// I got the idea from Roblox-LSP :P

const ScriptEditorService = game.GetService( "ScriptEditorService" );
const AnalyticsService = game.GetService( "AnalyticsService" );

export let StateModule = new Instance( "ModuleScript" )
let State: SettingsState = DEFAULT_STATE

export function GenerateStateModule () {
    StateModule.Name = `${EDITOR_NAME}-Settings`
    StateModule.Parent = AnalyticsService
    LoadData()
}

export function DisplayStateModule () {
    ScriptEditorService.OpenScriptDocumentAsync( StateModule )
}

// Fix empty save data strings
function SetStateModuleSource () {
    StateModule.Source = `return {
    toggle = {
        caseSensitive = ${State.toggle.caseSensitive},
    },
    exclude = {
        ancestors = { -- This will exclude modules which are a descendant of the ancestors
            ${State.exclude.ancestors.map( ancestors => `"${ancestors}"` ).join( ",\n\t\t\t" )},
        },
        ancestorsTypes = { -- This will exclude modules which are a descendant of an ancestor with this type
            ${State.exclude.ancestorsTypes.map( types => `"${types}"` ).join( ",\n\t\t\t" )},
        },
        modules = { -- This will exclude modules matching this name
            ${State.exclude.modules.map( modules => `"${modules}"` ).join( ",\n\t\t\t" )},
        },
    },

    include = {
        services = { -- This will include services matching these names
            ${State.include.services.map( services => `"${services}"` ).join( ",\n\t\t\t" )},
        },
    },

    importLines = {
        services = { -- Reposition what line Services will be imported on.
            newLine = "${State.importLines.services.newLine}", -- Reposition the \n to create a line below or above.
            start = {
                line = ${State.importLines.services.start.line},
                character = ${State.importLines.services.start.character},
            },
            finish = {
                line = ${State.importLines.services.finish.line},
                character = ${State.importLines.services.finish.character},
            }
        },
        modules = { -- Reposition what line Modules will be imported on.
            newLine = "${State.importLines.modules.newLine}", -- Reposition the \n to create a line below or above.
            start = {
                line = ${State.importLines.modules.start.line},
                character = ${State.importLines.modules.start.character},
            },
            finish = {
                line = ${State.importLines.modules.finish.line},
                character = ${State.importLines.modules.finish.character},
            }
        },
    },
}

-- Data will be saved upon closing this Module.`
}

function LoadData () {
    State = {
        toggle: {
            caseSensitive: globals.plugin.GetSetting( "toggle_caseSensitive" ) as boolean ?? DEFAULT_STATE.toggle.caseSensitive,
        },
        exclude: {
            ancestors: globals.plugin.GetSetting( "exclude_ancestors" ) as Array<string> ?? DEFAULT_STATE.exclude.ancestors,
            modules: globals.plugin.GetSetting( "exclude_modules" ) as Array<string> ?? DEFAULT_STATE.exclude.modules,
            ancestorsTypes: globals.plugin.GetSetting( "exclude_ancestorsTypes" ) as Array<string> ?? DEFAULT_STATE.exclude.ancestorsTypes,
        },
        include: {
            services: globals.plugin.GetSetting( "include_services" ) as Array<string> ?? DEFAULT_STATE.include.services,
        },
        importLines: {
            services: globals.plugin.GetSetting( "importLines_services" ) as ImportLine ?? DEFAULT_STATE.importLines.services,
            modules: globals.plugin.GetSetting( "importLines_modules" ) as ImportLine ?? DEFAULT_STATE.importLines.modules,
        }
    }

    SetStateModuleSource()
}

export function SaveData () {
    const newModule = StateModule.Clone()
    newModule.Parent = AnalyticsService
    StateModule.Destroy()

    StateModule = newModule
    let stateModule: SettingsModule
    const [success, response] = pcall( () => stateModule = require( StateModule ) as SettingsModule ) // Must create another Module because old one doesn't update when required a second time.
    if ( !success || !stateModule! ) {
        warn( `${EDITOR_NAME}: ${response}` )
        print( `${EDITOR_NAME}: Did you mess up the settings table?` )
        print( `${EDITOR_NAME}: Your setting changes have been reverted.` )
        LoadData()
        return
    }

    for ( const [key, value] of pairs( stateModule.toggle ) ) {
        if ( t.boolean( value ) ) {
            globals.plugin.SetSetting( `toggle_${key}`, value )
            State.toggle[key] = value
        }
    }

    for ( const [key, value] of pairs( stateModule.exclude ) ) {
        if ( t.array( t.string )( value ) ) {
            globals.plugin.SetSetting( `exclude_${key}`, value )
            State.exclude[key] = value
        }
    }

    for ( const [key, value] of pairs( stateModule.include ) ) {
        if ( t.array( t.string )( value ) ) {
            globals.plugin.SetSetting( `include_${key}`, value )
            State.include[key] = value
        }
    }

    for ( const [key, value] of pairs( stateModule.importLines ) ) {
        globals.plugin.SetSetting( `importLines_${key}`, value )
        State.importLines[key] = value
    }

    print( `${EDITOR_NAME}: Settings have been saved` )
}

export function GetState () {
    return State
}
