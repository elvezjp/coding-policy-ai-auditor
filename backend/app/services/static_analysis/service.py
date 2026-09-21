"""静的解析サービス

Checkstyle/PMD (Java) と Ruff/Flake8/Pylint (Python) を使用した静的解析を提供する。
"""

import logging
from pathlib import Path
from typing import Any

from .aggregator import ResultAggregator
from .config_resolver import ConfigResolver
from .summary_builder import build_summary_for_audit, build_summary_markdown
from .tool_checker import ToolChecker
from .tools import (
    CheckstyleRunner,
    Flake8Runner,
    PMDRunner,
    PylintRunner,
    RuffRunner,
)

logger = logging.getLogger(__name__)


class StaticAnalysisService:
    """静的解析サービスクラス"""

    def __init__(self) -> None:
        self.tool_checker = ToolChecker()

    def _is_java_file(self, file_data: dict[str, str]) -> bool:
        """Javaファイルか判定"""
        return file_data.get("name", "").lower().endswith(".java")

    def _is_python_file(self, file_data: dict[str, str]) -> bool:
        """Pythonファイルか判定"""
        return file_data.get("name", "").lower().endswith(".py")


    def get_tools_availability(self) -> dict[str, Any]:
        """ツールの利用可能性を取得"""
        return self.tool_checker.get_tools_availability()

    async def run_analysis(self, files: list[dict[str, str]]) -> dict[str, Any]:
        """静的解析を実行

        Args:
            files: 解析対象ファイルのリスト
                   各要素は {"name": str, "path": str | None, "content": str}

        Returns:
            解析結果
        """
        # ファイルを分類
        java_files = [f for f in files if self._is_java_file(f)]
        python_files = [f for f in files if self._is_python_file(f)]

        # 設定解決
        config_resolver = ConfigResolver(files)

        # 結果集約
        aggregator = ResultAggregator()

        # Java解析
        await self._run_java_analysis(java_files, config_resolver, aggregator)

        # Python解析
        await self._run_python_analysis(python_files, config_resolver, aggregator)

        # 結果を集約
        result = aggregator.aggregate()

        # AI監査向けサマリーマークダウンを生成
        summary = build_summary_for_audit(result, files)
        summary_markdown = build_summary_markdown(summary)

        logger.info(
            "静的解析完了: 合計%s件の違反を検出",
            result["summary"]["total_findings"],
        )

        return {
            "result": result,
            "summaryMarkdown": summary_markdown,
        }

    async def _run_java_analysis(
        self,
        java_files: list[dict[str, str]],
        config_resolver: ConfigResolver,
        aggregator: ResultAggregator,
    ) -> None:
        """Java解析を実行"""
        # Checkstyle
        checkstyle_result = await self._run_checkstyle(java_files, config_resolver)
        aggregator.add_result("checkstyle", checkstyle_result)

        # PMD
        pmd_result = await self._run_pmd(java_files, config_resolver)
        aggregator.add_result("pmd", pmd_result)

    async def _run_checkstyle(
        self,
        java_files: list[dict[str, str]],
        config_resolver: ConfigResolver,
    ) -> dict[str, Any]:
        """Checkstyleを実行"""
        if not java_files:
            return self._skipped("checkstyle", "skipped_no_java", "no_java")

        # get_tool_availability("checkstyle") 内部でJavaランタイムも確認される
        tool_info = self.tool_checker.get_tool_availability("checkstyle")
        if not tool_info["available"]:
            reason = tool_info.get("unavailable_reason", "not_installed")
            if "Java" in (reason or ""):
                return self._skipped("checkstyle", "skipped_no_java", "no_java_runtime")
            return self._skipped("checkstyle", "skipped_not_installed", "not_installed")

        runner = CheckstyleRunner()
        config_file = config_resolver.select_checkstyle_config()
        return runner.run(java_files, config_file)

    async def _run_pmd(
        self,
        java_files: list[dict[str, str]],
        config_resolver: ConfigResolver,
    ) -> dict[str, Any]:
        """PMDを実行"""
        if not java_files:
            return self._skipped("pmd", "skipped_no_java", "no_java")

        # check_installed("pmd") 内部でJavaランタイムも確認される
        tool_info = self.tool_checker.get_tool_availability("pmd")
        if not tool_info["available"]:
            reason = tool_info.get("unavailable_reason", "not_installed")
            if "Java" in (reason or ""):
                return self._skipped("pmd", "skipped_no_java", "no_java_runtime")
            return self._skipped("pmd", "skipped_not_installed", "not_installed")

        runner = PMDRunner()
        config_file = config_resolver.select_pmd_config()
        return runner.run(java_files, config_file)

    async def _run_python_analysis(
        self,
        python_files: list[dict[str, str]],
        config_resolver: ConfigResolver,
        aggregator: ResultAggregator,
    ) -> None:
        """Python解析を実行

        インストールされているツールをすべて実行する。
        """
        if not python_files:
            aggregator.add_result(
                "ruff", self._skipped("ruff", "skipped_no_python", "no_python")
            )
            aggregator.add_result(
                "flake8", self._skipped("flake8", "skipped_no_python", "no_python")
            )
            aggregator.add_result(
                "pylint", self._skipped("pylint", "skipped_no_python", "no_python")
            )
            return

        # Ruff（インストールされていれば実行）
        if self.tool_checker.check_installed("ruff"):
            ruff_result = await self._run_ruff(python_files, config_resolver)
            aggregator.add_result("ruff", ruff_result)
        else:
            aggregator.add_result(
                "ruff", self._skipped("ruff", "skipped_not_installed", "not_installed")
            )

        # Flake8（インストールされていれば実行）
        if self.tool_checker.check_installed("flake8"):
            flake8_result = await self._run_flake8(python_files, config_resolver)
            aggregator.add_result("flake8", flake8_result)
        else:
            aggregator.add_result(
                "flake8",
                self._skipped("flake8", "skipped_not_installed", "not_installed"),
            )

        # Pylint（インストールされていれば実行）
        if self.tool_checker.check_installed("pylint"):
            pylint_result = await self._run_pylint(python_files, config_resolver)
            aggregator.add_result("pylint", pylint_result)
        else:
            aggregator.add_result(
                "pylint",
                self._skipped("pylint", "skipped_not_installed", "not_installed"),
            )

    async def _run_ruff(
        self,
        python_files: list[dict[str, str]],
        config_resolver: ConfigResolver,
    ) -> dict[str, Any]:
        """Ruffを実行"""
        runner = RuffRunner()
        config_file = config_resolver.select_python_config("ruff")
        return runner.run(python_files, config_file)

    async def _run_flake8(
        self,
        python_files: list[dict[str, str]],
        config_resolver: ConfigResolver,
    ) -> dict[str, Any]:
        """Flake8を実行"""
        runner = Flake8Runner()
        config_file = config_resolver.select_python_config("flake8")
        return runner.run(python_files, config_file)

    async def _run_pylint(
        self,
        python_files: list[dict[str, str]],
        config_resolver: ConfigResolver,
    ) -> dict[str, Any]:
        """Pylintを実行"""
        runner = PylintRunner()
        config_file = config_resolver.select_python_config("pylint")
        return runner.run(python_files, config_file)

    def _skipped(
        self, tool_name: str, status: str, reason: str
    ) -> dict[str, Any]:
        """スキップ結果を構築"""
        return {
            "name": tool_name,
            "status": status,
            "violations": [],
            "config_used": "bundled_default",
            "exit_code": None,
            "duration_ms": None,
            "skipped_reason": reason,
            "version": None,
        }
