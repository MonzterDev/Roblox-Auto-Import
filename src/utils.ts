import { t } from "@rbxts/t";
import { EDITOR_NAME, MODULE_DIRECTORIES } from "constants";
import { GetState } from "state";

export const services = new Array<Instance>();
export const moduleScripts = new Array<ModuleScript>();
export const responseItems: Record<string, ResponseItem> = {}

const RESPONSE_PROPERTIES = ["kind", "tags", "detail", "overloads", "learnMoreLink", "codeSample", "preselect", "textEdit.newText", "documentation"] as const;

function UpdateResponseProperty ( response: ResponseItem, prop: string, value: string ) {
    switch ( prop ) {
        case 'detail':
        case 'learnMoreLink':
        case 'codeSample':
            response[prop] = value;
            break;
        // case 'textEdit.newText': {
        //     const newText = response.textEdit?.newText
        //     if ( newText ) response.textEdit!.newText = value;
        //     break;
        // }
        case 'kind': // Doesn't seem to work
            response.kind = Enum.CompletionItemKind.GetEnumItems().find( ( item ) => `Enum.CompletionItemKind.${item.Name}` === value ) ?? Enum.CompletionItemKind.Color;
            break;
        case 'overloads':
            response.overloads = tonumber( value )
            break;
        case 'preselect':
            response.preselect = value.lower() === 'true';
            break;
        case 'documentation':
            response.documentation = { value: value }
            break;
        // Handle other properties here
    }
}

export function CreateResponseItem ( module: ModuleScript | Instance ) {
    const response = responseItems[module.GetFullName()] ?? {
        label: module.Name,
        kind: Enum.CompletionItemKind.Class,
        detail: `Import ${module.Name}`,
        documentation: {
            value: `Create a variable for the ${module.Name.find( "Service" )[0] ? module.Name : module.Name + " service"}.`
        },
        overloads: 0,
        learnMoreLink: "",
        codeSample: "",
        preselect: false,
        textEdit: {
            newText: "",
            replace: { start: { line: 0, character: 0 }, ["end"]: { line: 0, character: 0 } }
        }
    };

    if ( t.instanceOf( "ModuleScript" )( module ) ) {
        response.kind = Enum.CompletionItemKind.Module;

        let loops = 0
        for ( const line of module.Source.split( "\n" ) ) {
            if ( loops >= 10 ) break
            loops++

            const lowerLine = line.lower();

            for ( const property of RESPONSE_PROPERTIES ) {
                const propertyIndex = lowerLine.find( `--${property.lower()}:` )[0];
                if ( propertyIndex ) {
                    const startIndex = lowerLine.find( '"', propertyIndex )[0] || lowerLine.find( "'", propertyIndex )[0];
                    if ( startIndex ) {
                        const endIndex = lowerLine.find( '"', startIndex + 1 )[0] || lowerLine.find( "'", startIndex + 1 )[0];
                        if ( endIndex ) {
                            const extractedValue = string.sub( line, startIndex + 1, endIndex - 1 );
                            UpdateResponseProperty( response, property, extractedValue );
                        }
                    }
                }
            }
        }
    }

    responseItems[module.GetFullName()] = response;
}

export function IsAlreadyImported ( scriptContent: string, importString: string ) {
    const scriptLines = scriptContent.split( '\n' );
    for ( const line of scriptLines ) {
        const cleanedLine = string.gsub( line, '\n', '' )[0];
        if ( cleanedLine.size() === 0 ) continue

        const cleanedImportString = string.gsub( importString, '\n', '' )[0];
        if ( cleanedImportString === cleanedLine )
            return true;
    }
    return false;
}

export function CreateImportStatement ( object: ModuleScript | Instance ) {
    if ( object.IsA( "ModuleScript" ) ) return `local ${object.Name} = require(${object.GetFullName()})` // COME BACK TO
    else return `local ${object.Name} = game:GetService("${object.Name}")`
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

export function GetResponseItemsFromTypedText ( text: string, scriptContent: string ) {
    const imports: Record<string, ResponseItem> = {}

    for ( const [path, response] of pairs( responseItems ) ) {
        const isImport = response.label.find( text )[0] !== undefined;
        if ( !isImport ) continue;

        const instance = services.find( ( service ) => service.GetFullName() === path ) ?? moduleScripts.find( ( module ) => module.GetFullName() === path )
        if ( !instance ) continue

        const importStatement = CreateImportStatement( instance )
        const isImported = IsAlreadyImported( scriptContent, importStatement );
        if ( !isImported ) imports[path] = response;
    }

    return imports;
}

export function GetServiceOfModule ( moduleScript: ModuleScript ) {
    for ( const service of services ) {
        if ( service.IsAncestorOf( moduleScript ) ) return service;
    }
}

function AddModuleImport ( module: ModuleScript ) {
    const hasExcludedAncestor = GetState().exclude.ancestors.some( ancestorName => module.FindFirstAncestor( ancestorName ) !== undefined );
    if ( hasExcludedAncestor ) return;

    const isExcludedModule = GetState().exclude.modules.includes( module.Name )
    if ( isExcludedModule ) return;

    moduleScripts.push( module );
    CreateResponseItem( module )
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
        let serviceInstance: Instance
        const [success, response] = pcall( () => serviceInstance = game.GetService( service as never ) as Instance )
        if ( !success ) {
            warn( `${EDITOR_NAME}: ${response}` )
            print( `${EDITOR_NAME}: Did you spell the name correctly?` );
        }

        if ( success && serviceInstance! ) {
            services.push( serviceInstance );
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
