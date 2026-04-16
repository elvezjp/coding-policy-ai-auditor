"""Flake8 ランナー"""

import logging
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from ..base import ToolRunner, map_python_code_severity

logger = logging.getLogger(__name__)


class Flake8Runner(ToolRunner):
    """Flake8静的解析ツールのランナー"""

    @property
    def tool_name(self) -> str:
        return "flake8"

    def run(
        self, files: list[dict[str, str]], config_file: dict[str, str] | None
    ) -> dict[str, Any]:
        """Flake8を実行"""
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
            command = [
                sys.executable,
                "-m",
                "flake8",
                ".",
                "--format=%(path)s:%(row)d:%(col)d:%(code)s:%(text)s",
            ]
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
                    violations = self._parse_output(result.stdout)

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
                logger.error("Flake8 not found")
                return self._skipped("skipped_not_installed", "not_installed")
            except Exception as e:
                logger.error(f"Flake8 error: {e}")
                return self._skipped("skipped_not_installed", str(e))

    def _get_version(self) -> str | None:
        """Flake8のバージョンを取得"""
        try:
            result = subprocess.run(
                [sys.executable, "-m", "flake8", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            output = (result.stdout or result.stderr or "").strip()
            return output.splitlines()[0] if output else None
        except Exception:
            return None

    def _parse_output(self, output: str) -> list[dict[str, Any]]:
        """Flake8のテキスト出力をパース"""
        violations: list[dict[str, Any]] = []

        for line in output.splitlines():
            parts = line.split(":", 4)
            if len(parts) < 5:
                continue
            path, row, col, code, message = parts
            violations.append(
                {
                    "tool": "flake8",
                    "file": os.path.basename(path),
                    "line": int(row or 0),
                    "column": int(col or 0),
                    "severity": map_python_code_severity(code),
                    "message": message.strip(),
                    "rule_id": code,
                }
            )

        return violations
