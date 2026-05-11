# 変更履歴

[English](./CHANGELOG.md) | [日本語](./CHANGELOG_ja.md)

このプロジェクトに対するすべての重要な変更はこのファイルに記録されます。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に基づいており、
このプロジェクトは [セマンティックバージョニング](https://semver.org/lang/ja/) に準拠しています。

## [0.5.1] - 2026-05-07

### セキュリティ
- **[SECURITY] Path Traversal 脆弱性の修正**（[Issue #19](https://github.com/elvezjp/coding-policy-ai-auditor/issues/19)）
  - `_safe_relative_path` の fallback 処理に欠陥があり、`name` フィールドに含まれる traversal パスがそのまま返されていた問題を修正。`POST /api/static-analysis/analyze` 経由で tmpdir 外への任意ファイル書き込みが可能だった
  - 多層防御を適用:
    1. `_safe_relative_path` の fallback で `Path(...).name` によりディレクトリ部分を除去し、空文字列の場合は `unknown_file` にフォールバック
    2. `_create_temp_files` で `resolve()` 後に `is_relative_to()` による境界チェックを行い、tmpdir を外れる場合は `ValueError` で拒否
  - API 仕様の変更はなく、正常な相対パスの挙動は従来通り
  - 注: v0.3 / v0.4 にも同一の欠陥があるが、Dependabot Alert Policy に従い修正対象外

### 注意
- v0.5.0 との後方互換性あり（正常入力に対する API 仕様・挙動の変更なし）

## [0.5.0] - 2026-04-16

### 追加
- **Windows静的解析対応**: `.bat/.cmd` 形式のツールを `cmd /c` 経由で安全に実行（`shell=True` 不使用）
- **CP932エンコーディング対応**: ツール出力の UTF-8/CP932 フォールバックデコード、解析対象ファイルの CP932→UTF-8 自動変換
- **プロセス実行統一**: `subprocess.run()` を `run_capture()` に統一し、Windows/Unix 両対応
- **v0.5用CIジョブ**: GitHub Actions に v0.5 のバックエンド・フロントエンドテストを追加（Windows/macOS/Linux）

### 修正
- **ファイル再選択のリセット不具合**: `addCodeFiles` で再選択時に即座に state をリセットするよう修正（[Issue #15](https://github.com/elvezjp/coding-policy-ai-auditor/issues/15)）
- **テストの不安定性**: `setTimeout(0)` による非同期待ちを `waitFor` に置き換え安定化

### 変更
- Python 最小バージョンを 3.11 に引き上げ

### 注意
- PR #14（atsutakaGithub 氏）の改修案をベースにしています
- v0.4 との後方互換性があります

## [0.4.0] - 2026-01-28

### 追加
- **規約選択機能**: AIオーディター形式で規約をチェックボックスで個別選択
  - 選択された規約のみをMarkdownに変換
  - リンクされた詳細シートも動的にフィルタリング

### 注意
- v0.3との後方互換性があります
- AIオーディター形式Excelのサンプルは `docs/ai-auditor-format/` を参照

## [0.3.0] - 2026-01-26

### 追加
- **マルチLLMプロバイダー対応**: AWS Bedrock / OpenAI / Anthropic を切り替えて監査実行が可能に
- **静的解析機能（Java）**: Checkstyle / PMD による機械検出ルールのチェック
- **静的解析機能（Python）**: Ruff / Flake8 / Pylint による機械検出ルールのチェック
- **設定ファイルジェネレーター**: LLM設定やルールセットをGUIで生成
- **単体テスト**: バックエンドの主要機能に対するテストを実装
- **公開用ドキュメント整備**: CONTRIBUTING.md、SECURITY.md、GitHub テンプレート

### 変更
- **フロントエンド刷新**: Vite + React 19 + TypeScript + Tailwind CSS によるモダンなSPA構成
- **バックエンド改善**: FastAPI + Python 3.10+ による高速なAPI
- **excel2md v2.0対応**: git subtreeを更新しv2.0に対応

### 注意
- v0.1との後方互換性はありません
- 静的解析ツール（Checkstyle/PMD/Ruff/Flake8/Pylint）は未インストールでもAI監査は動作します

## [0.1.0] - 2026-01-09

### 追加
- **初期リリース**: 基本的な監査機能を実装
- **Javaファイルアップロード**: ドラッグ&ドロップ対応
- **ルールプロンプト管理**: 新規作成、MDファイルインポート、削除
- **リアルタイム進捗表示**: WebSocketによる進捗配信
- **監査結果フィルタリング**: 違反/要確認の表示切替
- **Markdownレポート出力**: 監査結果のダウンロード機能
- **静的解析サービス**: Checkstyle / PMD による機械検出

### 既知の問題
- AWS Bedrock連携でエラーが発生する場合がある
- 単体テストが未実装

---

## リンク

- [リポジトリ](https://github.com/elvezjp/coding-policy-ai-auditor)
- [Issue](https://github.com/elvezjp/coding-policy-ai-auditor/issues)

---

## バージョン比較

| バージョン | 主な機能 |
|------------|----------|
| 0.5.1      | Path Traversal 脆弱性の修正 |
| 0.5.0      | Windows静的解析対応、CP932エンコーディング対応、テスト安定化 |
| 0.4.0      | AIオーディター形式Excel対応、規約選択機能 |
| 0.3.0      | マルチLLM対応、静的解析（Java+Python）、設定ジェネレーター |
| 0.1.0      | 初期リリース、基本監査機能、静的解析（Java） |

### 機能マトリクス

| 機能 | v0.5.1 | v0.5 | v0.4 | v0.3 | v0.1 |
|------|--------|------|------|------|------|
| Javaファイルアップロード | ✅ | ✅ | ✅ | ✅ | ✅ |
| ルールプロンプト管理 | ✅ | ✅ | ✅ | ✅ | ✅ |
| リアルタイム進捗表示 | ✅ | ✅ | ✅ | ✅ | ✅ |
| LLM監査実行 | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| 静的解析 (Checkstyle/PMD) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 静的解析 (Ruff/Flake8/Pylint) | ✅ | ✅ | ✅ | ✅ | ❌ |
| 結果フィルタリング | ✅ | ✅ | ✅ | ✅ | ✅ |
| Markdownレポート出力 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 設定ファイルジェネレーター | ✅ | ✅ | ✅ | ✅ | ❌ |
| 単体テスト | ✅ | ✅ | ✅ | ✅ | ❌ |
| AIオーディター形式Excel | ✅ | ✅ | ✅ | ❌ | ❌ |
| 規約選択機能 | ✅ | ✅ | ✅ | ❌ | ❌ |
| Windows 静的解析対応 | ✅ | ✅ | ❌ | ❌ | ❌ |
| CP932 エンコーディング対応 | ✅ | ✅ | ❌ | ❌ | ❌ |
| Path Traversal 脆弱性修正 (#19) | ✅ | ⚠️ | ⚠️ | ⚠️ | - |

**凡例**: ✅ 実装済み / ⚠️ 問題あり / ❌ 未実装
