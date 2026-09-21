"""prompt_builder.py の単体テスト

テストケース（旧bedrock_service.pyから移行）:
- UT-BED-001: build_system_prompt() - 全項目指定時のプロンプト生成
- UT-BED-002: build_user_message() - 単一ファイル
- UT-BED-003: build_user_message() - 複数ファイル
- UT-BED-004: build_audit_info_markdown() - 規約・プログラム指定
- UT-BED-005: build_audit_meta() - 規約・プログラム指定
"""

import pytest

from app.services.prompt_builder import (
    build_audit_info_markdown,
    build_audit_meta,
    build_system_prompt,
    build_user_message,
)


class TestBuildSystemPrompt:
    """build_system_prompt() のテスト"""

    def test_ut_bed_001_all_fields(self):
        """UT-BED-001: 全項目指定時のプロンプト生成"""
        result = build_system_prompt(
            role="あなたはレビュアーです。",
            purpose="設計書とコードを突合してください。",
            format="マークダウン形式で出力してください。",
            notes="重要度順に報告してください。",
        )

        assert "## 役割" in result
        assert "あなたはレビュアーです。" in result
        assert "## 目的" in result
        assert "設計書とコードを突合してください。" in result
        assert "## 出力形式" in result
        assert "マークダウン形式で出力してください。" in result
        assert "## 注意事項" in result
        assert "重要度順に報告してください。" in result

    def test_build_system_prompt_empty_fields(self):
        """空のフィールドでもプロンプトが生成される"""
        result = build_system_prompt(role="", purpose="", format="", notes="")

        assert "## 役割" in result
        assert "## 目的" in result
        assert "## 出力形式" in result
        assert "## 注意事項" in result


class TestBuildUserMessage:
    """build_user_message() のテスト"""

    def test_ut_bed_002_single_file(self):
        """UT-BED-002: 単一ファイル"""
        result = build_user_message(
            rule_markdown=None,
            rule_filename=None,
            rules=[
                {
                    "filename": "spec.xlsx",
                    "content": "## 機能仕様\n| 機能 | 説明 |",
                    "isMain": True,
                    "type": "規約",
                }
            ],
            codes=[
                {
                    "filename": "main.py",
                    "contentWithLineNumbers": "   1: def main():\n   2:     pass",
                }
            ],
        )

        # 監査対象一覧が含まれる
        assert "# 監査対象一覧" in result
        assert "規約ファイル: spec.xlsx" in result
        assert "プログラム: main.py" in result

        # 規約詳細が含まれる
        assert "# 規約詳細" in result
        assert "## 規約ファイル: spec.xlsx" in result
        assert "種別: 規約" in result
        assert "役割: メイン" in result
        assert "## 機能仕様" in result

        # プログラム詳細が含まれる
        assert "# プログラム詳細" in result
        assert "## プログラム: main.py" in result
        assert "def main():" in result

    def test_ut_bed_003_multiple_files(self):
        """UT-BED-003: 複数ファイル"""
        result = build_user_message(
            rule_markdown=None,
            rule_filename=None,
            rules=[
                {
                    "filename": "spec1.xlsx",
                    "content": "# 仕様書1",
                    "isMain": True,
                    "type": "規約",
                },
                {
                    "filename": "api.xlsx",
                    "content": "# API仕様",
                    "isMain": False,
                    "type": "要件定義書",
                },
            ],
            codes=[
                {
                    "filename": "main.py",
                    "contentWithLineNumbers": "   1: main",
                },
                {
                    "filename": "util.py",
                    "contentWithLineNumbers": "   1: util",
                },
                {
                    "filename": "test.py",
                    "contentWithLineNumbers": "   1: test",
                },
            ],
        )

        # 規約のセクション
        assert "## 規約ファイル: spec1.xlsx" in result
        assert "## 規約ファイル: api.xlsx" in result

        # プログラムのセクション
        assert "## プログラム: main.py" in result
        assert "## プログラム: util.py" in result
        assert "## プログラム: test.py" in result

        # 監査対象一覧
        assert "規約ファイル: spec1.xlsx" in result
        assert "規約ファイル: api.xlsx" in result
        assert "プログラム: main.py" in result
        assert "プログラム: util.py" in result
        assert "プログラム: test.py" in result

    def test_build_user_message_legacy_format(self):
        """後方互換: 旧形式のフィールドからメッセージ生成"""
        result = build_user_message(
            rule_markdown="# 規約\n旧形式",
            rule_filename="legacy_spec.xlsx",
            rules=[],
            codes=[],
            legacy_code_with_line_numbers="   1: legacy code",
            legacy_code_filename="legacy.py",
        )

        assert "規約ファイル: legacy_spec.xlsx" in result
        assert "プログラム: legacy.py" in result
        assert "旧形式" in result
        assert "legacy code" in result

    def test_build_user_message_no_codes_raises(self):
        """コードなしでValueError"""
        with pytest.raises(ValueError, match="コードファイル"):
            build_user_message(
                rule_markdown=None,
                rule_filename=None,
                rules=[{"filename": "spec.xlsx", "content": "# spec"}],
                codes=[],
            )

    def test_build_user_message_no_rules_raises(self):
        """規約なしでValueError"""
        with pytest.raises(ValueError, match="規約ファイル"):
            build_user_message(
                rule_markdown=None,
                rule_filename=None,
                rules=[],
                codes=[{"filename": "main.py", "contentWithLineNumbers": "   1: code"}],
            )


class TestBuildAuditMeta:
    """build_audit_meta() のテスト"""

    def test_ut_bed_005_build_audit_meta(self):
        """UT-BED-005: 規約・プログラム指定"""
        result = build_audit_meta(
            version="v0.5.0",
            model_id="claude-haiku-4-5-20251001",
            provider="bedrock",
            rules=[
                {
                    "filename": "spec.xlsx",
                    "isMain": True,
                    "type": "規約",
                    "tool": "markitdown",
                },
                {
                    "filename": "api.xlsx",
                    "isMain": False,
                    "type": "要件定義書",
                    "tool": "excel2md",
                },
            ],
            codes=[
                {"filename": "main.py"},
                {"filename": "util.py"},
            ],
            input_tokens=12500,
            output_tokens=3200,
        )

        assert result["version"] == "v0.5.0"
        assert result["modelId"] == "claude-haiku-4-5-20251001"
        assert result["provider"] == "bedrock"
        assert "executedAt" in result
        assert result["inputTokens"] == 12500
        assert result["outputTokens"] == 3200
        assert len(result["rules"]) == 2
        assert result["rules"][0]["filename"] == "spec.xlsx"
        assert result["rules"][0]["role"] == "メイン"
        assert result["rules"][0]["isMain"] is True
        assert result["rules"][0]["tool"] == "MarkItDown"
        assert result["rules"][1]["role"] == "参照"
        assert result["rules"][1]["isMain"] is False
        assert result["rules"][1]["tool"] == "excel2md"
        assert len(result["programs"]) == 2
        assert result["programs"][0]["filename"] == "main.py"

    def test_build_audit_meta_default_values(self):
        """デフォルト値のテスト"""
        result = build_audit_meta(
            version="v0.5.0",
            model_id="claude-haiku-4-5-20251001",
            provider="anthropic",
            rules=[{"filename": "spec.xlsx"}],
            codes=[{"filename": "main.py"}],
            input_tokens=100,
            output_tokens=50,
        )

        assert result["rules"][0]["role"] == "参照"  # デフォルトはFalse→参照
        assert result["rules"][0]["isMain"] is False
        assert result["rules"][0]["type"] == "規約"
        assert result["rules"][0]["tool"] == "MarkItDown"
        assert result["provider"] == "anthropic"


class TestBuildAuditInfoMarkdown:
    """build_audit_info_markdown() のテスト"""

    def test_ut_bed_004_build_audit_info_markdown(self):
        """UT-BED-004: 規約・プログラム指定"""
        audit_meta = {
            "version": "v0.5.0",
            "modelId": "claude-haiku-4-5-20251001",
            "provider": "bedrock",
            "executedAt": "2024/12/21 14:30",
            "rules": [
                {
                    "filename": "spec.xlsx",
                    "role": "メイン",
                    "isMain": True,
                    "type": "規約",
                    "tool": "MarkItDown",
                },
            ],
            "programs": [
                {"filename": "main.py"},
            ],
            "inputTokens": 12345,
            "outputTokens": 1234,
        }

        result = build_audit_info_markdown(audit_meta)

        assert "# コーディング規約 AIオーディター 監査レポート" in result
        assert "## 監査情報" in result
        assert "v0.5.0" in result
        assert "claude-haiku-4-5-20251001" in result
        assert "bedrock" in result
        assert "2024/12/21 14:30" in result
        assert "12,345" in result
        assert "1,234" in result
        assert "spec.xlsx" in result
        assert "main.py" in result
        assert "## AIによる監査結果" in result
        assert "以下はAIが出力した監査結果です。" in result

    def test_build_audit_info_markdown_empty_lists(self):
        """空のリストでもエラーにならない"""
        audit_meta = {
            "version": "v0.5.0",
            "modelId": "claude-haiku-4-5-20251001",
            "provider": "openai",
            "executedAt": "2024/12/21 14:30",
            "rules": [],
            "programs": [],
            "inputTokens": 0,
            "outputTokens": 0,
        }

        result = build_audit_info_markdown(audit_meta)

        assert "# コーディング規約 AIオーディター 監査レポート" in result
        assert "## 監査情報" in result
        assert "openai" in result
        assert "### 規約" not in result
        assert "### プログラム" not in result


