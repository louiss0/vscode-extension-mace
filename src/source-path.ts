import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const maceModuleDeclaration = /^module\s+github\.com\/louiss0\/mace\s*$/m;

async function isMaceSourcePath(path: string) {
	try {
		const [moduleContent, commandDirectory] = await Promise.all([
			readFile(resolve(path, 'go.mod'), 'utf8'),
			stat(resolve(path, 'cmd')),
		]);
		return maceModuleDeclaration.test(moduleContent) && commandDirectory.isDirectory();
	} catch {
		return false;
	}
}

function getAncestorPaths(path: string) {
	const ancestors: string[] = [];
	let current = resolve(path);
	while (true) {
		ancestors.push(current);
		const parent = dirname(current);
		if (parent === current) {
			return ancestors;
		}
		current = parent;
	}
}

export async function findMaceSourcePath(
	workspacePaths: string[],
	configuredPath?: string,
) {
	const candidates = configuredPath
		? [resolve(configuredPath)]
		: [...new Set(workspacePaths.flatMap(getAncestorPaths))];

	for (const candidate of candidates) {
		if (await isMaceSourcePath(candidate)) {
			return candidate;
		}
	}
	return undefined;
}
