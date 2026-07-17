import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const extensionRoot = resolve(__dirname, '..', '..');

test('registers Mace highlighting and snippets for .mace files', async () => {
	const manifest = JSON.parse(await readFile(resolve(extensionRoot, 'package.json'), 'utf8'));
	const grammar = JSON.parse(
		await readFile(resolve(extensionRoot, 'syntaxes/mace.tmLanguage.json'), 'utf8'),
	);

	assert.deepEqual(manifest.contributes.languages[0].extensions, ['.mace']);
	assert.equal(manifest.contributes.snippets[0].language, 'mace');
	assert.match(grammar.repository.keywords.patterns[0].match, /schema/);
	assert.match(grammar.repository.types.patterns[0].match, /hex_float/);
	assert.ok(grammar.patterns.some((pattern: { include?: string }) => pattern.include === '#comments'));
});
