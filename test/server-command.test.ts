import assert from 'node:assert/strict';
import test from 'node:test';

import {
	getBinaryServerCommand,
	getDevelopmentServerCommand,
	shouldUseDevelopmentServer,
} from '../src/server-command.js';

test('starts the repository language server in development mode', () => {
	assert.deepEqual(getDevelopmentServerCommand('C:\\workspace\\mace'), {
		command: 'go',
		args: ['run', './cmd', 'lsp'],
		options: { cwd: 'C:\\workspace\\mace' },
	});
});

test('starts a release binary with the lsp subcommand', () => {
	assert.deepEqual(getBinaryServerCommand('C:\\bin\\mace.exe'), {
		command: 'C:\\bin\\mace.exe',
		args: ['lsp'],
	});
});

test('allows launch configurations to override the configured server mode', () => {
	assert.equal(shouldUseDevelopmentServer(true, undefined), true);
	assert.equal(shouldUseDevelopmentServer(false, 'development'), true);
	assert.equal(shouldUseDevelopmentServer(true, 'release'), false);
});
