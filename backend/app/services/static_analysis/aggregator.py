"""結果集約モジュール

各ツールの実行結果を統合してAPIレスポンス形式に変換する。
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from .base import ExecutionStatus


class ResultAggregator:
    """静的解析結果の集約クラス"""

    TOOL_NAMES = ["checkstyle", "pmd", "ruff", "flake8", "pylint"]

    def __init__(self) -> None:
        self._results: dict[str, dict[str, Any]] = {}

    def add_result(self, tool_name: str, result: dict[str, Any]) -> None:
        """ツールの実行結果を追加"""
        self._results[tool_name] = result

    def _status_reason(self, status: ExecutionStatus) -> str | None:
        """ステータスから理由文字列を取得"""
        return {
            "skipped_no_java": "no_java",
            "skipped_no_python": "no_python",
            "skipped_not_installed": "not_installed",
            "skipped_disabled": "disabled",
            "skipped_not_selected": "not_selected",
            "skipped_timeout": "timeout",
        }.get(status)

    def aggregate(self) -> dict[str, Any]:
        """すべての結果を集約してAPIレスポンス形式に変換"""
        # 全違反を収集
        all_violations: list[dict[str, Any]] = []
        for result in self._results.values():
            all_violations.extend(result.get("violations", []))

        # ツール結果とスキップ情報を構築
        tools: list[dict[str, Any]] = []
        skipped_tools: list[dict[str, str]] = []

        for name in self.TOOL_NAMES:
            result = self._results.get(name, self._empty_result())
            status = result.get("status", "skipped_not_installed")
            violations = result.get("violations", [])

            tools.append(
                {
                    "name": name,
                    "version": result.get("version"),
                    "status": status,
                    "exit_code": result.get("exit_code"),
                    "duration_ms": result.get("duration_ms"),
                    "config_used": result.get("config_used", "bundled_default"),
                    "findings": violations,
                    "skipped_reason": result.get("skipped_reason"),
                }
            )

            if status != "executed":
                skipped_tools.append(
                    {
                        "name": name,
                        "reason": result.get("skipped_reason")
                        or self._status_reason(status)
                        or "unknown",
                    }
                )

        # サマリーを構築
        summary = self._build_summary(all_violations)

        return {
            "run_id": uuid.uuid4().hex,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tools": tools,
            "skipped_tools": skipped_tools,
            "summary": summary,
            "violations": all_violations,
        }

    def _empty_result(self) -> dict[str, Any]:
        """空の結果を返す"""
        return {
            "status": "skipped_not_installed",
            "violations": [],
            "config_used": "bundled_default",
            "exit_code": None,
            "duration_ms": None,
            "skipped_reason": "not_installed",
            "version": None,
        }

    def _build_summary(self, violations: list[dict[str, Any]]) -> dict[str, Any]:
        """サマリーを構築"""
        by_tool: dict[str, int] = {}
        by_severity: dict[str, int] = {"error": 0, "warning": 0, "info": 0}

        for violation in violations:
            # ツール別集計
            tool = violation.get("tool", "unknown")
            by_tool[tool] = by_tool.get(tool, 0) + 1

            # 重大度別集計
            severity = violation.get("severity", "warning")
            if severity in by_severity:
                by_severity[severity] += 1

        return {
            "total_findings": len(violations),
            "by_tool": by_tool,
            "by_severity": by_severity,
        }
