import Object from '@rbxts/object-utils';
import { ResponseItemClass } from 'responseItemClass';
import { CONTEXT_DIRECTORIES, EDITOR_NAME, MODULE_DIRECTORIES } from 'constants/imports';
import { Context, LineChange, Request, Response } from 'constants/scriptEditor';
import { GetState, StateModule } from 'state';
import { CreateResponseItem, DestroyResponseItem, DestroyResponseItemByName, GetResponseItem, moduleEvents, responseItems } from 'responseItems';

const ScriptEditorService = game.GetService( 'ScriptEditorService' );
const StudioService = game.GetService( 'StudioService' );

export let scriptEditorContext: Context = "server"

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

function SetEditorContext () {
	const activeScript = StudioService.ActiveScript
	if ( !activeScript ) return

	const contextDirectories = GetState().context ?? CONTEXT_DIRECTORIES
	for ( const [key, values] of pairs( contextDirectories ) ) {
		for ( const service of values ) {
			const foundAncestor = activeScript.FindFirstAncestorWhichIsA( service as never )
			if ( foundAncestor ) {
				scriptEditorContext = key;
				break;
			}
		}
	}
}

function GetResponseItemsFromTypedText ( text: string, scriptContent: string ) {
	const imports: Record<string, ResponseItemClass> = {}
	const isCaseSensitive = GetState().toggle.caseSensitive;

	if ( text === "[" || text === "]" || text === "[]" ) return imports

	for ( const [path, response] of pairs( responseItems ) ) {
		const textToMatch = isCaseSensitive ? text : text.lower();
		const responseText = isCaseSensitive ? response.detail : response.detail.lower();
		const isAnImport = responseText.find( textToMatch )[0] !== undefined;
		if ( !isAnImport ) continue;

		const isAlreadyImported = response.IsAlreadyImported( scriptContent )
		if ( isAlreadyImported ) continue

		const isContextCompatible = response.IsContextCompatible( scriptEditorContext )
		if ( !isContextCompatible ) continue

		imports[path] = response
	}

	return imports;
}

function CreateModuleImport ( module: ModuleScript ) {
	const hasExcludedAncestor = GetState().exclude.ancestors.some( ancestorName => module.FindFirstAncestor( ancestorName ) !== undefined );
	if ( hasExcludedAncestor ) return;

	const hasExcludedAncestorType = GetState().exclude.ancestorsTypes.some( ancestorType => module.FindFirstAncestorWhichIsA( ancestorType as never ) !== undefined );
	if ( hasExcludedAncestorType ) return;

	const isExcludedModule = GetState().exclude.modules.includes( module.Name )
	if ( isExcludedModule ) return;

	CreateResponseItem( module )

	const previousKey = module.GetFullName()
	const ancestryChanged = module.AncestryChanged.Once( ( child, newParent ) => {
		DestroyResponseItemByName( previousKey )
		CreateModuleImport( child as ModuleScript )
	} )
	moduleEvents[previousKey] = ancestryChanged
}

// Probably need to remove old Service imports
export function SetImports () {
	MODULE_DIRECTORIES.forEach( ( directory ) => {
		const service = game.GetService( directory as never ) as Instance;
		service.GetDescendants().forEach( ( descendant ) => {
			if ( descendant.IsA( 'ModuleScript' ) ) {
				CreateModuleImport( descendant )
			}
		} )
	} )

	GetState().include.services.forEach( ( service ) => {
		let serviceInstance: Instance
		const [success, response] = pcall( () => serviceInstance = game.GetService( service as never ) as Instance )
		if ( !success ) {
			warn( `${EDITOR_NAME}: ${response}` )
			print( `${EDITOR_NAME}: Did you spell the name correctly?` );
		}

		if ( success && serviceInstance! ) {
			CreateResponseItem( serviceInstance )
		}
	} )
}

function TryImportService ( document: ScriptDocument, response: ResponseItemClass ) {
	const scriptContents = document.GetText();
	const isServiceRequired = response.IsAlreadyImported( scriptContents );
	if ( isServiceRequired ) return

	response.Import( document )
}

function TryImportModuleScript ( document: ScriptDocument, response: ResponseItemClass ) {
	const scriptContents = document.GetText();
	const isModuleRequired = response.IsAlreadyImported( scriptContents );
	if ( isModuleRequired ) return

	const service = response.serviceAncestor
	if ( service === undefined ) return;

	const serviceResponse = GetResponseItem( service )
	TryImportService( document, serviceResponse )

	response.Import( document )
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
	if ( !document || document.Name === "CommandBar" ) return response

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

export function RegisterScriptEvents () {
	const connections = new Array<RBXScriptConnection>();

	MODULE_DIRECTORIES.forEach( ( directory ) => {
		const service = game.GetService( directory as never ) as Instance;
		if ( service === undefined ) return;

		const addedEvent = service.DescendantAdded.Connect( ( descendant ) => {
			if ( descendant.IsA( 'ModuleScript' ) ) {
				CreateModuleImport( descendant )
			}
		} );

		const removingEvent = service.DescendantRemoving.Connect( ( descendant ) => {
			if ( descendant.IsA( 'ModuleScript' ) ) {
				DestroyResponseItem( descendant )
			}
		} );

		connections.push( addedEvent, removingEvent );
	} )

	const documentChangeEvent = ScriptEditorService.TextDocumentDidChange.Connect( ( document, changes ) => {
		const activeScriptName = StudioService.ActiveScript?.Name;
		const isActiveScript = activeScriptName === document.GetScript()?.Name;
		if ( !isActiveScript || activeScriptName === undefined ) return;

		const changesArray = changes as Array<LineChange>;
		for ( const change of changesArray ) {
			TryImport( change.text, document )

			const inRangeOfModuleProps = change.range.start.line >= 0 && change.range.end.line <= 10
			if ( inRangeOfModuleProps )
				CreateResponseItem( document.GetScript() )
		}
	} )

	connections.push( documentChangeEvent )

	SetImports()

	return connections;
}
