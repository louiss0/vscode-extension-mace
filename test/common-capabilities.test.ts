import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const extensionRoot = resolve(__dirname, '..', '..');

async function readManifest() {
	return JSON.parse(await readFile(resolve(extensionRoot, 'package.json'), 'utf8'));
}

test('contributes common Mace language-server commands', async () => {
	const manifest = await readManifest();
	const commands = new Set(
		manifest.contributes.commands.map((command: { command: string }) => command.command),
	);

	assert.deepEqual(commands, new Set([
		'mace.restartLanguageServer',
		'mace.showLanguageServerOutput',
		'mace.selectLanguageServer',
		'mace.clearLanguageServerCache',
	]));
	assert.ok(
		manifest.contributes.menus['editor/context'].some(
			(item: { command: string; when: string }) =>
				item.command === 'mace.restartLanguageServer' && item.when === 'editorLangId == mace',
		),
	);
	assert.ok(
		manifest.contributes.keybindings.some(
			(binding: { command: string; when: string }) =>
				binding.command === 'mace.restartLanguageServer' && binding.when === 'editorLangId == mace',
		),
	);
	assert.equal(
		manifest.contributes.configuration.properties['mace.server.developmentMode'].default,
		true,
		'local `go run ./cmd lsp` must be the default server',
	);
});
