/// <reference types="@rbxts/types/plugin" />

import { AutocompleteCallback, Events } from "auto-import";
import { EDITOR_NAME } from "constants";
import { globals } from "global";
import { DisplayStateModule, GenerateStateModule, SaveData, StateModule } from "state";
import { RegisterScriptAddedEvents, SetModuleImports, SetServiceImports } from "utils";


const ScriptEditorService = game.GetService( "ScriptEditorService" );
const RunService = game.GetService( "RunService" );

const isTesting = RunService.IsRunning()

if ( !isTesting ) {
	globals.plugin = plugin

	const toolbar = plugin.CreateToolbar( "Auto Importer" );
	const button = toolbar.CreateButton( "Settings", "", "rbxassetid://1507949215" );
	button.ClickableWhenViewportHidden = true

	button.Click.Connect( () => {
		DisplayStateModule()
	} );

	GenerateStateModule()

	const scriptAddedEvents = RegisterScriptAddedEvents()

	const documentClosedEvent = ScriptEditorService.TextDocumentDidClose.Connect( ( oldDocument ) => {
		const wasSettingsDocument = oldDocument.Name === `AnalyticsService.${StateModule.Name}`
		if ( wasSettingsDocument ) {
			SaveData()
			SetModuleImports()
			SetServiceImports()
		}
	} )

	function cleanup () {
		ScriptEditorService.DeregisterAutocompleteCallback( EDITOR_NAME );
		for ( const [index, event] of pairs( Events ) )
			event.Disconnect()

		scriptAddedEvents.forEach( event => event.Disconnect() )
		documentClosedEvent.Disconnect()
		StateModule.Destroy()
	}

	plugin.Deactivation.Once( () => cleanup() )
	plugin.Unloading.Once( () => cleanup() )

	ScriptEditorService.RegisterAutocompleteCallback( EDITOR_NAME, 99, AutocompleteCallback )
}
