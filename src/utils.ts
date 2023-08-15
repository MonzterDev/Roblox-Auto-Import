import { ResponseItemClass } from "ResponseItemClass";
import { CONTEXT_DIRECTORIES, EDITOR_NAME, MODULE_DIRECTORIES } from "constants/Imports";
import { Context } from "constants/ScriptEditor";
import { GetState } from "state";

const StudioService = game.GetService( 'StudioService' );

export const responseItems: Record<string, ResponseItemClass> = {}
export let scriptEditorContext: Context = "server"

export function CreateResponseItem ( instance: ModuleScript | Instance ) {
    responseItems[instance.GetFullName()] = new ResponseItemClass( instance );
}

export function GetResponseItem ( instance: ModuleScript | Instance ) {
    return responseItems[instance.GetFullName()]
}

export function DestroyResponseItem ( instance: ModuleScript | Instance ) {
    responseItems[instance.GetFullName()] = undefined as never
}

export function GetWordFromTypedText ( text: string, cursorChar: number ) {
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

export function SetEditorContext () {
    const activeScript = StudioService.ActiveScript
    if ( !activeScript ) return

    for ( const [key, values] of pairs( CONTEXT_DIRECTORIES ) ) {
        for ( const service of values ) {
            const foundAncestor = activeScript.FindFirstAncestorWhichIsA( service as never )
            if ( foundAncestor ) {
                scriptEditorContext = key;
                break;
            }
        }
    }
}

export function GetResponseItemsFromTypedText ( text: string, scriptContent: string ) {
    const imports: Record<string, ResponseItemClass> = {}

    for ( const [path, response] of pairs( responseItems ) ) {
        const isAnImport = response.label.find( text )[0] !== undefined;
        if ( !isAnImport ) continue;

        const isAlreadyImported = response.IsAlreadyImported( scriptContent )
        if ( isAlreadyImported ) continue

        const isContextCompatible = response.IsContextCompatible( scriptEditorContext )
        if ( !isContextCompatible ) continue

        imports[path] = response
    }
    return imports;
}

function AddModuleImport ( module: ModuleScript ) {
    const hasExcludedAncestor = GetState().exclude.ancestors.some( ancestorName => module.FindFirstAncestor( ancestorName ) !== undefined );
    if ( hasExcludedAncestor ) return;

    const isExcludedModule = GetState().exclude.modules.includes( module.Name )
    if ( isExcludedModule ) return;

    CreateResponseItem( module )
}

// Probably need to remove old Service imports
export function SetImports () {
    MODULE_DIRECTORIES.forEach( ( directory ) => {
        const service = game.GetService( directory as never ) as Instance;
        service.GetDescendants().forEach( ( descendant ) => {
            if ( descendant.IsA( 'ModuleScript' ) ) AddModuleImport( descendant )
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

export function RegisterScriptAddedEvents () {
    const connections = new Array<RBXScriptConnection>();

    MODULE_DIRECTORIES.forEach( ( directory ) => {
        const service = game.GetService( directory as never ) as Instance;
        if ( service === undefined ) return;

        const addedEvent = service.DescendantAdded.Connect( ( descendant ) => {
            if ( descendant.IsA( 'ModuleScript' ) )
                AddModuleImport( descendant )
        } );

        const removingEvent = service.DescendantRemoving.Connect( ( descendant ) => {
            if ( descendant.IsA( 'ModuleScript' ) )
                DestroyResponseItem( descendant )
        } );

        connections.push( addedEvent, removingEvent );
    } )

    SetImports()

    return connections;
}
