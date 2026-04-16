# Changelog

[English](./CHANGELOG.md) | [日本語](./CHANGELOG_ja.md)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
| 0.5.0   | Windows static analysis support, CP932 encoding support, test stabilization |
| 0.4.0   | AI Auditor format Excel support, policy selection feature |
| 0.3.0   | Multi-LLM support, static analysis (Java+Python), config generator |
| 0.1.0   | Initial release, basic audit functionality, static analysis (Java) |

### Feature Matrix

| Feature | v0.5 | v0.4 | v0.3 | v0.1 |
|---------|------|------|------|------|
| Java file upload | ✅ | ✅ | ✅ | ✅ |
| Rule prompt management | ✅ | ✅ | ✅ | ✅ |
| Real-time progress | ✅ | ✅ | ✅ | ✅ |
| LLM audit execution | ✅ | ✅ | ✅ | ⚠️ |
| Static analysis (Checkstyle/PMD) | ✅ | ✅ | ✅ | ✅ |
| Static analysis (Ruff/Flake8/Pylint) | ✅ | ✅ | ✅ | ❌ |
| Result filtering | ✅ | ✅ | ✅ | ✅ |
| Markdown report output | ✅ | ✅ | ✅ | ✅ |
| Config file generator | ✅ | ✅ | ✅ | ❌ |
| Unit tests | ✅ | ✅ | ✅ | ❌ |
| AI Auditor format Excel | ✅ | ✅ | ❌ | ❌ |
| Policy selection feature | ✅ | ✅ | ❌ | ❌ |
| Windows static analysis | ✅ | ❌ | ❌ | ❌ |
| CP932 encoding support | ✅ | ❌ | ❌ | ❌ |

**Legend**: ✅ Implemented / ⚠️ Has issues / ❌ Not implemented
