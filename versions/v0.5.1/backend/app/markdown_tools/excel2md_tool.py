"""excel2md を用いた Markdown 変換ツール。"""

import tempfile
from pathlib import Path

from excel2md.cli import build_argparser
from excel2md.runner import run

from .base import MarkdownTool
from ..safe_path import safe_filename


class Excel2mdTool(MarkdownTool):
    """excel2md を利用したExcel→CSVマークダウン変換。

    概要セクションあり、検証用メタデータなしで出力する。
    """

    @property
    def name(self) -> str:
        """ツールの識別名。"""
        return "excel2md"

    @property
    def display_name(self) -> str:
        """ツールの表示名。"""
        return "excel2md (CSV)"

    def convert(self, file_content: bytes, filename: str) -> str:
        """file_contentとfilenameを受け取りCSVマークダウン文字列を返す。"""
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
            # 概要セクションあり（デフォルト）、検証用メタデータなし
            parser = build_argparser()
            args = parser.parse_args(
                [
                    str(input_path),
                    "-o",
                    str(tmpdir_path / f"{output_basename}.md"),
                    "--csv-markdown-enabled",
                    "--no-csv-include-metadata",
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
