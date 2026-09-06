# 変更履歴

[English](./CHANGELOG.md) | [日本語](./CHANGELOG_ja.md)

このプロジェクトに対するすべての重要な変更はこのファイルに記録されます。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に基づいており、
このプロジェクトは [セマンティックバージョニング](https://semver.org/lang/ja/) に準拠しています。

## [0.6.0] - Unreleased

### セキュリティ
- **フロントエンド開発依存の `js-yaml` を 4.3.0 → 4.3.2 に更新**: `!!omap` の処理による過剰な CPU 消費（GHSA-5p4m-2wfm-xmqj、Dependabot [#251](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/251)）に対応。現行版のロックファイルを更新。
- **[SECURITY] `starlette` を 1.0.1 → 1.3.1 に更新**: Dependabot アラート [#162](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/162) / [#163](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/163) / [#164](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/164) / [#165](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/165)（`starlette < 1.3.1` ほか）を解消。あわせて `uv.lock` を再生成。
- **[SECURITY] 認証なし Excel 変換 API のパストラバーサルによる任意ファイル書き込みを修正**（GHSA-ghvr-jjv7-mx45）: `POST /api/convert/excel-to-markdown`（`excel2md_tool.py` / `excel2md_mermaid_tool.py`）がクライアント指定のアップロードファイル名を一時ディレクトリのパスへそのまま結合していたため、絶対パスや `../` を含む値で一時ディレクトリ外にファイルを作成・上書きできた。クライアント由来のファイル名は `safe_filename()`（`versions/v0.5.1/backend/app/safe_path.py` に追加）でディレクトリ成分を除去してから使用するよう修正し、回帰テストを追加。注: `versions/v0.3` / `versions/v0.4` / `versions/v0.5` にも同一の欠陥があるが、Dependabot Alert Policy に従い修正対象外（`versions/` レイアウトは廃止予定）
- **[SECURITY] 自社リポジトリ由来の依存をタグ指定の git 参照に変更**: `add-line-numbers` をリポジトリ内の複製（`add-line-numbers/`、v0.1.0）へのローカルパス参照（`path = "../../../add-line-numbers", editable = true`）で取り込んでいたため、依存の実体がバージョン管理外の作業ツリーの状態に左右され、参照先のすり替えが差分に現れない経路が残っていた（CWE-829）。`{ git = "https://github.com/elvezjp/add-line-numbers.git", tag = "v0.1.3" }` に変更し、上流のリリースタグから取得するようにした。更新は `pyproject.toml` の差分としてレビューに乗る。あわせて `[project.dependencies]` に下限 `>=0.1.3` を宣言し、pytest の `pythonpath` から複製ディレクトリへの参照を除去（複製側が優先して読み込まれると固定の意味が失われるため）。取り込んだ `add_line_numbers.py` は複製と上流 v0.1.3 で完全一致しており、実行時の挙動は変わらない。注: `versions/v0.3` / `versions/v0.4` / `versions/v0.5` は同じローカルパス参照のままだが、`versions/` レイアウトは廃止予定のため対象外
- **依存パッケージを一括更新**: `uv lock --upgrade` で `versions/v0.5.1/backend/uv.lock` を再生成し、30 パッケージを更新。主なものは `starlette` 1.3.1 → 1.6.0、`fastapi` 0.137.1 → 0.141.1、`uvicorn` 0.49.0 → 0.52.1、`anthropic` 0.109.2 → 0.121.0、`openai` 2.42.0 → 2.53.0、`boto3` 1.43.31 → 1.43.67、`pandas` 3.0.3 → 3.0.5、`numpy` 2.4.6 → 2.5.1、`markitdown` 0.1.6 → 0.1.7、`ruff` 0.15.17 → 0.16.2。CORS 修正が依拠する Starlette の全許可判定（`allow_all_origins = "*" in allow_origins`）は 1.6.0 でも変わらないことを確認済み。既存を含めて178件全通過
- **[SECURITY] CORS 全許可時に認証情報を許可しないよう修正**（#33）: `CORS_ORIGINS` の既定値が `*` であるにもかかわらず `allow_credentials=True` としていた。Starlette はワイルドカードと認証情報を併用できないため、この場合 `Access-Control-Allow-Origin` にリクエスト元の Origin をそのまま返す（`allow_all_origins and allow_credentials` → `allow_explicit_origin()`）。結果として任意のサイトがこの API へ資格情報付きで到達して応答を読めるため、ローカル起動中に利用者が悪意あるページを開くと監査対象のコードや設計書が読み取られうる状態だった。全許可のときは認証情報を許可しないよう修正（オリジンを限定している場合の挙動は変更なし）。Starlette は `"*"` がリストに **含まれる** かどうかで全許可を判定する（`allow_all_origins = "*" in allow_origins`）ため、判定は等価比較ではなく包含判定とし、`CORS_ORIGINS="https://app.example.com,*"` のようなワイルドカード混在設定も対象とした。回帰テストを6件追加。注: `versions/v0.3` / `versions/v0.4` / `versions/v0.5` にも同一の欠陥があるが、Dependabot Alert Policy に従い修正対象外（`versions/` レイアウトは廃止予定）
- **[SECURITY] フロントエンド依存関係を更新し Dependabot アラートを解消**（#32）: `react-router-dom` を 7.17.0 → 7.18.2 に更新してアラート [#192](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/192) / [#204](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/204) / [#210](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/210) / [#212](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/212)（XSS、ルートマッチング DoS、コンストラクタインジェクション、オープンリダイレクト）を解消。あわせて推移的な開発依存 `js-yaml` 4.2.0 → 4.3.0（アラート [#199](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/199)）と `brace-expansion` → 1.1.16 / 5.0.8（アラート [#186](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/186)、いずれも CPU 消費型 DoS）を更新し、`postcss` も 8.5.15 → 8.5.24 に先行更新（GHSA-r28c-9q8g-f849、任意 `.map` ファイル漏えい）。アラート [#200](https://github.com/elvezjp/coding-policy-ai-auditor/security/dependabot/200)（GHSA-qwww-vcr4-c8h2、RSC モードの CSRF）は unstable RSC API 未使用かつ 7.x 系修正版が存在しないため「該当機能未使用」として dismiss

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
| 0.5.1      | Path Traversal 脆弱性の修正、excel2md subtree を v2.1.1 に更新 |
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
| excel2md subtree バージョン | v2.1.1 | v2.0 | v2.0 | v2.0 | - |

**凡例**: ✅ 実装済み / ⚠️ 問題あり / ❌ 未実装
