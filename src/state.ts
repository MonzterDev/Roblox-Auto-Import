import { t } from "@rbxts/t";
import { DEFAULT_STATE, EDITOR_NAME } from "constants"
import { globals } from "global";

const ScriptEditorService = game.GetService( "ScriptEditorService" );
const AnalyticsService = game.GetService( "AnalyticsService" );

export const StateModule = new Instance( "ModuleScript" )
export let State: SettingsState = DEFAULT_STATE

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
        services = { -- This will exclude specific services from being suggested
            ${State.services.map( service => `"${service}"` ).join( ",\n\t\t\t" )},
        },
        ancestors = { -- This will exclude modules which are a descendant of the ancestors
            ${State.ancestors.map( ancestors => `"${ancestors}"` ).join( ",\n\t\t\t" )},
        },
        modules = { -- This will exclude modules matching this name
            ${State.modules.map( modules => `"${modules}"` ).join( ",\n\t\t\t" )},
        },
    }
}

-- Data will be saved upon closing this Module.`
}

function LoadData () {
    State = {
        services: globals.plugin.GetSetting( "services" ) as Array<string> ?? DEFAULT_STATE.services,
        ancestors: globals.plugin.GetSetting( "ancestors" ) as Array<string> ?? DEFAULT_STATE.ancestors,
        modules: globals.plugin.GetSetting( "modules" ) as Array<string> ?? DEFAULT_STATE.modules,
    }
    SetStateModuleSource()
}

function SaveData ( scriptDocument: ScriptDocument ) {
    const stateModule = require( scriptDocument.GetScript() as ModuleScript ) as SettingsModule
    const exclude = stateModule.exclude

    for ( const [key, value] of pairs( exclude ) ) {
        if ( t.array( t.string )( value ) )
            globals.plugin.SetSetting( key, value )
    }
}

export const documentClosedEvent = ScriptEditorService.TextDocumentDidClose.Connect( ( oldDocument ) => {
    if ( oldDocument.Name === `AnalyticsService.${StateModule.Name}` ) {
        SaveData( oldDocument )
    }
} )
