import assert from 'node:assert/strict';
import test from 'node:test';

import { parseReleaseMetadata } from '../src/release-metadata.js';

test('reads the pinned Mace version from release metadata', () => {
	assert.deepEqual(parseReleaseMetadata('{"version":"v0.1.3"}'), {
		value: { version: 'v0.1.3' },
	});
});

test('rejects release metadata without a version', () => {
	const result = parseReleaseMetadata('{}');

	assert.match(result.error?.message ?? '', /version/);
});
