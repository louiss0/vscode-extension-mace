import type { Result } from './release.js';

export interface ReleaseMetadata {
	version: string;
}

export function parseReleaseMetadata(content: string): Result<ReleaseMetadata> {
	try {
		const metadata: unknown = JSON.parse(content);
		if (
			typeof metadata !== 'object' ||
			metadata === null ||
			!('version' in metadata) ||
			typeof metadata.version !== 'string' ||
			metadata.version.length === 0
		) {
			return { error: new Error('Mace release metadata must contain a version') };
		}

		return { value: { version: metadata.version } };
	} catch (cause) {
		return { error: new Error('Could not parse Mace release metadata', { cause }) };
	}
}
