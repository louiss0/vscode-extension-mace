export interface ServerCommand {
	command: string;
	args: string[];
	options?: {
		cwd: string;
	};
}

export function getDevelopmentServerCommand(workspacePath: string): ServerCommand {
	return {
		command: 'go',
		args: ['run', './cmd', 'lsp'],
		options: { cwd: workspacePath },
	};
}

export function getBinaryServerCommand(binaryPath: string): ServerCommand {
	return {
		command: binaryPath,
		args: ['lsp'],
	};
}
