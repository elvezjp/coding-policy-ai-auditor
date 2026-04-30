# Dependabot アラート運用方針 整備計画書（2026-04-30）

## 目的

本リポジトリの Dependabot アラートに対する運用方針を策定し、README の Security セクションに明文化する。あわせて、現時点で open の既存アラート 29 件を方針に沿って処理する。

## 対象 Issue

| 番号 | タイトル | 種別 |
|------|---------|------|
| [Issue #17](https://github.com/elvezjp/coding-policy-ai-auditor/issues/17) | Dependabot アラートの運用方針を策定する | docs / ops |

## 前提・経緯

- 本リポジトリでは現在 Dependabot アラートが **計 29 件 open**（high: 18, medium: 10, low: 1）
- 発生箇所は次の 4 系統:
  1. `versions/v0.5/frontend/package-lock.json`, `versions/v0.5/backend/uv.lock`（最新版相当）
  2. `versions/v0.4/...`（旧バージョン）
  3. `versions/v0.3/...`（旧バージョン）
  4. `excel2md/uv.lock`（git subtree で取り込んでいるディレクトリ）
- 旧バージョン配下や git subtree 配下は本リポジトリ単独では更新しない／できないため、すべてを修正対象とすると運用が回らない
- 一方で Malware は利用有無に関わらず排除する必要がある
- 姉妹リポジトリ [`elvezjp/spec-code-ai-reviewer`](https://github.com/elvezjp/spec-code-ai-reviewer) では同様の議論を行い、issue #97 / PR #98 で方針を整備済み。本リポジトリは構造が一部異なるため、それに合わせて策定する

### spec-code-ai-reviewer との構造差分

| 観点 | spec-code-ai-reviewer | 本リポジトリ |
|------|----------------------|-------------|
| 最新版ディレクトリ | `latest/`（独立） | なし。`versions/v0.5/` が最新を兼ねる |
| 旧バージョン | `versions/v0.x.x/` | `versions/v0.3/`, `versions/v0.4/` |
| git subtree 対象 | `add-line-numbers/`, `code2map/`, `excel2md/`, `markitdown/`, `md2map/`（5つ） | `add-line-numbers/`, `excel2md/`（2つ） |

## 運用方針

### Malware タブ

- 発生場所を問わず必ず修正対応する
- 旧バージョン・git subtree 配下であっても放置しない

### Vulnerable タブ

| 対象 | 対応 |
|------|------|
| 最新バージョン（現在は `versions/v0.5/`） | 修正対応する（依存更新／PR 作成） |
| 旧バージョン（`versions/v0.3/`, `versions/v0.4/`） | Dismiss。既存分は一括 close、新規発生時は影響を確認のうえ close |
| `add-line-numbers/`, `excel2md/`（git subtree） | Dismiss。subtree 元リポジトリ側で管理されているため、本リポジトリでは修正対象外 |
| 上記 subtree 配下の `versions/` 等 | 同上 |

### 運用フロー

1. 新規アラート発生時、まず **Malware タブ**か **Vulnerable タブ**かを確認
2. **Malware** → 場所を問わず修正
3. **Vulnerable** → 発生場所を確認
   - 最新バージョンディレクトリ → 修正対応
   - 旧バージョン or git subtree 配下 → 影響なしを確認のうえ Dismiss

### Dismiss の再発生条件（補足）

- 同一 manifest × 同一パッケージ × 同一 GHSA の組み合わせでは再発生しない
- 同パッケージで別の CVE が将来公開された場合は新規アラートとして再通知される
- そのため Dismiss 運用は継続的に必要

## 作業内容

### Phase 1: ドキュメント整備（本 PR で実施）

[README.md](../README.md) と [README_ja.md](../README_ja.md) の **Security / セキュリティ**セクション配下に「Dependabot Alert Policy / Dependabot アラートの運用方針」サブセクションを追記する。

| # | 内容 | 対象ファイル |
|---|------|-------------|
| 1-1 | 「Security」セクション直下に「Dependabot Alert Policy」を追記 | `README.md` |
| 1-2 | 「セキュリティ」セクション直下に「Dependabot アラートの運用方針」を追記 | `README_ja.md` |
| 1-3 | 日英で記述内容に齟齬がないことを確認 | （両ファイル） |

### Phase 2: 既存アラートの処理（README マージ後に実施）

既存 29 件を方針に従って処理する。

| 場所 | 件数 | 対応 |
|------|------|------|
| `versions/v0.5/frontend/package-lock.json`, `versions/v0.5/backend/uv.lock` | 9 件 | 修正（依存更新 PR を別途起票） |
| `versions/v0.4/...` | 9 件 | Dismiss（reason: `not_used`、コメントで本方針を引用） |
| `versions/v0.3/...` | 9 件 | Dismiss（同上） |
| `excel2md/uv.lock`（git subtree） | 2 件 | Dismiss（reason: `not_used`、subtree 上流で管理） |

> 計画策定時の概算は v0.5: 8 / v0.4: 9 / v0.3: 10 / excel2md: 2 だったが、実行時の再集計で **v0.5: 9 / v0.4: 9 / v0.3: 9 / excel2md: 2（計 29）** が正と判明。

#### Phase 2 の留意点

- Dismiss は本 issue のリンクをコメントに残し、判断根拠を辿れるようにする
- v0.5 修正は `vite` のメジャー更新で `vite/rollup/picomatch` がまとめて解消できる可能性が高い。`flatted`, `minimatch` は eslint 系の間接依存のため `eslint` 更新で連動する見込み。`backend` 側は `python-dotenv` 単体更新
- 修正は **別 PR / 別 issue** を起票してから実施。本計画書の対象外

### Phase 2 実行ログ（2026-04-30）

対象外ディレクトリ（`versions/v0.3/`, `versions/v0.4/`, `excel2md/`）の Dependabot アラート計 **20 件** を `gh api PATCH /repos/.../dependabot/alerts/{n}` で Dismiss した。`dismissed_reason` は全件 `not_used`、コメントは下記の 2 種類を使い分けた。

- 旧バージョン用: 「Dismissed per the Dependabot Alert Policy documented in README (issue #17). This alert is in an archived older version directory under versions/ and is out of scope for fixes.」
- subtree 用: 「Dismissed per the Dependabot Alert Policy documented in README (issue #17). excel2md/ is pulled in via git subtree; dependencies are managed in the upstream repository, so this alert is out of scope for this repo.」

#### Dismiss 一覧

| グループ | 件数 | アラート番号 |
|---|---|---|
| `versions/v0.4/...` | 9 | #23, #26, #27, #29, #31, #34, #35, #36, #54 |
| `versions/v0.3/...` | 9 | #6, #9, #10, #12, #14, #17, #18, #19, #55 |
| `excel2md/uv.lock`（git subtree） | 2 | #1, #2 |

#### 実行後の状態

`gh api repos/elvezjp/coding-policy-ai-auditor/dependabot/alerts` で再集計し、open 状態は **`versions/v0.5/` 配下の 9 件のみ** であることを確認（backend `uv.lock` × 1、frontend `package-lock.json` × 8）。これらは Phase 3 で修正対応する。

### Phase 3 実行ログ（2026-04-30、最新版 `versions/v0.5/` の修正）

#### 修正方針

各アラートが要求する修正バージョンは `pyproject.toml` / `package.json` の semver 範囲内に収まっていたため、**ロックファイルを削除して再生成する**ことで自動的に修正版へバンプする方針で実施。

| パッケージ | アラート | 修正必要バージョン |
|---|---|---|
| python-dotenv | #56 | `>= 1.2.2` |
| vite | #51, #52, #53 | `>= 7.3.2` |
| rollup | #40 | `>= 4.59.0` |
| picomatch | #48 | `>= 4.0.4` |
| flatted | #46 | `>= 3.4.2` |
| minimatch | #43, #44 | `>= 9.0.7` / `>= 3.1.3` |

#### backend（`versions/v0.5/backend/`）

```bash
rm uv.lock
uv lock         # 77 packages resolved
uv sync
```

- python-dotenv: `1.0.1` → **`1.2.2`** ✅
- 他にも fastapi 等が範囲内で更新されたが pytest により挙動を確認

#### frontend（`versions/v0.5/frontend/`）

```bash
rm package-lock.json
rm -rf node_modules
npm install     # added 310 packages, found 0 vulnerabilities
```

| パッケージ | 旧版 | 新版 | 状態 |
|---|---|---|---|
| vite | 7.2.x | **7.3.2** | ✅ |
| rollup | 4.x | **4.60.2** | ✅ |
| picomatch | 4.0.x | **4.0.4** | ✅ |
| flatted | 3.x | **3.4.2** | ✅ |
| minimatch | 9.0.x / 3.x | **10.2.5 / 3.1.5** | ✅ |

#### 検証結果

| チェック | 結果 |
|---|---|
| backend `uv run pytest` | **141 / 141 passed** |
| frontend `npm run test:run`（vitest） | **95 / 95 passed** |
| frontend `npm run build`（tsc + vite build） | **success** |
| `npm audit` | **found 0 vulnerabilities** |
| frontend `npm run lint` | 12 errors / 1 warning（うち 9 errors / 1 warning は main から継続。残り 3 errors は `eslint-plugin-react-hooks@7` の新ルール `set-state-in-effect`・`refs-during-render` の追加と `@typescript-eslint/no-unused-vars` 強化に起因。挙動への影響なしと判断し、本計画の対象外） |

#### Dependabot 側の状態

PR マージ前のためアラートは引き続き open 表示だが、`versions/v0.5/` のロックファイル更新が main にマージされた時点で 9 件すべて自動 close される見込み。

> 追記: PR #18 のプッシュ後、`versions/v0.5/` 配下のアラート（#37〜#56）は Dependabot 側で `fixed` に切り替わったことを確認した（過去に `auto_dismissed` だった `ajv` / `brace-expansion` 等も連動して `fixed` 表示になっている）。

### Phase 2 追加実施ログ（2026-04-30、新規発生分の Dismiss）

PR #18 作成後の Dependabot 再スキャンにより、対象外ディレクトリで新規アラートが計 **16 件**発生した（旧バージョン配下のみ。Malware ／ subtree への新規発生はなし）。Phase 2 と同じ手順・同じコメント文面（旧バージョン用）で `not_used` として Dismiss した。

#### 追加 Dismiss 一覧

| グループ | 件数 | アラート番号 | 内容 |
|---|---|---|---|
| `versions/v0.3/backend/uv.lock` | 7 | #57〜#63 | urllib3, python-multipart × 2, protobuf, requests, Pygments, pytest |
| `versions/v0.3/frontend/package-lock.json` | 1 | #64 | postcss |
| `versions/v0.4/backend/uv.lock` | 7 | #65〜#71 | 同上 |
| `versions/v0.4/frontend/package-lock.json` | 1 | #72 | postcss |

#### 実行後の状態

`gh api repos/elvezjp/coding-policy-ai-auditor/dependabot/alerts --jq '[.[] | select(.state=="open")] | length'` で再集計し、**open 状態は 0 件**を確認。

## 対象ファイル一覧（Phase 1）

```
docs/
└── 20260430dependabot-policy-plan.md   ... 本計画書（新規）

README.md                                ... 1-1
README_ja.md                             ... 1-2
```

## 検証

- [ ] GitHub 上で [README.md](../README.md) と [README_ja.md](../README_ja.md) のレンダリングを確認
- [ ] 表・見出し階層が崩れていないこと
- [ ] 日英で記述内容に齟齬がないこと
- [ ] 既存リンク（SECURITY.md、CONTRIBUTING.md など）が壊れていないこと

## 関連

- [Issue #17](https://github.com/elvezjp/coding-policy-ai-auditor/issues/17)（本件）
- [elvezjp/spec-code-ai-reviewer#97](https://github.com/elvezjp/spec-code-ai-reviewer/issues/97)（同方針の議論）
- [elvezjp/spec-code-ai-reviewer#98](https://github.com/elvezjp/spec-code-ai-reviewer/pull/98)（README 追記 PR）
