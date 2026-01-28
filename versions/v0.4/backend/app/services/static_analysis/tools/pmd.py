"""PMD ランナー"""

import logging
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from ..base import ToolRunner

logger = logging.getLogger(__name__)


class PMDRunner(ToolRunner):
    """PMD静的解析ツールのランナー"""

    @property
    def tool_name(self) -> str:
        return "pmd"

    def run(
        self, files: list[dict[str, str]], config_file: dict[str, str] | None
    ) -> dict[str, Any]:
        """PMDを実行"""
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

            output_file = Path(tmpdir) / "pmd-output.xml"

            # 設定ファイルパスを決定
            if config_file:
                config_path = Path(tmpdir) / self._safe_relative_path(config_file)
            else:
                # バンドルされたデフォルト設定を使用
                config_path = (
                    Path(__file__).parent.parent / "configs" / "pmd_ruleset.xml"
                )

            # コマンドを構築
            command = [
                "pmd",
                "check",
                "-d",
                tmpdir,
                "-R",
                str(config_path),
                "-f",
                "xml",
                "-r",
                str(output_file),
            ]

            try:
                with self._measure_time() as timer:
                    result = subprocess.run(
                        command,
                        capture_output=True,
                        text=True,
                        timeout=self.timeout,
                    )

                violations = []
                # PMDは違反がある場合exit code 4を返す
                if output_file.exists():
                    violations = self._parse_xml(output_file)

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
                logger.error("PMD not found")
                return self._skipped("skipped_not_installed", "not_installed")
            except Exception as e:
                logger.error(f"PMD error: {e}")
                return self._skipped("skipped_not_installed", str(e))

    def _get_version(self) -> str | None:
        """PMDのバージョンを取得

        PMDの--versionはASCIIアートを出力するため、
        "PMD X.Y.Z" 形式の行を探して抽出する。
        """
        try:
            result = subprocess.run(
                ["pmd", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            output = (result.stdout or result.stderr or "").strip()
            if not output:
                return None

            # ASCIIアートの後に "PMD X.Y.Z (...)" 形式の行がある
            for line in output.splitlines():
                if line.startswith("PMD "):
                    # "PMD 7.20.0 (fa478ec...)" -> "PMD 7.20.0"
                    match = re.match(r"(PMD \d+\.\d+\.\d+)", line)
                    if match:
                        return match.group(1)
            return None
        except Exception:
            return None

    def _parse_xml(self, xml_path: Path) -> list[dict[str, Any]]:
        """PMDのXML出力をパース"""
        violations: list[dict[str, Any]] = []

        if not xml_path.exists():
            return violations

        try:
            root = ET.parse(xml_path).getroot()
            # PMDのXML名前空間を処理
            ns = {"pmd": "http://pmd.sourceforge.net/report/2.0.0"}

            # 名前空間なしの場合も対応
            for file_elem in root.findall(".//file") or root.findall(
                ".//pmd:file", ns
            ):
                file_name = Path(file_elem.get("name", "")).name

                for violation in file_elem.findall("violation") or file_elem.findall(
                    "pmd:violation", ns
                ):
                    line_number = int(violation.get("beginline", 0))
                    column = int(violation.get("begincolumn", 0))
                    rule = violation.get("rule", "")
                    priority = violation.get("priority", "3")
                    message = (violation.text or "").strip()

                    severity = self._map_severity(priority)
                    violations.append(
                        {
                            "tool": "pmd",
                            "file": file_name,
                            "line": line_number,
                            "column": column,
                            "severity": severity,
                            "message": message,
                            "rule_id": rule,
                        }
                    )
        except Exception as e:
            logger.error(f"PMD XML parse error: {e}")

        return violations

    def _map_severity(self, priority: str) -> str:
        """PMDの重大度を正規化

        PMD priority: 1 (high) - 5 (low)
        """
        priority_value = priority.strip()
        if priority_value.isdigit():
            p = int(priority_value)
            if p <= 2:
                return "error"
            if p <= 3:
                return "warning"
            return "info"
        return "warning"
