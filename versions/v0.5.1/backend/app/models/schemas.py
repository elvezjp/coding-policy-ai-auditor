"""Pydantic スキーマ定義 (AI-Auditor)"""

from typing import Literal

from pydantic import BaseModel, Field, AliasChoices, ConfigDict, model_validator


class ConvertResponse(BaseModel):
    """変換APIのレスポンス"""

    success: bool
    markdown: str | None = None
    content: str | None = None
    filename: str
    line_count: int | None = None
    error: str | None = None


class SystemPrompt(BaseModel):
    """システムプロンプト設定"""

    role: str
    purpose: str
    format: str
    notes: str


class CodeFile(BaseModel):
    """監査対象のコードファイル"""

    filename: str
    contentWithLineNumbers: str


class RuleFile(BaseModel):
    """規約ファイル（Markdown変換済み）"""

    filename: str
    content: str
    isMain: bool | None = False
    type: str | None = None
    tool: str | None = "markitdown"


class LLMConfig(BaseModel):
    """LLM設定（オプション）

    リクエストにこの設定が含まれる場合、指定されたプロバイダーを使用する。
    含まれない場合はシステムLLM（環境変数で設定されたBedrock）を使用する。
    """

    model_config = ConfigDict(populate_by_name=True)

    provider: Literal["anthropic", "bedrock", "openai"]
    model: str
    apiKey: str | None = Field(default=None, validation_alias=AliasChoices("apiKey", "api_key"))  # Anthropic/OpenAI用
    accessKeyId: str | None = Field(
        default=None,
        validation_alias=AliasChoices("accessKeyId", "access_key_id"),
    )  # Bedrock用
    secretAccessKey: str | None = Field(
        default=None,
        validation_alias=AliasChoices("secretAccessKey", "secret_access_key"),
    )  # Bedrock用
    region: str | None = None  # Bedrock用
    maxTokens: int = Field(
        default=16384,
        validation_alias=AliasChoices("maxTokens", "max_tokens"),
    )


class AuditRequest(BaseModel):
    """監査APIのリクエスト"""

    ruleMarkdown: str | None = None
    ruleFilename: str | None = None
    codeWithLineNumbers: str | None = None
    codeFilename: str | None = None
    codes: list[CodeFile] | None = None
    rules: list[RuleFile] | None = None
    systemPrompt: SystemPrompt
    llmConfig: LLMConfig | None = None  # オプション: 未指定時はシステムLLMを使用
    executedAt: str | None = None  # 監査実行日時（ISO形式）- 指定時はその値を使用、未指定時はサーバー側で生成
    staticAnalysisSummaryMarkdown: str | None = None  # 静的解析サマリー（マークダウン形式）

    @model_validator(mode='after')
    def validate_code_sources(self):
        if not self.codes and not self.codeWithLineNumbers:
            raise ValueError("コードファイルが指定されていません。")
        return self

    @model_validator(mode='after')
    def validate_rule_sources(self):
        if not self.rules and not self.ruleMarkdown:
            raise ValueError("規約ファイルが指定されていません。")
        return self

    def get_code_blocks(self) -> list[dict]:
        """codes/旧フィールドを統一したリスト形式で取得する"""

        if self.codes:
            return [
                {
                    "filename": code.filename,
                    "contentWithLineNumbers": code.contentWithLineNumbers,
                }
                for code in self.codes
            ]

        if self.codeWithLineNumbers:
            return [
                {
                    "filename": self.codeFilename or "code",
                    "contentWithLineNumbers": self.codeWithLineNumbers,
                }
            ]

        return []

    def get_rule_blocks(self) -> list[dict]:
        """rules/旧フィールドを統一したリスト形式で取得する"""

        if self.rules:
            return [
                {
                    "filename": rule.filename,
                    "content": rule.content,
                    "isMain": rule.isMain,
                    "type": rule.type,
                    "tool": rule.tool,
                }
                for rule in self.rules
            ]

        if self.ruleMarkdown:
            return [
                {
                    "filename": self.ruleFilename or "rule",
                    "content": self.ruleMarkdown,
                    "isMain": True,  # 単一ファイルの場合はメイン
                    "type": None,
                    "tool": None,
                }
            ]

        return []


class RuleMeta(BaseModel):
    """規約のメタ情報"""

    filename: str
    role: str
    isMain: bool
    type: str
    tool: str


class ProgramMeta(BaseModel):
    """監査対象のプログラムメタ情報"""

    filename: str


class AuditMeta(BaseModel):
    """監査実行時のメタ情報"""

    version: str
    modelId: str
    provider: str | None = None  # プロバイダー名 (bedrock/anthropic/openai)
    executedAt: str
    rules: list[RuleMeta]
    programs: list[ProgramMeta]
    inputTokens: int
    outputTokens: int


class AuditResponse(BaseModel):
    """監査APIのレスポンス"""

    success: bool
    report: str | None = None
    auditMeta: AuditMeta | None = None
    error: str | None = None


class LLMStatus(BaseModel):
    """LLM接続状態"""

    provider: str
    model: str | None = None
    status: Literal["connected", "error"]
    error: str | None = None


class HealthResponse(BaseModel):
    """ヘルスチェックのレスポンス"""

    status: str
    version: str
    llm: LLMStatus


class ToolInfo(BaseModel):
    """ツール情報"""

    name: str
    display_name: str


class AvailableToolsResponse(BaseModel):
    """利用可能ツールAPIのレスポンス"""

    tools: list[ToolInfo]


class TestConnectionRequest(BaseModel):
    """LLM接続テストのリクエスト

    provider/modelが未指定の場合はシステムLLM（Bedrock）をテストする。
    """

    provider: Literal["anthropic", "bedrock", "openai"] | None = None
    model: str | None = None
    apiKey: str | None = None
    accessKeyId: str | None = None
    secretAccessKey: str | None = None
    region: str | None = None


class TestConnectionResponse(BaseModel):
    """LLM接続テストのレスポンス"""

    status: Literal["connected", "error"]
    provider: str
    model: str | None = None
    error: str | None = None


# ===== AIオーディター形式Excel関連 =====


class CellHyperlinkModel(BaseModel):
    """セルのハイパーリンク情報"""

    sheetName: str
    cell: str


class SpreadsheetSheetModel(BaseModel):
    """スプレッドシートのシートデータ"""

    title: str
    key: str
    data: list[list[str]]
    rows: int
    columns: int
    hyperlinks: dict[str, CellHyperlinkModel]


class AuditorSpreadsheetResponse(BaseModel):
    """AIオーディター形式Excelスプレッドシート解析のレスポンス"""

    success: bool
    sheets: list[SpreadsheetSheetModel]
    filename: str
    error: str | None = None


# ===== 静的解析関連 =====


class StaticAnalysisFile(BaseModel):
    """静的解析対象のファイル"""

    name: str
    path: str | None = None
    content: str


class StaticAnalysisViolation(BaseModel):
    """静的解析の違反"""

    tool: str
    file: str
    line: int
    column: int
    severity: Literal["error", "warning", "info"]
    rule_id: str
    message: str


class StaticAnalysisToolResult(BaseModel):
    """静的解析ツールの実行結果"""

    name: str
    version: str | None = None
    status: str  # executed, skipped_*
    exit_code: int | None = None
    duration_ms: int | None = None
    config_used: str
    findings: list[StaticAnalysisViolation] = []
    skipped_reason: str | None = None


class StaticAnalysisSummary(BaseModel):
    """静的解析結果のサマリー"""

    total_findings: int
    by_tool: dict[str, int]
    by_severity: dict[str, int]


class StaticAnalysisResult(BaseModel):
    """静的解析の実行結果"""

    run_id: str
    timestamp: str
    tools: list[StaticAnalysisToolResult]
    skipped_tools: list[dict[str, str]]
    summary: StaticAnalysisSummary
    violations: list[StaticAnalysisViolation]


class StaticAnalysisRequest(BaseModel):
    """静的解析APIのリクエスト"""

    files: list[StaticAnalysisFile]
    enabled: bool = True


class StaticAnalysisResponse(BaseModel):
    """静的解析APIのレスポンス"""

    success: bool
    result: StaticAnalysisResult | None = None
    summaryMarkdown: str | None = None
    error: str | None = None


class ToolAvailability(BaseModel):
    """ツールの利用可能性"""

    name: str  # ツール名 (checkstyle, pmd, ruff, flake8, pylint)
    available: bool  # 利用可能かどうか
    version: str | None = None  # バージョン情報（利用可能な場合）
    language: str  # 対象言語 ("java" or "python")
    unavailable_reason: str | None = None  # 利用不可の理由（available=falseの場合）


class StaticAnalysisToolsResponse(BaseModel):
    """静的解析ツールの利用可能性レスポンス"""

    java_available: bool  # Java解析が可能か（java + checkstyle/pmd）
    python_available: bool  # Python解析が可能か（ruff/flake8/pylint）
    java_unavailable_reason: str | None = None  # Java解析不可の理由
    python_unavailable_reason: str | None = None  # Python解析不可の理由
    tools: list[ToolAvailability]
