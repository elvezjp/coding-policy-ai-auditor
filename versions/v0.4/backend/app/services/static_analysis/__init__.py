"""静的解析サービス

Checkstyle/PMD (Java) と Ruff/Flake8/Pylint (Python) を使用した静的解析を提供する。
"""

from .service import StaticAnalysisService

__all__ = ["StaticAnalysisService"]
