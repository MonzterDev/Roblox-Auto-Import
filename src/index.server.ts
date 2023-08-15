/// <reference types="@rbxts/types/plugin" />

import { AutocompleteCallback, RegisterScriptEvents, SetImports } from "autoImport";
import { EDITOR_NAME } from "constants/imports";
import { globals } from "constants/global";
import { DisplayStateModule, GenerateStateModule, SaveData, StateModule } from "state";


const ScriptEditorService = game.GetService( "ScriptEditorService" );
const RunService = game.GetService( "RunService" );

const isTesting = RunService.IsRunning()

if ( !isTesting ) {
	globals.plugin = plugin

	const toolbar = plugin.CreateToolbar( "Auto Importer" );

	const settingsButton = toolbar.CreateButton( "Settings", "", "rbxassetid://14442903039" );
	settingsButton.ClickableWhenViewportHidden = true
	settingsButton.Click.Connect( () => DisplayStateModule() );

	GenerateStateModule()

	const scriptAddedEvents = RegisterScriptEvents()

	const documentClosedEvent = ScriptEditorService.TextDocumentDidClose.Connect( ( oldDocument ) => {
		const wasSettingsDocument = oldDocument.Name === `AnalyticsService.${StateModule.Name}`
		if ( wasSettingsDocument ) {
			SaveData()
			SetImports()
		}
	} )

	function cleanup () {
		ScriptEditorService.DeregisterAutocompleteCallback( EDITOR_NAME );

		scriptAddedEvents.forEach( event => event.Disconnect() )
		documentClosedEvent.Disconnect()
		StateModule.Destroy()
	}

	plugin.Deactivation.Once( () => cleanup() )
	plugin.Unloading.Once( () => cleanup() )

	ScriptEditorService.RegisterAutocompleteCallback( EDITOR_NAME, 99, AutocompleteCallback )
}
