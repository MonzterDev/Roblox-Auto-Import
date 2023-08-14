import { MODULE_DIRECTORIES } from "constants";

export const services = game.GetChildren()
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

export function RegisterScriptAddedEvents () {
    const connections = new Array<RBXScriptConnection>();

    MODULE_DIRECTORIES.forEach( ( directory ) => {
        const service = game.GetService( directory as never ) as Instance;
        if ( service === undefined ) return;

        const addedEvent = service.DescendantAdded.Connect( ( descendant ) => {
            if ( descendant.IsA( 'ModuleScript' ) ) {
                moduleScripts.push( descendant as ModuleScript );
            }
        } );

        const removingEvent = service.DescendantRemoving.Connect( ( descendant ) => {
            if ( descendant.IsA( 'ModuleScript' ) ) {
                moduleScripts.push( descendant as ModuleScript );
            }
        } );

        connections.push( addedEvent, removingEvent );

        service.GetDescendants().forEach( ( descendant ) => {
            if ( descendant.IsA( 'ModuleScript' ) ) {
                moduleScripts.push( descendant as ModuleScript );
            }
        } )
    } )

    return connections;
}
