# VS Code common capabilities

The extension applies the APIs described by VS Code's [Common Capabilities](https://code.visualstudio.com/api/extension-capabilities/common-capabilities) guide where they support Mace workflows.

| Capability | Mace implementation |
| --- | --- |
| Commands | Restart the language server, show its output, select its executable strategy, and clear downloaded servers |
| Configuration | `mace.server.path`, `mace.server.sourcePath`, and `mace.server.developmentMode`; development mode locates the Mace module among workspace ancestors before running `go run ./cmd lsp` |
| Keybindings | `Ctrl+Alt+M R` (`Cmd+Alt+M R` on macOS) restarts the server while editing Mace |
| Context menus | Mace editors expose restart and output commands |
| Data storage | Release binaries are cached under `ExtensionContext.globalStorageUri` and shared across workspaces |
| Notifications | Startup, selection, cache, download, and server failures use the appropriate information or error messages |
| Quick Pick | **Mace: Select Language Server** chooses the default workspace Go server, pinned release, or a custom executable |
| File picker | The custom executable option opens the native file picker |
| Output channel | **Mace Language Server** records the selected command, lifecycle events, client logs, and failures |
| Progress | Preparing or downloading the pinned release reports notification progress |
| Status bar | Mace documents show starting, ready, stopped, or error state; selecting it opens the output channel |

Secret storage is intentionally unused because the extension does not collect credentials. Workspace and global key/value state are also unnecessary: user choices belong in synchronized VS Code configuration, while binaries belong in global file storage.
