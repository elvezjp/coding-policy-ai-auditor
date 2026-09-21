# Changelog

[English](./CHANGELOG.md) | [日本語](./CHANGELOG_ja.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-09-21

This release retires the `versions/` directory in favor of a layout that keeps only the latest code at the repository root, together with security fixes and dependency updates.

### Security
- **Fixed a path traversal in the Excel-conversion API that allowed arbitrary file writes** (GHSA-ghvr-jjv7-mx45): `POST /api/convert/excel-to-markdown` joined the client-supplied filename directly into a temporary directory path, so absolute paths or `../` sequences could create or overwrite files outside it. Filenames are now sanitized with `safe_filename()`, which strips directory components, with regression tests
- **[BREAKING] Changed the CORS default from allow-all (`*`) to local development origins only** (#33, #43): When `CORS_ORIGINS` is unset or blank, only `http://localhost:5173` / `http://127.0.0.1:5173` / `http://localhost:4173` / `http://127.0.0.1:4173` are allowed. Credentials (`allow_credentials`) are never allowed when the setting contains `*`, including mixed values such as `https://app.example.com,*`. Previously the allow-all default combined with `allow_credentials=True` made Starlette echo the requesting Origin, so any site could read responses containing the code and design documents under audit. **Note:** the frontend calls the API from the same origin, so typical setups are unaffected; if you call the API from a different origin, set `CORS_ORIGINS` explicitly
- **Switched the in-house tool `add-line-numbers` to a tagged git dependency** (#35, CWE-829): It is now fetched from the upstream release tag `v0.1.3` instead of a local path reference to an in-tree copy. Runtime behavior is unchanged
- **Documented that the tool is intended for local use** (#43): The tool has no authentication or authorization, so README / SECURITY gained an "Intended environment" section and the launch examples now use `--host 127.0.0.1`. SECURITY now supports the latest version only, and vulnerability reports go through private channels only (GitHub private vulnerability reporting or email)
- **Updated dependencies to address known vulnerabilities**:
  - Backend: `starlette` 1.0.1 → 1.6.0 (Dependabot alerts #162–#165). `uv lock --upgrade` updated 30 packages in total, including `fastapi` 0.141.1, `uvicorn` 0.52.1, `anthropic` 0.121.0, and `openai` 2.53.0
  - Frontend: `react-router-dom` 7.17.0 → 7.18.2 (XSS, route-matching DoS, constructor injection, open redirect; #32), `vitest` 4.1.9 → 4.1.11 (GHSA-82fw-gwwq-j7x9), `browserslist` 4.28.2 → 4.28.9 (GHSA-73wf-gq98-2v4g), `js-yaml` 4.2.0 → 4.3.2 (GHSA-5p4m-2wfm-xmqj and others), `brace-expansion` → 1.1.16 / 5.0.8, `postcss` 8.5.15 → 8.5.24 (GHSA-r28c-9q8g-f849)
  - GHSA-qwww-vcr4-c8h2 (CSRF in `react-router` RSC mode) was dismissed: the affected feature is not used and no 7.x fix exists

### Fixed
- **Fixed `/health` returning 404** (#43): The route was registered after the static file mount at `/`, which shadowed it. The registration order was swapped and a regression test added

### Changed
- **[BREAKING] Retired the `versions/` directory and moved to a layout that keeps only the latest code at the repository root** (#24): `backend` and `frontend` under `versions/v0.5.1/` moved to the root, the specifications moved to `docs/`, and the snapshots of old versions (v0.3 / v0.4 / v0.5) were removed. This ends the duplicate Dependabot alerts against the lockfiles of old versions. The old layout is preserved under the `v0.5.1` tag and can be inspected with `git checkout v0.5.1` (the code under that tag does not include this release's security fixes). Going forward, a `vX.Y.Z` tag is created at release time
- **[BREAKING] Migrated `excel2md` from `sys.path` injection of an in-tree copy to a PyPI dependency** (#26): `excel2md>=2.2.1` was added as a dependency (v2.1.1 → v2.3.0). The `EXCEL2MD_PATH` environment variable has been removed. Verified that converting the sample policy workbook yields identical output before and after the migration
- **Updated the documentation for the single-version layout and git-tag based releases** (#24, #26): The steps in README / CONTRIBUTING now use the root layout, README gained "Related Projects" and "Version Management" sections, and the Dependabot alert policy now covers the root lockfiles only
- **Aligned the Node.js requirement with the dependencies** (#43): 20.19+ (20.x) / 22.12+ (22.x) / 24+. The frontend CI Node.js matrix also changed from `["20", "23"]` to `["20", "24"]`

### Removed
- **[BREAKING] Removed the in-tree copies of the in-house tools, `add-line-numbers/` and `excel2md/`** (#24, #26): They had already moved to a git dependency and a PyPI dependency respectively and were no longer referenced. The dependency manifests in the repository went from 19 files to 4. To read the sources, clone the upstream repositories ([add-line-numbers](https://github.com/elvezjp/add-line-numbers), [excel2md](https://github.com/elvezjp/excel2md))
- **Removed the unused version-switching code** (#24): The frontend's `VersionSelector` / `useVersions` and related code. No change to what the UI shows or does

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
| 0.6.0   | Retired `versions/` and moved to a root layout, excel2md migrated to PyPI, security fixes (path traversal in the Excel-conversion API, CORS default restricted to local origins), `/health` 404 fix |
| 0.5.1   | Path Traversal vulnerability fix, excel2md subtree updated to v2.1.1 |
| 0.5.0   | Windows static analysis support, CP932 encoding support, test stabilization |
| 0.4.0   | AI Auditor format Excel support, policy selection feature |
| 0.3.0   | Multi-LLM support, static analysis (Java+Python), config generator |
| 0.1.0   | Initial release, basic audit functionality, static analysis (Java) |

### Feature Matrix

| Feature | v0.6.0 | v0.5.1 | v0.5 | v0.4 | v0.3 | v0.1 |
|---------|--------|--------|------|------|------|------|
| Java file upload | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rule prompt management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Real-time progress | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| LLM audit execution | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Static analysis (Checkstyle/PMD) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Static analysis (Ruff/Flake8/Pylint) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Result filtering | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Markdown report output | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Config file generator | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Unit tests | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| AI Auditor format Excel | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Policy selection feature | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Windows static analysis | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| CP932 encoding support | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Path Traversal vulnerability fix (#19) | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | - |
| excel2md version (subtree up to v0.5.1) | v2.3.0 (PyPI) | v2.1.1 | v2.0 | v2.0 | v2.0 | - |
| Path traversal fix in the Excel-conversion API (GHSA-ghvr-jjv7-mx45) | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | - |
| CORS default restricted to local origins / no credentials when open to all | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | - |

**Legend**: ✅ Implemented / ⚠️ Has issues / ❌ Not implemented
