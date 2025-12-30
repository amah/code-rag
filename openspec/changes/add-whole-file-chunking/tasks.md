# Tasks: Add Whole File Chunking Mode

## 1. Configuration
- [ ] 1.1 Add `wholeFile: boolean` to `ChunkingConfigSchema` in `src/config/schema.ts` (default: `false`)
- [ ] 1.2 Update `config/default.yaml` with commented example of `wholeFile` option

## 2. Chunker Implementation
- [ ] 2.1 Update `Chunker` constructor to accept and store `wholeFile` config
- [ ] 2.2 Modify `chunkFile()` to skip parsing when `wholeFile` is enabled
- [ ] 2.3 Ensure large files are still split with overlap even in whole-file mode

## 3. Testing
- [ ] 3.1 Add unit tests for whole-file chunking mode
- [ ] 3.2 Test that large files are properly split in whole-file mode
- [ ] 3.3 Verify default behavior (semantic chunking) is unchanged
