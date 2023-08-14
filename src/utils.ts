import { MODULE_DIRECTORIES } from "constants";
import { GetState } from "state";

export const services = new Array<Instance>();
export const moduleScripts = new Array<ModuleScript>();

export function IsAlreadyImported ( scriptContent: string, importString: string ) {
    const importStatement = `local ${importString}`
    const scriptLines = scriptContent.split( '\n' );
    const importLine = scriptLines.find( ( line ) => string.find( line, importStatement )[0] !== undefined );
    return importLine !== undefined;
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

export function GetImportsFromTypedText ( text: string, scriptContent: string ) {
    const imports: Imports = {
        modules: new Array<ModuleScript>(),
        services: new Array<Instance>(),
    }

    services.forEach( ( service ) => {
        const isImport = service.Name.find( text )[0] !== undefined;
        if ( !isImport ) return;

        const isImported = IsAlreadyImported( scriptContent, service.Name );
        if ( !isImported ) imports.services.push( service );
    } )

    moduleScripts.forEach( ( moduleScript ) => {
        const isImport = moduleScript.Name.find( text )[0] !== undefined;
        if ( !isImport ) return;

        const isImported = IsAlreadyImported( scriptContent, moduleScript.Name );
        if ( !isImported ) imports.modules.push( moduleScript );
    } );

    return imports;
}

export function GetServiceOfModule ( moduleScript: ModuleScript ) {
    for ( const service of services ) {
        if ( service.IsAncestorOf( moduleScript ) ) return service;
    }
}

export function GenerateModulePath ( module: ModuleScript ): string {
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

    modulePathSegments.push( `${module.Name}` );
    return modulePathSegments.join( '.' );
}

function AddModuleImport ( module: ModuleScript ) {
    const hasExcludedAncestor = GetState().exclude.ancestors.some( ancestorName => module.FindFirstAncestor( ancestorName ) !== undefined );
    if ( hasExcludedAncestor ) return;

    const isExcludedModule = GetState().exclude.modules.includes( module.Name )
    if ( isExcludedModule ) return;

    moduleScripts.push( module );
}

export function SetModuleImports () {
    moduleScripts.clear()
    MODULE_DIRECTORIES.forEach( ( directory ) => {
        const service = game.GetService( directory as never ) as Instance;
        service.GetDescendants().forEach( ( descendant ) => {
            if ( descendant.IsA( 'ModuleScript' ) ) AddModuleImport( descendant )
        } )
    } )
}

export function SetServiceImports () {
    services.clear()
    GetState().include.services.forEach( ( service ) => {
        const serviceInstance = game.GetService( service as never ) as Instance;
        if ( serviceInstance )
            services.push( serviceInstance );
    } )
}

export function RegisterScriptAddedEvents () {
    const connections = new Array<RBXScriptConnection>();

    MODULE_DIRECTORIES.forEach( ( directory ) => {
        const service = game.GetService( directory as never ) as Instance;
        if ( service === undefined ) return;

        const addedEvent = service.DescendantAdded.Connect( ( descendant ) => {
            if ( descendant.IsA( 'ModuleScript' ) ) AddModuleImport( descendant )
        } );

        const removingEvent = service.DescendantRemoving.Connect( ( descendant ) => {
            if ( descendant.IsA( 'ModuleScript' ) ) {
                const index = moduleScripts.indexOf( descendant as ModuleScript );
                if ( index !== -1 ) moduleScripts.remove( index )
            }
        } );

        connections.push( addedEvent, removingEvent );

        SetModuleImports()
        SetServiceImports()
    } )

    return connections;
}
