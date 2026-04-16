"""Checkstyle ランナー"""

import logging
import os
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from ..base import ToolRunner
from ..utils.proc import run_capture

logger = logging.getLogger(__name__)


class CheckstyleRunner(ToolRunner):
    """Checkstyle静的解析ツールのランナー"""

    @property
    def tool_name(self) -> str:
        return "checkstyle"

    def run(
        self, files: list[dict[str, str]], config_file: dict[str, str] | None
    ) -> dict[str, Any]:
        """Checkstyleを実行"""
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

            # 設定ファイルのパスを決定
            if config_file:
                config_path = Path(tmpdir) / self._safe_relative_path(config_file)
            else:
                config_path = self._get_bundled_config()

            if not Path(config_path).exists():
                logger.error("Checkstyle config not found: %s", config_path)
                return self._skipped("skipped_config_missing", str(config_path))

            # tmpdir 配下の .java ファイルを列挙。0件なら早期リターン
            java_files = [str(p) for p in Path(tmpdir).rglob("*.java")]
            if not java_files:
                return self._build_result(
                    "executed",
                    [],
                    config_used=config_used,
                    exit_code=0,
                    duration_ms=None,
                    version=self._get_version(),
                )

            command = [
                "checkstyle",
                "-c",
                str(config_path),
                "-f",
                "xml",
                *java_files,
            ]

            try:
                with self._measure_time() as timer:
                    ret, out, err = run_capture(command, timeout=self.timeout)

                # XML は通常 stdout。何もない場合は stderr も確認
                raw_out = (out or "").strip()
                raw_err = (err or "").strip()
                xml_text = raw_out if raw_out.startswith("<") else (raw_err if raw_err.startswith("<") else "")
                violations: list[dict[str, Any]] = []
                if xml_text:
                    violations = self._parse_xml(xml_text)
                else:
                    if ret == 0:
                        logger.warning(
                            "Checkstyle produced no XML output; treating as 0 violations. "
                            "stdout=%r stderr=%r", raw_out[:200], raw_err[:200]
                        )
                    else:
                        logger.error(
                            "Checkstyle non-XML output (exit=%s). stdout=%r stderr=%r",
                            ret, raw_out[:200], raw_err[:200]
                        )

                return self._build_result(
                    "executed",
                    violations,
                    config_used=config_used,
                    exit_code=ret,
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
                logger.error("Checkstyle not found")
                return self._skipped("skipped_not_installed", "not_installed")
            except Exception as e:
                logger.error(f"Checkstyle error: {e}")
                return self._skipped("skipped_not_installed", str(e))

    def _get_bundled_config(self) -> Path:
        """バンドルされたデフォルト設定ファイルのパスを返す"""
        return Path(__file__).parent.parent / "configs" / "checkstyle.xml"

    def _get_version(self) -> str | None:
        """Checkstyleのバージョンを取得"""
        try:
            ret, out, err = run_capture(["checkstyle", "--version"], timeout=5)
            output = (out or err or "").strip()
            return output.splitlines()[0] if output else None
        except Exception:
            return None

    def _parse_xml(self, xml_output: str) -> list[dict[str, Any]]:
        """CheckstyleのXML出力をパース"""
        violations: list[dict[str, Any]] = []

        try:
            root = ET.fromstring(xml_output)
            for file_elem in root.findall("file"):
                filename = os.path.basename(file_elem.get("name", ""))

                for error_elem in file_elem.findall("error"):
                    rule_id = error_elem.get("source", "").split(".")[-1]
                    violations.append(
                        {
                            "tool": "checkstyle",
                            "file": filename,
                            "line": int(error_elem.get("line", 0)),
                            "column": int(error_elem.get("column", 0)),
                            "severity": error_elem.get("severity", "warning"),
                            "message": error_elem.get("message", ""),
                            "rule_id": rule_id,
                        }
                    )
        except Exception as e:
            logger.error(f"Checkstyle XML parse error: {e}")

        return violations
