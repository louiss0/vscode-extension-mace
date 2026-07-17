import { constants } from 'node:fs';
import { access, chmod, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import extractZip from 'extract-zip';
import { x as extractTar } from 'tar';

import { getReleaseAsset, type Result } from './release.js';

type InstallStep = (source: string, destination: string) => Promise<Result<void>>;

interface EnsureReleaseBinaryOptions {
	version: string;
	storagePath: string;
	platform?: NodeJS.Platform;
	architecture?: NodeJS.Architecture;
	download?: InstallStep;
	extract?: InstallStep;
}

async function pathExists(path: string) {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

export async function ensureReleaseBinary(
	options: EnsureReleaseBinaryOptions,
): Promise<Result<string>> {
	const platform = options.platform ?? process.platform;
	const architecture = options.architecture ?? process.arch;
	const asset = getReleaseAsset(options.version, platform, architecture);
	if (asset.error) {
		return asset;
	}

	const version = options.version.replace(/^v/, '');
	const installationPath = join(options.storagePath, version);
	const binaryPath = join(installationPath, asset.value.binaryName);
	if (await pathExists(binaryPath)) {
		return { value: binaryPath };
	}

	await mkdir(installationPath, { recursive: true });
	const archivePath = join(installationPath, asset.value.archiveName);
	const download = options.download ?? downloadRelease;
	const extract = options.extract ?? extractRelease;

	const downloadResult = await download(asset.value.url, archivePath);
	if (downloadResult.error) {
		return downloadResult;
	}

	const extractResult = await extract(archivePath, installationPath);
	await rm(archivePath, { force: true });
	if (extractResult.error) {
		return extractResult;
	}
	if (!(await pathExists(binaryPath))) {
		return { error: new Error(`The Mace archive did not contain ${asset.value.binaryName}`) };
	}

	if (platform !== 'win32') {
		await chmod(binaryPath, 0o755);
	}

	return { value: binaryPath };
}

async function downloadRelease(url: string, destination: string): Promise<Result<void>> {
	try {
		const response = await fetch(url, {
			headers: { 'User-Agent': 'mace-vscode-extension' },
		});
		if (!response.ok) {
			return { error: new Error(`Could not download Mace: HTTP ${response.status}`) };
		}

		await mkdir(dirname(destination), { recursive: true });
		await writeFile(destination, Buffer.from(await response.arrayBuffer()));
		return { value: undefined };
	} catch (cause) {
		return { error: new Error('Could not download the Mace language server', { cause }) };
	}
}

async function extractRelease(archivePath: string, destination: string): Promise<Result<void>> {
	try {
		if (archivePath.endsWith('.zip')) {
			await extractZip(archivePath, { dir: destination });
		} else {
			await extractTar({ file: archivePath, cwd: destination });
		}
		return { value: undefined };
	} catch (cause) {
		return { error: new Error('Could not extract the Mace language server', { cause }) };
	}
}
