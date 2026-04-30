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
| `versions/v0.5/frontend/package-lock.json`, `versions/v0.5/backend/uv.lock` | 8 件 | 修正（依存更新 PR を別途起票） |
| `versions/v0.4/...` | 9 件 | Dismiss（reason: `inaccurate` または `tolerable_risk`、コメントで本方針を引用） |
| `versions/v0.3/...` | 10 件 | Dismiss（同上） |
| `excel2md/uv.lock`（git subtree） | 2 件 | Dismiss（reason: `inaccurate`、subtree 上流で管理） |

#### Phase 2 の留意点

- Dismiss は本 issue のリンクをコメントに残し、判断根拠を辿れるようにする
- v0.5 修正は `vite` のメジャー更新で `vite/rollup/picomatch` がまとめて解消できる可能性が高い。`flatted`, `minimatch` は eslint 系の間接依存のため `eslint` 更新で連動する見込み。`backend` 側は `python-dotenv` 単体更新
- 修正は **別 PR / 別 issue** を起票してから実施。本計画書の対象外

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
