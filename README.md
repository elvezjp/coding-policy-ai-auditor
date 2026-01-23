# coding-policy-ai-auditor

[English](./README.md) | [日本語](./README_ja.md)

[![Elvez](https://img.shields.io/badge/Elvez-Product-3F61A7?style=flat-square)](https://elvez.co.jp/)
[![IXV Ecosystem](https://img.shields.io/badge/IXV-Ecosystem-3F61A7?style=flat-square)](https://elvez.co.jp/ixv/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Stars](https://img.shields.io/github/stars/elvezjp/coding-policy-ai-auditor?style=social)](https://github.com/elvezjp/coding-policy-ai-auditor/stargazers)

An LLM-powered auditor that checks Java code compliance with **judgment-based coding standards** (semantic and subjective rules that are difficult to detect with tools like Lint).

This tool applies coding standards "one by one" to the code, **identifies violations with specific line numbers**, and **outputs suggested fixes**.
Since judgment-based rules are inherently difficult to determine absolutely, **ambiguous cases are reported as violations with a `Requires Review:` prefix**, designed to facilitate human review.

---

## Setup Instructions

### System Requirements

- **OS**: macOS / Linux / Windows (WSL recommended)
- **Node.js**: 20.0.0 or higher
- **Python**: 3.10 or higher

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
cd versions/v0.3/frontend
npm install
npm run dev
```

Access the web application at `http://localhost:5173` in your browser.

### 3. Start the Backend

```bash
cd versions/v0.3/backend

# Set environment variables
cp .env.example .env
# Edit .env file to configure AWS credentials

# Install dependencies and start server using uv
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
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
FRONTEND_URL=http://localhost:5173
```

**Note**: Using AWS Bedrock requires an AWS account and access permissions to the Claude Haiku model.

---

## Usage

### Execution Example

```bash
# Start frontend (Terminal 1)
cd versions/v0.3/frontend && npm run dev

# Start backend (Terminal 2)
cd versions/v0.3/backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

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
├── add-line-numbers/       # Line numbering library
├── excel2md/               # Excel to Markdown conversion library
├── docs/
│   └── ai-auditor-format/  # AI Auditor format sample files
├── versions/
│   └── v0.3/
│       ├── frontend/       # Frontend application
│       ├── backend/        # Backend application
│       └── spec.md         # Detailed specification
└── ...
```

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
2. **Checkstyle**: Download `checkstyle-X.X.X-all.jar` from [GitHub Releases](https://github.com/checkstyle/checkstyle/releases) and place it in any folder
3. **PMD**: Download the ZIP file from the [official site](https://pmd.github.io/), extract to any folder, and add the `bin` folder to your PATH environment variable

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
## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed change history.

## Development Background

This tool is a small practical product that emerged from the development process of **IXV (pronounced "ik-siv")**, a development support AI targeting Japanese development documents and specifications.

IXV addresses challenges in understanding, structuring, and utilizing Japanese documents in system development. This repository publishes a portion of that work.

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contact

- **Email**: info@elvez.co.jp
- **Company**: Elvez Inc.
