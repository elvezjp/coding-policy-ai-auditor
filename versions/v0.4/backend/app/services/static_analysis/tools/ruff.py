"""Ruff ランナー"""

import json
import logging
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from ..base import ToolRunner, map_python_code_severity

logger = logging.getLogger(__name__)


class RuffRunner(ToolRunner):
    """Ruff静的解析ツールのランナー"""

    @property
    def tool_name(self) -> str:
        return "ruff"

    def run(
        self, files: list[dict[str, str]], config_file: dict[str, str] | None
    ) -> dict[str, Any]:
        """Ruffを実行"""
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
            command = [sys.executable, "-m", "ruff", "check", ".", "--output-format", "json"]
            if config_file:
                config_path = Path(tmpdir) / self._safe_relative_path(config_file)
                command.extend(["--config", str(config_path)])

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
                logger.error("Ruff not found")
                return self._skipped("skipped_not_installed", "not_installed")
            except Exception as e:
                logger.error(f"Ruff error: {e}")
                return self._skipped("skipped_not_installed", str(e))

    def _get_version(self) -> str | None:
        """Ruffのバージョンを取得"""
        try:
            result = subprocess.run(
                [sys.executable, "-m", "ruff", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            output = (result.stdout or result.stderr or "").strip()
            return output.splitlines()[0] if output else None
        except Exception:
            return None

    def _parse_json(self, json_output: str) -> list[dict[str, Any]]:
        """RuffのJSON出力をパース"""
        violations: list[dict[str, Any]] = []

        try:
            data = json.loads(json_output)
            for item in data:
                filename = os.path.basename(item.get("filename", ""))
                location = item.get("location", {})
                code = item.get("code", "")
                violations.append(
                    {
                        "tool": "ruff",
                        "file": filename,
                        "line": int(location.get("row", 0)),
                        "column": int(location.get("column", 0)),
                        "severity": map_python_code_severity(code),
                        "message": item.get("message", ""),
                        "rule_id": code,
                    }
                )
        except Exception as e:
            logger.error(f"Ruff JSON parse error: {e}")

        return violations
