## ADDED Requirements

### Requirement: Whole File Chunking Mode
The system SHALL support a `wholeFile` chunking mode that embeds entire files as single chunks instead of parsing them into semantic units.

#### Scenario: Whole file mode enabled
- **WHEN** `chunking.wholeFile` is set to `true` in configuration
- **THEN** each file is indexed as a single chunk with `symbol_type: "file"`
- **AND** AST parsing is skipped regardless of file language

#### Scenario: Large file in whole file mode
- **WHEN** `chunking.wholeFile` is `true`
- **AND** a file exceeds `chunking.maxTokens`
- **THEN** the file is split into multiple chunks with `chunking.overlap` overlap
- **AND** each chunk retains the file-level metadata

#### Scenario: Default behavior preserved
- **WHEN** `chunking.wholeFile` is not specified or is `false`
- **THEN** files are parsed into semantic chunks (classes, functions, methods)
- **AND** existing chunking behavior is unchanged
