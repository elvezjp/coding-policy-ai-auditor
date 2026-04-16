"""anthropic_service.py の単体テスト

テストケース:
- UT-ANT-001: invoke() - 正常なリクエスト（モック）
- UT-ANT-002: invoke() - APIキー未設定
- UT-ANT-003: invoke() - 無効なモデルID（モック）
- UT-ANT-004: test_connection() - 正常な接続（モック）
- UT-ANT-005: test_connection() - 接続失敗（モック）
"""

from unittest.mock import MagicMock, patch

import pytest
from anthropic import APIError, AuthenticationError

from app.models.schemas import LLMConfig, SystemPrompt
from app.services.anthropic_service import AnthropicProvider


class TestAnthropicProviderInit:
    """AnthropicProvider初期化のテスト"""

    def test_ut_ant_002_no_api_key(self):
        """UT-ANT-002: APIキー未設定でValueError"""
        config = LLMConfig(
            provider="anthropic",
            model="claude-sonnet-4-20250514",
            apiKey=None,
        )

        with pytest.raises(ValueError, match="APIキー"):
            AnthropicProvider(config)

    def test_init_with_valid_config(self):
        """有効な設定で初期化成功"""
        config = LLMConfig(
            provider="anthropic",
            model="claude-sonnet-4-20250514",
            apiKey="test-api-key",
            maxTokens=8192,
        )

        provider = AnthropicProvider(config)

        assert provider.provider_name == "anthropic"
        assert provider.model_id == "claude-sonnet-4-20250514"
        assert provider._max_tokens == 8192


class TestAnthropicProviderTestConnection:
    """AnthropicProvider.test_connection()のテスト"""

    @patch("app.services.anthropic_service.Anthropic")
    def test_ut_ant_004_connection_success(self, mock_anthropic_class):
        """UT-ANT-004: 正常な接続"""
        # モックの設定
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.return_value = MagicMock()

        config = LLMConfig(
            provider="anthropic",
            model="claude-sonnet-4-20250514",
            apiKey="test-api-key",
        )
        provider = AnthropicProvider(config)

        result = provider.test_connection()

        assert result["status"] == "connected"
        assert "error" not in result

    @patch("app.services.anthropic_service.Anthropic")
    def test_ut_ant_005_connection_failure_auth(self, mock_anthropic_class):
        """UT-ANT-005: 認証失敗"""
        # モックの設定
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.side_effect = AuthenticationError(
            message="Invalid API Key",
            response=MagicMock(status_code=401),
            body=None,
        )

        config = LLMConfig(
            provider="anthropic",
            model="claude-sonnet-4-20250514",
            apiKey="invalid-api-key",
        )
        provider = AnthropicProvider(config)

        result = provider.test_connection()

        assert result["status"] == "error"
        assert "APIキー" in result["error"]

    @patch("app.services.anthropic_service.Anthropic")
    def test_connection_failure_api_error(self, mock_anthropic_class):
        """API エラー時"""
        # モックの設定
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.side_effect = APIError(
            message="Model not found",
            request=MagicMock(),
            body=None,
        )

        config = LLMConfig(
            provider="anthropic",
            model="invalid-model",
            apiKey="test-api-key",
        )
        provider = AnthropicProvider(config)

        result = provider.test_connection()

        assert result["status"] == "error"
        assert "Model not found" in result["error"]


class TestAnthropicProviderExecuteAudit:
    """AnthropicProvider.execute_audit()のテスト（モック使用）"""

    @patch("app.services.anthropic_service.Anthropic")
    def test_ut_ant_001_execute_audit_success(self, mock_anthropic_class):
        """UT-ANT-001: 正常なリクエスト"""
        # モックの設定
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="## 監査結果\n問題ありません。")]
        mock_response.usage.input_tokens = 1000
        mock_response.usage.output_tokens = 200
        mock_client.messages.create.return_value = mock_response

        config = LLMConfig(
            provider="anthropic",
            model="claude-sonnet-4-20250514",
            apiKey="test-api-key",
        )
        provider = AnthropicProvider(config)

        # AuditRequestのモック
        mock_request = MagicMock()
        mock_request.systemPrompt = SystemPrompt(
            role="オーディター",
            purpose="規約とコードの突合",
            format="マークダウン",
            notes="注意事項",
        )
        mock_request.ruleMarkdown = None
        mock_request.ruleFilename = None
        mock_request.codeWithLineNumbers = None
        mock_request.codeFilename = None
        mock_request.executedAt = "2024/12/21 14:30"
        mock_request.get_rule_blocks.return_value = [
            {"filename": "spec.xlsx", "content": "# 仕様", "isMain": True, "type": "規約"}
        ]
        mock_request.get_code_blocks.return_value = [
            {"filename": "main.py", "contentWithLineNumbers": "   1: code"}
        ]

        result = provider.execute_audit(mock_request, "v0.4.0")

        assert result.success is True
        assert result.report is not None
        assert "問題ありません" in result.report
        assert result.auditMeta is not None
        assert result.auditMeta.provider == "anthropic"
        assert result.auditMeta.modelId == "claude-sonnet-4-20250514"
        assert result.auditMeta.inputTokens == 1000
        assert result.auditMeta.outputTokens == 200

    @patch("app.services.anthropic_service.Anthropic")
    def test_execute_audit_auth_error(self, mock_anthropic_class):
        """認証エラー時"""
        mock_client = MagicMock()
        mock_anthropic_class.return_value = mock_client
        mock_client.messages.create.side_effect = AuthenticationError(
            message="Invalid API Key",
            response=MagicMock(status_code=401),
            body=None,
        )

        config = LLMConfig(
            provider="anthropic",
            model="claude-sonnet-4-20250514",
            apiKey="invalid-api-key",
        )
        provider = AnthropicProvider(config)

        mock_request = MagicMock()
        mock_request.systemPrompt = SystemPrompt(
            role="オーディター",
            purpose="規約とコードの突合",
            format="マークダウン",
            notes="注意事項",
        )
        mock_request.ruleMarkdown = None
        mock_request.ruleFilename = None
        mock_request.codeWithLineNumbers = None
        mock_request.codeFilename = None
        mock_request.get_rule_blocks.return_value = [
            {"filename": "spec.xlsx", "content": "# 仕様", "isMain": True}
        ]
        mock_request.get_code_blocks.return_value = [
            {"filename": "main.py", "contentWithLineNumbers": "   1: code"}
        ]

        result = provider.execute_audit(mock_request, "v0.4.0")

        assert result.success is False
        assert "認証エラー" in result.error
