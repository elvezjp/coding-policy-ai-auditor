"""Pylint ランナー"""

import json
import logging
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from ..base import ToolRunner, map_pylint_severity

logger = logging.getLogger(__name__)


class PylintRunner(ToolRunner):
    """Pylint静的解析ツールのランナー"""

    @property
    def tool_name(self) -> str:
        return "pylint"

    def run(
        self, files: list[dict[str, str]], config_file: dict[str, str] | None
    ) -> dict[str, Any]:
        """Pylintを実行"""
        config_used = (
            config_file.get("path") or config_file.get("name")
            if config_file
            else "bundled_default"
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            # ファイルを一時ディレクトリに配置
            write_files = list(files)
            if config_file:
                write_files.append(config_file)
            self._create_temp_files(write_files, tmpdir)

            # コマンドを構築
            command = [sys.executable, "-m", "pylint", ".", "--output-format=json", "--exit-zero"]
            if config_file:
                config_path = Path(tmpdir) / self._safe_relative_path(config_file)
                command.extend(["--rcfile", str(config_path)])

            try:
                with self._measure_time() as timer:
                    result = subprocess.run(
                        command,
                        capture_output=True,
                        text=True,
                        timeout=self.timeout,
                        cwd=tmpdir,
                    )

                violations = []
                if result.stdout:
                    violations = self._parse_json(result.stdout)

                return self._build_result(
                    "executed",
                    violations,
                    config_used=config_used,
                    exit_code=result.returncode,
                    duration_ms=timer.duration_ms,
                    version=self._get_version(),
                )

            except subprocess.TimeoutExpired:
                return self._build_result(
                    "skipped_timeout",
                    [],
                    config_used=config_used,
                    duration_ms=self.timeout * 1000,
                    skipped_reason="timeout",
                )
            except FileNotFoundError:
                logger.error("Pylint not found")
                return self._skipped("skipped_not_installed", "not_installed")
            except Exception as e:
                logger.error(f"Pylint error: {e}")
                return self._skipped("skipped_not_installed", str(e))

    def _get_version(self) -> str | None:
        """Pylintのバージョンを取得"""
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pylint", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            output = (result.stdout or result.stderr or "").strip()
            return output.splitlines()[0] if output else None
        except Exception:
            return None

    def _parse_json(self, json_output: str) -> list[dict[str, Any]]:
        """PylintのJSON出力をパース"""
        violations: list[dict[str, Any]] = []

        try:
            data = json.loads(json_output)
            for item in data:
                violations.append(
                    {
                        "tool": "pylint",
                        "file": os.path.basename(item.get("path", "")),
                        "line": int(item.get("line", 0)),
                        "column": int(item.get("column", 0)),
                        "severity": map_pylint_severity(item.get("type", "")),
                        "message": item.get("message", ""),
                        "rule_id": item.get("message-id", ""),
                    }
                )
        except Exception as e:
            logger.error(f"Pylint JSON parse error: {e}")

        return violations
