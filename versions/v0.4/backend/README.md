# バックエンド

FastAPI + Python で構築されたバックエンドAPIです。

## 技術スタック

- **フレームワーク**: FastAPI
- **Python**: 3.10+
- **依存管理**: uv

## ディレクトリ構成

```
app/
├── main.py               # エントリーポイント
├── models/               # Pydanticスキーマ
├── routers/              # APIルーター
└── services/             # 監査/静的解析/LLM連携
tests/                    # テスト
```

## 起動方法

```bash
# 依存関係のインストール
uv sync

# 環境変数を設定
cp .env.example .env

# 開発サーバー起動（http://localhost:8000）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 環境変数

`.env.example` に必要な環境変数を記載しています。用途に応じて `.env` を設定してください。
