import Object from '@rbxts/object-utils';
import { ResponseItemClass } from 'ResponseItemClass';
import { EDITOR_NAME } from 'constants';
import { GetState } from 'state';
import { GetResponseItemsFromTypedText, GetWordFromTypedText, responseItems, CreateResponseItem, SetEditorContext, GetResponseItem } from 'utils';

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

function TryImportService ( document: ScriptDocument, response: ResponseItemClass ) {
	const scriptContents = document.GetText();
	const isServiceRequired = response.IsAlreadyImported( scriptContents );
	if ( isServiceRequired ) return

	const importStatement = response.GetImportStatement()
	const lineConfig = GetState().importLines.services
	const text = lineConfig.newLine === "Above" ? `\n${importStatement}` : `${importStatement}\n`
	const lastServiceLine = GetLastServiceLine( document )
	const [success, result] = pcall( () => document.EditTextAsync( text, lastServiceLine, lineConfig.start.character, lineConfig.finish.line, lineConfig.finish.character ) )
	if ( !success ) {
		warn( `${EDITOR_NAME}: ${result}` )
		print( `${EDITOR_NAME}: Did you mess up the import lines for Services?` )
	}
}

function TryImportModuleScript ( document: ScriptDocument, response: ResponseItemClass ) {
	const scriptContents = document.GetText();
	const isModuleRequired = response.IsAlreadyImported( scriptContents );
	if ( isModuleRequired ) return

	const service = response.serviceAncestor
	if ( service === undefined ) return;

	const serviceResponse = GetResponseItem( service )
	TryImportService( document, serviceResponse )

	const importStatement = response.GetImportStatement()
	const lineConfig = GetState().importLines.modules
	const text = lineConfig.newLine === "Above" ? `\n${importStatement}` : `${importStatement}\n`
	const lastServiceLine = GetLastServiceLine( document )
	const [success, result] = pcall( () => document.EditTextAsync( text, lastServiceLine + 1, lineConfig.start.character, lineConfig.finish.line, lineConfig.finish.character ) )
	if ( !success ) {
		warn( `${EDITOR_NAME}: ${result}` )
		print( `${EDITOR_NAME}: Did you mess up the import lines for Modules?` )
	}
}

// This is where we import based on the line of text created after User uses an auto-complete suggestion
function TryImport ( lineText: string, document: ScriptDocument ) {
	const response = Object.values( GetResponseItemsFromTypedText( lineText, document.GetText() ) ).find( ( response ) => response.textEdit.newText === lineText )
	if ( !response ) return;

	if ( response.type === "Module" )
		TryImportModuleScript( document, response )
	else
		TryImportService( document, response )
}

export function AutocompleteCallback ( request: Request, response: Response ) {
	const document = request.textDocument.document;
	if ( !document ) return response

	const currentLine = document.GetLine( request.position.line );
	const currentLineText = currentLine.sub( 0, request.position.character );

	const currentWord = GetWordFromTypedText( currentLineText, request.position.character );
	if ( currentWord.size() === 0 ) return response

	SetEditorContext()


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

	const currentScriptContents = document.GetText();
	const imports = GetResponseItemsFromTypedText( currentWord, currentScriptContents );
	for ( const [path, responseItem] of pairs( imports ) ) {
		responseItem.textEdit.replace = replace
		response.items.push( responseItem.GetResponseItem() );
	}

	return response;
}

export const Events = {
	DocumentChangeEvent: ScriptEditorService.TextDocumentDidChange.Connect( ( document, changes ) => {
		const isActiveScript = StudioService.ActiveScript?.Name === document.GetScript()?.Name;
		if ( !isActiveScript ) return;

		const changesArray = changes as ChangesArray;
		for ( const change of changesArray ) {
			TryImport( change.text, document )

			const inRangeOfModuleProps = change.range.start.line >= 0 && change.range.end.line <= 10
			if ( inRangeOfModuleProps )
				CreateResponseItem( document.GetScript() )
		}
	} ),
}
