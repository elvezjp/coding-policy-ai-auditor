# Versions ディレクトリ

このディレクトリは、Coding Policy AI Auditor の各バージョンを管理します。

---

## バージョン管理方針

### 1. バージョンごとの完全保持

各バージョンディレクトリには、**フロントエンドとバックエンドを丸ごと保持**します。

```
versions/
├── v0.4/
│   ├── frontend/      # フロントエンド全体
│   ├── backend/       # バックエンド全体
│   └── README.md      # 仕様・起動方法（必要に応じて追加）
└── ...
```

**理由**:
- 各バージョンを独立して動作可能にする
- バージョン間の差分を明確にする
- 過去バージョンへのロールバックを容易にする

### 2. 新バージョン作成手順

新しいバージョンを作成する際は、以下の手順に従ってください。

```bash
# 1. 最新バージョンディレクトリをコピー
cp -r versions/v0.4 versions/v0.5

# 2. 新バージョンディレクトリで修正を実施
cd versions/v0.5

# 3. READMEや関連ドキュメントのバージョン情報を更新
# 4. 必要な修正を実施
# 5. テストを実行して動作確認
```

**注意事項**:
- `node_modules/` や `.venv/` などの依存関係ディレクトリは `.gitignore` で除外されているため、コピー後に再インストールが必要です
- 新バージョンの spec.md でバージョン番号と更新日を必ず更新してください

---

## バージョン比較表

詳細な変更点は[更新履歴](#更新履歴)を確認してください。

| 機能 / バージョン | v0.1 | v0.3 | v0.4 |
| :--- | :--- | :--- | :--- |
| リリース日 | 2026-01-09 | 2026-01-23 | 2026-01-28 |
| フロントエンド | Vite + React + TypeScript | Vite + React + TypeScript | Vite + React + TypeScript |
| バックエンド | FastAPI + Python 3.11+ | FastAPI + Python 3.10+ | FastAPI + Python 3.10+ |
| Javaファイルアップロード | ✅ | ✅ | ✅ |
| ルールプロンプト管理 | ✅ | ✅ | ✅ |
| リアルタイム進捗表示 | ✅ | ✅ | ✅ |
| 結果フィルタリング | ✅ | ✅ | ✅ |
| Markdownレポート出力 | ✅ | ✅ | ✅ |
| LLMプロバイダー | AWS Bedrock | AWS Bedrock / OpenAI / Anthropic | AWS Bedrock / OpenAI / Anthropic |
| LLM監査実行 | ⚠️ エラーあり | ✅ | ✅ |
| 静的解析 (Checkstyle/PMD) | ✅ | ✅ | ✅ |
| 静的解析 (Ruff/Flake8/Pylint) | - | ✅ | ✅ |
| 設定ファイルジェネレーター | - | ✅ | ✅ |
| 単体テスト | - | ✅ | ✅ |
| AIオーディター形式Excel | - | - | ✅ |
| 規約選択機能 | - | - | ✅ |

**凡例**: ✅ 実装済み / ⚠️ 問題あり / - 未実装

---

## 更新履歴

### v0.4 (最新)

**規約選択機能追加版**

- **フロントエンド**
  - AIオーディター形式で規約をチェックボックスで個別選択
  - 選択された規約のみをMarkdownに変換
  - リンクされた詳細シートも動的にフィルタリング

- **バックエンド**
  - v0.3と同等（後方互換性あり）

- **注意事項**
  - v0.3との後方互換性があります
  - AIオーディター形式Excelのサンプルは `docs/ai-auditor-format/` を参照

---

### v0.3

**公開準備版**

- **フロントエンド**
  - Vite + React 19 + TypeScript + Tailwind CSS
  - Javaファイルのドラッグ&ドロップアップロード
  - ルールプロンプト管理（新規作成、MDファイルインポート、削除）
  - WebSocketによるリアルタイム進捗表示
  - 監査結果のフィルタリング（違反/要確認）
  - Markdownレポートダウンロード
  - 設定ファイルジェネレーター

- **バックエンド**
  - FastAPI + Python 3.10+
  - AWS Bedrock / OpenAI / Anthropic 連携
  - WebSocketによる進捗配信
  - 静的解析サービス（Checkstyle/PMD/Ruff/Flake8/Pylint）
  - 行番号付きコード生成

- **既知の問題**
  - ドキュメント整備が未完了

### v0.1 (2026-01-09)

**初期バージョン**

- **フロントエンド**
  - Vite + React 19 + TypeScript + Tailwind CSS
  - Javaファイルのドラッグ&ドロップアップロード
  - ルールプロンプト管理（新規作成、MDファイルインポート、削除）
  - WebSocketによるリアルタイム進捗表示
  - 監査結果のフィルタリング（違反/要確認）
  - Markdownレポートダウンロード
  - デモモード（バックエンド不要で動作確認可能）

- **バックエンド**
  - FastAPI + Python 3.11+
  - AWS Bedrock連携（Claude 3.5 Sonnet）
  - WebSocketによる進捗配信
  - 静的解析サービス（Checkstyle/PMD）
  - 行番号付きコード生成

- **既知の問題**
  - AWS Bedrock連携でエラーが発生する（[Issue #1](https://github.com/elvezjp/coding-policy-ai-auditor/issues/1)）
  - 単体テストが未実装

---

## 関連ドキュメント

- [プロジェクトREADME](../README.md) - プロジェクト全体の説明
