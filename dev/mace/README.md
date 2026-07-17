# Manual Mace development files

These files are for manually exercising the extension in an Extension Development Host. They are not automated test fixtures and `.vscodeignore` excludes the entire `dev/` directory from published VSIX packages.

- `highlighting.mace` covers representative syntax and theming.
- `outline.mace` demonstrates aliases, schemas, variables, fields, and output properties.
- `formatting.mace` is intentionally awkwardly formatted.
- `diagnostics.mace` intentionally contains an `int`/`float` mismatch.
- `workspace/` exercises imports, definitions, hover, completion, and rename across files.
