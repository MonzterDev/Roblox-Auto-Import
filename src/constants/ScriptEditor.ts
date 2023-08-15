export type Context = "server" | "client" | "shared"

export type Request = {
    position: {
        line: number;
        character: number;
    };
    textDocument: {
        document: ScriptDocument | undefined;
        script: LuaSourceContainer | undefined;
    };
};

export type ReplaceLine = {
    start: { line: number; character: number };
    end: { line: number; character: number };
};

export type Response = {
    items: Array<ResponseItem>;
};

export type ResponseItem = {
    label: string;
    kind?: Enum.CompletionItemKind;
    tags?: Array<Enum.CompletionItemTag>;
    detail?: string;
    documentation?: {
        value: string;
    };
    overloads?: number;
    learnMoreLink?: string;
    codeSample?: string;
    preselect?: boolean;
    textEdit?: {
        newText: string;
        replace: ReplaceLine
    };
};

export type LineChange = {
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
    text: string;
};
