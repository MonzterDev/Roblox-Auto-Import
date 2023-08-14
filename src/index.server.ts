/// <reference types="@rbxts/types/plugin" />

import { AutocompleteCallback, DocumentChangeEvent } from "auto-import";
import { EDITOR_NAME } from "constants";
import { globals } from "global";
import { DisplayStateModule, GenerateStateModule, StateModule, documentClosedEvent } from "state";
import { RegisterScriptAddedEvents } from "utils";


const ScriptEditorService = game.GetService( "ScriptEditorService" );
const RunService = game.GetService( "RunService" );

const isTesting = RunService.IsRunning()

if ( !isTesting ) {
	globals.plugin = plugin
	const toolbar = plugin.CreateToolbar( "MyToolbar" );
	const button = toolbar.CreateButton( "MyButton", "", "" );

	button.Click.Connect( () => {
		DisplayStateModule()
	} );

	GenerateStateModule()

	const scriptAddedEvents = RegisterScriptAddedEvents()

	function cleanup () {
		ScriptEditorService.DeregisterAutocompleteCallback( EDITOR_NAME );
		DocumentChangeEvent.Disconnect()
		scriptAddedEvents.forEach( event => event.Disconnect() )
		documentClosedEvent.Disconnect()
		StateModule.Destroy()
	}

	plugin.Deactivation.Once( () => cleanup() )
	plugin.Unloading.Once( () => cleanup() )

	ScriptEditorService.RegisterAutocompleteCallback( EDITOR_NAME, 99, AutocompleteCallback )
}
