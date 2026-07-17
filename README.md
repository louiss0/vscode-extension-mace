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

The extension reads `mace-version.json`, downloads the matching Mace release from GitHub, and caches the executable in VS Code's global extension storage. The server starts automatically when a `.mace` file opens.

Supported release platforms are:

- Linux x64 and ARM64
- macOS x64 and ARM64
- Windows x64 and ARM64

Set `mace.server.path` to use an existing Mace executable instead. The executable must support `mace lsp`.

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

- **Run Mace Extension** uses the release pinned in `mace-version.json`.
- **Run Mace Extension (development server)** opens the parent Mace repository and runs `go run ./cmd lsp`.

Package a VSIX after all tests pass:

```sh
pnpm package
```
