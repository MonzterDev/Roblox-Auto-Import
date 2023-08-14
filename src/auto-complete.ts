import { t } from '@rbxts/t';
import { EDITOR_NAME, MODULE_DIRECTORIES } from 'constants';

const ScriptEditorService = game.GetService( 'ScriptEditorService' );
const StudioService = game.GetService( 'StudioService' );

const services = game.GetChildren()
print( `Services:` )
print( services )

const moduleScripts = new Array<ModuleScript>();

function GetWordFromTypedText ( text: string, cursorChar: number ) {
	let startCharacter = cursorChar;
	let i = cursorChar - 1;

	while ( i >= 0 ) {
		const char = text.sub( i, i );
		if ( string.match( char, '%a' )[0] )
			startCharacter = i;
		else
			break;
		i--;
	}

	const currentWord = text.sub( startCharacter, cursorChar - 1 );
	return currentWord;
}

function IsAlreadyImported ( scriptContent: string, importString: string ) {
	const scriptLines = scriptContent.split( '\n' );
	const importLine = scriptLines.find( ( line ) => string.find( line, importString )[0] !== undefined );
	return importLine !== undefined;
}

function GetImportsFromTypedText ( text: string, scriptContent: string ) {
	const imports = new Array<ModuleScript>();
	moduleScripts.forEach( ( moduleScript ) => {
		const isImport = moduleScript.Name.find( text )[0] !== undefined;
		if ( !isImport ) return;

		const isImported = IsAlreadyImported( scriptContent, moduleScript.Name );
		if ( !isImported ) imports.push( moduleScript );
	} );

	return imports;
}

function GetServiceOfModule ( moduleScript: ModuleScript ) {
	for ( const service of services ) {
		if ( service.IsAncestorOf( moduleScript ) ) return service;
	}
}

function Import ( document: ScriptDocument, moduleScript: ModuleScript ) {
	const service = GetServiceOfModule( moduleScript );
	if ( service === undefined ) return;

	const moduleContents = document.GetText();

	const isServiceRequired = IsAlreadyImported( moduleContents, service.Name );
	if ( !isServiceRequired ) {
		const requireStatement = `local ${service.Name} = game.GetService("${service.Name}")`;
		document.EditTextAsync( `\n${requireStatement}`, 1, 0, 0, 0 );
	}

	const modulePath = GenerateModulePath( moduleScript, moduleScript.Name );
	const isModuleRequired = IsAlreadyImported( moduleContents, modulePath );
	if ( !isModuleRequired ) {
		const requireModuleStatement = `local ${moduleScript.Name} = require(${modulePath})`;
		document.EditTextAsync( `\n${requireModuleStatement}`, 3, 0, 0, 0 );
	}
}

function GenerateModulePath ( module: ModuleScript, moduleName: string ): string {
	const modulePathSegments = [];

	let currentParent = module.Parent;
	while ( currentParent !== undefined ) {
		if ( services.includes( currentParent ) ) {
			modulePathSegments.unshift( currentParent.Name );
			break;
		}
		modulePathSegments.unshift( currentParent.Name );
		currentParent = currentParent.Parent;
	}

	modulePathSegments.push( `${moduleName}` );
	return modulePathSegments.join( '.' );
}

export function AutocompleteCallback ( request: Request, response: Response ) {
	const doc = request.textDocument.document;
	if ( !doc ) return;

	const currentLine = doc.GetLine( request.position.line );
	const currentLineText = currentLine.sub( 0, request.position.character );

	const currentWord = GetWordFromTypedText( currentLineText, request.position.character );

	const currentScript = request.textDocument.document!.GetText();
	const imports = GetImportsFromTypedText( currentWord, currentScript );

	const replace = {
		start: {
			line: request.position.line,
			character: request.position.character - currentWord.size(),
		},
		end: {
			line: request.position.line,
			character: request.position.character,
		},
	};

	imports.forEach( ( moduleScript ) => {
		const field: ResponseItem = {
			label: moduleScript.Name,
			detail: `Require: ${moduleScript.Name}`,
			textEdit: {
				newText: moduleScript.Name,
				replace: replace,
			},
		};

		response.items.push( field );
	} );

	return response;
}

export function RegisterScriptAddedEvents () {
	game.GetDescendants().forEach( ( descendant ) => {
		if ( descendant.IsA( 'ModuleScript' ) ) {
			moduleScripts.push( descendant as ModuleScript );
		}
	} );

	const connections = new Array<RBXScriptConnection>();

	const descendantAdded = game.DescendantAdded.Connect( ( descendant ) => {
		if ( descendant.IsA( 'ModuleScript' ) ) {
			moduleScripts.push( descendant as ModuleScript );
		}
	} );
	const descendantRemoving = game.DescendantRemoving.Connect( ( descendant ) => {
		if ( descendant.IsA( 'ModuleScript' ) ) {
			const index = moduleScripts.findIndex( ( moduleScript ) => moduleScript === descendant );
			if ( index !== -1 ) moduleScripts.remove( index );
		}
	} );

	connections.push( descendantAdded, descendantRemoving );

	return connections;
}

export const DocumentChangeEvent = ScriptEditorService.TextDocumentDidChange.Connect( ( document, changes ) => {
	const isActiveScript = StudioService.ActiveScript?.Name === document.GetScript()?.Name;
	if ( !isActiveScript ) return;

	const changesArray = changes as ChangesArray;
	for ( const change of changesArray ) {
		moduleScripts.forEach( ( moduleScript ) => {
			if ( moduleScript.Name === change.text ) Import( document, moduleScript );
		} );
	}
} );

ScriptEditorService.RegisterAutocompleteCallback( EDITOR_NAME, 99, ( request: Request, response: Response ) => {
	const document = request.textDocument.document;
	if ( !document ) return;

	const currentLine = document.GetLine( request.position.line );
	const currentLineText = currentLine.sub( 0, request.position.character );

	const currentWord = GetWordFromTypedText( currentLineText, request.position.character );

	const currentScript = document.GetText();
	const imports = GetImportsFromTypedText( currentWord, currentScript );

	const replace = {
		start: {
			line: request.position.line,
			character: request.position.character - currentWord.size(),
		},
		end: {
			line: request.position.line,
			character: request.position.character,
		},
	};

	imports.forEach( ( moduleScript ) => {
		const field: ResponseItem = {
			label: moduleScript.Name,
			detail: `Require: ${moduleScript.Name}`,
			textEdit: {
				newText: moduleScript.Name,
				replace: replace,
			},
		};

		response.items.push( field );
	} );

	return response;
} );
