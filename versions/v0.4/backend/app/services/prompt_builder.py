"""プロンプト組み立て・メタデータ構築の共通ロジック

全LLMプロバイダー（Bedrock / Anthropic / OpenAI）で共通して使用する
プロンプト組み立てとメタデータ構築のロジックを提供する。
"""

from datetime import datetime


def build_system_prompt(role: str, purpose: str, format: str, notes: str) -> str:
    """システムプロンプトを組み立てる

    Args:
        role: AIの役割
        purpose: 監査の目的
        format: 出力形式
        notes: 注意事項

    Returns:
        str: 組み立てられたシステムプロンプト
    """
    return f"""## 役割
{role}

## 目的
{purpose}

## 出力形式
{format}

## 注意事項
{notes}"""


def build_user_message(
    rule_markdown: str | None,
    rule_filename: str | None,
    rules: list[dict],
    codes: list[dict],
    legacy_code_with_line_numbers: str | None = None,
    legacy_code_filename: str | None = None,
    static_analysis_summary_markdown: str | None = None,
) -> str:
    """ユーザーメッセージを組み立てる

    Args:
        rule_markdown: 規約ファイルのMarkdown（後方互換用）
        rule_filename: 規約ファイルのファイル名（後方互換用）
        rules: 規約ファイルのリスト
        codes: コードファイルのリスト
        legacy_code_with_line_numbers: 後方互換用の単一コード文字列
        legacy_code_filename: 後方互換用の単一コードファイルのファイル名
        static_analysis_summary_markdown: 静的解析サマリー（マークダウン形式）

    Returns:
        str: 組み立てられたユーザーメッセージ

    Raises:
        ValueError: 規約またはコードが指定されていない場合
    """
    code_blocks = codes.copy()
    rule_blocks = rules.copy()

    # 後方互換: 旧フィールドのみが提供された場合はリスト形式に変換
    if not code_blocks and legacy_code_with_line_numbers:
        code_blocks = [
            {
                "filename": legacy_code_filename or "code",
                "contentWithLineNumbers": legacy_code_with_line_numbers,
            }
        ]

    if not rule_blocks and rule_markdown:
        rule_blocks = [
            {
                "filename": rule_filename or "rule",
                "content": rule_markdown,
                "isMain": True,
            }
        ]

    if not code_blocks:
        raise ValueError("コードファイルが指定されていません。")

    if not rule_blocks:
        raise ValueError("規約ファイルが指定されていません。")

    audit_targets = {"rules": [], "programs": []}
    rule_sections = []
    program_sections = []

    # メイン規約を先頭に並び替え
    rule_blocks = sorted(
        rule_blocks,
        key=lambda r: 0 if r.get("isMain") else 1,
    )

    for rule in rule_blocks:
        filename = rule.get("filename", "rule")
        is_main = rule.get("isMain") or False
        role = "メイン" if is_main else "参照"
        rule_type = rule.get("type") or "規約"

        meta = [f"役割: {role}", f"種別: {rule_type}"]
        audit_targets["rules"].append(f"- 規約ファイル: {filename}（{'; '.join(meta)}）")
        rule_sections.append(
            "\n".join(
                [
                    f"## 規約ファイル: {filename}",
                    f"- 種別: {rule_type}",
                    f"- 役割: {role}",
                    "",
                    rule.get("content", ""),
                ]
            ).strip()
        )

    for code in code_blocks:
        filename = code.get("filename", "code")
        content = code.get("contentWithLineNumbers", "")
        audit_targets["programs"].append(f"- プログラム: {filename}")
        program_sections.append(
            f"## プログラム: {filename}\n\n```\n{content}\n```"
        )

    rules_text = "\n\n".join(rule_sections)
    programs_text = "\n\n".join(program_sections)

    audit_targets_text = "\n".join(
        [
            "## 規約",
            "\n".join(audit_targets["rules"]) or "- (未指定)",
            "",
            "## プログラム",
            "\n".join(audit_targets["programs"]) or "- (未指定)",
        ]
    )

    # 静的解析サマリーのマークダウンをそのまま埋め込む
    summary_block = (
        f"\n# 静的解析サマリ\n{static_analysis_summary_markdown}\n"
        if static_analysis_summary_markdown
        else ""
    )

    return f"""以下の規約に基づいてプログラムを監査してください。
{summary_block}
# 監査対象一覧
{audit_targets_text}

# 規約詳細
{rules_text}

# プログラム詳細
{programs_text}"""


def build_audit_meta(
    version: str,
    model_id: str,
    provider: str,
    rules: list[dict],
    codes: list[dict],
    input_tokens: int,
    output_tokens: int,
    executed_at: str | None = None,
) -> dict:
    """監査メタ情報を構築する

    Args:
        version: アプリケーションのバージョン番号
        model_id: 使用したAIモデルのID
        provider: プロバイダー名 (bedrock/anthropic/openai)
        rules: 規約ファイルのリスト
        codes: コードファイルのリスト
        input_tokens: 入力トークン数
        output_tokens: 出力トークン数
        executed_at: 監査実行日時（ISO形式）- 未指定時は現在日時を使用

    Returns:
        dict: AuditMeta形式の辞書
    """
    # ツール名の表示名変換マップ
    tool_labels = {"markitdown": "MarkItDown", "excel2md": "excel2md"}

    # executed_atが指定されていない場合は現在日時を使用（YYYY/MM/DD HH:MM形式）
    if executed_at:
        actual_executed_at = executed_at
    else:
        now = datetime.now()
        actual_executed_at = now.strftime("%Y/%m/%d %H:%M")

    return {
        "version": version,
        "modelId": model_id,
        "provider": provider,
        "executedAt": actual_executed_at,
        "rules": [
            {
                "filename": r.get("filename", "rule"),
                "role": "メイン" if r.get("isMain") else "参照",
                "isMain": r.get("isMain") or False,
                "type": r.get("type") or "規約",
                "tool": tool_labels.get(
                    str(r.get("tool") or "markitdown").lower(),
                    r.get("tool") or "MarkItDown",
                ),
            }
            for r in rules
        ],
        "programs": [{"filename": c.get("filename", "code")} for c in codes],
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
    }


def build_audit_info_markdown(audit_meta: dict) -> str:
    """監査情報セクションのマークダウンを構築する

    Args:
        audit_meta: AuditMeta形式の辞書

    Returns:
        str: マークダウン形式の監査情報
    """
    version = audit_meta.get("version", "")
    model_id = audit_meta.get("modelId", "")
    provider = audit_meta.get("provider", "")
    executed_at = audit_meta.get("executedAt", "")
    # executedAtはフロントエンドでフォーマット済み（YYYY/MM/DD HH:MM形式）
    executed_at_formatted = executed_at

    input_tokens = audit_meta.get("inputTokens", 0)
    output_tokens = audit_meta.get("outputTokens", 0)
    rules = audit_meta.get("rules", [])
    programs = audit_meta.get("programs", [])

    # 規約テーブル
    rule_rows = "\n".join(
        [f"| {r['filename']} | {r['role']} | {r['type']} | {r['tool']} |" for r in rules]
    )
    rule_table = (
        f"""### 規約

| ファイル名 | 役割 | 種別 | ツール |
|-----------|------|------|--------|
{rule_rows}
"""
        if rules
        else ""
    )

    # プログラムテーブル
    program_rows = "\n".join([f"| {p['filename']} |" for p in programs])
    program_table = (
        f"""### プログラム

| ファイル名 |
|-----------|
{program_rows}
"""
        if programs
        else ""
    )

    # プロバイダー行を追加
    provider_row = f"| プロバイダー | {provider} |" if provider else ""

    return f"""# コーディング規約 AIオーディター 監査レポート

## 監査情報

| 項目 | 内容 |
|------|------|
| バージョン | {version} |
{provider_row}
| モデルID | {model_id} |
| 監査実行日時 | {executed_at_formatted} |
| 入力トークン数 | {input_tokens:,} |
| 出力トークン数 | {output_tokens:,} |

{rule_table}
{program_table}
---

## AIによる監査結果

以下はAIが出力した監査結果です。

"""
