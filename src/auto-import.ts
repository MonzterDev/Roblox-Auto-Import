import { t } from '@rbxts/t';
import { EDITOR_NAME, MODULE_DIRECTORIES } from 'constants';
import { GenerateModulePath, GetImportsFromTypedText, GetServiceOfModule, GetWordFromTypedText, IsAlreadyImported, moduleScripts, services } from 'utils';

const ScriptEditorService = game.GetService( 'ScriptEditorService' );
const StudioService = game.GetService( 'StudioService' );

function ImportService ( document: ScriptDocument, service: Instance ) {
	const scriptContents = document.GetText();

	const isServiceRequired = IsAlreadyImported( scriptContents, service.Name );
	if ( !isServiceRequired ) {
		const requireStatement = `local ${service.Name} = game.GetService("${service.Name}")`;
		document.EditTextAsync( `${requireStatement}\n`, 1, 1, 0, 0 );
	}
}

function ImportModuleScript ( document: ScriptDocument, moduleScript: ModuleScript ) {
	const service = GetServiceOfModule( moduleScript );
	if ( service === undefined ) return;

	ImportService( document, service )

	const scriptContents = document.GetText();
	const modulePath = GenerateModulePath( moduleScript );
	const isModuleRequired = IsAlreadyImported( scriptContents, modulePath );
	if ( !isModuleRequired ) {
		const requireModuleStatement = `local ${moduleScript.Name} = require(${modulePath})`;
		document.EditTextAsync( `\n${requireModuleStatement}`, 2, 1, 0, 0 );
	}
}

function Import ( lineText: string, document: ScriptDocument ) {
	for ( const module of moduleScripts ) {
		if ( module.Name === lineText ) {
			print( "Module imported" )
			return ImportModuleScript( document, module )
		}
	}

	print( "Trying to import service" )
	print( lineText )
	for ( const service of services ) {
		print( service.Name )
		if ( service.Name === lineText ) {
			print( "IMPORT SERVICE" )
			return ImportService( document, service )
		}
	}
}


export function AutocompleteCallback ( request: Request, response: Response ) {
	const document = request.textDocument.document;
	if ( !document ) return;

	const currentLine = document.GetLine( request.position.line );
	const currentLineText = currentLine.sub( 0, request.position.character );

	const currentWord = GetWordFromTypedText( currentLineText, request.position.character );

	const currentScriptContents = document.GetText();
	const imports = GetImportsFromTypedText( currentWord, currentScriptContents );

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

	imports.services.forEach( ( service ) => {
		const field: ResponseItem = {
			label: service.Name,
			detail: `Require: ${service.Name}`,
			textEdit: {
				newText: service.Name,
				replace: replace,
			},
		};
		response.items.push( field );
	} )

	imports.modules.forEach( ( module ) => {
		const field: ResponseItem = {
			label: module.Name,
			detail: `Require: ${module.Name}`,
			textEdit: {
				newText: module.Name,
				replace: replace,
			},
		};
		response.items.push( field );
	} )

	return response;
}

export const DocumentChangeEvent = ScriptEditorService.TextDocumentDidChange.Connect( ( document, changes ) => {
	const isActiveScript = StudioService.ActiveScript?.Name === document.GetScript()?.Name;
	if ( !isActiveScript ) return;

	const changesArray = changes as ChangesArray;
	for ( const change of changesArray ) Import( change.text, document )
} );
