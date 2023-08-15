import { t } from "@rbxts/t";
import { CONTEXT_DIRECTORIES } from "constants";

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

    public IsContextCompatible ( editorContext: Context ) {
        if ( this.type === "Module" )
            return this.context === "shared" ?? this.context === editorContext

        if ( this.context !== "shared" && editorContext === "shared" )
            return true
        else if ( this.context === "shared" ?? this.context === editorContext )
            return true

        return false
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
