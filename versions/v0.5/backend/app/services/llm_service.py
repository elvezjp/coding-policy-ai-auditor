"""LLMプロバイダー抽象化レイヤー

マルチプロバイダー対応（Bedrock / Anthropic / OpenAI）のための
抽象インターフェースとプロバイダー選択ロジックを提供する。
"""

import os
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from app.models.schemas import AuditMeta, AuditResponse
from app.services.prompt_builder import (
    build_audit_info_markdown,
    build_audit_meta,
    build_system_prompt,
    build_user_message,
)

if TYPE_CHECKING:
    from app.models.schemas import LLMConfig, AuditRequest

# システムLLM用のデフォルト設定（環境変数から取得）
# 後方互換性のため、既存の環境変数名を維持
_SYSTEM_LLM_REGION = os.environ.get("AWS_REGION", "ap-northeast-1")
_SYSTEM_LLM_MODEL_ID = os.environ.get(
    "BEDROCK_MODEL_ID", "global.anthropic.claude-haiku-4-5-20251001-v1:0"
)
_SYSTEM_LLM_MAX_TOKENS = int(os.environ.get("BEDROCK_MAX_TOKENS", "16384"))


class LLMProvider(ABC):
    """LLMプロバイダーの抽象基底クラス

    各プロバイダー（Bedrock, Anthropic, OpenAI）はこのクラスを継承し、
    execute_auditとtest_connectionを実装する。
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """プロバイダー名を返す

        Returns:
            str: プロバイダー名 (bedrock/anthropic/openai)
        """
        pass

    @property
    @abstractmethod
    def model_id(self) -> str:
        """使用するモデルIDを返す

        Returns:
            str: モデルID
        """
        pass

    @abstractmethod
    def execute_audit(
        self,
        request: "AuditRequest",
        version: str,
    ) -> "AuditResponse":
        """監査を実行する

        Args:
            request: 監査リクエスト
            version: アプリケーションのバージョン番号

        Returns:
            AuditResponse: 監査結果
        """
        pass

    @abstractmethod
    def test_connection(self) -> dict:
        """接続テストを実行する

        Returns:
            dict: {"status": "connected"} または {"status": "error", "error": "エラーメッセージ"}
        """
        pass

    def _build_prompts(self, request: "AuditRequest") -> tuple[str, str]:
        """プロンプトを構築する（共通処理）

        Args:
            request: 監査リクエスト

        Returns:
            tuple: (system_prompt, user_message)
        """
        system_prompt = build_system_prompt(
            role=request.systemPrompt.role,
            purpose=request.systemPrompt.purpose,
            format=request.systemPrompt.format,
            notes=request.systemPrompt.notes,
        )
        user_message = build_user_message(
            rule_markdown=request.ruleMarkdown,
            rule_filename=request.ruleFilename,
            rules=request.get_rule_blocks(),
            codes=request.get_code_blocks(),
            legacy_code_with_line_numbers=request.codeWithLineNumbers,
            legacy_code_filename=request.codeFilename,
            static_analysis_summary_markdown=request.staticAnalysisSummaryMarkdown,
        )
        return system_prompt, user_message

    def _build_success_response(
        self,
        request: "AuditRequest",
        version: str,
        llm_output: str,
        input_tokens: int,
        output_tokens: int,
    ) -> AuditResponse:
        """成功レスポンスを構築する（共通処理）

        Args:
            request: 監査リクエスト
            version: アプリケーションのバージョン番号
            llm_output: LLMからの出力テキスト
            input_tokens: 入力トークン数
            output_tokens: 出力トークン数

        Returns:
            AuditResponse: 成功レスポンス
        """
        rules = request.get_rule_blocks()
        codes = request.get_code_blocks()
        audit_meta_dict = build_audit_meta(
            version=version,
            model_id=self.model_id,
            provider=self.provider_name,
            rules=rules,
            codes=codes,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            executed_at=request.executedAt,
        )
        audit_info_markdown = build_audit_info_markdown(audit_meta_dict)
        report = audit_info_markdown + llm_output
        audit_meta = AuditMeta(**audit_meta_dict)
        return AuditResponse(success=True, report=report, auditMeta=audit_meta)

    def _build_error_response(self, error_message: str) -> AuditResponse:
        """エラーレスポンスを構築する（共通処理）

        Args:
            error_message: エラーメッセージ

        Returns:
            AuditResponse: エラーレスポンス
        """
        return AuditResponse(success=False, error=error_message)


def get_system_llm_config() -> "LLMConfig":
    """環境変数からシステムLLM用のLLMConfigを生成する

    現在はBedrockのみサポート。将来的に環境変数で
    プロバイダーを切り替え可能にすることも可能。

    Returns:
        LLMConfig: システムLLM用の設定
    """
    from app.models.schemas import LLMConfig

    return LLMConfig(
        provider="bedrock",
        model=_SYSTEM_LLM_MODEL_ID,
        region=_SYSTEM_LLM_REGION,
        maxTokens=_SYSTEM_LLM_MAX_TOKENS,
        # accessKeyId/secretAccessKey は None（IAMロール認証を使用）
    )


def get_llm_provider(llm_config: "LLMConfig | None") -> LLMProvider:
    """LLMConfigに基づいて適切なプロバイダーを返す

    Args:
        llm_config: LLM設定。Noneの場合はシステムLLMを使用。

    Returns:
        LLMProvider: プロバイダーインスタンス

    Raises:
        ValueError: 未知のプロバイダーが指定された場合
    """
    # 循環インポートを避けるためにここでインポート
    from app.services.anthropic_service import AnthropicProvider
    from app.services.bedrock_service import BedrockProvider
    from app.services.openai_service import OpenAIProvider

    # llm_configがNoneの場合はシステムLLM設定を使用
    if llm_config is None:
        llm_config = get_system_llm_config()

    if llm_config.provider == "anthropic":
        return AnthropicProvider(llm_config)
    elif llm_config.provider == "openai":
        return OpenAIProvider(llm_config)
    elif llm_config.provider == "bedrock":
        return BedrockProvider(llm_config)
    else:
        raise ValueError(f"Unknown provider: {llm_config.provider}")
