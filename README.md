# coding-policy-ai-auditor

[English](./README.md) | [日本語](./README_ja.md)

[![Elvez](https://img.shields.io/badge/Elvez-Product-3F61A7?style=flat-square)](https://elvez.co.jp/)
[![IXV Ecosystem](https://img.shields.io/badge/IXV-Ecosystem-3F61A7?style=flat-square)](https://elvez.co.jp/ixv/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Stars](https://img.shields.io/github/stars/elvezjp/coding-policy-ai-auditor?style=social)](https://github.com/elvezjp/coding-policy-ai-auditor/stargazers)

An LLM-powered auditor that checks Java code compliance with **judgment-based coding standards** (semantic and subjective rules that are difficult to detect with tools like Lint).

This tool applies coding standards "one by one" to the code, **identifies violations with specific line numbers**, and **outputs suggested fixes**.
Since judgment-based rules are inherently difficult to determine absolutely, **ambiguous cases are reported as violations with a `Requires Review:` prefix**, designed to facilitate human review.

https://github.com/user-attachments/assets/01b8fe08-861b-473a-8f1a-f4de00f751f4

---

## Intended Environment

This tool is intended for local use and has no application authentication or authorization. Anyone who can reach it may invoke the LLM using server credentials and incur charges.

- Start the backend with `--host 127.0.0.1`.
- If exposing it on a network, require authentication at a reverse proxy and restrict direct access to the backend.
- CORS defaults to `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`, and `http://127.0.0.1:4173`, including when unset or blank.
- Set `CORS_ORIGINS` explicitly for other origins. Credentials are disabled whenever the list contains `*`. Avoid allow-all settings. CORS does not replace authentication or network access controls.


## Features

- **Judgment-based rule auditing**: Detects semantic and subjective coding standard violations that linters cannot catch
- **Line-number specific detection**: Identifies violations with exact line numbers and outputs suggested fixes
- **Ambiguity handling**: Reports ambiguous cases with a `Requires Review:` prefix, designed for human review
- **Multi-LLM provider support**: Switch between AWS Bedrock, OpenAI, and Anthropic APIs
- **Static analysis integration**: Combine AI audit with Checkstyle, PMD, Ruff, Flake8, and Pylint
- **Config file generator**: GUI-based generation of LLM settings and rulesets
- **Cross-platform**: Supports macOS, Linux, and Windows

## Use Cases

- **Code review automation**: Audit Java code against company-specific coding standards that static analysis tools cannot detect
- **Compliance checking**: Verify adherence to judgment-based rules such as naming conventions, comment quality, and design patterns
- **Review support**: Generate audit reports with specific violation locations and fix suggestions to streamline human review

## System Architecture

- **Frontend** (UI): Vite + React 19 + TypeScript + Tailwind CSS
- **Backend** (API / Processing): Python / FastAPI
  - MarkItDown / excel2md (Excel to Markdown conversion)
  - add-line-numbers (line numbering)
  - Multi-LLM provider support (Bedrock / Anthropic / OpenAI)
  - Static analysis tools (Checkstyle / PMD / Ruff / Flake8 / Pylint)

## Setup Instructions

### System Requirements

- **OS**: macOS / Linux / Windows (WSL recommended)
- **Node.js**: 20.19+ (20.x), 22.12+ (22.x), or 24+
- **Python**: 3.11 or higher

### 1. Install Required Tools

Please install the following tools in advance.

| Tool | Purpose | Installation |
|------|---------|--------------|
| uv | Python package manager | [Official site](https://docs.astral.sh/uv/) |
| Java (JDK 21+) | Running static analysis tools | [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) or other methods appropriate for your environment |
| Checkstyle | Coding standard checker (Java) | [GitHub](https://github.com/checkstyle/checkstyle) |
| PMD | Static code analysis (Java) | [Official site](https://pmd.github.io/) |

> **Note**: Java/Checkstyle/PMD are only required when using static analysis features. The AI audit functionality works normally even without them installed. Python static analysis tools (Ruff/Flake8/Pylint) are managed as backend dependencies. See [Using Static Analysis Tools](#using-static-analysis-tools) for details.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Access the web application at `http://localhost:5173` in your browser.

### 3. Start the Backend

```bash
cd backend

# Set environment variables
cp .env.example .env
# Edit .env file to configure AWS credentials

# Install dependencies and start server using uv
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend API starts at `http://localhost:8000`.

#### System LLM Configuration (AWS Bedrock)

**Note**: If you don't have an AWS environment, this configuration is not required. Users can set their own LLM credentials by uploading a configuration file through the web interface.

Configure the following in your `.env` file:

```env
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
BEDROCK_MODEL_ID=global.anthropic.claude-haiku-4-5-20251001-v1:0
BEDROCK_MAX_TOKENS=16384
CORS_ORIGINS=http://localhost:5173
```

**Note**: Using AWS Bedrock requires an AWS account and access permissions to the Claude Haiku model.

---

## Usage

### Execution Example

```bash
# Start frontend (Terminal 1)
cd frontend && npm run dev

# Start backend (Terminal 2)
cd backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Access http://localhost:5173 in your browser
```

### Web Interface

1. Open `http://localhost:5173` in your browser
2. Upload a coding standards file (Excel)
3. Upload Java program files
4. Review static analysis settings
5. Click the "Start Audit" button
6. Review results and download report if needed

Coding standards files can be in [AI Auditor format](docs/ai-auditor-format/) or any Excel file converted to Markdown.

## Directory Structure

```
coding-policy-ai-auditor/
├── README.md
├── backend/                # Backend application (FastAPI)
├── frontend/               # Frontend application (Vite + React)
├── docs/
│   ├── spec.md             # Detailed specification
│   ├── design.md           # Design document (for developers)
│   ├── config-file-generator-spec.md  # Config file generator specification
│   ├── ai-auditor-format/  # AI Auditor format sample files
│   └── samples/            # Sample code
└── ...
```

## Related Projects

The following in-house tools are used as dependencies (installed via uv from PyPI or git sources — see `backend/pyproject.toml`).

| Package | Repository | Description |
|---------|-----------|-------------|
| add-line-numbers | https://github.com/elvezjp/add-line-numbers | Tool to add line numbers to files |
| excel2md | https://github.com/elvezjp/excel2md | Excel to CSV Markdown conversion tool |

If you need the sources for reference, clone the upstream repositories directly (e.g., `git clone https://github.com/elvezjp/excel2md.git`). These repositories were previously embedded at the repository root as git subtrees; that layout is preserved in the `v0.5.1` tag.

## Version Management

Only the latest code is kept at the repository root. Versions are managed with git tags.

- The `main` branch accumulates changes for the next version under a `## [X.Y.Z] - Unreleased` heading in [CHANGELOG.md](CHANGELOG.md)
- On release, the heading date is finalized, the version in `backend/pyproject.toml` (and the frontend version labels) is confirmed, and a `vX.Y.Z` tag is created (see [CONTRIBUTING.md](CONTRIBUTING.md#version-management) for the steps)

### Using Old Versions

Old versions (v0.3–v0.5.1) were previously kept as snapshots under a `versions/` directory. That layout, including the embedded `add-line-numbers/` and `excel2md/` copies, is preserved in the `v0.5.1` tag:

```bash
git checkout v0.5.1
# Old versions are under versions/v0.3 ... versions/v0.5.1
```

**Note**:

- The code under the `v0.5.1` tag is a frozen snapshot and does not include the security fixes made in v0.6.0 and later (path traversal, CORS configuration, and others — see [CHANGELOG.md](CHANGELOG.md)). Use it for reference and verification only, and use the latest version for actual use
- Do not delete or move the `v0.5.1` tag — it serves as the archive reference point for the old layout

## Using Static Analysis Tools

This section explains the setup for using static analysis in addition to AI auditing.

> **Note**: Even if static analysis tools are not installed, the AI audit functionality works normally. Static analysis will be skipped, and only AI auditing will be performed.

### Java Static Analysis Tools

To use Java static analysis (Checkstyle, PMD), install them according to your environment as follows.

**macOS (using Homebrew):**

```bash
brew install openjdk
brew install checkstyle
brew install pmd
```

**macOS (downloading packages):**

1. Java: Download DMG file from [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) and install
2. Checkstyle: Download the latest release from [GitHub Releases](https://github.com/checkstyle/checkstyle/releases)
3. PMD: Download the latest release from [GitHub Releases](https://github.com/pmd/pmd/releases)

**Windows:**

1. **Java**: Download and run the Windows installer from [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) or similar
2. **Checkstyle**: Download `checkstyle-X.X.X-all.jar` from [GitHub Releases](https://github.com/checkstyle/checkstyle/releases), place it in any folder, and create `checkstyle.bat` in the same folder:
   ```bat
   @echo off
   java -jar "%~dp0checkstyle-X.X.X-all.jar" %*
   ```
   (Replace `checkstyle-X.X.X-all.jar` with your downloaded file name.)
3. **PMD**: Download the ZIP from the [official site](https://pmd.github.io/) or [GitHub Releases](https://github.com/pmd/pmd/releases), extract to any folder. Some archives nest folders (e.g. `pmd-dist-X.X.X-bin\pmd-bin-X.X.X\bin`). Add **only** the `bin` directory that contains `pmd.bat` to your PATH.

Before starting the backend in PowerShell, prepend Java and tool locations to `PATH` (adjust paths to match your install):

```powershell
$JAVA_BIN       = "C:\path\to\jdk\bin"
$CHECKSTYLE_DIR = "C:\path\to\checkstyle"
$PMD_BIN        = "C:\path\to\...\bin"

$env:PATH = "$JAVA_BIN;$CHECKSTYLE_DIR;$PMD_BIN;" + $env:PATH
```

Confirm with `where.exe java`, `where.exe checkstyle`, and `where.exe pmd`, then run `uv run uvicorn ...`.

Please refer to the latest documentation for each tool for placement and configuration details.


### Python Static Analysis Tools

- **Pylint**: Installed by default
- **Ruff/Flake8**: Since they have similar static analysis capabilities, choose one to install additionally.

```bash
# Default: Pylint only
uv sync

# To use Ruff (recommended)
uv sync --extra ruff

# To use Flake8
uv sync --extra flake8
```

**Behavior:**
- If both Ruff and Flake8 are installed, both will be executed

---

## Documentation

- [Detailed Specification](docs/spec.md) - Specification document
- [Design Document](docs/design.md) - Design philosophy, technical details, and internals (for developers, Japanese)
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [SECURITY.md](SECURITY.md) - Security policy
- [AI Auditor Format](docs/ai-auditor-format/) - Sample files for AI Auditor format

## Security

For details, see [SECURITY.md](SECURITY.md).

- Process only files from trusted sources
- Manage API keys via environment variables; do not hardcode them
- Review generated audit reports before sharing, as they may contain source code content

### Dependabot Alert Policy

This repository keeps only the latest code at the root (`backend/` / `frontend/`) and old versions are referenced via git tags, so old versions are not scanned by Dependabot. The in-house tools (`add-line-numbers`, `excel2md`) are installed as uv dependencies, so their vulnerabilities are detected through the root lockfiles. Given this, we operate Dependabot alerts as follows.

#### Malware tab

- **Always fix**

#### Vulnerable tab

| Target | Action |
|--------|--------|
| Root lockfiles (`backend/uv.lock`, `frontend/package-lock.json`) | **Fix** (dependency update / PR) |

A dismissed alert will not reappear for the same combination of manifest × package × CVE, but a new CVE published for the same package will be raised as a new alert.

## Contributing

Contributions are welcome. For details, see [CONTRIBUTING.md](CONTRIBUTING.md).

- Bug reports: [GitHub Issues](https://github.com/elvezjp/coding-policy-ai-auditor/issues)
- Feature suggestions: [GitHub Issues](https://github.com/elvezjp/coding-policy-ai-auditor/issues)
- Pull requests: [GitHub Pull Requests](https://github.com/elvezjp/coding-policy-ai-auditor/pulls)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed change history.

## Background

This tool was created during the development of **IXV**, an AI development ecosystem designed for Japanese engineering teams.

IXV delivers a methodology and OSS that put AI to practical use in real development workflows. This repository publishes a portion of that work.

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contact

- **Email**: info@elvez.co.jp
- **Company**: Elvez Inc.
