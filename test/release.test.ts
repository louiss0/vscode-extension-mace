import assert from 'node:assert/strict';
import test from 'node:test';

import { getReleaseAsset } from '../src/release.js';

test('selects the versioned Windows release asset', () => {
	const result = getReleaseAsset('v0.1.3', 'win32', 'x64');

	assert.deepEqual(result, {
		value: {
			archiveName: 'mace_0.1.3_windows_amd64.zip',
			binaryName: 'mace.exe',
			url: 'https://github.com/louiss0/mace/releases/download/v0.1.3/mace_0.1.3_windows_amd64.zip',
		},
	});
});
