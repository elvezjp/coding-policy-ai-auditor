"""ツール実行の基底クラスと共通ユーティリティ"""

import shutil
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Literal

# 実行ステータスの型定義
ExecutionStatus = Literal[
    "executed",
    "skipped_no_java",
    "skipped_no_python",
    "skipped_not_installed",
    "skipped_disabled",
    "skipped_not_selected",
    "skipped_timeout",
]

# デフォルトタイムアウト設定（秒）
DEFAULT_TIMEOUTS = {
    "checkstyle": 30,
    "pmd": 60,
    "ruff": 30,
    "flake8": 30,
    "pylint": 60,
}


class ToolRunner(ABC):
    """静的解析ツール実行の基底クラス"""

    def __init__(self, timeout: int | None = None):
        self.timeout = timeout or DEFAULT_TIMEOUTS.get(self.tool_name, 300)

    @property
    @abstractmethod
    def tool_name(self) -> str:
        """ツール名"""
        ...

    @abstractmethod
    def run(
        self, files: list[dict[str, str]], config_file: dict[str, str] | None
    ) -> dict[str, Any]:
        """ツールを実行して結果を返す"""
        ...

    def _create_temp_files(self, files: list[dict[str, str]], tmpdir: str) -> None:
        """一時ディレクトリにファイルを作成"""
        tmpdir_resolved = Path(tmpdir).resolve()
        for file_data in files:
            relative_path = self._safe_relative_path(file_data)
            target_path = Path(tmpdir) / relative_path

            # resolve 後に tmpdir 配下に収まるかを確認 (Path Traversal の最終防衛線)
            resolved = target_path.resolve()
            if not resolved.is_relative_to(tmpdir_resolved):
                raise ValueError(f"Path traversal detected: {target_path}")

            target_path.parent.mkdir(parents=True, exist_ok=True)

            src_path = file_data.get("path")
            if src_path:
                # まずは非破壊でコピー（UTF-8ならこのままでOK）
                shutil.copy2(src_path, target_path)
                try:
                    target_path.read_text(encoding="utf-8")
                except UnicodeDecodeError:
                    # CP932（Shift_JIS）の可能性が高いのでUTF-8に変換して書き戻す
                    txt = target_path.read_text(encoding="cp932")
                    target_path.write_text(txt, encoding="utf-8")
                continue

            if "content" in file_data:
                data = file_data["content"]
                if isinstance(data, (bytes, bytearray)):
                    target_path.write_bytes(data)
                elif isinstance(data, str):
                    enc = file_data.get("encoding", "utf-8")
                    target_path.write_text(data, encoding=enc, newline="\n")
                else:
                    raise TypeError("content must be bytes or str")
            else:
                raise ValueError("file spec must contain 'path' or 'content'")

    def _safe_relative_path(self, file_data: dict[str, str]) -> Path:
        """パストラバーサル攻撃を防止した相対パスを取得"""
        file_path = file_data.get("path") or file_data.get("name", "")
        candidate = Path(file_path)
        if candidate.is_absolute() or ".." in candidate.parts:
            # fallback でも name フィールドのディレクトリ部分を除去して
            # 末端ファイル名のみを採用する (issue #19)
            name_only = Path(file_data.get("name", "")).name
            return Path(name_only) if name_only else Path("unknown_file")
        return candidate

    def _build_result(
        self,
        status: ExecutionStatus,
        violations: list[dict[str, Any]],
        **kwargs: Any,
    ) -> dict[str, Any]:
        """結果辞書を構築"""
        return {
            "name": self.tool_name,
            "status": status,
            "violations": violations,
            "config_used": kwargs.get("config_used", "bundled_default"),
            "exit_code": kwargs.get("exit_code"),
            "duration_ms": kwargs.get("duration_ms"),
            "version": kwargs.get("version"),
            "skipped_reason": kwargs.get("skipped_reason"),
        }

    def _skipped(self, status: ExecutionStatus, reason: str) -> dict[str, Any]:
        """スキップ結果を構築"""
        return self._build_result(status, [], skipped_reason=reason)

    def _measure_time(self) -> "TimeMeasure":
        """実行時間計測用コンテキストマネージャを返す"""
        return TimeMeasure()


class TimeMeasure:
    """実行時間計測用コンテキストマネージャ"""

    def __init__(self) -> None:
        self.start_time: float = 0
        self.duration_ms: int = 0

    def __enter__(self) -> "TimeMeasure":
        self.start_time = time.monotonic()
        return self

    def __exit__(self, *args: Any) -> None:
        self.duration_ms = int((time.monotonic() - self.start_time) * 1000)


# 共通の重大度マッピング
def map_python_code_severity(code: str) -> str:
    """Python系ツール（Ruff/Flake8）のコードから重大度を判定"""
    if not code:
        return "warning"
    prefix = code[0].upper()
    if prefix in {"E", "F"}:
        return "error"
    if prefix == "W":
        return "warning"
    if prefix == "I":
        return "info"
    return "warning"


def map_pylint_severity(pylint_type: str) -> str:
    """Pylintの重大度を正規化"""
    normalized = pylint_type.lower()
    if normalized in {"fatal", "error"}:
        return "error"
    if normalized in {"warning", "convention", "refactor"}:
        return "warning"
    if normalized == "info":
        return "info"
    return "warning"
