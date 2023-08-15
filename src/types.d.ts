type Context = "server" | "client" | "shared"

type Request = {
	position: {
		line: number;
		character: number;
	};
	textDocument: {
		document: ScriptDocument | undefined;
		script: LuaSourceContainer | undefined;
	};
};

type ReplaceLine = {
	start: { line: number; character: number };
	end: { line: number; character: number };
};

type Response = {
	items: Array<ResponseItem>;
};

type ResponseItem = {
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

type Change = {
	range: { start: { line: number; character: number }; end: { line: number; character: number } };
	text: string;
};
type ChangesArray = Array<Change>;

type SelectionTuple = LuaTuple<[CursorLine: number, CursorChar: number, AnchorLine: number, AnchorChar: number]>;

interface Imports {
	modules: Array<ModuleScript>;
	services: Array<Instance>;
}

type SettingsModule = ModuleScript & SettingsState

type ImportLine = {
	newLine: "Above" | "Below";
	start: { line: number; character: number };
	finish: { line: number; character: number };
}
interface SettingsState {
	exclude: {
		ancestors: Array<string>;
		modules: Array<string>;
	},
	include: {
		services: Array<string>;
	}
	importLines: {
		services: ImportLine,
		modules: ImportLine,
	},
}
