import { t } from "@rbxts/t";
import { CONTEXT_DIRECTORIES, EDITOR_NAME } from "constants/imports";
import { Context, ReplaceLine, ResponseItem } from "constants/scriptEditor";
import { GetState } from "state";

const RESPONSE_PROPERTIES = ["kind", "tags", "detail", "overloads", "learnMoreLink", "codeSample", "preselect", "textEdit.newText", "documentation"] as const;

export class ResponseItemClass {
    public readonly label: string;
    private kind?: Enum.CompletionItemKind;
    private tags?: Array<Enum.CompletionItemTag>;
    private detail?: string;
    private documentation?: {
        value: string;
    };
    private overloads?: number;
    private learnMoreLink?: string;
    private codeSample?: string;
    private preselect?: boolean;
    public textEdit: {
        newText: string;
        replace: ReplaceLine
    };

    public readonly context: Context;
    public readonly type: "Service" | "Module"
    public readonly instance: Instance | ModuleScript
    public readonly serviceAncestor: Instance | undefined // Set for Modules to indicate where they're stored

    constructor ( instance: Instance ) {
        this.instance = instance

        this.label = instance.Name
        this.type = t.instanceIsA( "ModuleScript" )( instance ) ? "Module" : "Service"

        this.kind = this.type === "Module" ? Enum.CompletionItemKind.Module : Enum.CompletionItemKind.Class
        this.detail = `${instance.GetFullName()}`
        this.documentation = {
            value: this.GetDocumentation()
        }
        this.overloads = 0
        this.codeSample = ""
        this.preselect = false
        this.textEdit = {
            newText: instance.Name,
            replace: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
        }

        for ( const service of game.GetChildren() ) {
            if ( service.IsAncestorOf( this.instance ) ) {
                this.serviceAncestor = service
                break
            }
        }

        this.context = this.GetContext()

        this.UpdateCustomProps()
    }

    private GetContext () {
        const serviceName = this.type === "Module" ? this.serviceAncestor!.Name : this.instance.Name
        let context: Context = "shared"
        if ( CONTEXT_DIRECTORIES.client.includes( serviceName ) )
            context = "client"
        else if ( CONTEXT_DIRECTORIES.server.includes( serviceName ) )
            context = "server"
        return context
    }


    private GetDocumentation () {
        const name = this.instance.Name
        if ( this.type === "Module" )
            return `Create a variable for the ${name} Module.`
        else {
            const serviceName = name.find( "Service" )[0] ? name : name + " service"
            return `Create a variable for the ${serviceName}.`
        }
    }

    private UpdateResponseProperty ( prop: string, value: string ) {
        switch ( prop ) {
            case 'detail':
            case 'learnMoreLink':
            case 'codeSample':
                this[prop] = value;
                break;
            // case 'textEdit.newText': {
            //     const newText = response.textEdit?.newText
            //     if ( newText ) response.textEdit!.newText = value;
            //     break;
            // }
            case 'kind': // Doesn't seem to work
                this.kind = Enum.CompletionItemKind.GetEnumItems().find( ( item ) => `Enum.CompletionItemKind.${item.Name}` === value ) ?? Enum.CompletionItemKind.Color;
                break;
            case 'overloads':
                this.overloads = tonumber( value )
                break;
            case 'preselect':
                this.preselect = value.lower() === 'true';
                break;
            case 'documentation':
                this.documentation = { value: value }
                break;
            // Handle other properties here
        }
    }

    private UpdateCustomProps () {
        if ( !t.instanceIsA( "ModuleScript" )( this.instance ) ) return

        let loops = 0
        for ( const line of this.instance.Source.split( "\n" ) ) {
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
                            this.UpdateResponseProperty( property, extractedValue );
                        }
                    }
                }
            }
        }
    }

    private GetModuleText ( text: string, lines: string[], lastServiceLine: number ) {
        const importLine = lastServiceLine + 1
        const lineOfImport = lines[importLine]
        const lineBelowImportLine = lines[importLine]
        const moduleFoundBelowImportLine = ( lineBelowImportLine && lineBelowImportLine.find( "require" )[0] )
        print( lineBelowImportLine, "LINE BELOW" )
        if ( moduleFoundBelowImportLine !== undefined || lineBelowImportLine === "" ) {
            print( "CLEARERREREERD" )
            text = text.gsub( "\n", "" )[0]
        }

        const doesLineBelowContainModule = lineOfImport && lineOfImport.find( "require" )[0]
        const isLineBelowServiceBlank = lineOfImport === ""
        print( "DDDDDDDDDDDDDDDDDDDD   ", moduleFoundBelowImportLine )
        if ( ( !isLineBelowServiceBlank || lines[lastServiceLine - 2] !== "" ) && !moduleFoundBelowImportLine ) {
            text = `\n${text}`
        }

        if ( !moduleFoundBelowImportLine ) {
            text = `${text}\n`
        }

        return text
    }
    private GetServiceText ( text: string, lines: string[], lastServiceLine: number ) {
        // If line below import is not a service or is not blank, then add a new line
        const importLine = lastServiceLine + 1
        const lineOfImport = lines[importLine]
        const lineBelowImportLine = lines[importLine]
        const isServiceBelowImport = ( lineBelowImportLine && lineBelowImportLine.find( "game:GetService" )[0] )
        print( lineBelowImportLine, "LINE BELOW" )
        if ( !isServiceBelowImport || lineBelowImportLine !== "" )
            text = `${text}\n`

        return text
    }


    public IsContextCompatible ( editorContext: Context ) {
        return this.context === "shared" || this.context === editorContext
    }

    public IsAlreadyImported ( scriptContent: string ) {
        const importStatement = this.GetImportStatement()
        const scriptLines = scriptContent.split( '\n' );
        for ( const line of scriptLines ) {
            const cleanedLine = string.gsub( line, '\n', '' )[0];
            if ( cleanedLine.size() === 0 ) continue

            const cleanedImportString = string.gsub( importStatement, '\n', '' )[0];
            if ( cleanedImportString === cleanedLine )
                return true;
        }
        return false;
    }

    public GetImportStatement () {
        const name = this.instance.Name
        if ( this.type === "Module" )
            return `local ${name} = require(${this.instance.GetFullName()})`
        else
            return `local ${name} = game:GetService("${name}")`
    }

    // Index is 1 greater than the line number
    private GetIndexOfLastService ( document: ScriptDocument ) {
        const lines = document.GetText().split( "\n" );
        print( lines )

        for ( const [index, line] of pairs( lines ) ) {
            const cleanedLine = string.gsub( line, '\n', '' )[0];
            if ( !cleanedLine.find( "game:GetService" )[0] )
                return index
        }
        return 1
    }

    // I am really tired...I don't know why the numbers are all messed up, but it seems to be working..?
    public EditText ( document: ScriptDocument ) {
        const isModule = this.type === "Module"
        const lineConfig = isModule ? GetState().importLines.modules : GetState().importLines.services

        let text = this.GetImportStatement() // First new line is needed to move text on current line down

        const lines = document.GetText().split( "\n" );
        const indexOfLastServiceLine = this.GetIndexOfLastService( document )
        const lineOfLastService = indexOfLastServiceLine - 2
        // print( `Line of Last Service: `, lineOfLastService )
        // print( `Line: `, lines[lineOfLastService] )

        // if ( lineOfLastService < 0 ) { // If there is no service, then add a new line
        //     text = `${text}\n`
        // }

        let importLine = lineOfLastService
        if ( !isModule ) {
            text = `${text}\n`
            print( "indexOfLastServiceLine: ", indexOfLastServiceLine )
            const lineBelowImportLine = lines[indexOfLastServiceLine - 1]
            print( "lineBelowImportLine: ", lineBelowImportLine )
            const isBlankBelowImport = lineBelowImportLine === ""
            print( "isBlankBelowImport: ", lineBelowImportLine, isBlankBelowImport )
            if ( lineBelowImportLine === undefined || !isBlankBelowImport ) {
                text = `${text}\n`
                print( "NEW LINE ADDED" )
            }
        }

        if ( isModule ) {
            // Check if there is a blank line after the last service
            if ( lines[indexOfLastServiceLine] !== "" ) {
                text = `\n${text}`;
            }

            // If there is no module import after the last service, add a newline to separate modules from services
            if ( lines[indexOfLastServiceLine] === "" && lines[indexOfLastServiceLine + 1] !== undefined && !lines[indexOfLastServiceLine + 1].find( "local " ) ) {
                text = `\n${text}`;
            }
        }

        // if ( isModule )
        //     text = this.GetModuleText( text, lines, lineOfLastService - 2 )
        // else
        //     text = this.GetServiceText( text, lines, lineOfLastService - 2 )

        // print( "TEZZZZZZZZZZT", " ", text )


        // if ( importLine > lines.size() ) importLine = lines.size()

        const [success, result] = pcall( () => document.EditTextAsync( text, importLine + 2, lineConfig.start.character, lineConfig.finish.line, lineConfig.finish.character ) )
        if ( !success ) {
            warn( `${EDITOR_NAME}: ${result} ` )
            print( `${EDITOR_NAME}: Did you mess up the import lines for Services ? ` )
        }
    }

    // // I am really tired...I don't know why the numbers are all messed up, but it seems to be working..?
    // public EditText ( document: ScriptDocument ) {
    //     const isModule = this.type === "Module"
    //     const lineConfig = isModule ? GetState().importLines.modules : GetState().importLines.services

    //     const importStatement = this.GetImportStatement()
    //     let text = lineConfig.newLine === "Above" ? `\n${importStatement}` : `${importStatement}\n`

    //     const lines = document.GetText().split( "\n" );
    //     const lineOfLastService = this.GetLineOfLastService( document )
    //     if ( isModule )
    //         text = this.GetModuleText( text, lines, lineOfLastService - 2 )
    //     else
    //         text = this.GetServiceText( text, lines, lineOfLastService - 2 )

    //     print( "TEZZZZZZZZZZT", " ", text )


    //     let importLine = isModule ? lineOfLastService + 2 : lineOfLastService
    //     print( isModule )
    //     if ( importLine > lines.size() ) importLine = lines.size()

    //     const [success, result] = pcall( () => document.EditTextAsync( text, importLine, lineConfig.start.character, lineConfig.finish.line, lineConfig.finish.character ) )
    //     if ( !success ) {
    //         warn( `${EDITOR_NAME}: ${result} ` )
    //         print( `${EDITOR_NAME}: Did you mess up the import lines for Services ? ` )
    //     }
    // }

    public GetResponseItem (): ResponseItem {
        return {
            label: this.label,
            kind: this.kind,
            tags: this.tags,
            detail: this.detail,
            documentation: this.documentation,
            overloads: this.overloads,
            learnMoreLink: this.learnMoreLink,
            codeSample: this.codeSample,
            preselect: this.preselect,
            textEdit: this.textEdit,
        }
    }
}
