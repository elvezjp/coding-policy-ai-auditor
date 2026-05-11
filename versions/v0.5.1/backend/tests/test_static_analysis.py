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


class TestProcUtils:
    """utils/proc.py のテスト"""

    def test_resolve_cmd_on_windows_wraps_bat(self):
        """Windows 環境で .bat は cmd /c でラップされること"""
        from unittest.mock import patch
        from app.services.static_analysis.utils.proc import resolve_cmd_on_windows

        with patch("app.services.static_analysis.utils.proc.sys") as mock_sys, \
             patch("app.services.static_analysis.utils.proc.shutil.which",
                   return_value=r"C:\tools\checkstyle.bat"):
            mock_sys.platform = "win32"
            result = resolve_cmd_on_windows(["checkstyle", "--version"])

        assert result == ["cmd", "/c", r"C:\tools\checkstyle.bat", "--version"]

    def test_resolve_cmd_on_non_windows_passthrough(self):
        """Windows 以外ではコマンドがそのまま返ること"""
        from app.services.static_analysis.utils.proc import resolve_cmd_on_windows

        result = resolve_cmd_on_windows(["checkstyle", "--version"])
        assert result == ["checkstyle", "--version"]

    def test_decode_with_fallback_utf8(self):
        """UTF-8 バイト列は正常にデコードできること"""
        from app.services.static_analysis.utils.proc import decode_with_fallback

        result = decode_with_fallback("hello".encode("utf-8"))
        assert result == "hello"

    def test_decode_with_fallback_cp932(self):
        """CP932 バイト列が UTF-8 としてデコード失敗した後 CP932 で読めること"""
        from app.services.static_analysis.utils.proc import decode_with_fallback

        cp932_bytes = "日本語テスト".encode("cp932")
        result = decode_with_fallback(cp932_bytes)
        assert result == "日本語テスト"


class TestCreateTempFiles:
    """base.py _create_temp_files のテスト"""

    def test_cp932_file_converted_to_utf8(self, tmp_path):
        """path 指定の CP932 ファイルが UTF-8 に変換されて配置されること"""
        from app.services.static_analysis.tools.checkstyle import CheckstyleRunner

        # CP932 でエンコードされたファイルを用意
        src = tmp_path / "source" / "Main.java"
        src.parent.mkdir()
        src.write_bytes("// 日本語コメント\nclass Main {}".encode("cp932"))

        out_dir = tmp_path / "out"
        out_dir.mkdir()

        runner = CheckstyleRunner()
        runner._create_temp_files(
            [{"name": "Main.java", "path": str(src)}],
            str(out_dir),
        )

        result = (out_dir / "Main.java").read_text(encoding="utf-8")
        assert "日本語コメント" in result


class TestSafeRelativePath:
    """base.py _safe_relative_path のテスト (issue #19)"""

    def _runner(self):
        from app.services.static_analysis.tools.checkstyle import CheckstyleRunner

        return CheckstyleRunner()

    def test_normal_relative_path_is_preserved(self):
        """通常の相対パスはそのまま返ること"""
        from pathlib import Path

        result = self._runner()._safe_relative_path(
            {"name": "src/app.py", "path": "src/app.py"}
        )
        assert result == Path("src/app.py")

    def test_dotdot_in_name_falls_back_to_basename(self):
        """name に .. が含まれる場合、ディレクトリ部分を除去した basename になること"""
        from pathlib import Path

        result = self._runner()._safe_relative_path(
            {"name": "../../../tmp/evil.py"}
        )
        assert result == Path("evil.py")

    def test_dotdot_in_path_falls_back_to_name_basename(self):
        """path に .. があっても fallback の name の basename が返ること"""
        from pathlib import Path

        result = self._runner()._safe_relative_path(
            {"path": "../../etc/passwd", "name": "sub/dir/foo.py"}
        )
        assert result == Path("foo.py")

    def test_absolute_path_falls_back_to_name_basename(self):
        """絶対パスの場合も fallback の name の basename が返ること"""
        from pathlib import Path

        result = self._runner()._safe_relative_path(
            {"path": "/etc/passwd", "name": "passwd"}
        )
        assert result == Path("passwd")

    def test_empty_name_fallback_returns_unknown_file(self):
        """name が空文字列で fallback に入った場合、unknown_file が返ること"""
        from pathlib import Path

        result = self._runner()._safe_relative_path(
            {"name": "", "path": "../../x.py"}
        )
        assert result == Path("unknown_file")

    def test_leading_slash_path_falls_back_even_when_not_absolute(self):
        """先頭スラッシュ系のパス (Windows での drive-relative) も fallback すること"""
        from pathlib import Path

        # POSIX では is_absolute() が True、Windows では False になるが
        # いずれの環境でも fallback が発動して basename のみが返るべき
        result = self._runner()._safe_relative_path(
            {"path": "/etc/passwd", "name": "passwd"}
        )
        assert result == Path("passwd")

    def test_leading_backslash_path_falls_back(self):
        """先頭バックスラッシュ系のパスも fallback すること"""
        from pathlib import Path

        result = self._runner()._safe_relative_path(
            {"path": "\\Windows\\System32\\evil.py", "name": "evil.py"}
        )
        assert result == Path("evil.py")


class TestCreateTempFilesPathTraversal:
    """_create_temp_files の Path Traversal 防御テスト (issue #19)"""

    def test_traversal_via_name_does_not_escape_tmpdir(self, tmp_path):
        """name に .. を含むリクエストでも tmpdir 外に書き込まれないこと"""
        from app.services.static_analysis.tools.checkstyle import CheckstyleRunner

        out_dir = tmp_path / "out"
        out_dir.mkdir()

        runner = CheckstyleRunner()
        runner._create_temp_files(
            [{"name": "../../../tmp/evil.py", "content": "x = 1"}],
            str(out_dir),
        )

        # tmpdir 外への流出がないこと
        evil_in_root = tmp_path / "evil.py"
        evil_in_parent = tmp_path.parent / "evil.py"
        assert not evil_in_root.exists()
        assert not evil_in_parent.exists()

        # tmpdir 内に basename のみで作成されていること
        assert (out_dir / "evil.py").exists()

    def test_resolve_boundary_check_blocks_synthetic_traversal(
        self, tmp_path, monkeypatch
    ):
        """_safe_relative_path を迂回しても resolve 後の境界チェックで弾かれること"""
        from pathlib import Path
        from app.services.static_analysis.tools.checkstyle import CheckstyleRunner

        out_dir = tmp_path / "out"
        out_dir.mkdir()

        runner = CheckstyleRunner()

        # _safe_relative_path 自体を traversal を返すように差し替えて
        # _create_temp_files 側の境界チェックが機能することを確認する
        monkeypatch.setattr(
            runner, "_safe_relative_path", lambda fd: Path("../escaped.py")
        )

        with pytest.raises(ValueError, match="Path traversal detected"):
            runner._create_temp_files(
                [{"name": "x.py", "content": "x = 1"}],
                str(out_dir),
            )

        # tmpdir の親に escaped.py が作られていないこと
        assert not (tmp_path / "escaped.py").exists()

    def test_normal_subdir_still_works(self, tmp_path):
        """通常のサブディレクトリパスは従来通り動作すること"""
        from app.services.static_analysis.tools.checkstyle import CheckstyleRunner

        out_dir = tmp_path / "out"
        out_dir.mkdir()

        runner = CheckstyleRunner()
        runner._create_temp_files(
            [{"name": "pkg/sub/Foo.java", "content": "class Foo {}"}],
            str(out_dir),
        )

        target = out_dir / "pkg" / "sub" / "Foo.java"
        assert target.exists()
        assert target.read_text(encoding="utf-8") == "class Foo {}"


class TestCheckstyleRunner:
    """CheckstyleRunnerのテスト"""

    def test_run_no_java_files_returns_empty_violations(self):
        """.javaファイルが0件の場合、空のviolationsで正常終了すること"""
        from app.services.static_analysis.tools.checkstyle import CheckstyleRunner

        runner = CheckstyleRunner()
        # .javaファイルを含まないファイルリストを渡す
        result = runner.run(
            files=[{"name": "README.md", "content": "# test"}],
            config_file=None,
        )

        assert result["status"] == "executed"
        assert result["violations"] == []
        assert result["exit_code"] == 0

    def test_run_missing_config_returns_skipped(self):
        """バンドルconfigが存在しない場合、skipped_config_missingが返ること"""
        from pathlib import Path
        from unittest.mock import patch
        from app.services.static_analysis.tools.checkstyle import CheckstyleRunner

        runner = CheckstyleRunner()
        with patch.object(
            runner,
            "_get_bundled_config",
            return_value=Path("/nonexistent/path/checkstyle.xml"),
        ):
            result = runner.run(
                files=[{"name": "Main.java", "content": "class Main {}"}],
                config_file=None,
            )

        assert result["status"] == "skipped_config_missing"
        assert result["violations"] == []


class TestTimeMeasure:
    """TimeMeasureのテスト"""

    def test_time_measure(self):
        """時間計測が動作すること"""
        import time

        with TimeMeasure() as timer:
            time.sleep(0.05)  # 50ms

        assert timer.duration_ms >= 30
        assert timer.duration_ms < 500  # 妥当な範囲内
