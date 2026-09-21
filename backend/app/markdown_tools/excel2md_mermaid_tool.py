"""excel2md (CSV+Mermaid) を用いた Markdown 変換ツール。"""

import tempfile
from pathlib import Path

from excel2md.cli import build_argparser
from excel2md.runner import run

from .base import MarkdownTool
from ..safe_path import safe_filename


class Excel2mdMermaidTool(MarkdownTool):
    """excel2md を利用したExcel→CSVマークダウン+Mermaid変換。

    概要セクションあり、検証用メタデータなし、Mermaidフローチャートありで出力する。
    シェイプからMermaidフローチャートを検出して出力する（mermaid_detect_mode=shapes）。
    """

    @property
    def name(self) -> str:
        """ツールの識別名。"""
        return "excel2md_mermaid"

    @property
    def display_name(self) -> str:
        """ツールの表示名。"""
        return "excel2md (CSV+Mermaid)"

    def convert(self, file_content: bytes, filename: str) -> str:
        """file_contentとfilenameを受け取りCSVマークダウン+Mermaid文字列を返す。"""
        # 一時ディレクトリで作業
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # 入力ファイルを作成
            input_path = tmpdir_path / safe_filename(filename)
            input_path.write_bytes(file_content)

            # 出力パスを設定（run()がファイルを生成する）
            output_basename = input_path.stem
            # CSVマークダウンモードでは {basename}_csv.md が生成される
            expected_output = tmpdir_path / f"{output_basename}_csv.md"

            # argparserでオプションを設定
            # 概要セクションあり（デフォルト）、検証用メタデータなし、Mermaidあり
            parser = build_argparser()
            args = parser.parse_args(
                [
                    str(input_path),
                    "-o",
                    str(tmpdir_path / f"{output_basename}.md"),
                    "--csv-markdown-enabled",
                    "--no-csv-include-metadata",
                    "--mermaid-enabled",
                    "--mermaid-detect-mode",
                    "shapes",
                ]
            )

            # 変換実行
            result = run(str(input_path), args.output, args)

            # 出力ファイルを読み取り
            if result and Path(result).exists():
                output_file = Path(result)
            elif expected_output.exists():
                output_file = expected_output
            else:
                raise RuntimeError(
                    "excel2md変換に失敗しました: 出力ファイルが見つかりません"
                )

            return output_file.read_text(encoding="utf-8")
