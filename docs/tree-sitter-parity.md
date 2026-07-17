# Tree-sitter to TextMate parity

The VS Code grammar tracks `louiss0/tree-sitter-mace` at revision `5f57e31`, the same revision configured by the Mace Zed extension.

Tree-sitter builds a syntax tree and enforces structure. VS Code's TextMate engine assigns scopes with regular-expression patterns. Therefore, parity means that every lexical and semantic family exposed by the Tree-sitter grammar receives an appropriate TextMate scope. Structural validation, precedence, exhaustiveness, and type checking remain the responsibility of the Mace language server.

## Grammar map

| Tree-sitter family | Tree-sitter rules | TextMate repository entries and scopes |
| --- | --- | --- |
| Document structure | `source_file`, `script_block`, `_script_delimiter`, `output_block` | `scriptDelimiters` → `punctuation.section.embedded.mace`; output keywords, brackets, and fields use their respective entries |
| Trivia | `comment` | `comments` → `comment.line.double-slash.mace`, `comment.block.mace` |
| Identifiers | `identifier`, `identifier_word`, `field_name` | `properties`, `namedTypes`, `specialVariables`; unclassified identifiers retain `source.mace` |
| Strings | `string_literal`, `doc_block_string`, `inline_doc_block`, `interpolation`, `path_literal` | `strings`, `paths`, `escapes`, `interpolation` → quoted-string, path, escape, and interpolation scopes |
| Scalar literals | `int_literal`, `float_literal`, `hex_int_literal`, `hex_float_literal`, `boolean_literal`, `null_literal` | `numbers`, `languageConstants` → numeric, boolean, and null scopes |
| Imports | `import_declaration` | `keywords`, `paths`, `namedTypes`; covers `from`, `import`, `-`, and `as` forms |
| Declarations | `_declaration`, `variable_declaration`, `type_declaration`, `schema_declaration` | `declarations`, `modifiers`, `types`, `namedTypes` → declaration, modifier, built-in type, and defined-type scopes |
| Documentation | `gen_doc_declaration`, `schema_doc_declaration`, `gen_doc_entry`, `schema_doc_entry`, `summary_entry`, `description_entry`, `fields_entry`, `field_doc_entry`, `inline_description`, `description_text` | `declarations`, `documentationKeys`, `inlineDocumentation`, and string entries |
| Record types | `record_type`, `schema_field`, `_field_suffix`, `_field_separator`, `_pair_separator`, `optional_marker` | `properties`, `operators`, `punctuation`, and nested type entries |
| Primitive types | `_type_reference`, `string_type`, `int_type`, `float_type`, `hex_int_type`, `hex_float_type`, `boolean_type`, `named_type` | `types` → `storage.type.primitive.mace`; `namedTypes` → `storage.type.named.mace` |
| Composite types | `array_type`, `record_map_type`, `fusion_type`, `variant_type`, `choice_type`, `choice_member` | `types` → `storage.type.composite.mace`, plus brackets, literals, and named types |
| Output directives | `_data_directive_list`, `_schema_directive_list`, `data_output_mode_directive`, `schema_output_mode_directive`, `data_mode`, `schema_mode`, `schema_directive`, `schema_file_directive`, `parse_directive`, `parse_file_directive` | `keywords`, `languageConstants`, `paths`, `operators`, and `punctuation` |
| Output fields | `output_field`, `output_schema_field` | `properties`, types, literals, operators, and punctuation |
| Nullability | `nullable_modifier`, `optional_marker` | `modifiers` → `storage.modifier.mace`; `operators` → `keyword.operator.mace` |
| Expressions | `_expression`, `_non_conditional_expression`, `_primary_expression`, `parenthesized_expression` | Recursive interpolation plus literal, variable, operator, and punctuation entries |
| Member access | `member_access`, `self_reference`, `parsed_variable_reference` | `specialVariables`, `properties`, `operators` |
| Unary arithmetic | `unary_expression`, `bang_operator`, `tilde_operator`, `plus_operator`, `minus_operator` | `operators` → `keyword.operator.mace` |
| Numeric arithmetic | `exponent_expression`, `multiplicative_expression`, `additive_expression`, `double_star_operator`, `star_operator`, `slash_operator`, `percent_operator` | `operators` → `keyword.operator.mace` |
| Shifts | `shift_expression`, `shift_left_operator`, `shift_right_operator`, `unsigned_shift_right_operator` | `operators` → `keyword.operator.mace` |
| Relations | `relational_expression`, `less_operator`, `less_equal_operator`, `greater_operator`, `greater_equal_operator`, `in_operator` | symbolic operators → `keyword.operator.mace`; `in` → `keyword.operator.word.mace` |
| Structural merge | `merge_operand`, `structural_merge` | `<>` → `keyword.operator.mace`; operands use collection and identifier entries |
| Equality | `equality_expression`, `equal_equal_operator`, `not_equal_operator` | `operators` → `keyword.operator.mace` |
| Bitwise expressions | `bitwise_and_expression`, `bitwise_xor_expression`, `bitwise_or_expression`, `ampersand_operator`, `caret_operator`, `pipe_operator` | `operators` → `keyword.operator.mace` |
| Logical expressions | `logical_and_expression`, `logical_or_expression`, `and_and_operator`, `or_or_operator` | `operators` → `keyword.operator.mace` |
| Conditionals | `conditional_expression` | `?` and `:` use operator and delimiter scopes |
| Match expressions | `match_expression`, `match_arm` | `match` → `keyword.control.mace`; `=>` → `keyword.operator.mace`; patterns and results reuse type and expression entries |
| Collections | `array_literal`, `record_literal`, `record_field` | brackets, properties, literals, operators, and delimiters |

## Scope policy

- `match` uses `keyword.control.mace`; imports and directives use specialized `keyword.other` scopes.
- Declaration words use `keyword.declaration.mace`, while declared type names use `entity.name.type.mace`.
- `nullable` uses `storage.modifier.mace`.
- Primitive and composite type constructors use `storage.type.primitive.mace` and `storage.type.composite.mace`.
- Named type references use `storage.type.named.mace`.
- Record and documentation keys use `variable.other.property.mace`.
- `$self` uses `variable.language.self.mace`; parsed input uses `variable.other.readwrite.mace`.
- Operators use `keyword.operator.mace`, except word-form `in`, which uses `keyword.operator.word.mace`.

These names follow the [TextMate grammar naming conventions](https://macromates.com/manual/en/language_grammars#naming-conventions): language types belong under `storage.type`, declarations under `entity.name.type`, constants under `constant`, and framework-oriented `support` scopes are avoided for Mace syntax.

## Verification

`test/textmate-parity.test.ts` loads the real TextMate grammar through `vscode-textmate` and `vscode-oniguruma`. Its representative Mace documents verify comments, paths, all string forms, interpolation, declarations, documentation, primitive and composite types, directives, special variables, and every operator family.
