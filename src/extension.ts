import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as vscode from 'vscode';
import {
	LanguageClient,
	State,
	type LanguageClientOptions,
	type ServerOptions,
} from 'vscode-languageclient/node';

import { ensureReleaseBinary } from './binary.js';
import { parseReleaseMetadata } from './release-metadata.js';
import type { Result } from './release.js';
import {
	getBinaryServerCommand,
	getDevelopmentServerCommand,
	shouldUseDevelopmentServer,
	type ServerCommand,
} from './server-command.js';
import { findMaceSourcePath } from './source-path.js';

const commandIds = {
	clearCache: 'mace.clearLanguageServerCache',
	restart: 'mace.restartLanguageServer',
	selectServer: 'mace.selectLanguageServer',
	showOutput: 'mace.showLanguageServerOutput',
} as const;

let runtime: MaceRuntime | undefined;

export async function activate(context: vscode.ExtensionContext) {
	runtime = new MaceRuntime(context);
	context.subscriptions.push(runtime);
	await runtime.activate();
}

export async function deactivate() {
	await runtime?.dispose();
	runtime = undefined;
}

class MaceRuntime implements vscode.Disposable {
	private client: LanguageClient | undefined;
	private clientStateSubscription: vscode.Disposable | undefined;
	private fileWatcher: vscode.FileSystemWatcher | undefined;
	private readonly output: vscode.OutputChannel;
	private readonly status: vscode.StatusBarItem;

	constructor(private readonly context: vscode.ExtensionContext) {
		this.output = vscode.window.createOutputChannel('Mace Language Server');
		this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.status.name = 'Mace Language Server';
		this.status.command = commandIds.showOutput;
		this.setStatus('stopped');
	}

	async activate() {
		this.context.subscriptions.push(
			this.output,
			this.status,
			vscode.window.onDidChangeActiveTextEditor(() => this.updateStatusVisibility()),
			vscode.commands.registerCommand(commandIds.restart, () => this.restart()),
			vscode.commands.registerCommand(commandIds.showOutput, () => this.output.show()),
			vscode.commands.registerCommand(commandIds.selectServer, () => this.selectServer()),
			vscode.commands.registerCommand(commandIds.clearCache, () => this.clearCache()),
		);
		this.updateStatusVisibility();
		await this.start();
	}

	async dispose() {
		await this.stop();
	}

	private async start() {
		this.setStatus('starting');
		const serverCommand = await this.resolveServerCommand();
		if (serverCommand.error) {
			this.reportError(serverCommand.error);
			return;
		}

		this.output.appendLine(`Starting: ${formatServerCommand(serverCommand.value)}`);
		this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.mace');
		const clientOptions: LanguageClientOptions = {
			documentSelector: [{ scheme: 'file', language: 'mace' }],
			outputChannel: this.output,
			synchronize: { fileEvents: this.fileWatcher },
		};

		this.client = new LanguageClient(
			'mace',
			'Mace LSP',
			serverCommand.value as ServerOptions,
			clientOptions,
		);
		this.clientStateSubscription = this.client.onDidChangeState(event => {
			if (event.newState === State.Running) {
				this.setStatus('running');
			} else if (event.newState === State.Starting) {
				this.setStatus('starting');
			} else {
				this.setStatus('stopped');
			}
		});

		try {
			await this.client.start();
		} catch (cause) {
			this.reportError(new Error('Could not start the Mace language server', { cause }));
		}
	}

	private async stop() {
		this.clientStateSubscription?.dispose();
		this.clientStateSubscription = undefined;
		this.fileWatcher?.dispose();
		this.fileWatcher = undefined;

		const client = this.client;
		this.client = undefined;
		if (client) {
			try {
				await client.stop();
			} catch (cause) {
				this.output.appendLine(`Could not stop the Mace language server: ${String(cause)}`);
			}
		}
		this.setStatus('stopped');
	}

	private async restart() {
		this.output.appendLine('Restarting the Mace language server.');
		await this.stop();
		await this.start();
	}

	private async selectServer() {
		const selection = await vscode.window.showQuickPick(
			[
				{
					label: 'Workspace Go server',
					description: 'Run `go run ./cmd lsp` from the open workspace (default)',
					mode: 'development',
				},
				{
					label: 'Pinned Mace release',
					description: 'Download and cache the version bundled with this extension',
					mode: 'release',
				},
				{
					label: 'Choose a Mace executable…',
					description: 'Use an existing Mace installation',
					mode: 'custom',
				},
			],
			{ placeHolder: 'Select how the Mace language server should run' },
		);
		if (!selection) {
			return;
		}

		const configuration = vscode.workspace.getConfiguration('mace.server');
		if (selection.mode === 'custom') {
			const selectedFiles = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				openLabel: 'Use Mace Executable',
				title: 'Select the Mace executable',
			});
			const executable = selectedFiles?.[0];
			if (!executable) {
				return;
			}
			await configuration.update('path', executable.fsPath, vscode.ConfigurationTarget.Global);
			await configuration.update('developmentMode', false, vscode.ConfigurationTarget.Global);
		} else {
			await configuration.update('path', '', vscode.ConfigurationTarget.Global);
			await configuration.update(
				'developmentMode',
				selection.mode === 'development',
				vscode.ConfigurationTarget.Global,
			);
		}

		void vscode.window.showInformationMessage(`Mace language server: ${selection.label}`);
		await this.restart();
	}

	private async clearCache() {
		await this.stop();
		try {
			await vscode.workspace.fs.delete(this.context.globalStorageUri, {
				recursive: true,
				useTrash: false,
			});
		} catch (cause) {
			if (!(cause instanceof vscode.FileSystemError && cause.code === 'FileNotFound')) {
				this.reportError(new Error('Could not clear downloaded Mace servers', { cause }));
				return;
			}
		}

		void vscode.window.showInformationMessage('Downloaded Mace language servers were cleared.');
		await this.start();
	}

	private async resolveServerCommand(): Promise<Result<ServerCommand>> {
		const configuration = vscode.workspace.getConfiguration('mace.server');
		const configuredPath = configuration.get<string>('path', '').trim();
		if (configuredPath) {
			return { value: getBinaryServerCommand(configuredPath) };
		}

		const workspacePaths = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) ?? [];
		const usesDevelopmentServer = shouldUseDevelopmentServer(
			configuration.get<boolean>('developmentMode', true),
			process.env.MACE_EXTENSION_MODE,
		);
		if (usesDevelopmentServer) {
			const configuredSourcePath = configuration.get<string>('sourcePath', '').trim();
			const sourcePath = await findMaceSourcePath(
				workspacePaths,
				configuredSourcePath || undefined,
			);
			if (!sourcePath) {
				return {
					error: new Error(
						'Mace development mode could not find the source repository. '
						+ 'Set mace.server.sourcePath or select the pinned release.',
					),
				};
			}
			return { value: getDevelopmentServerCommand(sourcePath) };
		}

		const metadataPath = join(this.context.extensionPath, 'mace-version.json');
		let metadataContent: string;
		try {
			metadataContent = await readFile(metadataPath, 'utf8');
		} catch {
			return { error: new Error('The Mace release version is missing') };
		}

		const metadata = parseReleaseMetadata(metadataContent);
		if (metadata.error) {
			return metadata;
		}

		const binary = await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Preparing Mace ${metadata.value.version}`,
			},
			() =>
				ensureReleaseBinary({
					version: metadata.value.version,
					storagePath: this.context.globalStorageUri.fsPath,
				}),
		);
		if (binary.error) {
			return binary;
		}

		return { value: getBinaryServerCommand(binary.value) };
	}

	private reportError(error: Error) {
		this.output.appendLine(error.stack ?? error.message);
		this.setStatus('error');
		void vscode.window.showErrorMessage(error.message, 'Show Output').then(selection => {
			if (selection === 'Show Output') {
				this.output.show();
			}
		});
	}

	private setStatus(state: 'error' | 'running' | 'starting' | 'stopped') {
		const statuses = {
			error: { icon: '$(error)', label: 'Mace: Error' },
			running: { icon: '$(check)', label: 'Mace: Ready' },
			starting: { icon: '$(sync~spin)', label: 'Mace: Starting' },
			stopped: { icon: '$(circle-slash)', label: 'Mace: Stopped' },
		};
		const status = statuses[state];
		this.status.text = `${status.icon} ${status.label}`;
		this.status.tooltip = `${status.label}. Select to show language server output.`;
	}

	private updateStatusVisibility() {
		if (vscode.window.activeTextEditor?.document.languageId === 'mace') {
			this.status.show();
		} else {
			this.status.hide();
		}
	}
}

function formatServerCommand(server: ServerCommand) {
	return [server.command, ...server.args].join(' ');
}
