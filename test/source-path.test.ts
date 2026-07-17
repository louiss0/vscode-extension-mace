import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { findMaceSourcePath } from '../src/source-path.js';

async function createMaceSourceRoot() {
	const root = await mkdtemp(join(tmpdir(), 'mace-source-'));
	await writeFile(join(root, 'go.mod'), 'module github.com/louiss0/mace\n\ngo 1.24\n');
	await mkdir(join(root, 'cmd'));
	return root;
}

test('finds the Mace source root above the extension workspace', async t => {
	const root = await createMaceSourceRoot();
	t.after(() => rm(root, { recursive: true, force: true }));
	const extensionWorkspace = join(root, 'vscode-extension-mace');
	await mkdir(extensionWorkspace);

	assert.equal(await findMaceSourcePath([extensionWorkspace]), root);
});

test('prefers an explicitly configured Mace source root', async t => {
	const root = await createMaceSourceRoot();
	t.after(() => rm(root, { recursive: true, force: true }));

	assert.equal(await findMaceSourcePath([], root), root);
});

test('rejects workspaces that are not the Mace source repository', async t => {
	const workspace = await mkdtemp(join(tmpdir(), 'other-workspace-'));
	t.after(() => rm(workspace, { recursive: true, force: true }));
	await writeFile(join(workspace, 'go.mod'), 'module example.com/other\n');
	await mkdir(join(workspace, 'cmd'));

	assert.equal(await findMaceSourcePath([workspace]), undefined);
});
