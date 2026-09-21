# 変更履歴

[English](./CHANGELOG.md) | [日本語](./CHANGELOG_ja.md)

このプロジェクトに対するすべての重要な変更はこのファイルに記録されます。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に基づいており、
このプロジェクトは [セマンティックバージョニング](https://semver.org/lang/ja/) に準拠しています。

## [0.6.0] - 2026-09-21

`versions/` ディレクトリを廃止して最新コードのみをルート直下で保持する構成へ移行し、あわせてセキュリティ修正と依存関係の更新を行ったリリース。

### セキュリティ
- **Excel 変換 API のパストラバーサルによる任意ファイル書き込みを修正**（GHSA-ghvr-jjv7-mx45）: `POST /api/convert/excel-to-markdown` がクライアント指定のファイル名を一時ディレクトリのパスへそのまま結合しており、絶対パスや `../` で一時ディレクトリ外にファイルを作成・上書きできた。`safe_filename()` でディレクトリ成分を除去するよう修正し、回帰テストを追加
- **[BREAKING] CORS の既定値を全許可（`*`）からローカル開発用オリジンのみに変更**（#33, #43）: `CORS_ORIGINS` が未設定・空白の場合は `http://localhost:5173` / `http://127.0.0.1:5173` / `http://localhost:4173` / `http://127.0.0.1:4173` のみを許可する。`*` を含む設定（`https://app.example.com,*` のような混在を含む）では認証情報（`allow_credentials`）を許可しない。従来は既定の全許可と `allow_credentials=True` の組み合わせにより、Starlette がリクエスト元の Origin をそのまま返し、任意のサイトが監査対象のコードや設計書を含む応答を読める状態だった。**注意:** フロントエンドは同一オリジンから API を呼ぶため通常の構成に影響はないが、別オリジンから API を呼んでいる場合は `CORS_ORIGINS` の明示が必要
- **自社ツール `add-line-numbers` をタグ指定の git 依存に変更**（#35、CWE-829）: リポジトリ内の複製へのローカルパス参照をやめ、上流のリリースタグ `v0.1.3` から取得する。実行時の挙動は変わらない
- **ローカル利用を前提とする方針を明記**（#43）: 本ツールは認証・認可を持たないため、README / SECURITY に「想定する利用環境」を追加し、起動例を `--host 127.0.0.1` に統一。SECURITY のサポート対象を最新版のみとし、脆弱性の報告先を非公開の窓口（GitHub の非公開脆弱性報告またはメール）に統一
- **依存関係を更新して既知の脆弱性に対応**:
  - バックエンド: `starlette` 1.0.1 → 1.6.0（Dependabot アラート #162〜#165）。`uv lock --upgrade` により `fastapi` 0.141.1、`uvicorn` 0.52.1、`anthropic` 0.121.0、`openai` 2.53.0 など計 30 パッケージを更新
  - フロントエンド: `react-router-dom` 7.17.0 → 7.18.2（XSS、ルートマッチング DoS、コンストラクタインジェクション、オープンリダイレクト。#32）、`vitest` 4.1.9 → 4.1.11（GHSA-82fw-gwwq-j7x9）、`browserslist` 4.28.2 → 4.28.9（GHSA-73wf-gq98-2v4g）、`js-yaml` 4.2.0 → 4.3.2（GHSA-5p4m-2wfm-xmqj ほか）、`brace-expansion` → 1.1.16 / 5.0.8、`postcss` 8.5.15 → 8.5.24（GHSA-r28c-9q8g-f849）
  - GHSA-qwww-vcr4-c8h2（`react-router` の RSC モードの CSRF）は、該当機能を使用しておらず 7.x 系の修正版も存在しないため dismiss

### 修正
- **`/health` が 404 を返す問題を修正**（#43）: 静的ファイル配信（`/` への mount）より後にルートを登録していたため到達できなかった。登録順を入れ替え、回帰テストを追加

### 変更
- **[BREAKING] `versions/` ディレクトリを廃止し、最新コードのみをルート直下で保持する構成に移行**（#24）: `versions/v0.5.1/` の `backend`・`frontend` をルート直下へ、仕様書類を `docs/` へ移動し、旧バージョン（v0.3 / v0.4 / v0.5）のスナップショットを削除。旧バージョンの lockfile に対する Dependabot アラートの重複通知が解消される。旧構成は `v0.5.1` タグに保存されており `git checkout v0.5.1` で参照できる（同タグのコードは本リリースのセキュリティ修正を含まない）。今後はリリース時に `vX.Y.Z` タグを作成する
- **[BREAKING] `excel2md` を同梱ディレクトリの `sys.path` 注入から PyPI 依存に移行**（#26）: `excel2md>=2.2.1` を依存に追加（v2.1.1 → v2.3.0）。環境変数 `EXCEL2MD_PATH` は廃止。サンプル規約 Excel の変換結果が移行前後で一致することを確認済み
- **ドキュメントを単一バージョン構成・git tag 運用に合わせて整備**（#24, #26）: README / CONTRIBUTING の手順をルート構成に書き換え、README に「関連プロジェクト」「バージョン管理」を追加。Dependabot 運用方針をルートの lockfile のみを対象とする内容に更新
- **Node.js の要件を依存関係に合わせて更新**（#43）: 20.19 以上（20.x）/ 22.12 以上（22.x）/ 24 以上。フロントエンド CI の Node.js マトリクスも `["20", "23"]` → `["20", "24"]` に変更

### 削除
- **[BREAKING] 同梱していた自社ツールのディレクトリ `add-line-numbers/`・`excel2md/` を削除**（#24, #26）: それぞれ git 依存・PyPI 依存へ移行済みで未参照だった。リポジトリ内の依存マニフェストは 19 ファイルから 4 ファイルになった。ソースを参照したい場合は各上流リポジトリ（[add-line-numbers](https://github.com/elvezjp/add-line-numbers)、[excel2md](https://github.com/elvezjp/excel2md)）を clone する
- **未使用のバージョン切替コードを削除**（#24）: フロントエンドの `VersionSelector` / `useVersions` など。画面の表示・挙動に変更はない

## [0.5.1] - 2026-05-11

### セキュリティ
- **[SECURITY] Path Traversal 脆弱性の修正**（[Issue #19](https://github.com/elvezjp/coding-policy-ai-auditor/issues/19)）
  - `_safe_relative_path` の fallback 処理に欠陥があり、`name` フィールドに含まれる traversal パスがそのまま返されていた問題を修正。`POST /api/static-analysis/analyze` 経由で tmpdir 外への任意ファイル書き込みが可能だった
  - 多層防御を適用:
    1. `_safe_relative_path` の fallback で `Path(...).name` によりディレクトリ部分を除去し、空文字列の場合は `unknown_file` にフォールバック
    2. `_create_temp_files` で `resolve()` 後に `is_relative_to()` による境界チェックを行い、tmpdir を外れる場合は `ValueError` で拒否
  - API 仕様の変更はなく、正常な相対パスの挙動は従来通り
  - 注: v0.3 / v0.4 にも同一の欠陥があるが、Dependabot Alert Policy に従い修正対象外

### 変更
- **excel2md subtree を v2.0 → v2.1.1 に更新**（[Issue #21](https://github.com/elvezjp/coding-policy-ai-auditor/issues/21)）
  - `versions/v0.5.1/backend/app/markdown_tools/excel2md_tool.py` の参照先を `excel2md/v2.1.1/` に変更
  - 以下の upstream 修正を取り込み:
    - **v2.0.1**: heuristic Mermaid 検出時に `is_code_block` の import 漏れで発生していた `NameError` を修正
    - **v2.1.0**: 同梱の test-time 依存を更新 — pytest 9.0.3（[CVE-2025-71176](https://github.com/advisories/GHSA-6w46-j5rx-g56g)）、Pygments 2.20.0（[CVE-2026-4539](https://github.com/advisories/GHSA-5239-wwwm-4pmq)）
    - **v2.1.1**: v1.x 後方互換の再エクスポート（`is_code_block` / `build_code_block_from_rows`）を復元、`max_cells_per_table` truncation 経路の tuple arity 不整合を修正、複数テーブル間の脚注番号重複・脱落を修正
  - 注: upstream は v2.1.0 で最低 Python を 3.10 に引き上げ済みだが、v0.5 の `requires-python = ">=3.11"` で既にカバー済み

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
| 0.6.0      | `versions/` 廃止・ルート構成へ移行、excel2md の PyPI 移行、セキュリティ修正（Excel 変換 API のパストラバーサル、CORS 既定値のローカル限定）、`/health` の 404 修正 |
| 0.5.1      | Path Traversal 脆弱性の修正、excel2md subtree を v2.1.1 に更新 |
| 0.5.0      | Windows静的解析対応、CP932エンコーディング対応、テスト安定化 |
| 0.4.0      | AIオーディター形式Excel対応、規約選択機能 |
| 0.3.0      | マルチLLM対応、静的解析（Java+Python）、設定ジェネレーター |
| 0.1.0      | 初期リリース、基本監査機能、静的解析（Java） |

### 機能マトリクス

| 機能 | v0.6.0 | v0.5.1 | v0.5 | v0.4 | v0.3 | v0.1 |
|------|--------|--------|------|------|------|------|
| Javaファイルアップロード | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ルールプロンプト管理 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| リアルタイム進捗表示 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| LLM監査実行 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| 静的解析 (Checkstyle/PMD) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 静的解析 (Ruff/Flake8/Pylint) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 結果フィルタリング | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Markdownレポート出力 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 設定ファイルジェネレーター | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 単体テスト | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| AIオーディター形式Excel | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 規約選択機能 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Windows 静的解析対応 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| CP932 エンコーディング対応 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Path Traversal 脆弱性修正 (#19) | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | - |
| excel2md バージョン（v0.5.1 以前は subtree） | v2.3.0（PyPI） | v2.1.1 | v2.0 | v2.0 | v2.0 | - |
| Excel 変換 API のパストラバーサル修正 (GHSA-ghvr-jjv7-mx45) | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | - |
| CORS 既定値のローカル限定・全許可時の認証情報無効化 | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | - |

**凡例**: ✅ 実装済み / ⚠️ 問題あり / ❌ 未実装
