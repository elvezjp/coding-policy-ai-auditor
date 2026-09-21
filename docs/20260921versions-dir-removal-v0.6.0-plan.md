# `versions/` ディレクトリ廃止と v0.6.0 ルート構成移行 計画書

作成日: 2026-09-21

## 1. 背景・目的

これまで本リポジトリは、`versions/` ディレクトリに全バージョン（v0.3 / v0.4 / v0.5 / v0.5.1）のスナップショットを実体として保持し、自社ツール（`add-line-numbers/`、`excel2md/`）もリポジトリ直下に git subtree で取り込んできた。

この構成には以下の問題がある。

- Dependabot アラートが旧バージョン・subtree の lockfile ごとに重複通知される（#24）。現在リポジトリ内の依存マニフェストは 19 ファイルあり、実際に保守しているのはそのうち `versions/v0.5.1/` 配下の 4 ファイルのみ
- セキュリティ修正のたびに「旧バージョンにも同一の欠陥があるが対象外」というトリアージと CHANGELOG 注記が発生している（0.6.0 だけでパストラバーサル・CORS・依存のタグ固定の 3 件）
- #35 で `add-line-numbers` をタグ指定の git 依存に切り替えたが、`versions/v0.3` / `v0.4` / `v0.5` が同梱ディレクトリへのローカルパス参照のまま残っているため、`add-line-numbers/` を削除できず、サプライチェーン是正（CWE-829）が完了していない（#24）
- `excel2md` だけが依存管理の外にあり、`sys.path` への動的注入で同梱の `excel2md/v2.1.1` を読み込んでいる（#26）。上流は v2.3.0 まで進んでおり、2 マイナー遅れている
- 新バージョン追加のたびに `versions/<version>/` を丸ごとコピーする運用コストが大きい

本計画では `versions/` ディレクトリと subtree を廃止し、**最新コードのみをルート直下で保持する構成**へ移行する。先行して同じ対応を完了した AIレビュアー（[spec-code-ai-reviewer PR #122](https://github.com/elvezjp/spec-code-ai-reviewer/pull/122)）の方式に揃える。移行後は次の運用とする。

- main ブランチには次バージョンの変更を未リリースとして蓄積する（CHANGELOG の `[0.6.0] - Unreleased` セクション。現行運用のまま）
- リリース時に `pyproject.toml` 等のバージョンを確定し、CONTRIBUTING のタグ運用ルールに従って annotated tag（`vX.Y.Z`）を打つ
- 旧構成（`versions/` ディレクトリ時代）のバージョンを利用したい場合は、既存の **`v0.5.1` タグ**を checkout する。このタグには `versions/` の全スナップショット（v0.3〜v0.5.1）と subtree 一式が含まれるため、旧バージョンごとの tag は新規作成しない（code2map / md2map / AIレビュアーと同方式）
- 本移行は開発中の **v0.6.0** に含める

### 関連 Issue

| Issue | 内容 | 本計画での扱い |
| --- | --- | --- |
| #24 | `versions/` 廃止・依存ライブラリの uv 管理への移行 | 本計画の中核。`versions/` 削除・subtree 削除。旧構成は `v0.5.1` タグで参照。Issue 本文の「各バージョンに対応する git tag を作成する」は実施しない（同 Issue コメントの方針どおり） |
| #26 | 外部依存の取り込み方式統一 | `add-line-numbers` の git 化は #35 で完了済み。残る `excel2md` を PyPI 版へ移行し、両 subtree ディレクトリを削除 |

本計画の PR で #24 / #26 をクローズする。

## 2. 移行後のディレクトリ構成

`versions/v0.5.1/` の内容をルートに昇格させ、以下の構成とする。

```
coding-policy-ai-auditor/
├── .github/
│   └── workflows/
│       └── ci.yml                  # working-directory を backend/ / frontend/ に変更
├── backend/                        # ← versions/v0.5.1/backend を昇格
│   ├── app/
│   ├── tests/
│   ├── .env.example
│   ├── README.md
│   ├── pyproject.toml              # version = "0.6.0"、excel2md を依存に追加
│   └── uv.lock
├── frontend/                       # ← versions/v0.5.1/frontend を昇格
│   ├── src/
│   ├── package.json                # version = "0.6.0"
│   └── ...
├── docs/
│   ├── spec.md                     # ← versions/v0.5.1/spec.md を移動
│   ├── config-file-generator-spec.md  # ← versions/v0.5.1/ から移動
│   ├── design.md                   # ← versions/v0.5.1/README.md（開発者向け設計ドキュメント）を移動
│   ├── ai-auditor-format/ / assets/ / samples/
│   └── （既存の計画書類）
├── CHANGELOG.md / CHANGELOG_ja.md
├── README.md / README_ja.md
├── CONTRIBUTING.md / CONTRIBUTING_ja.md
├── SECURITY.md / SECURITY_ja.md
└── LICENSE
```

**なくなるもの**: `versions/`（`versions/README.md` 含む）、subtree 2 ディレクトリ（`add-line-numbers/`、`excel2md/`）、フロントエンドの未使用のバージョン切替コード（`VersionSelector` / `useVersions` / `VersionInfo`）。

> **AIレビュアーとの差分**: 本リポジトリには `nginx/`、Docker 関連ファイル、PM2 設定（`ecosystem.config.js`）、`latest` シンボリックリンク、`scripts/sync_version.py` がもともと存在しない。また `VersionSelector` / `useVersions` は `core/index.ts` から export されているだけで画面からは使われていない。このため AIレビュアーのフェーズ 1（インフラ一式の廃止と UI 改修）に相当する作業は、未使用コードの削除のみとなる。

## 3. 削除対象の一覧

### 3.1 ディレクトリ

| 対象 | 規模 | 理由 | 前提条件 |
| --- | --- | --- | --- |
| `versions/v0.3/` `versions/v0.4/` `versions/v0.5/` | 478 ファイル | 旧構成は既存の `v0.5.1` タグの checkout で参照可能 | README に `v0.5.1` checkout の案内を記載 |
| `versions/README.md` | 1 ファイル | バージョン管理方針（丸ごとコピー運用）が廃止される。バージョン比較表・更新履歴は CHANGELOG（「バージョン比較」セクションを含む）に同等の情報がある | CHANGELOG のバージョン比較表に不足がないことを確認（不足があれば追記） |
| `add-line-numbers/` | 8 ファイル | v0.5.1 は #35 で git ソース（`tag = "v0.1.3"`）取得に移行済み。実体を参照しているのは旧バージョン（v0.3〜v0.5）の path 参照のみ | `versions/` 旧バージョンの削除とセット |
| `excel2md/` | 149 ファイル | PyPI 公開済み（v2.3.0）。`sys.path` 注入を撤去し依存宣言に移行（#26） | フェーズ 2 のコード修正とセット |

> **補足**: v0.3〜v0.5 の `pyproject.toml` は `[tool.uv.sources]` で `path = "../../../add-line-numbers"` を参照している。`v0.5.1` タグには `versions/` 全体と subtree 一式が含まれるため、タグを checkout すれば全旧バージョンが従来どおり動作する。

### 3.2 フロントエンドの未使用バージョン切替コード

| 対象 | 内容 |
| --- | --- |
| `frontend/src/core/hooks/useVersions.ts` | フックごと削除。`DEFAULT_VERSIONS` は `v0.6.0` / `v0.5.2` など実在しないバージョンを含む AIレビュアー由来の残骸 |
| `frontend/src/core/components/shared/VersionSelector.tsx` | コンポーネントごと削除 |
| `frontend/src/core/index.ts` | `VersionSelector`（33 行目）、`useVersions` / `DEFAULT_VERSIONS`（47 行目）の export を削除 |
| `frontend/src/core/types/index.ts` | `VersionInfo` 型（62 行目付近）を削除（上記 2 ファイル以外から未参照） |

`features/auditor/` からの利用箇所およびテストは存在しないため、画面・テストへの影響はない。設定モーダルのバージョン表示は `APP_INFO`（`features/auditor/index.tsx`）のままとする。

## 4. 実装修正が必要な箇所

### 4.1 バックエンド（#26: excel2md の PyPI 移行）

| ファイル | 修正内容 |
| --- | --- |
| `backend/pyproject.toml` | `dependencies` に `"excel2md>=2.2.1"` を追加（PyPI 公開済みのため `[tool.uv.sources]` への追記は不要。下限は AIレビュアーに揃える。lock 上は 2.3.0 に解決される見込み）。`version` を `0.6.0` に更新 |
| `backend/app/markdown_tools/excel2md_tool.py` | `_DEFAULT_EXCEL2MD_PATH` / `EXCEL2MD_PATH` 環境変数 / `sys.path.insert` による動的注入と `sys.path` の復元処理を撤去し、`from excel2md.cli import build_argparser` / `from excel2md.runner import run` の通常 import に変更。`safe_filename()` によるサニタイズは維持 |
| `backend/app/markdown_tools/excel2md_mermaid_tool.py` | 同上（`EXCEL2MD_PATH` の import と `sys.path` 操作を撤去） |
| `backend/tests/test_excel2md_tool.py` / `test_excel2md_mermaid_tool.py` | 変更不要の見込み（AIレビュアーの移行前後でテストは無変更。本リポジトリのテストは AIレビュアーの移行前と同一内容） |
| `backend/uv.lock` | `uv lock` で再生成 |

本リポジトリの 2 ファイルは、AIレビュアーの移行前コードと `safe_filename` の追加・`preprocess_for_organize()` の有無（本リポジトリには無い）を除いて同一である。AIレビュアーの移行コミット（`5fc1d63`）の差分をそのまま適用できる。`build_argparser` / `run` は PyPI 版に同一シグネチャで存在することを AIレビュアー側で確認済み。

なお `_DEFAULT_EXCEL2MD_PATH` はディレクトリ階層（`versions/vX.Y.Z/backend/...` から 6 階層上）に依存しているため、ルート昇格だけでもパスが壊れる。**ルート昇格（フェーズ 3）より先に対応する。**

### 4.2 バージョン表記（0.5.1 → 0.6.0）

| ファイル | 箇所 |
| --- | --- |
| `backend/pyproject.toml` | `version = "0.5.1"`（`uv.lock` も追従） |
| `frontend/package.json` / `package-lock.json` | `"version": "0.5.1"` |
| `frontend/src/features/auditor/index.tsx` | `APP_INFO.version: 'v0.5.1'`（35 行目） |
| `frontend/src/features/config-file-generator/schema/configSchema.ts` | `version: 'v0.5.1'`（7 行目）、`value: 'v0.5.1'`（20 行目） |
| `docs/spec.md`（移動後） | 冒頭のバージョン表（5 行目）、画面例（419 行目付近） |

バージョン文字列を期待値に持つテストがあれば追従させる。

### 4.3 CI

| ファイル | 修正内容 |
| --- | --- |
| `.github/workflows/ci.yml` | `working-directory` を `versions/v0.5.1/backend` → `backend`、`versions/v0.5.1/frontend` → `frontend` に変更 |

### 4.4 ドキュメント

| ファイル | 修正内容 |
| --- | --- |
| `README.md` / `README_ja.md` | セットアップ・実行例の `cd versions/v0.5.1/...`（70 / 80 / 118 / 121 行目付近）をルートパスに変更。「Directory Structure」（137 行目〜）を新構成に書き換え。「Documentation」の仕様書リンク（230 行目）を `docs/spec.md` に変更し `docs/design.md` を追加。「Dependabot Alert Policy」（244 行目〜）から旧バージョン・subtree の行と前提説明を削除し、単一バージョン構成向けに書き換え。**旧構成のバージョンを利用したい場合は `git checkout v0.5.1` で取得する**旨と注意書き（6 章参照）、自社ツールのソースを参照したい場合は各上流リポジトリを clone する旨を追記 |
| `CONTRIBUTING.md` / `CONTRIBUTING_ja.md` | `cd versions/v0.5.1/...`（45 / 52 / 90 / 102 行目付近）をルートパスに更新。「バージョン管理」の「最新バージョン（`versions/v0.5.1/`）に焦点を当てる」（162 行目）を削除または書き換え。タグ運用ルールは現行のまま |
| `SECURITY.md` / `SECURITY_ja.md` | Dependabot 運用方針（134〜145 行目付近）の「旧バージョン（`versions/`）は Dismiss」「git subtree ディレクトリ」の記述を、単一バージョン + git tag 構成に合わせて書き換え。サポート対象バージョンの表を確認 |
| `CHANGELOG.md` / `CHANGELOG_ja.md` | `[0.6.0] - Unreleased` に本移行（`versions/`・subtree 廃止、excel2md の PyPI 移行、未使用バージョン切替コードの削除）を追記。同セクション内の既存エントリにある `versions/v0.5.1/backend/...` のパス表記をルート構成に更新し、「`versions/` layout is scheduled for removal」の注記を「本リリースで削除」に合わせて整理。リリース済みバージョン（0.5.1 以前）のエントリは変更しない |
| `docs/spec.md`（移動後） | バージョン表記の更新（4.2）。ディレクトリ構成の記述に `versions/` 前提があれば更新。バージョン切替 UI の章は本リポジトリの spec には存在しない |
| `docs/design.md`（移動後） | 「v0.5.1 リリースノート」セクション（CHANGELOG と重複）を削除。「ディレクトリ構造」を新構成に更新。`../../CHANGELOG.md` 等の相対リンクを修正 |
| `backend/README.md` | 「Python: 3.10+」を `pyproject.toml`（`>=3.11`）に合わせて修正 |
| `docs/` の過去の計画書 | 当時の記録のため変更しない（`versions/v0.5.1/...` への言及は残る） |

## 5. 移行フェーズ

変更差分が大きくなるため、PR を以下の 4 本に分割し、番号順にマージする。各 PR 内ではフェーズ・作業単位でコミットを分ける。

| PR | 範囲 | マージ後の main の状態 |
| --- | --- | --- |
| PR 1 | 本計画書 + フェーズ 1〜2 | `versions/v0.5.1/` 構成のまま。excel2md は PyPI 依存で動作 |
| PR 2 | フェーズ 3 | ルート構成（`backend/` / `frontend/`）。CI もルート構成。subtree は未参照のまま残存 |
| PR 3 | フェーズ 4 | subtree 削除済み |
| PR 4 | フェーズ 5 | ドキュメント整備済み。#24 / #26 をクローズ |

- 後続 PR のブランチは直前の PR のブランチから作成する（積み上げ構成）。差分を見やすくするため、後続 PR の base は直前の PR のブランチとし、直前の PR のマージ後に main へ付け替える
- CI は `main` 向けの PR でのみ起動するため、後続 PR は main への付け替え後に CI を実行し、グリーンを確認してからマージする
- 積み上げ構成を保つため、マージはマージコミット方式（squash しない）で行う。squash した場合は後続ブランチを main へ rebase する
- CHANGELOG は各 PR で自身の変更分を `[0.6.0] - Unreleased` に追記する。既存エントリのパス表記の整理は PR 4 で行う
- PR 2 のマージから PR 4 のマージまでの間、README / CONTRIBUTING 等の手順は旧パス（`versions/v0.5.1/...`）のままとなる。間を空けずにマージする

### フェーズ 0: 旧構成への到達性の確認

旧バージョンごとの git tag は**新規作成しない**。

1. `v0.5.1` タグ（annotated、`4da8b66`、2026-06-01）のツリーに `versions/v0.3` / `v0.4` / `v0.5` / `v0.5.1`、`add-line-numbers/`、`excel2md/` がすべて含まれていることを確認する（確認済み）
2. README に旧構成の取得方法を記載する（フェーズ 5 に含める）

### フェーズ 1: 未使用のバージョン切替コードの削除

- セクション 3.2 の削除を実施
- `npm run test:run` / `npm run build`（`tsc -b` を含む）が通ることを確認

### フェーズ 2: excel2md の PyPI 移行（#26）

- セクション 4.1 を `versions/v0.5.1/backend/` に対して実施（この時点ではまだ昇格しない）
- `uv lock` → `uv sync --all-extras` → `uv run pytest` が通ることを確認
- 実ファイル（`docs/ai-auditor-format/` のサンプル規約 Excel）で excel2md / excel2md-mermaid の変換結果を移行前後で比較する（v2.1.1 → v2.3.0 の出力差分の有無を確認）

### フェーズ 3: v0.5.1 のルート昇格と旧バージョン削除（#24）

1. `git mv versions/v0.5.1/backend backend`、`git mv versions/v0.5.1/frontend frontend`（履歴追跡のため `git mv` を使用）
2. `versions/v0.5.1/spec.md` / `config-file-generator-spec.md` を `docs/` へ、`versions/v0.5.1/README.md` を `docs/design.md` へ `git mv`
3. `versions/`（v0.3 / v0.4 / v0.5 と `README.md`）を削除
4. バージョンを 0.6.0 に更新（4.2）、`uv lock` と `npm install --package-lock-only` で lockfile を追従
5. CI の `working-directory` を更新（4.3）
6. ルートで `uv sync --all-extras` / `uv run pytest`、`npm ci` / `npm run test:run` / `npm run build` が通ることを確認

移動（rename のみ）と修正（差分あり）はコミットを分け、レビューしやすくする。

### フェーズ 4: subtree ディレクトリの削除（#24 / #26）

1. `add-line-numbers/`、`excel2md/` を `git rm -r` で削除
2. 削除後に `uv sync` をやり直し、バックエンドテストが通ること（同梱ディレクトリに暗黙依存していないこと）を確認

### フェーズ 5: ドキュメント整備

1. セクション 4.4 のドキュメント更新
2. `git grep -n -E 'versions/|subtree|EXCEL2MD_PATH'` で取りこぼしを確認（CHANGELOG のリリース済みエントリと過去の計画書は対象外）

### マージ後

- Dependabot: `versions/` と subtree の manifest 消滅により、重複アラートは自動クローズされる見込み。残存アラートは SECURITY.md の新方針で運用
- v0.6.0 リリース時: CHANGELOG の `[0.6.0] - Unreleased` を日付で確定 → バージョン表記を確認 → annotated tag `v0.6.0` を作成・push

## 6. リスク・留意点

| リスク | 対応 |
| --- | --- |
| `v0.5.1` タグの削除・付け替えにより旧構成へ到達できなくなる | `v0.5.1` タグを旧構成アーカイブの参照点として位置づけ、削除・付け替えを行わない運用を README に明記 |
| `v0.5.1` タグは 0.6.0 のセキュリティ修正（パストラバーサル GHSA-ghvr-jjv7-mx45、CORS #33、依存のタグ固定 #35 ほか、タグ以降 24 コミット分）を含まない | README の旧構成案内に「`v0.5.1` タグ配下のコードは既知の脆弱性を含む凍結スナップショットであり、参照・検証用途に限る。利用には最新版を使うこと」を明記 |
| excel2md v2.1.1 → v2.3.0 で変換出力が変わる | フェーズ 2 で既存テストに加え、サンプル Excel の変換結果を移行前後で比較。差分があれば内容を確認し CHANGELOG に記載 |
| ルート昇格により `_DEFAULT_EXCEL2MD_PATH` の相対階層が壊れる | フェーズ 2（excel2md 移行）をフェーズ 3（昇格）より先に実施 |
| `git mv` による大規模移動で PR レビューが困難になる | フェーズごと、かつ移動と修正でコミットを分ける |
| `EXCEL2MD_PATH` 環境変数で同梱外の excel2md を指定していた利用者がいる | 環境変数は廃止。CHANGELOG に破壊的変更として記載 |
| Windows / macOS の CI でのみ失敗する | CI マトリクス（3 OS × Python 3.11/3.13、Node 20/24）が PR 上でグリーンになることをマージ条件とする |

### 試験項目表について

AIレビュアーでは移行の試験項目表と確認結果を `docs/tests/` に追加したが、本リポジトリは `.gitignore` で `docs/tests/*` を除外している（内部文書扱い）。試験項目表を作成する場合はローカル管理とし、確認結果の要約を PR 本文に記載する。

## 7. 受け入れ条件

- [ ] `git checkout v0.5.1` で旧構成（`versions/` + subtree 一式）が取得でき、その手順と注意書きが README に記載されている
- [ ] ルート直下の `backend/` / `frontend/` で開発・テスト・起動が完結する（`uv run pytest` / `npm run test:run` / `npm run build` がパス）
- [ ] `versions/`、`add-line-numbers/`、`excel2md/` がリポジトリから削除されている
- [ ] excel2md が PyPI 依存（`excel2md>=2.2.1`）で動作し、`sys.path` 注入・`EXCEL2MD_PATH` が撤去されている
- [ ] `VersionSelector` / `useVersions` / `VersionInfo` が削除され、設定モーダルのバージョン表示が `v0.6.0` になっている
- [ ] バージョン表記が 0.6.0 に統一されている（pyproject.toml / package.json / APP_INFO / configSchema / spec.md）
- [ ] CI がルート構成でグリーン
- [ ] README / CONTRIBUTING / SECURITY / spec.md / design.md が新構成・新運用に更新されている
- [ ] CHANGELOG の `[0.6.0] - Unreleased` に本移行が記録されている
- [ ] リポジトリ内の依存マニフェストが `backend/pyproject.toml` / `backend/uv.lock` / `frontend/package.json` / `frontend/package-lock.json` の 4 ファイルのみになっている
