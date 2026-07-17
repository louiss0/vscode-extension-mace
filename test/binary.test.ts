import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { ensureReleaseBinary } from '../src/binary.js';

test('reuses a cached release binary without downloading it', async () => {
	const storagePath = await mkdtemp(join(tmpdir(), 'mace-vscode-'));
	const binaryPath = join(storagePath, '0.1.3', 'mace.exe');
	await mkdir(join(storagePath, '0.1.3'));
	await writeFile(binaryPath, 'cached');
	let downloaded = false;

	const result = await ensureReleaseBinary({
		version: 'v0.1.3',
		storagePath,
		platform: 'win32',
		architecture: 'x64',
		download: async () => {
			downloaded = true;
			return { value: undefined };
		},
	});

	assert.deepEqual(result, { value: binaryPath });
	assert.equal(downloaded, false);
	await rm(storagePath, { recursive: true, force: true });
});

test('downloads and extracts a missing release binary', async () => {
	const storagePath = await mkdtemp(join(tmpdir(), 'mace-vscode-'));
	let downloadedUrl = '';

	const result = await ensureReleaseBinary({
		version: 'v0.1.3',
		storagePath,
		platform: 'win32',
		architecture: 'x64',
		download: async (url, archivePath) => {
			downloadedUrl = url;
			await writeFile(archivePath, 'archive');
			return { value: undefined };
		},
		extract: async (_archivePath, destination) => {
			await writeFile(join(destination, 'mace.exe'), 'binary');
			return { value: undefined };
		},
	});

	assert.equal(
		downloadedUrl,
		'https://github.com/louiss0/mace/releases/download/v0.1.3/mace_0.1.3_windows_amd64.zip',
	);
	assert.deepEqual(result, { value: join(storagePath, '0.1.3', 'mace.exe') });
	await rm(storagePath, { recursive: true, force: true });
});
