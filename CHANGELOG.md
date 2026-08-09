# Changelog

[English](./CHANGELOG.md) | [日本語](./CHANGELOG_ja.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - Unreleased

### Security
- **[SECURITY] Bumped `starlette` from 1.0.1 to 1.3.1** to resolve Dependabot alerts [#162](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/162) / [#163](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/163) / [#164](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/164) / [#165](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/165) (`starlette < 1.3.1` and related). Also regenerated `uv.lock`.
- **[SECURITY] Fixed a path traversal in the unauthenticated Excel-conversion API that allowed arbitrary file writes** (GHSA-ghvr-jjv7-mx45): `POST /api/convert/excel-to-markdown` (`excel2md_tool.py` / `excel2md_mermaid_tool.py`) joined the client-supplied upload filename directly into a temporary directory path, so absolute paths or `../` sequences could create or overwrite files outside the temporary directory. Client-supplied filenames are now sanitized with `safe_filename()` (added in `versions/v0.5.1/backend/app/safe_path.py`), which strips directory components, with regression tests. Note: `versions/v0.3` / `versions/v0.4` / `versions/v0.5` share the same flaw but are out of scope per the Dependabot Alert Policy (the `versions/` layout is scheduled for removal)
- **[SECURITY] Stopped allowing credentials when CORS is open to all origins** (#33): `CORS_ORIGINS` defaults to `*`, and the backend combined that wildcard with `allow_credentials=True`. Starlette cannot serve a wildcard alongside credentials, so it reflects the request's `Origin` back in `Access-Control-Allow-Origin` instead (`allow_all_origins and allow_credentials` → `allow_explicit_origin()`). Any site could therefore reach this API with credentials and read the response — if a user opened a malicious page while the auditor was running locally, the code and design documents under review could be exfiltrated. Credentials are now disabled whenever the origin list is open to all; behavior with an explicit origin list is unchanged. Because Starlette treats the origins as open when the list *contains* `*` (`allow_all_origins = "*" in allow_origins`), the check uses membership rather than equality, so mixed settings such as `CORS_ORIGINS="https://app.example.com,*"` are also covered. Six regression tests added. Note: `versions/v0.3` / `versions/v0.4` / `versions/v0.5` share the same flaw but are out of scope per the Dependabot Alert Policy (the `versions/` layout is scheduled for removal)
- **[SECURITY] Updated frontend dependencies to resolve Dependabot alerts** (#32): Bumped `react-router-dom` 7.17.0 → 7.18.2 to resolve alerts [#192](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/192) / [#204](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/204) / [#210](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/210) / [#212](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/212) (XSS, route-matching DoS, constructor injection, open redirect), and updated the transitive dev dependencies `js-yaml` 4.2.0 → 4.3.0 (alert [#199](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/199)) and `brace-expansion` → 1.1.16 / 5.0.8 (alert [#186](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/186)), both CPU-consumption DoS. Also preemptively bumped `postcss` 8.5.15 → 8.5.24 (GHSA-r28c-9q8g-f849, arbitrary `.map` file disclosure). Alert [#200](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/200) (GHSA-qwww-vcr4-c8h2, RSC-mode CSRF) was dismissed as not applicable — the unstable RSC APIs are not used and no 7.x patch exists

## [0.5.1] - 2026-05-11

### Security
- **[SECURITY] Path Traversal vulnerability fix** ([Issue #19](https://github.com/elvezjp/coding-policy-ai-auditor/issues/19))
  - Fixed a flaw in the `_safe_relative_path` fallback that allowed traversal paths in the `name` field to be returned as-is, enabling arbitrary file writes outside the intended temp directory via `POST /api/static-analysis/analyze`
  - Applied two-layer defense:
    1. `_safe_relative_path` fallback now strips directory components via `Path(...).name` and falls back to `unknown_file` when empty
    2. `_create_temp_files` now performs a post-`resolve()` boundary check with `is_relative_to()` and raises `ValueError` if the resolved path escapes `tmpdir`
  - No API contract changes; legitimate paths behave as before
  - Note: v0.3 and v0.4 share the same flaw but are out of scope per the Dependabot Alert Policy

### Changed
- **excel2md subtree updated from v2.0 → v2.1.1** ([Issue #21](https://github.com/elvezjp/coding-policy-ai-auditor/issues/21))
  - `versions/v0.5.1/backend/app/markdown_tools/excel2md_tool.py` now references `excel2md/v2.1.1/`
  - Inherits the following upstream fixes:
    - **v2.0.1**: Fixed `NameError` in heuristic Mermaid detection caused by a missing `is_code_block` import
    - **v2.1.0**: Bumped bundled test-time dependencies — pytest 9.0.3 ([CVE-2025-71176](https://github.com/advisories/GHSA-6w46-j5rx-g56g)) and Pygments 2.20.0 ([CVE-2026-4539](https://github.com/advisories/GHSA-5239-wwwm-4pmq))
    - **v2.1.1**: Restored v1.x backward-compatible re-exports (`is_code_block`, `build_code_block_from_rows`); fixed tuple-arity mismatch on the `max_cells_per_table` truncation path; fixed duplicated and dropped footnote numbering across multiple tables
  - Note: upstream raised its minimum Python to 3.10 in v2.1.0, which is already covered by v0.5's `requires-python = ">=3.11"`

### Note
- Backward compatible with v0.5.0 (no API or behavioral change for legitimate inputs)

## [0.5.0] - 2026-04-16

### Added
- **Windows static analysis support**: Safely execute `.bat/.cmd` tools via `cmd /c` (without using `shell=True`)
- **CP932 encoding support**: UTF-8/CP932 fallback decoding for tool output, automatic CP932-to-UTF-8 conversion for analysis target files
- **Unified process execution**: Unified `subprocess.run()` to `run_capture()` for Windows/Unix compatibility
- **v0.5 CI jobs**: Added v0.5 backend and frontend tests to GitHub Actions (Windows/macOS/Linux)

### Fixed
- **File re-selection reset bug**: Fixed `addCodeFiles` to immediately reset state on re-selection ([Issue #15](https://github.com/elvezjp/coding-policy-ai-auditor/issues/15))
- **Test instability**: Replaced `setTimeout(0)` async waits with `waitFor` for stability

### Changed
- Raised minimum Python version to 3.11

### Note
- Based on the implementation from PR #14 (by atsutakaGithub)
- Backward compatible with v0.4

## [0.4.0] - 2026-01-28

### Added
- **Policy selection feature**: Select individual policies via checkboxes in AI Auditor format
  - Only selected policies are converted to Markdown
  - Linked detail sheets are dynamically filtered

### Note
- Backward compatible with v0.3
- See `docs/ai-auditor-format/` for AI Auditor format Excel samples

## [0.3.0] - 2026-01-26

### Added
- **Multi-LLM provider support**: Switch between AWS Bedrock / OpenAI / Anthropic for audit execution
- **Static analysis (Java)**: Checkstyle / PMD for mechanical rule checking
- **Static analysis (Python)**: Ruff / Flake8 / Pylint for mechanical rule checking
- **Config file generator**: GUI-based generation of LLM settings and rulesets
- **Unit tests**: Tests for major backend features
- **Public documentation**: CONTRIBUTING.md, SECURITY.md, GitHub templates

### Changed
- **Frontend redesign**: Modern SPA with Vite + React 19 + TypeScript + Tailwind CSS
- **Backend improvements**: High-performance API with FastAPI + Python 3.10+
- **excel2md v2.0**: Updated git subtree to v2.0

### Note
- Not backward compatible with v0.1
- Static analysis tools (Checkstyle/PMD/Ruff/Flake8/Pylint) are optional; AI audit works without them

## [0.1.0] - 2026-01-09

### Added
- **Initial release**: Basic audit functionality
- **Java file upload**: Drag & drop support
- **Rule prompt management**: Create new, import MD files, delete
- **Real-time progress**: WebSocket-based progress updates
- **Audit result filtering**: Toggle violation/requires-review display
- **Markdown report output**: Download audit results
- **Static analysis service**: Checkstyle / PMD mechanical detection

### Known Issues
- Errors may occur with AWS Bedrock integration
- Unit tests not yet implemented

---

## Links

- [Repository](https://github.com/elvezjp/coding-policy-ai-auditor)
- [Issues](https://github.com/elvezjp/coding-policy-ai-auditor/issues)

---

## Version Comparison

| Version | Key Features |
|---------|-------------|
| 0.5.1   | Path Traversal vulnerability fix, excel2md subtree updated to v2.1.1 |
| 0.5.0   | Windows static analysis support, CP932 encoding support, test stabilization |
| 0.4.0   | AI Auditor format Excel support, policy selection feature |
| 0.3.0   | Multi-LLM support, static analysis (Java+Python), config generator |
| 0.1.0   | Initial release, basic audit functionality, static analysis (Java) |

### Feature Matrix

| Feature | v0.5.1 | v0.5 | v0.4 | v0.3 | v0.1 |
|---------|--------|------|------|------|------|
| Java file upload | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rule prompt management | ✅ | ✅ | ✅ | ✅ | ✅ |
| Real-time progress | ✅ | ✅ | ✅ | ✅ | ✅ |
| LLM audit execution | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Static analysis (Checkstyle/PMD) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Static analysis (Ruff/Flake8/Pylint) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Result filtering | ✅ | ✅ | ✅ | ✅ | ✅ |
| Markdown report output | ✅ | ✅ | ✅ | ✅ | ✅ |
| Config file generator | ✅ | ✅ | ✅ | ✅ | ❌ |
| Unit tests | ✅ | ✅ | ✅ | ✅ | ❌ |
| AI Auditor format Excel | ✅ | ✅ | ✅ | ❌ | ❌ |
| Policy selection feature | ✅ | ✅ | ✅ | ❌ | ❌ |
| Windows static analysis | ✅ | ✅ | ❌ | ❌ | ❌ |
| CP932 encoding support | ✅ | ✅ | ❌ | ❌ | ❌ |
| Path Traversal vulnerability fix (#19) | ✅ | ⚠️ | ⚠️ | ⚠️ | - |
| excel2md subtree version | v2.1.1 | v2.0 | v2.0 | v2.0 | - |

**Legend**: ✅ Implemented / ⚠️ Has issues / ❌ Not implemented
