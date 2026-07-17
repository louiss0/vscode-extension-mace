# Mace for Visual Studio Code

Official language support for the [Mace configuration language](https://github.com/louiss0/mace).

## Features

- Syntax highlighting for Mace declarations, types, values, interpolation, and documentation
- Comment, bracket, quote, and indentation support
- Snippets for imports, outputs, aliases, schemas, and variables
- Diagnostics, completion, hover, definitions, rename, symbols, code actions, and formatting through the Mace language server
- Language-server state in the status bar and dedicated output logs
- Commands for restarting, selecting, inspecting, and clearing the language server

## Language server

By default, the extension runs the current workspace source with:

```sh
go run ./cmd lsp
```

This mode requires Go. The extension searches every workspace folder and its ancestors for the `github.com/louiss0/mace` Go module, so opening the nested `vscode-extension-mace` repository correctly runs the command from its parent Mace repository. Set `mace.server.sourcePath` when the source lives elsewhere.

Disable `mace.server.developmentMode` to download the release in `mace-version.json`. Release binaries are cached in VS Code's global extension storage and support Linux, macOS, and Windows on x64 and ARM64. Set `mace.server.path` to use another Mace executable; it must support `mace lsp`.

## Commands

Open the Command Palette and search for **Mace**:

- **Mace: Restart Language Server**
- **Mace: Show Language Server Output**
- **Mace: Select Language Server**
- **Mace: Clear Downloaded Language Servers**

The selection command offers the pinned release, a custom executable selected through the system file picker, and workspace development mode. While editing Mace, `Ctrl+Alt+M R` (`Cmd+Alt+M R` on macOS) restarts the server.

See [Tree-sitter to TextMate parity](docs/tree-sitter-parity.md) and [VS Code common capabilities](docs/common-capabilities.md) for implementation details.

## Extension development

Install dependencies and run the tests:

```sh
pnpm install
pnpm test
```

Open this directory in VS Code and use one of the launch configurations:

- **Run Mace Extension (local Go server)** opens the parent Mace repository and runs `go run ./cmd lsp`.
- **Run Mace Extension (pinned release)** explicitly tests the release in `mace-version.json`.

Package a VSIX after all tests pass:

```sh
pnpm package
```
