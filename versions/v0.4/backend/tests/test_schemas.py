"""schemas.py の単体テスト

テストケース:
- UT-SCH-001: get_code_blocks() - codesフィールドからリスト取得
- UT-SCH-002: get_code_blocks() - 旧形式(codeWithLineNumbers)からリスト取得
- UT-SCH-003: get_rule_blocks() - rulesフィールドからリスト取得
- UT-SCH-004: get_rule_blocks() - 旧形式(ruleMarkdown)からリスト取得
- UT-SCH-005: validate_code_sources() - codes/codeWithLineNumbers両方なし
- UT-SCH-006: validate_rule_sources() - rules/ruleMarkdown両方なし
"""

import pytest
from pydantic import ValidationError

from app.models.schemas import (
    CodeFile,
    RuleFile,
    AuditRequest,
    SystemPrompt,
)


def create_system_prompt() -> SystemPrompt:
    """テスト用のSystemPromptを作成"""
    return SystemPrompt(
        role="テストロール",
        purpose="テスト目的",
        format="テストフォーマット",
        notes="テスト注意事項",
    )


class TestGetCodeBlocks:
    """get_code_blocks() のテスト"""

    def test_ut_sch_001_codes_field(self):
        """UT-SCH-001: codesフィールドからリスト取得"""
        request = AuditRequest(
            codes=[
                CodeFile(filename="main.py", contentWithLineNumbers="   1: print('hello')"),
                CodeFile(filename="util.py", contentWithLineNumbers="   1: def foo():"),
            ],
            ruleMarkdown="# 規約",
            systemPrompt=create_system_prompt(),
        )

        result = request.get_code_blocks()

        assert len(result) == 2
        assert result[0]["filename"] == "main.py"
        assert result[0]["contentWithLineNumbers"] == "   1: print('hello')"
        assert result[1]["filename"] == "util.py"

    def test_ut_sch_002_legacy_field(self):
        """UT-SCH-002: 旧形式(codeWithLineNumbers)からリスト取得"""
        request = AuditRequest(
            codeWithLineNumbers="   1: print('hello')\n   2: print('world')",
            codeFilename="legacy.py",
            ruleMarkdown="# 規約",
            systemPrompt=create_system_prompt(),
        )

        result = request.get_code_blocks()

        assert len(result) == 1
        assert result[0]["filename"] == "legacy.py"
        assert "print('hello')" in result[0]["contentWithLineNumbers"]

    def test_ut_sch_002_legacy_field_default_filename(self):
        """UT-SCH-002補足: ファイル名なしの場合はデフォルト値"""
        request = AuditRequest(
            codeWithLineNumbers="   1: code",
            ruleMarkdown="# 規約",
            systemPrompt=create_system_prompt(),
        )

        result = request.get_code_blocks()

        assert result[0]["filename"] == "code"


class TestGetRuleBlocks:
    """get_rule_blocks() のテスト"""

    def test_ut_sch_003_rules_field(self):
        """UT-SCH-003: rulesフィールドからリスト取得"""
        request = AuditRequest(
            rules=[
                RuleFile(
                    filename="spec1.xlsx",
                    content="## Sheet1\n| A | B |",
                    isMain=True,
                    type="規約",
                ),
                RuleFile(
                    filename="api.xlsx",
                    content="## API\n| Method | Path |",
                    isMain=False,
                    type="要件定義書",
                ),
            ],
            codeWithLineNumbers="   1: code",
            systemPrompt=create_system_prompt(),
        )

        result = request.get_rule_blocks()

        assert len(result) == 2
        assert result[0]["filename"] == "spec1.xlsx"
        assert result[0]["content"] == "## Sheet1\n| A | B |"
        assert result[0]["isMain"] is True
        assert result[0]["type"] == "規約"
        assert result[1]["filename"] == "api.xlsx"

    def test_ut_sch_004_legacy_field(self):
        """UT-SCH-004: 旧形式(ruleMarkdown)からリスト取得"""
        request = AuditRequest(
            ruleMarkdown="# 規約\n## 機能一覧",
            ruleFilename="rule.xlsx",
            codeWithLineNumbers="   1: code",
            systemPrompt=create_system_prompt(),
        )

        result = request.get_rule_blocks()

        assert len(result) == 1
        assert result[0]["filename"] == "rule.xlsx"
        assert result[0]["content"] == "# 規約\n## 機能一覧"
        assert result[0]["isMain"] is True  # 単一ファイルはメイン
        assert result[0]["type"] is None

    def test_ut_sch_004_legacy_field_default_filename(self):
        """UT-SCH-004補足: ファイル名なしの場合はデフォルト値"""
        request = AuditRequest(
            ruleMarkdown="# 規約",
            codeWithLineNumbers="   1: code",
            systemPrompt=create_system_prompt(),
        )

        result = request.get_rule_blocks()

        assert result[0]["filename"] == "rule"


class TestValidation:
    """バリデーションのテスト"""

    def test_ut_sch_005_no_code_sources(self):
        """UT-SCH-005: codes/codeWithLineNumbers両方なしでValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            AuditRequest(
                ruleMarkdown="# 規約",
                systemPrompt=create_system_prompt(),
            )

        errors = exc_info.value.errors()
        assert any("コードファイル" in str(e) for e in errors)

    def test_ut_sch_006_no_rule_sources(self):
        """UT-SCH-006: rules/ruleMarkdown両方なしでValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            AuditRequest(
                codeWithLineNumbers="   1: code",
                systemPrompt=create_system_prompt(),
            )

        errors = exc_info.value.errors()
        assert any("規約ファイル" in str(e) for e in errors)

    def test_valid_with_codes_only(self):
        """codesのみでも有効"""
        request = AuditRequest(
            codes=[CodeFile(filename="main.py", contentWithLineNumbers="   1: code")],
            ruleMarkdown="# 規約",
            systemPrompt=create_system_prompt(),
        )
        assert request.codes is not None

    def test_valid_with_rules_only(self):
        """rulesのみでも有効"""
        request = AuditRequest(
            rules=[RuleFile(filename="spec.xlsx", content="# 規約")],
            codeWithLineNumbers="   1: code",
            systemPrompt=create_system_prompt(),
        )
        assert request.rules is not None
