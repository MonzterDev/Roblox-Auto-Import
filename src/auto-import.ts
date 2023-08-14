import { EDITOR_NAME } from 'constants';
import { GetState } from 'state';
import { GetResponseItemsFromTypedText, GetServiceOfModule, GetWordFromTypedText, IsAlreadyImported, moduleScripts, services, CreateImportStatement, responseItems, CreateResponseItem } from 'utils';

const ScriptEditorService = game.GetService( 'ScriptEditorService' );
const StudioService = game.GetService( 'StudioService' );

function GetLastServiceLine ( document: ScriptDocument ) {
	const lines = document.GetText().split( "\n" );
	for ( const [index, line] of pairs( lines ) ) {
		const cleanedLine = string.gsub( line, '\n', '' )[0];
		if ( !cleanedLine.find( "game:GetService" )[0] )
			return index
	}
	return 1
}



function ImportService ( document: ScriptDocument, service: Instance ) {
	const scriptContents = document.GetText();

	const importStatement = CreateImportStatement( service )
	const isServiceRequired = IsAlreadyImported( scriptContents, importStatement );
	const lineConfig = GetState().importLines.services
	if ( !isServiceRequired ) {
		const text = lineConfig.newLine === "Above" ? `\n${importStatement}` : `${importStatement}\n`
		const lastServiceLine = GetLastServiceLine( document )
		const [success, result] = pcall( () => document.EditTextAsync( text, lastServiceLine, lineConfig.start.character, lineConfig.finish.line, lineConfig.finish.character ) )
		if ( !success ) {
			warn( `${EDITOR_NAME}: ${result}` )
			print( `${EDITOR_NAME}: Did you mess up the import lines for Services?` )
		}
	}
}

function ImportModuleScript ( document: ScriptDocument, moduleScript: ModuleScript ) {
	const service = GetServiceOfModule( moduleScript );
	if ( service === undefined ) return;

	ImportService( document, service )

	const scriptContents = document.GetText();
	const importStatement = CreateImportStatement( moduleScript )
	const isModuleRequired = IsAlreadyImported( scriptContents, importStatement );
	const lineConfig = GetState().importLines.modules
	if ( !isModuleRequired ) {
		const text = lineConfig.newLine === "Above" ? `\n${importStatement}` : `${importStatement}\n`
		const lastServiceLine = GetLastServiceLine( document )
		const [success, result] = pcall( () => document.EditTextAsync( text, lastServiceLine + 1, lineConfig.start.character, lineConfig.finish.line, lineConfig.finish.character ) )
		if ( !success ) {
			warn( `${EDITOR_NAME}: ${result}` )
			print( `${EDITOR_NAME}: Did you mess up the import lines for Modules?` )
		}
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
	const imports = GetResponseItemsFromTypedText( currentWord, currentScriptContents );

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

	for ( const [path, item] of pairs( imports ) ) {
		const responseItem = responseItems[path];
		if ( !responseItem ) return;

		responseItem.textEdit = {
			newText: item.label,
			replace: replace,
		}

		response.items.push( responseItem );
	}

	return response;
}

export const DocumentChangeEvent = ScriptEditorService.TextDocumentDidChange.Connect( ( document, changes ) => {
	const isActiveScript = StudioService.ActiveScript?.Name === document.GetScript()?.Name;
	if ( !isActiveScript ) return;

	const changesArray = changes as ChangesArray;
	for ( const change of changesArray ) {
		Import( change.text, document )

		const inRangeOfModuleProps = change.range.start.line >= 0 && change.range.end.line <= 10
		if ( inRangeOfModuleProps )
			CreateResponseItem( document.GetScript() )
	}
} );
