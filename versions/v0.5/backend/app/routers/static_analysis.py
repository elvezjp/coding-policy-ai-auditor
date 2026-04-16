"""静的解析API"""

import logging

from fastapi import APIRouter

from app.models.schemas import (
    StaticAnalysisRequest,
    StaticAnalysisResponse,
    StaticAnalysisResult,
    StaticAnalysisToolResult,
    StaticAnalysisSummary,
    StaticAnalysisViolation,
    StaticAnalysisToolsResponse,
    ToolAvailability,
)
from app.services.static_analysis import StaticAnalysisService

logger = logging.getLogger(__name__)

router = APIRouter()

# サービスインスタンス
_service = StaticAnalysisService()


@router.get("/tools", response_model=StaticAnalysisToolsResponse)
async def get_tools_availability():
    """
    静的解析ツールの利用可能性を取得

    インストールされているツールとバージョン情報を返す。
    """
    try:
        availability = _service.get_tools_availability()
        return StaticAnalysisToolsResponse(
            java_available=availability["java_available"],
            python_available=availability["python_available"],
            java_unavailable_reason=availability.get("java_unavailable_reason"),
            python_unavailable_reason=availability.get("python_unavailable_reason"),
            tools=[
                ToolAvailability(
                    name=tool["name"],
                    available=tool["available"],
                    version=tool["version"],
                    language=tool["language"],
                    unavailable_reason=tool.get("unavailable_reason"),
                )
                for tool in availability["tools"]
            ],
        )
    except Exception as e:
        logger.error(f"ツール利用可能性の取得に失敗: {e}")
        return StaticAnalysisToolsResponse(
            java_available=False,
            python_available=False,
            java_unavailable_reason="ツール情報の取得に失敗しました",
            python_unavailable_reason="ツール情報の取得に失敗しました",
            tools=[],
        )


@router.post("/analyze", response_model=StaticAnalysisResponse)
async def analyze(request: StaticAnalysisRequest):
    """
    静的解析を実行

    Java/Pythonファイルに対してCheckstyle, PMD, Ruff, Flake8, Pylintを実行する。
    """
    if not request.enabled:
        return StaticAnalysisResponse(
            success=True,
            result=None,
            error=None,
        )

    if not request.files:
        return StaticAnalysisResponse(
            success=False,
            error="解析対象ファイルが指定されていません。",
        )

    try:
        # ファイルを変換
        files = [
            {
                "name": f.name,
                "path": f.path,
                "content": f.content,
            }
            for f in request.files
        ]

        # 解析実行
        analysis_data = await _service.run_analysis(files)

        # サービスの戻り値から各データを取得
        result = analysis_data["result"]
        summary_markdown = analysis_data["summaryMarkdown"]

        # レスポンス形式に変換
        return StaticAnalysisResponse(
            success=True,
            result=StaticAnalysisResult(
                run_id=result["run_id"],
                timestamp=result["timestamp"],
                tools=[
                    StaticAnalysisToolResult(
                        name=tool["name"],
                        version=tool.get("version"),
                        status=tool["status"],
                        exit_code=tool.get("exit_code"),
                        duration_ms=tool.get("duration_ms"),
                        config_used=tool.get("config_used", "bundled_default"),
                        findings=[
                            StaticAnalysisViolation(
                                tool=v["tool"],
                                file=v["file"],
                                line=v["line"],
                                column=v["column"],
                                severity=v["severity"],
                                rule_id=v["rule_id"],
                                message=v["message"],
                            )
                            for v in tool.get("findings", [])
                        ],
                        skipped_reason=tool.get("skipped_reason"),
                    )
                    for tool in result["tools"]
                ],
                skipped_tools=result["skipped_tools"],
                summary=StaticAnalysisSummary(
                    total_findings=result["summary"]["total_findings"],
                    by_tool=result["summary"]["by_tool"],
                    by_severity=result["summary"]["by_severity"],
                ),
                violations=[
                    StaticAnalysisViolation(
                        tool=v["tool"],
                        file=v["file"],
                        line=v["line"],
                        column=v["column"],
                        severity=v["severity"],
                        rule_id=v["rule_id"],
                        message=v["message"],
                    )
                    for v in result["violations"]
                ],
            ),
            summaryMarkdown=summary_markdown,
        )

    except Exception as e:
        logger.exception("静的解析中にエラーが発生しました")
        return StaticAnalysisResponse(
            success=False,
            error=f"静的解析中にエラーが発生しました: {str(e)}",
        )
