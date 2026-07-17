import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const extensionRoot = resolve(__dirname, '..', '..');

const themeBranches = new Map<string, Set<string>>([
	['comment', new Set(['line', 'block'])],
	['constant', new Set(['numeric', 'character', 'language', 'other'])],
	['entity', new Set(['name', 'other'])],
	['invalid', new Set(['illegal', 'deprecated'])],
	['keyword', new Set(['control', 'operator', 'other'])],
	['markup', new Set(['underline', 'bold', 'heading', 'italic', 'list', 'quote', 'raw', 'other'])],
	['meta', new Set()],
	['storage', new Set(['type', 'modifier'])],
	['string', new Set(['quoted', 'unquoted', 'interpolated', 'regexp', 'other'])],
	['support', new Set(['function', 'class', 'type', 'constant', 'variable', 'other'])],
	['variable', new Set(['parameter', 'language', 'other'])],
]);

function collectScopeNames(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.flatMap(collectScopeNames);
	}
	if (typeof value !== 'object' || value === null) {
		return [];
	}

	const record = value as Record<string, unknown>;
	const scope = typeof record.name === 'string' && record.name.includes('.')
		? [record.name]
		: [];
	return [...scope, ...Object.values(record).flatMap(collectScopeNames)];
}

test('all grammar names follow the TextMate theming taxonomy', async () => {
	const grammar = JSON.parse(
		await readFile(resolve(extensionRoot, 'syntaxes/mace.tmLanguage.json'), 'utf8'),
	);
	const scopes = new Set(collectScopeNames(grammar.repository));

	for (const scope of scopes) {
		const [root, branch] = scope.split('.');
		const branches = themeBranches.get(root);
		assert.ok(branches, `${scope} does not use a standard TextMate root scope`);
		if (branches.size > 0) {
			assert.ok(branches.has(branch), `${scope} does not use a standard ${root} branch`);
		}
		assert.equal(scope.endsWith('.mace'), true, `${scope} must end with the language name`);
	}
});
