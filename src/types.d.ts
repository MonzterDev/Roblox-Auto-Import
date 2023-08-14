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

type Response = {
	items: Array<{
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
			replace: {
				start: { line: number; character: number };
				end: { line: number; character: number };
			};
		};
	}>;
};

type ResponseItem = {
	label: string;
	detail?: string;
	learnMoreLink?: string;
	textEdit: {
		newText: string;
		replace: {
			start: { line: number; character: number };
			end: { line: number; character: number };
		};
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

interface SettingsModule extends ModuleScript {
	exclude: SettingsState
}

type SettingsState = {
	services: Array<string>;
	ancestors: Array<string>;
	modules: Array<string>;
};
