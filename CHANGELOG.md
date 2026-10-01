# Changelog

## 0.1.0

- Initial release. `buildCard()` API and `mchbad` / `meeting-could-have-been-a-diff` CLI.
- Read-only git facts (files, insertions, deletions, commit subjects) against a chosen base.
- User-supplied evidence files linked by path and SHA-256, with explicit caps (8 files, 256 KiB each, 1 MiB total).
- Explicit blockers only; `evidenceStatus: none-supplied` when no evidence is given.
- No LLM, no network, never executes tests or commands.
