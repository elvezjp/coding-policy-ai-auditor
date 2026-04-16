# Security Policy

[English](./SECURITY.md) | [日本語](./SECURITY_ja.md)

## Supported Versions

The latest version is supported:

| Version | Supported          |
| ------- | ------------------ |
| 0.5.x   | :white_check_mark: |
| 0.4.x   | :white_check_mark: |
| < 0.4   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in coding-policy-ai-auditor, please follow these steps for responsible disclosure:

### How to Report

1. **Do not** create a public GitHub Issue for security vulnerabilities
2. Send a detailed report to the maintainers via one of the following methods:
   - Create a GitHub Private Security Advisory (recommended)
   - Create an Issue with the "security" label for low-severity issues

### What to Include

Please include the following information in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact and severity
- Suggested fix or mitigation (if any)
- Contact information (optional)

### Report Example

```
Subject: [SECURITY] Potential vulnerability in file upload

Description:
When uploading a specially crafted Java file,
unexpected behavior may occur on the server side.

Steps to reproduce:
1. Create a very large Java file
2. Upload the file
3. Run the audit process

Impact:
May cause excessive server resource consumption or denial of service.

Suggested fix:
Strengthen file size and line count limits.
```

## Response Schedule

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Resolution**: Depending on severity
  - Critical: Within 14 days
  - High: Within 30 days
  - Medium: Within 60 days
  - Low: Next release cycle

## Security Considerations

### File Processing

coding-policy-ai-auditor processes files that may include:

- Java source code files (audit targets)
- Policy prompt files (Markdown format)
- Configuration files (API keys, credentials)

**Recommendations:**

1. Only process files from trusted sources
2. Review files received from external sources before processing
3. Use a sandbox environment when processing untrusted files
4. Carefully manage configuration files containing API keys and credentials

### API Key Management

This application may use the following APIs:

- AWS Bedrock
- Anthropic API
- OpenAI API

**Recommendations:**

1. Manage API keys via environment variables; do not hardcode them
2. Follow the principle of least privilege; grant only necessary permissions
3. Rotate API keys regularly
4. Use different API keys for production and development environments

### Input Validation

coding-policy-ai-auditor includes the following security measures:

- File extension and MIME type validation for uploads
- File size limits
- Input file validation

### Output Security

Notes when using generated audit reports:

- Reports may contain content from input files (Java source code)
- If files containing sensitive information are audited, the reports will also contain sensitive information
- Review report content before sharing

### Dependencies

This project uses the following major dependencies:

**Backend:**
- `fastapi`: Web framework
- `boto3`: AWS Bedrock integration
- `websockets`: Real-time communication

**Frontend:**
- `react`: UI framework
- `vite`: Build tool

We monitor security advisories for these dependencies and update as needed.

## Security Best Practices

Recommendations when using coding-policy-ai-auditor:

1. **Keep up to date**: Always use the latest version
2. **Verify inputs**: Inspect files before processing
3. **Sandbox processing**: Use containers or VMs for untrusted files
4. **Validate outputs**: Review generated reports before use
5. **Limit permissions**: Run with minimum required privileges
6. **Monitor dependencies**: Keep dependency libraries up to date
7. **Protect credentials**: Manage API keys securely

## Known Security Limitations

1. **File size**: Very large Java files may cause memory issues
2. **LLM output**: AI audit results are not always accurate. Human review is required for critical decisions
3. **Static analysis**: Static analysis tools (Checkstyle/PMD) are optional features and will be skipped if not installed

## Security Updates

Security updates are released in the following formats:

- Patch versions for minor issues (e.g., 0.4.1)
- Minor versions for critical issues (e.g., 0.5.0)
- Documented in CHANGELOG.md with a `[SECURITY]` prefix

## Acknowledgments

We appreciate security researchers who responsibly report vulnerabilities. Those who report valid security issues will be acknowledged in:

- CHANGELOG.md (unless anonymity is requested)
- Release notes for the fix

## Questions

For security-related questions that are not vulnerabilities, please contact us via:

- Create an Issue with the "security" label
- Contact the maintainers
