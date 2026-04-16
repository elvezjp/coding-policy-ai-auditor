"""静的解析サマリー生成モジュール

静的解析結果からAI監査向けのサマリーを生成する。
サマリーはJSON構造体とマークダウン形式の両方で提供される。
"""

from typing import Any

SUMMARY_SCHEMA_VERSION = 1
SUMMARY_MAX_TOKENS = 500

MAX_MESSAGE_LENGTH = 200
MAX_PATH_LENGTH = 80
TOP_FILES_LIMIT = 5
TOP_RULES_LIMIT = 5
SAMPLE_FINDINGS_LIMIT = 3

def _truncate_with_ellipsis(value: str, max_length: int) -> str:
    """文字列を最大長で切り詰め、省略記号を付ける"""
    if len(value) <= max_length:
        return value
    return f"...{value[-(max_length - 3):]}"


def _normalize_severity(
    tool: str | None, value: str | int | None
) -> str | None:
    """ツール固有の重大度を統一形式に正規化する

    Returns:
        'error', 'warning', 'info', または None（無視すべき場合）
    """
    if value is None:
        return "info"

    tool_name = (tool or "").lower()
    normalized = str(value).lower()

    if tool_name == "checkstyle":
        if normalized == "error":
            return "error"
        if normalized in ("warning", "warn"):
            return "warning"
        if normalized in ("info", "ignore"):
            return "info"
        return "info"

    if tool_name == "pmd":
        try:
            level = int(normalized)
            if level in (1, 2):
                return "error"
            if level in (3, 4):
                return "warning"
            if level == 5:
                return "info"
        except ValueError:
            pass
        return "info"

    if tool_name == "ruff":
        if normalized.startswith("e") or normalized.startswith("f"):
            return "error"
        if normalized.startswith("w"):
            return "warning"
        return "info"

    if tool_name == "eslint":
        if normalized in ("2", "error"):
            return "error"
        if normalized in ("1", "warn", "warning"):
            return "warning"
        if normalized in ("0", "off"):
            return None
        return "info"

    # 汎用マッピング
    if normalized in ("error", "fatal", "critical"):
        return "error"
    if normalized in ("warning", "warn"):
        return "warning"
    return "info"


def _normalize_file_path(file: str, files: list[dict]) -> str:
    """ファイルパスを正規化し、切り詰める"""
    normalized = file.replace("\\\\", "/")
    basename = normalized.split("/")[-1] or normalized

    # ファイルリストから一致するものを探す
    for f in files:
        filename = f.get("name", "")
        if filename == file or filename == basename:
            return _truncate_with_ellipsis(filename, MAX_PATH_LENGTH)

    return _truncate_with_ellipsis(basename, MAX_PATH_LENGTH)


def _get_sample_finding_key(violation: dict, rule_id: str) -> str:
    """サンプル検出項目の重複チェック用キーを生成"""
    if rule_id != "unknown":
        return f"{violation.get('tool', 'unknown')}:{rule_id}"
    return f"{violation.get('tool', 'unknown')}:{violation.get('message', '')}"


def build_summary_for_audit(
    result: dict[str, Any], files: list[dict]
) -> dict[str, Any]:
    """静的解析結果からAI監査向けサマリーを構築する

    Args:
        result: 静的解析結果（StaticAnalysisResult形式）
        files: 解析対象ファイルリスト（{name: str, ...}形式）

    Returns:
        StaticAnalysisSummaryForAudit形式の辞書
    """
    severity_counts = {"error": 0, "warning": 0, "info": 0}
    tool_counts: dict[str, int] = {}
    file_counts: dict[str, int] = {}
    rule_counts: dict[str, int] = {}

    violations = result.get("violations", [])

    for violation in violations:
        severity = _normalize_severity(
            violation.get("tool"), violation.get("severity")
        )
        if not severity:
            continue
        severity_counts[severity] += 1

        tool = violation.get("tool", "unknown")
        tool_counts[tool] = tool_counts.get(tool, 0) + 1

        file = _normalize_file_path(violation.get("file", "unknown"), files)
        file_counts[file] = file_counts.get(file, 0) + 1

        rule_id = violation.get("rule_id", "unknown")
        rule_key = f"{tool}:{rule_id}"
        rule_counts[rule_key] = rule_counts.get(rule_key, 0) + 1

    # 上位ファイル
    top_files = sorted(
        [{"file": f, "count": c} for f, c in file_counts.items()],
        key=lambda x: (-x["count"], x["file"]),
    )[:TOP_FILES_LIMIT]

    # 上位ルール
    top_rules_raw = []
    for key, count in rule_counts.items():
        sep_index = key.find(":")
        if sep_index == -1:
            tool = key
            rule_id = "unknown"
        else:
            tool = key[:sep_index]
            rule_id = key[sep_index + 1:] or "unknown"
        top_rules_raw.append({"tool": tool, "ruleId": rule_id, "count": count})

    top_rules = sorted(
        top_rules_raw,
        key=lambda x: (-x["count"], x["tool"], x["ruleId"]),
    )[:TOP_RULES_LIMIT]

    # サンプル検出項目（重大度順、重複排除）
    severity_order = {"error": 0, "warning": 1, "info": 2}
    sorted_violations = sorted(
        violations,
        key=lambda v: severity_order.get(
            _normalize_severity(v.get("tool"), v.get("severity")) or "info", 2
        ),
    )

    sample_findings: list[dict] = []
    seen: set[str] = set()

    for violation in sorted_violations:
        if len(sample_findings) >= SAMPLE_FINDINGS_LIMIT:
            break
        rule_id = violation.get("rule_id", "unknown")
        key = _get_sample_finding_key(violation, rule_id)
        if key in seen:
            continue
        severity = _normalize_severity(
            violation.get("tool"), violation.get("severity")
        )
        if not severity:
            continue
        seen.add(key)

        message = _truncate_with_ellipsis(
            violation.get("message", ""), MAX_MESSAGE_LENGTH
        )
        file = _normalize_file_path(violation.get("file", "unknown"), files)
        line = violation.get("line", 0)

        sample_findings.append(
            {
                "tool": violation.get("tool", "unknown"),
                "file": file,
                "line": line if line and line > 0 else 0,
                "ruleId": rule_id,
                "message": message,
                "severity": severity,
            }
        )

    total_findings = (
        severity_counts["error"]
        + severity_counts["warning"]
        + severity_counts["info"]
    )

    return {
        "schemaVersion": SUMMARY_SCHEMA_VERSION,
        "runId": result.get("run_id"),
        "timestamp": result.get("timestamp"),
        "totalFindings": total_findings,
        "bySeverity": severity_counts,
        "byTool": tool_counts,
        "topFiles": top_files,
        "topRules": top_rules,
        "sampleFindings": sample_findings,
    }


def build_summary_markdown(summary: dict[str, Any]) -> str:
    """サマリーをマークダウン形式に変換する

    Args:
        summary: build_summary_for_auditで生成されたサマリー

    Returns:
        マークダウン形式の文字列
    """
    if not summary:
        return ""

    schema_version = summary.get("schemaVersion")
    total_findings = summary.get("totalFindings", 0)
    by_severity = summary.get("bySeverity") or {}

    if schema_version != SUMMARY_SCHEMA_VERSION:
        # 未知のスキーマバージョンの場合は最小限の情報を出力
        lines = [f"- 総検出数: {total_findings}"]
        if by_severity:
            lines.append(
                f"- 重大度別: error={by_severity.get('error', 0)}, "
                f"warning={by_severity.get('warning', 0)}, "
                f"info={by_severity.get('info', 0)}"
            )
        return "\n".join(lines)

    base_lines = [f"- 総検出数: {total_findings}"]
    if by_severity:
        base_lines.append(
            f"- 重大度別: error={by_severity.get('error', 0)}, "
            f"warning={by_severity.get('warning', 0)}, "
            f"info={by_severity.get('info', 0)}"
        )

    by_tool = summary.get("byTool") or {}
    by_tool_lines: list[str] = []
    if by_tool:
        tool_text = ", ".join([f"{k}={v}" for k, v in by_tool.items()])
        by_tool_lines.append(f"- ツール別: {tool_text}")

    top_files_lines: list[str] = []
    top_files = summary.get("topFiles") or []
    if top_files:
        top_files_lines.append("- 上位ファイル:")
        for item in top_files:
            top_files_lines.append(f"  - {item.get('file')} ({item.get('count')})")

    top_rules_lines: list[str] = []
    top_rules = summary.get("topRules") or []
    if top_rules:
        top_rules_lines.append("- 上位ルール:")
        for item in top_rules:
            top_rules_lines.append(
                f"  - {item.get('tool')}:{item.get('ruleId')} ({item.get('count')})"
            )

    sample_lines: list[str] = []
    sample_findings = summary.get("sampleFindings") or []
    if sample_findings:
        sample_lines.append("- 代表的な検出例:")
        for item in sample_findings:
            line_num = item.get("line")
            line_display = "?" if line_num == 0 or line_num is None else line_num
            sample_lines.append(
                f"  - [{item.get('severity')}] {item.get('tool')} "
                f"{item.get('file')}:{line_display} {item.get('ruleId')}: "
                f"{item.get('message')}"
            )

    optional_sections = [
        ("byTool", by_tool_lines),
        ("topFiles", top_files_lines),
        ("topRules", top_rules_lines),
        ("sampleFindings", sample_lines),
    ]

    def build_lines(sections: list[tuple[str, list[str]]]) -> list[str]:
        lines = base_lines[:]
        for _, section_lines in sections:
            lines.extend(section_lines)
        return lines

    def estimate_tokens(text: str) -> int:
        # 簡易的なトークン数推定: 1トークン ≈ 4文字
        return max(1, (len(text) + 3) // 4)

    active_sections = optional_sections[:]
    lines = build_lines(active_sections)
    drop_order = ["topFiles", "byTool", "sampleFindings", "topRules"]

    for drop_key in drop_order:
        if estimate_tokens("\n".join(lines)) <= SUMMARY_MAX_TOKENS:
            break
        active_sections = [(k, v) for (k, v) in active_sections if k != drop_key]
        lines = build_lines(active_sections)

    return "\n".join(lines)
