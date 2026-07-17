export type Result<Value> =
	| { value: Value; error?: never }
	| { value?: never; error: Error };

export interface ReleaseAsset {
	archiveName: string;
	binaryName: string;
	url: string;
}

const releaseRepository = 'https://github.com/louiss0/mace';

const operatingSystems: Partial<Record<NodeJS.Platform, string>> = {
	darwin: 'darwin',
	linux: 'linux',
	win32: 'windows',
};

const architectures: Partial<Record<NodeJS.Architecture, string>> = {
	arm64: 'arm64',
	x64: 'amd64',
};

export function getReleaseAsset(
	version: string,
	platform: NodeJS.Platform = process.platform,
	architecture: NodeJS.Architecture = process.arch,
): Result<ReleaseAsset> {
	const operatingSystem = operatingSystems[platform];
	const releaseArchitecture = architectures[architecture];
	if (!operatingSystem || !releaseArchitecture) {
		return {
			error: new Error(`Mace does not publish a release for ${platform}/${architecture}`),
		};
	}

	const releaseVersion = version.replace(/^v/, '');
	const archiveExtension = platform === 'win32' ? 'zip' : 'tar.gz';
	const archiveName = `mace_${releaseVersion}_${operatingSystem}_${releaseArchitecture}.${archiveExtension}`;

	return {
		value: {
			archiveName,
			binaryName: platform === 'win32' ? 'mace.exe' : 'mace',
			url: `${releaseRepository}/releases/download/v${releaseVersion}/${archiveName}`,
		},
	};
}
