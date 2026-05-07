"""設定ファイル解決モジュール

リクエストに含まれるファイルから適切な設定ファイルを選択する。
"""

import configparser
import logging
import tomllib
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Checkstyle設定ファイル候補
CHECKSTYLE_CONFIG_CANDIDATES = [
    "checkstyle.xml",
    "config/checkstyle/checkstyle.xml",
    ".checkstyle",
]

# PMD設定ファイル候補
PMD_CONFIG_CANDIDATES = [
    "pmd.xml",
    "pmd_ruleset.xml",
    "ruleset.xml",
]

# Python設定ファイル名
PYTHON_CONFIG_FILENAMES = {
    "pyproject.toml",
    "ruff.toml",
    ".ruff.toml",
    ".flake8",
    "setup.cfg",
    "tox.ini",
    "pylintrc",
    ".pylintrc",
}


class ConfigResolver:
    """設定ファイル解決クラス"""

    def __init__(self, files: list[dict[str, str]]) -> None:
        self.files = files

    def _normalize_path(self, path: str) -> str:
        """パスを正規化"""
        return Path(path).as_posix().lower()

    def _base_name(self, file_data: dict[str, str]) -> str:
        """ファイル名を取得"""
        file_path = file_data.get("path") or file_data.get("name", "")
        return Path(file_path).name

    def _select_by_candidates(
        self, candidates: list[str]
    ) -> dict[str, str] | None:
        """候補リストから設定ファイルを選択"""
        normalized_candidates = [self._normalize_path(c) for c in candidates]
        for candidate in normalized_candidates:
            for file_data in self.files:
                raw_path = file_data.get("path") or file_data.get("name", "")
                normalized_path = self._normalize_path(raw_path)
                base_name = Path(normalized_path).name
                if normalized_path == candidate:
                    return file_data
                if "/" not in candidate and base_name == candidate:
                    return file_data
        return None

    def _has_toml_tool_table(self, content: str, table: str) -> bool:
        """TOMLにtool.<table>セクションが存在するか"""
        try:
            data = tomllib.loads(content)
        except Exception:
            return f"[tool.{table}]" in content
        return table in data.get("tool", {})

    def _has_ini_section(self, content: str, section: str) -> bool:
        """INIファイルにセクションが存在するか"""
        parser = configparser.ConfigParser()
        try:
            parser.read_string(content)
        except Exception:
            return f"[{section}]" in content
        return parser.has_section(section)

    def _is_python_config_file(self, file_data: dict[str, str]) -> bool:
        """Python設定ファイルか判定"""
        return self._base_name(file_data) in PYTHON_CONFIG_FILENAMES

    def get_config_files(self) -> list[dict[str, str]]:
        """設定ファイル一覧を取得"""
        return [f for f in self.files if self._is_python_config_file(f)]

    def select_checkstyle_config(self) -> dict[str, str] | None:
        """Checkstyle設定ファイルを選択"""
        return self._select_by_candidates(CHECKSTYLE_CONFIG_CANDIDATES)

    def select_pmd_config(self) -> dict[str, str] | None:
        """PMD設定ファイルを選択"""
        return self._select_by_candidates(PMD_CONFIG_CANDIDATES)

    def select_python_config(self, tool: str) -> dict[str, str] | None:
        """Python系ツールの設定ファイルを選択"""
        if tool == "ruff":
            candidates = ["pyproject.toml", "ruff.toml", ".ruff.toml"]
        elif tool == "flake8":
            candidates = ["pyproject.toml", "setup.cfg", "tox.ini", ".flake8"]
        elif tool == "pylint":
            candidates = ["pyproject.toml", "pylintrc", ".pylintrc"]
        else:
            return None

        config_files = self.get_config_files()

        for candidate in candidates:
            for config_file in config_files:
                if self._base_name(config_file) != candidate:
                    continue
                content = config_file.get("content", "")
                if candidate == "pyproject.toml":
                    if not self._has_toml_tool_table(content, tool):
                        continue
                if candidate in {"setup.cfg", "tox.ini"} and tool == "flake8":
                    if not self._has_ini_section(content, "flake8"):
                        continue
                return config_file

        return None

    def get_python_config_flags(self) -> tuple[bool, bool]:
        """Ruff/Flake8の設定有無を確認

        Returns:
            tuple[bool, bool]: (ruff_configured, flake8_configured)
        """
        ruff_configured = False
        flake8_configured = False

        for config_file in self.get_config_files():
            name = self._base_name(config_file)
            content = config_file.get("content", "")
            if name in {"ruff.toml", ".ruff.toml"}:
                ruff_configured = True
            elif name == "pyproject.toml":
                if self._has_toml_tool_table(content, "ruff"):
                    ruff_configured = True
                if self._has_toml_tool_table(content, "flake8"):
                    flake8_configured = True
            elif name in {".flake8", "setup.cfg", "tox.ini"}:
                if self._has_ini_section(content, "flake8"):
                    flake8_configured = True

        return ruff_configured, flake8_configured

    def select_python_lint_tool(
        self, ruff_installed: bool, flake8_installed: bool
    ) -> str | None:
        """使用するPython lintツールを選択

        設定ファイルとインストール状況に基づいて最適なツールを選択する。

        Returns:
            str | None: "ruff", "flake8", or None
        """
        ruff_configured, flake8_configured = self.get_python_config_flags()

        if ruff_configured:
            if ruff_installed:
                return "ruff"
            if flake8_installed:
                return "flake8"
            return None

        if flake8_configured:
            if flake8_installed:
                return "flake8"
            if ruff_installed:
                return "ruff"
            return None

        if ruff_installed:
            return "ruff"
        if flake8_installed:
            return "flake8"
        return None
