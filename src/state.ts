import { t } from "@rbxts/t";
import { DEFAULT_STATE, EDITOR_NAME } from "constants"
import { globals } from "global";

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

function SetStateModuleSource () {
    StateModule.Source = `return {
    exclude = {
        ancestors = { -- This will exclude modules which are a descendant of the ancestors
            ${State.exclude.ancestors.map( ancestors => `"${ancestors}"` ).join( ",\n\t\t\t" )},
        },
        modules = { -- This will exclude modules matching this name
            ${State.exclude.modules.map( modules => `"${modules}"` ).join( ",\n\t\t\t" )},
        },
    },

    include = {
        services = { -- This will include services matching these names
            ${State.include.services.map( services => `"${services}"` ).join( ",\n\t\t\t" )},
        }
    }
}

-- Data will be saved upon closing this Module.`
}

function LoadData () {
    State = {
        exclude: {
            ancestors: globals.plugin.GetSetting( "exclude_ancestors" ) as Array<string> ?? DEFAULT_STATE.exclude.ancestors,
            modules: globals.plugin.GetSetting( "exclude_modules" ) as Array<string> ?? DEFAULT_STATE.exclude.modules,
        },
        include: {
            services: globals.plugin.GetSetting( "include_services" ) as Array<string> ?? DEFAULT_STATE.include.services,
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
    if ( !success ?? !stateModule! ) {
        warn( `${EDITOR_NAME}: ${response}` )
        print( `${EDITOR_NAME}: Did you mess up the settings table?` )
        print( `${EDITOR_NAME}: Your setting changes have been reverted.` )
        LoadData()
        return
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

    print( `${EDITOR_NAME}: Settings have been saved` )
}

export function GetState () {
    return State
}
