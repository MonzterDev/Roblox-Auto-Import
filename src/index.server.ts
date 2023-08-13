/// <reference types="@rbxts/types/plugin" />

import { DocumentChangeEvent } from "auto-complete";
import { EDITOR_NAME } from "constants";

const ScriptEditorService = game.GetService( "ScriptEditorService" );

// const toolbar = plugin.CreateToolbar( "MyToolbar" );
// const button = toolbar.CreateButton("MyButton", "", "");

// button.Click.Connect( () => {
// 	print("Button clicked!");
// } );


plugin.Deactivation.Once( () => {
	ScriptEditorService.DeregisterAutocompleteCallback( EDITOR_NAME );
	DocumentChangeEvent.Disconnect()
} )
plugin.Unloading.Once( () => {
	ScriptEditorService.DeregisterAutocompleteCallback( EDITOR_NAME );
	DocumentChangeEvent.Disconnect()
} )
