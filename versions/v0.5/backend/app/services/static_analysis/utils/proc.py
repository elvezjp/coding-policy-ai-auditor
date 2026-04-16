"""コマンド実行共通ユーティリティ"""

import os
import shutil
import subprocess
import sys
from typing import Sequence, Tuple


def resolve_cmd_on_windows(cmd: Sequence[str]) -> list[str]:
    """
    Windows でコマンド実体が .bat/.cmd の場合は ['cmd', '/c', 実体, ...] に変換。
    shell=True を使わずにバッチを起動するための対策。
    """
    if not sys.platform.startswith("win"):
        return list(cmd)
    prog = cmd[0]
    resolved = shutil.which(prog)  # PATH と PATHEXT を考慮
    if resolved:
        _, ext = os.path.splitext(resolved)
        if ext.lower() in (".bat", ".cmd"):
            return ["cmd", "/c", resolved, *cmd[1:]]
    return list(cmd)


def decode_with_fallback(data: bytes) -> str:
    """
    出力デコードを UTF-8 優先で行い、失敗時は cp932 → 既定エンコーディングへフォールバック。
    最終手段のみ 'replace' を使用。
    """
    for enc in ("utf-8", "cp932", sys.getdefaultencoding()):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            pass
    return data.decode("utf-8", errors="replace")


def run_capture(cmd: Sequence[str], timeout: float | None = None) -> Tuple[int, str, str]:
    """
    - Windows の .bat/.cmd を安全に起動（cmd /c ラップ）
    - subprocess は常に text=False（バイナリ）で取得
    - stdout/stderr はフォールバック・デコード
    - shell=False 固定
    """
    cmd2 = resolve_cmd_on_windows(cmd)
    proc = subprocess.run(
        cmd2,
        capture_output=True,
        text=False,
        timeout=timeout,
        shell=False,
    )
    out = decode_with_fallback(proc.stdout or b"")
    err = decode_with_fallback(proc.stderr or b"")
    return proc.returncode, out, err
