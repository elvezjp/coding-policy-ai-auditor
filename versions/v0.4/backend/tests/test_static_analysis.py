"""静的解析サービスのテスト"""

import pytest
from unittest.mock import patch, MagicMock

from app.services.static_analysis.tool_checker import ToolChecker
from app.services.static_analysis.config_resolver import ConfigResolver
from app.services.static_analysis.aggregator import ResultAggregator
from app.services.static_analysis.base import (
    map_python_code_severity,
    map_pylint_severity,
    TimeMeasure,
)


class TestToolChecker:
    """ToolCheckerのテスト"""

    def test_tools_defined(self):
        """ツール定義が正しいこと"""
        checker = ToolChecker()
        # javaはランタイムなのでTOOLSには含まれない
        assert "checkstyle" in checker.TOOLS
        assert "pmd" in checker.TOOLS
        assert "ruff" in checker.TOOLS
        assert "flake8" in checker.TOOLS
        assert "pylint" in checker.TOOLS

    def test_check_installed_unknown_tool(self):
        """未知のツールはFalseを返すこと"""
        checker = ToolChecker()
        result = checker.check_installed("unknown_tool")
        assert result is False

    def test_check_installed_caching(self):
        """チェック結果がキャッシュされること"""
        checker = ToolChecker()
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            # 1回目の呼び出し
            result1 = checker.check_installed("ruff")
            # 2回目の呼び出し（キャッシュから）
            result2 = checker.check_installed("ruff")

            # subprocessは1回しか呼ばれないこと
            assert mock_run.call_count == 1
            assert result1 == result2

    def test_clear_cache(self):
        """キャッシュがクリアされること"""
        checker = ToolChecker()
        checker._cache["test"] = {"available": True, "version": "1.0", "unavailable_reason": None}
        checker._java_runtime_cache = (True, None, "Java 17.0.1")

        checker.clear_cache()

        assert len(checker._cache) == 0
        assert checker._java_runtime_cache is None

    def test_get_tools_availability(self):
        """ツール利用可能性が正しく返されること"""
        checker = ToolChecker()
        with patch.object(checker, "check_installed", return_value=False):
            with patch.object(checker, "get_version", return_value=None):
                result = checker.get_tools_availability()

        assert "java_available" in result
        assert "python_available" in result
        assert "tools" in result
        assert isinstance(result["tools"], list)


class TestConfigResolver:
    """ConfigResolverのテスト"""

    def test_select_checkstyle_config_found(self):
        """Checkstyle設定ファイルが見つかること"""
        files = [
            {"name": "checkstyle.xml", "content": "<config/>"},
            {"name": "Main.java", "content": "class Main {}"},
        ]
        resolver = ConfigResolver(files)
        config = resolver.select_checkstyle_config()

        assert config is not None
        assert config["name"] == "checkstyle.xml"

    def test_select_checkstyle_config_not_found(self):
        """Checkstyle設定ファイルが見つからない場合"""
        files = [
            {"name": "Main.java", "content": "class Main {}"},
        ]
        resolver = ConfigResolver(files)
        config = resolver.select_checkstyle_config()

        assert config is None

    def test_select_pmd_config(self):
        """PMD設定ファイルが見つかること"""
        files = [
            {"name": "pmd_ruleset.xml", "content": "<ruleset/>"},
        ]
        resolver = ConfigResolver(files)
        config = resolver.select_pmd_config()

        assert config is not None
        assert config["name"] == "pmd_ruleset.xml"

    def test_get_python_config_flags_ruff_toml(self):
        """ruff.tomlがある場合"""
        files = [
            {"name": "ruff.toml", "content": "[lint]"},
        ]
        resolver = ConfigResolver(files)
        ruff, flake8 = resolver.get_python_config_flags()

        assert ruff is True
        assert flake8 is False

    def test_get_python_config_flags_flake8(self):
        """.flake8がある場合"""
        files = [
            {"name": ".flake8", "content": "[flake8]\nmax-line-length = 120"},
        ]
        resolver = ConfigResolver(files)
        ruff, flake8 = resolver.get_python_config_flags()

        assert ruff is False
        assert flake8 is True

    def test_get_python_config_flags_pyproject_ruff(self):
        """pyproject.tomlにruff設定がある場合"""
        files = [
            {
                "name": "pyproject.toml",
                "content": '[tool.ruff]\nline-length = 120',
            },
        ]
        resolver = ConfigResolver(files)
        ruff, flake8 = resolver.get_python_config_flags()

        assert ruff is True
        assert flake8 is False

    def test_select_python_lint_tool_ruff_preferred(self):
        """Ruffが優先されること"""
        files = []
        resolver = ConfigResolver(files)
        tool = resolver.select_python_lint_tool(
            ruff_installed=True, flake8_installed=True
        )

        assert tool == "ruff"

    def test_select_python_lint_tool_flake8_configured(self):
        """Flake8が設定されている場合はFlake8が選択されること"""
        files = [
            {"name": ".flake8", "content": "[flake8]\nmax-line-length = 120"},
        ]
        resolver = ConfigResolver(files)
        tool = resolver.select_python_lint_tool(
            ruff_installed=True, flake8_installed=True
        )

        assert tool == "flake8"

    def test_select_python_lint_tool_none_installed(self):
        """どちらもインストールされていない場合"""
        files = []
        resolver = ConfigResolver(files)
        tool = resolver.select_python_lint_tool(
            ruff_installed=False, flake8_installed=False
        )

        assert tool is None


class TestResultAggregator:
    """ResultAggregatorのテスト"""

    def test_aggregate_empty(self):
        """空の結果を集約"""
        aggregator = ResultAggregator()
        result = aggregator.aggregate()

        assert "run_id" in result
        assert "timestamp" in result
        assert "tools" in result
        assert "skipped_tools" in result
        assert "summary" in result
        assert result["summary"]["total_findings"] == 0

    def test_aggregate_with_results(self):
        """結果を集約"""
        aggregator = ResultAggregator()
        aggregator.add_result(
            "ruff",
            {
                "status": "executed",
                "violations": [
                    {
                        "tool": "ruff",
                        "file": "test.py",
                        "line": 1,
                        "column": 1,
                        "severity": "error",
                        "rule_id": "E001",
                        "message": "test error",
                    }
                ],
                "config_used": "bundled_default",
                "exit_code": 1,
                "duration_ms": 100,
                "version": "0.1.0",
            },
        )

        result = aggregator.aggregate()

        assert result["summary"]["total_findings"] == 1
        assert result["summary"]["by_tool"]["ruff"] == 1
        assert result["summary"]["by_severity"]["error"] == 1

    def test_aggregate_skipped_tools(self):
        """スキップされたツールが記録されること"""
        aggregator = ResultAggregator()
        aggregator.add_result(
            "checkstyle",
            {
                "status": "skipped_no_java",
                "violations": [],
                "config_used": "bundled_default",
                "skipped_reason": "no_java",
            },
        )

        result = aggregator.aggregate()

        assert len(result["skipped_tools"]) == 5  # checkstyle以外もスキップ扱い
        skipped_names = [t["name"] for t in result["skipped_tools"]]
        assert "checkstyle" in skipped_names


class TestSeverityMapping:
    """重大度マッピングのテスト"""

    def test_map_python_code_severity_error(self):
        """E/Fコードはerrorになること"""
        assert map_python_code_severity("E001") == "error"
        assert map_python_code_severity("F401") == "error"

    def test_map_python_code_severity_warning(self):
        """Wコードはwarningになること"""
        assert map_python_code_severity("W001") == "warning"

    def test_map_python_code_severity_info(self):
        """Iコードはinfoになること"""
        assert map_python_code_severity("I001") == "info"

    def test_map_python_code_severity_default(self):
        """その他はwarningになること"""
        assert map_python_code_severity("C001") == "warning"
        assert map_python_code_severity("") == "warning"

    def test_map_pylint_severity(self):
        """Pylint重大度のマッピング"""
        assert map_pylint_severity("fatal") == "error"
        assert map_pylint_severity("error") == "error"
        assert map_pylint_severity("warning") == "warning"
        assert map_pylint_severity("convention") == "warning"
        assert map_pylint_severity("refactor") == "warning"
        assert map_pylint_severity("info") == "info"
        assert map_pylint_severity("unknown") == "warning"


class TestTimeMeasure:
    """TimeMeasureのテスト"""

    def test_time_measure(self):
        """時間計測が動作すること"""
        import time

        with TimeMeasure() as timer:
            time.sleep(0.05)  # 50ms

        assert timer.duration_ms >= 30
        assert timer.duration_ms < 500  # 妥当な範囲内
