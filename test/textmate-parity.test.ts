import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { loadWASM, OnigScanner, OnigString } from 'vscode-oniguruma';
import { INITIAL, Registry, type IRawGrammar, type StateStack } from 'vscode-textmate';

const extensionRoot = resolve(__dirname, '..', '..');

async function loadMaceGrammar() {
	const wasmPath = require.resolve('vscode-oniguruma/release/onig.wasm');
	await loadWASM(await readFile(wasmPath));

	const registry = new Registry({
		onigLib: Promise.resolve({ createOnigScanner: patterns => new OnigScanner(patterns), createOnigString: text => new OnigString(text) }),
		loadGrammar: async scopeName => {
			if (scopeName !== 'source.mace') {
				return null;
			}
			return JSON.parse(
				await readFile(resolve(extensionRoot, 'syntaxes/mace.tmLanguage.json'), 'utf8'),
			) as IRawGrammar;
		},
	});

	const grammar = await registry.loadGrammar('source.mace');
	assert.ok(grammar);
	return grammar;
}

function scopesFor(source: string, grammar: Awaited<ReturnType<typeof loadMaceGrammar>>) {
	let ruleStack: StateStack = INITIAL;
	return source.split('\n').flatMap(line => {
		const tokenized = grammar.tokenizeLine(line, ruleStack);
		ruleStack = tokenized.ruleStack;
		return tokenized.tokens.map(token => ({
			text: line.slice(token.startIndex, token.endIndex),
			scopes: token.scopes,
		}));
	});
}

test('TextMate grammar scopes Tree-sitter language features', async () => {
	const grammar = await loadMaceGrammar();
	const tokens = scopesFor(
		`|===|\nfrom './shared.mace' import Region;\nnullable array<hex_float> values = left <> right;\nstring included = item?.name ?? "";\nstring label = "value=$(values)" /# rendered label;\n|===|\n[output = data]\n{ label: label, }`,
		grammar,
	);

	const scopes = (text: string) => tokens.find(token => token.text === text)?.scopes ?? [];
	assert.ok(scopes('from').includes('keyword.other.import.mace'));
	assert.ok(scopes('nullable').includes('storage.modifier.mace'));
	assert.ok(scopes('hex_float').includes('storage.type.primitive.mace'));
	assert.ok(scopes('<>').includes('keyword.operator.mace'));
	assert.ok(
		tokens.some(
			token =>
				token.text.includes('rendered label') &&
				token.scopes.includes('comment.line.documentation.mace'),
		),
	);
	assert.ok(
		tokens.some(
			token => token.text === 'label' && token.scopes.includes('variable.other.property.mace'),
		),
	);
});

test('TextMate grammar keeps kebab-case identifiers intact', async () => {
	const grammar = await loadMaceGrammar();
	const tokens = scopesFor(
		`|===|\nfrom './profile.mace' import display-name:local-name;\nfrom './shared.mace' import-as shared-data;\nschema user-profile: { display-name: string, };\nuser-profile current-user = { display-name: "Ada", };\n|===|\n{ nested-record: { display-name: current-user.display-name, }, }`,
		grammar,
	);

	const matchingTokens = (text: string) => tokens.filter(token => token.text === text);
	assert.ok(matchingTokens('user-profile').some(token => token.scopes.includes('entity.name.type.mace')));
	assert.ok(matchingTokens('display-name').some(token => token.scopes.includes('variable.other.property.mace')));
	assert.ok(matchingTokens('import-as').some(token => token.scopes.includes('keyword.other.import.mace')));
	for (const identifier of ['display-name', 'local-name', 'shared-data', 'user-profile', 'current-user', 'nested-record']) {
		assert.ok(matchingTokens(identifier).length > 0, `kebab-case identifier was split: ${identifier}`);
	}
});

test('TextMate grammar covers every Tree-sitter lexical family', async () => {
	const grammar = await loadMaceGrammar();
	const tokens = scopesFor(
		`// line\n/* block */\n|===|\nfrom './shared.mace' import-as Shared;\nalias Value: variant[string, int, float, hex_int, hex_float, boolean, array<string>, record<int>, fusion[Shared], choice[true, false, 1, 1.0, 0x1, 0x1.0]];\nschema Item: { optional?: nullable Value, };\ngen_doc Value { summary: "Value", description: """A $(Shared) value""", };\nschema_doc Item { fields: { optional: 'Optional', }, };\nint math = !flag || left && right | bits ^ mask & value == other != third < upper <= max > lower >= min << one >> two >>> three + four - five * six / seven % eight ** nine ? ten : null;\nValue matched = match (value) { string => \"text\", };\n|===|\n[output = data, schema = Item, schema_file = './schema.mace', parse = Item, parse_file = './input.mace']\n{ optional: $self.value ?? $input?.value, }`,
		grammar,
	);

	const hasScope = (text: string, scope: string) =>
		tokens.some(token => token.text === text && token.scopes.includes(scope));

	for (const keyword of ['from', 'import-as']) {
		assert.ok(hasScope(keyword, 'keyword.other.import.mace'), `missing import scope for ${keyword}`);
	}
	for (const directive of ['output', 'schema_file', 'parse', 'parse_file']) {
		assert.ok(
			hasScope(directive, 'keyword.other.directive.mace'),
			`missing directive scope for ${directive}`,
		);
	}
	assert.ok(hasScope('match', 'keyword.control.mace'));
	for (const declaration of ['alias', 'schema', 'gen_doc', 'schema_doc']) {
		assert.ok(
			hasScope(declaration, 'keyword.other.declaration.mace'),
			`missing declaration scope for ${declaration}`,
		);
	}
	for (const type of ['string', 'int', 'float', 'hex_int', 'hex_float', 'boolean']) {
		assert.ok(
			hasScope(type, 'storage.type.primitive.mace'),
			`missing primitive type scope for ${type}`,
		);
	}
	for (const type of ['array', 'record', 'fusion', 'variant', 'choice']) {
		assert.ok(
			hasScope(type, 'storage.type.composite.mace'),
			`missing composite type scope for ${type}`,
		);
	}
	for (const operator of [
		'!', '||', '&&', '|', '^', '&', '==', '!=', '<', '<=', '>', '>=',
		'<<', '>>', '>>>', '+', '-', '*', '/', '%', '**', '?', '??', '?.', '=>',
	]) {
		assert.ok(hasScope(operator, 'keyword.operator.mace'), `missing operator scope for ${operator}`);
	}
	assert.ok(tokens.some(token => token.scopes.includes('comment.line.double-slash.mace')));
	assert.ok(tokens.some(token => token.scopes.includes('comment.block.mace')));
	assert.ok(tokens.some(token => token.scopes.includes('string.quoted.single.path.mace')));
	assert.ok(tokens.some(token => token.scopes.includes('string.quoted.single.mace')));
	assert.ok(tokens.some(token => token.scopes.includes('string.quoted.double.mace')));
	assert.ok(tokens.some(token => token.scopes.includes('string.quoted.triple.mace')));
	assert.ok(tokens.some(token => token.scopes.includes('meta.interpolation.mace')));
	assert.ok(hasScope('1', 'constant.numeric.integer.mace'));
	assert.ok(hasScope('1.0', 'constant.numeric.float.mace'));
	assert.ok(hasScope('0x1', 'constant.numeric.hex-integer.mace'));
	assert.ok(hasScope('0x1.0', 'constant.numeric.hex-float.mace'));
	assert.ok(hasScope('true', 'constant.language.boolean.mace'));
	assert.ok(hasScope('null', 'constant.language.null.mace'));
	assert.ok(hasScope('|===|', 'meta.embedded.block.delimiter.mace'));
	assert.ok(hasScope('summary', 'variable.other.property.mace'));
	assert.ok(hasScope('Shared', 'storage.type.named.mace'));
	assert.ok(hasScope('$self', 'variable.language.self.mace'));
	assert.ok(hasScope('$input', 'variable.other.readwrite.mace'));
});
