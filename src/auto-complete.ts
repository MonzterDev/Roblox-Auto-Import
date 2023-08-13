import { EDITOR_NAME } from 'constants';

const ScriptEditorService = game.GetService( 'ScriptEditorService' );
const StudioService = game.GetService( 'StudioService' );

const DIRECTORIES = [
	'Workspace',
	'ReplicatedFirst',
	'ReplicatedStorage',
	'ServerScriptService',
	'ServerStorage',
	'StarterGui',
	'StarterPack',
	'StarterPlayerScripts',
	'StarterCharacterScripts',
] as const;

const services = DIRECTORIES.map( ( directory ) => game.GetService( directory as never ) ) as Array<Instance>;

const moduleScripts = new Array<ModuleScript>();

services.forEach( ( service ) => {
	service.GetDescendants().forEach( ( child ) => {
		if ( child.IsA( 'ModuleScript' ) ) {
			moduleScripts.push( child as ModuleScript );
		}
	} );

	service.DescendantAdded.Connect( ( child ) => {
		if ( child.IsA( 'ModuleScript' ) ) {
			moduleScripts.push( child as ModuleScript );
		}
	} );
} );

function GetWordFromTypedText ( text: string, cursorChar: number ) {
	let startCharacter = cursorChar;
	let i = cursorChar - 1;

	while ( i >= 0 ) {
		const char = text.sub( i, i );
		if ( string.match( char, '%a' )[0] ) {
			startCharacter = i;
		} else {
			print( 'end char:', char );
			break;
		}
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
