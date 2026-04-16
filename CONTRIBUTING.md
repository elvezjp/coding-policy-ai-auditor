# Contributing to coding-policy-ai-auditor

[English](./CONTRIBUTING.md) | [日本語](./CONTRIBUTING_ja.md)

This document describes the guidelines for contributing to the project.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an Issue on GitHub with the following information:

- A clear and descriptive title
- Steps to reproduce the problem
- Expected behavior
- Actual behavior
- Sample files (if possible)
- Python / Node.js version
- Operating system

### Suggesting Enhancements

We welcome enhancement suggestions! Please create an Issue with the following:

- A clear and descriptive title
- A detailed description of the proposed feature
- Use cases and benefits
- Related examples or mockups

### Pull Requests

1. **Fork the repository** and create a branch from `main` (username/dateYYYYMMDD-description)
   ```bash
   git checkout -b user/20260105-fix-feature
   ```

2. **Follow the coding style** of the existing codebase
   - Use meaningful variable and function names
   - Add comments for complex logic
   - Follow PEP 8 style guidelines

3. **Write tests** for your changes
   ```bash
   # Run backend tests
   cd versions/v0.5/backend
   uv run pytest tests/ -v

   # Run tests with coverage
   uv run pytest tests/ --cov=app --cov-report=html

   # Run frontend tests
   cd versions/v0.5/frontend
   npm test
   ```

4. **Update documentation** as needed
   - Update README.md for user-facing changes
   - Update spec.md for specification changes
   - Add examples when introducing new features

5. **Commit your changes** with a clear commit message
   ```bash
   git commit -m "Add feature: description of your changes"
   ```

6. **Push to your fork** and submit a pull request
   ```bash
   git push origin user/20260105-fix-feature
   ```

7. **Wait for review** - Maintainers will review your PR and may request changes

## Development Setup

### Prerequisites

- Python 3.11 or higher
- Node.js 20.0.0 or higher
- [uv](https://docs.astral.sh/uv/) package manager
- AWS account (optional; required only for Bedrock-based audit)

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/coding-policy-ai-auditor.git
cd coding-policy-ai-auditor

# Install backend dependencies
cd versions/v0.5/backend
uv sync

# Install frontend dependencies
cd ../frontend
npm install
```

### Running Tests

```bash
# Run backend tests
cd versions/v0.5/backend
uv run pytest tests/ -v

# Run a specific test file
uv run pytest tests/test_audit.py -v

# Run with coverage
uv run pytest tests/ --cov=app --cov-report=html

# Run frontend tests
cd ../frontend
npm test
```

### Testing Your Changes

Before submitting a PR, please verify the following:

1. All existing tests pass
2. New tests are added for new features
3. Code coverage is maintained or improved
4. The application works correctly with various Java files
5. Frontend and backend integration works properly

## Coding Guidelines

### Python Style

- Follow PEP 8 style guidelines
- Use type hints where appropriate
- Maximum line length: 100 characters (flexible for long strings)
- Use meaningful variable names

### Documentation

- Add docstrings to all public functions and classes
- Use clear and concise language
- Include examples in docstrings when helpful

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests when relevant

Example:
```
Add multi-provider LLM support

- Add Anthropic API integration
- Add OpenAI API integration
- Update configuration file format

Closes #123
```

## Version Management

When contributing:
- Focus on the latest version (`versions/v0.5/`)
- Maintain backward compatibility where possible
- Clearly document breaking changes

## Code Review Process

1. Maintainers will review your pull request
2. Changes or questions may be requested
3. Once approved, your PR will be merged
4. Contributions will be acknowledged in release notes

## Community Guidelines

- Be respectful and inclusive
- Provide constructive feedback
- Help others when possible

## Questions

If you have questions about contributing, feel free to:
- Create an Issue with the "question" label
- Contact the maintainers
