import { GetModulePath, GetImportsFromTypedText, GetServiceOfModule, GetWordFromTypedText, IsAlreadyImported, moduleScripts, services, CreateImportStatement } from 'utils';

const ScriptEditorService = game.GetService( 'ScriptEditorService' );
const StudioService = game.GetService( 'StudioService' );

function ImportService ( document: ScriptDocument, service: Instance ) {
	const scriptContents = document.GetText();

	const importStatement = CreateImportStatement( service )
	const isServiceRequired = IsAlreadyImported( scriptContents, importStatement );
	if ( !isServiceRequired ) {
		document.EditTextAsync( `${importStatement}\n`, 1, 1, 0, 0 );
	}
}

function ImportModuleScript ( document: ScriptDocument, moduleScript: ModuleScript ) {
	const service = GetServiceOfModule( moduleScript );
	if ( service === undefined ) return;

	ImportService( document, service )

	const scriptContents = document.GetText();
	const importStatement = CreateImportStatement( moduleScript )
	const isModuleRequired = IsAlreadyImported( scriptContents, importStatement );
	if ( !isModuleRequired ) {
		document.EditTextAsync( `\n${importStatement}`, 2, 1, 0, 0 );
	}
}

function Import ( lineText: string, document: ScriptDocument ) {
	for ( const module of moduleScripts ) {
		if ( module.Name === lineText ) {
			return ImportModuleScript( document, module )
		}
	}

	for ( const service of services ) {
		if ( service.Name === lineText ) {
			return ImportService( document, service )
		}
	}
}


export function AutocompleteCallback ( request: Request, response: Response ) {
	const document = request.textDocument.document;
	if ( !document ) return response

	const currentLine = document.GetLine( request.position.line );
	const currentLineText = currentLine.sub( 0, request.position.character );

	const currentWord = GetWordFromTypedText( currentLineText, request.position.character );
	if ( currentWord.size() === 0 ) return response

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
