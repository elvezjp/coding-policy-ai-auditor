"""ツールインストール確認・バージョン取得"""

import logging
import re
import subprocess
import sys
from typing import Any

logger = logging.getLogger(__name__)


class ToolChecker:
    """静的解析ツールの利用可能性を確認"""

    # 静的解析ツール（javaは実行環境なので含めない）
    TOOLS = {
        "checkstyle": {"command": ["checkstyle", "--version"], "language": "java"},
        "pmd": {"command": ["pmd", "--version"], "language": "java"},
        "ruff": {"command": [sys.executable, "-m", "ruff", "--version"], "language": "python"},
        "flake8": {"command": [sys.executable, "-m", "flake8", "--version"], "language": "python"},
        "pylint": {"command": [sys.executable, "-m", "pylint", "--version"], "language": "python"},
    }

    def __init__(self) -> None:
        self._cache: dict[str, dict[str, Any]] = {}
        self._java_runtime_cache: tuple[bool, str | None, str | None] | None = None

    def _extract_version(self, tool_name: str, output: str) -> str | None:
        """ツール出力からバージョン文字列を抽出

        各ツールの出力形式に応じて適切なバージョン文字列を抽出する。
        """
        if not output:
            return None

        lines = output.strip().splitlines()

        # PMD: ASCIIアートの後に "PMD X.Y.Z (...)" 形式の行がある
        if tool_name == "pmd":
            for line in lines:
                if line.startswith("PMD "):
                    # "PMD 7.20.0 (fa478ec...)" -> "PMD 7.20.0"
                    match = re.match(r"(PMD \d+\.\d+\.\d+)", line)
                    if match:
                        return match.group(1)
            return None

        # その他のツール: 最初の行を使用
        return lines[0] if lines else None

    def check_java_runtime(self) -> tuple[bool, str | None, str | None]:
        """Javaランタイムの確認

        Returns:
            (利用可能かどうか, 利用不可の理由, Javaバージョン)
        """
        if self._java_runtime_cache is not None:
            return self._java_runtime_cache

        try:
            result = subprocess.run(
                ["java", "-version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                # java -versionはstderrに出力される
                output = (result.stderr or result.stdout or "").strip()
                java_version = self._extract_java_version(output)
                self._java_runtime_cache = (True, None, java_version)
            else:
                self._java_runtime_cache = (False, "Javaランタイムがインストールされていません", None)
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
            self._java_runtime_cache = (False, "Javaランタイムがインストールされていません", None)

        return self._java_runtime_cache

    def _extract_java_version(self, output: str) -> str | None:
        """Javaバージョン出力からバージョン文字列を抽出

        例: 'java version "25.0.1" 2025-10-21 LTS' -> 'Java 25.0.1'
        例: 'openjdk version "17.0.1" 2021-10-19' -> 'Java 17.0.1'
        """
        if not output:
            return None

        first_line = output.splitlines()[0] if output else ""
        # "X.Y.Z" 形式のバージョン番号を抽出
        match = re.search(r'"(\d+[\d.]*)"', first_line)
        if match:
            return f"Java {match.group(1)}"
        return None

    def get_tool_availability(self, tool_name: str) -> dict[str, Any]:
        """個別ツールの利用可能性を確認（理由付き）

        Returns:
            {
                "available": bool,
                "version": str | None,
                "unavailable_reason": str | None,
            }
        """
        if tool_name in self._cache:
            return self._cache[tool_name]

        tool_config = self.TOOLS.get(tool_name)
        if not tool_config:
            # "java" の場合は特別にJavaランタイムを確認
            if tool_name == "java":
                java_ok, java_reason, java_version = self.check_java_runtime()
                result = {
                    "available": java_ok,
                    "version": java_version,
                    "unavailable_reason": java_reason,
                }
                self._cache[tool_name] = result
                return result

            result = {
                "available": False,
                "version": None,
                "unavailable_reason": "不明なツール",
            }
            self._cache[tool_name] = result
            return result

        # Javaツールの場合、まずJavaランタイムを確認
        java_version = None
        if tool_config["language"] == "java":
            java_ok, java_reason, java_version = self.check_java_runtime()
            if not java_ok:
                result = {
                    "available": False,
                    "version": None,
                    "unavailable_reason": java_reason,
                }
                self._cache[tool_name] = result
                return result

        # ツール自体の確認
        try:
            proc_result = subprocess.run(
                tool_config["command"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if proc_result.returncode == 0:
                output = (proc_result.stdout or proc_result.stderr or "").strip()
                version = self._extract_version(tool_name, output)
                # Javaツールの場合、Javaバージョンを併記
                if tool_config["language"] == "java" and java_version and version:
                    version = f"{version} / {java_version}"
                result = {
                    "available": True,
                    "version": version,
                    "unavailable_reason": None,
                }
            else:
                result = {
                    "available": False,
                    "version": None,
                    "unavailable_reason": f"{tool_name}がインストールされていません",
                }
        except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
            result = {
                "available": False,
                "version": None,
                "unavailable_reason": f"{tool_name}がインストールされていません",
            }

        self._cache[tool_name] = result
        return result

    def check_installed(self, tool_name: str) -> bool:
        """指定ツールがインストールされているか確認（後方互換性用）"""
        return self.get_tool_availability(tool_name)["available"]

    def get_version(self, tool_name: str) -> str | None:
        """ツールのバージョンを取得（後方互換性用）"""
        return self.get_tool_availability(tool_name)["version"]

    def get_tools_availability(self) -> dict[str, Any]:
        """全ツールの利用可能性を一括確認"""
        results = []
        for name, config in self.TOOLS.items():
            info = self.get_tool_availability(name)
            results.append(
                {
                    "name": name,
                    "available": info["available"],
                    "version": info["version"],
                    "language": config["language"],
                    "unavailable_reason": info["unavailable_reason"],
                }
            )

        # Java解析可能判定: checkstyle または pmd のいずれかが利用可能
        java_tools = [t for t in results if t["language"] == "java" and t["available"]]
        java_available = len(java_tools) > 0

        # Java解析不可理由
        java_unavailable_reason = None
        if not java_available:
            java_ok, java_reason, _ = self.check_java_runtime()
            if not java_ok:
                java_unavailable_reason = java_reason
            else:
                java_unavailable_reason = "利用可能な静的解析ツールがインストールされていません。"

        # Python解析可能判定: ruff, flake8, pylint のいずれかが利用可能
        python_tools = [
            t for t in results if t["language"] == "python" and t["available"]
        ]
        python_available = len(python_tools) > 0

        # Python解析不可理由
        python_unavailable_reason = None
        if not python_available:
            python_unavailable_reason = (
                "利用可能な静的解析ツールがインストールされていません。"
            )

        return {
            "java_available": java_available,
            "python_available": python_available,
            "java_unavailable_reason": java_unavailable_reason,
            "python_unavailable_reason": python_unavailable_reason,
            "tools": results,
        }

    def clear_cache(self) -> None:
        """キャッシュをクリア"""
        self._cache.clear()
        self._java_runtime_cache = None
