/// <reference types="@rbxts/types/plugin" />

import { AutocompleteCallback, DocumentChangeEvent } from "auto-import";
import { EDITOR_NAME } from "constants";
import { RegisterScriptAddedEvents } from "utils";

const ScriptEditorService = game.GetService( "ScriptEditorService" );

// const toolbar = plugin.CreateToolbar( "MyToolbar" );
// const button = toolbar.CreateButton("MyButton", "", "");

// button.Click.Connect( () => {
// 	print("Button clicked!");
// } );

const scriptAddedEvents = RegisterScriptAddedEvents()

function cleanup () {
	ScriptEditorService.DeregisterAutocompleteCallback( EDITOR_NAME );
	DocumentChangeEvent.Disconnect()
	scriptAddedEvents.forEach( event => event.Disconnect() )
}

plugin.Deactivation.Once( () => cleanup() )
plugin.Unloading.Once( () => cleanup() )

ScriptEditorService.RegisterAutocompleteCallback( EDITOR_NAME, 99, AutocompleteCallback )
