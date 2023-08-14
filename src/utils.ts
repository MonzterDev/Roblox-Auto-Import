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

    game.GetDescendants().forEach( ( descendant ) => {
        if ( descendant.IsA( 'ModuleScript' ) ) {
            moduleScripts.push( descendant as ModuleScript );
        }
    } );

    return connections;
}
