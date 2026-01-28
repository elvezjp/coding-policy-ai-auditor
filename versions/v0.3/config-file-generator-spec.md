# 設定ファイルジェネレーター

**バージョン: 0.3.0**

## 概要

Markdown形式の設定ファイルを生成するための**汎用的な**Reactアプリケーション。
TypeScriptで型安全に実装され、スキーマ定義を差し替えることで様々なアプリケーション向けの設定ファイル生成に対応できる。

現在はcoding-policy-ai-auditor用の設定（`auditor-config.md`）を生成するスキーマが設定されている。

v0.3.0でフロントエンド全体がVite + React + TypeScriptに移行したため、本機能もReactコンポーネントとして再実装された。

## 使い方

1. ブラウザで `/config-file-generator` にアクセス（またはメイン画面の設定モーダルからリンク）
2. 各セクションの項目を入力・編集
3. 「ダウンロード」ボタンをクリック

### 対応プロバイダー

| プロバイダー | 必要な認証情報 |
|-------------|---------------|
| Anthropic | API Key |
| Bedrock | Access Key ID, Secret Access Key, Region |
| OpenAI | API Key |

### 出力ファイル

`auditor-config.md` がダウンロードされる。
このファイルをcoding-policy-ai-auditorにアップロードして利用する。

## カスタマイズ

`frontend/src/features/config-file-generator/schema/configSchema.ts` を編集することで、別のアプリケーション向けの設定ファイル生成に対応できる。

## 背景

ユーザーは `auditor-config.md` ファイルを使用してLLMプロバイダーの認証情報や規約種別を設定する。このファイルを簡単に作成できるツールが必要。

ただし、このツールは coding-policy-ai-auditor 専用ではなく、**汎用的な設定ファイルジェネレーター**として設計し、以下に対応できるようにする：
- 設定ファイル仕様のバージョンアップ
- 別アプリケーションへの転用

## 出力ファイル例

```markdown
# coding-policy-ai-auditor設定ファイル

## info

- version: v0.3.0
- created_at: 2026-01-18T10:30:00+09:00

## llm

- provider: bedrock
- accessKeyId: YOUR_ACCESS_KEY_ID
- secretAccessKey: YOUR_SECRET_ACCESS_KEY
- region: ap-northeast-1
- maxTokens: 10000
- models:
  - global.anthropic.claude-haiku-4-5-20251001-v1:0
  - global.anthropic.claude-sonnet-4-5-20250929-v1:0
  - apac.amazon.nova-pro-v1:0
  - apac.amazon.nova-micro-v1:0

## specTypes

| type | note |
|------|------|
| コーディング規約 | コードがこの規約に準拠しているかを確認してください |
| ... | ... |

## systemPrompts

### 標準監査プリセット

#### role

あなたはコーディング規約の監査を行う専門家です。コードの品質と保守性を重視します。

#### purpose

提供されるコーディング規約に基づいてプログラムコードを監査し、違反箇所を特定してください。

各違反について、以下の情報を提供してください：
1. 行番号
2. 違反内容の説明（具体的な問題点を明記）
3. 修正案（具体的なコード例を含む）
4. 重要度（明確な違反の場合は「NG」、判断が難しい場合は「要確認」）

#### format

マークダウン形式で、以下の順に出力してください：
1. サマリー（監査日時、ファイル名、総合判定）
2. 監査結果一覧（テーブル形式：行番号、違反内容、重要度）
3. 詳細（違反箇所の説明と修正案）

#### notes

- メイン規約の内容に基づいて監査してください。
- 判定は「OK」「NG」「要確認」の3段階で行ってください。
- 軽微な違反も見逃さないでください。
- 重要度が高い問題を優先して報告してください。
- 規約を引用する際は、見出し番号や項目番号を明示してください。
- プログラムを引用する際は、行番号を必ず添えてください。
- 各規約の冒頭に記載されている役割、種別、注意事項を考慮してください。
- メイン以外の規約は必要な場合に参照してください。
- 静的解析結果は参考情報として利用してください。監査は規約の内容に基づいて実行してください。
```

## 画面イメージ

```
┌──────────────────────────────────────────────────────────────┐
│  設定ファイルジェネレーター                          v0.3.0  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  コーディング規約-Javaプログラム AIオーディター 設定ファイル   │
│  を作成します。各項目を入力して「ダウンロード」ボタンを押し  │
│  てください。                                                 │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ ■ info（設定ファイル情報）                                    │
│                                                               │
│   version:    v0.3.0（固定）                                  │
│   created_at: ダウンロード時に自動生成                        │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ ■ llm（LLMプロバイダー設定）                                  │
│                                                               │
│   プロバイダー: ( ) Anthropic  (●) Bedrock  ( ) OpenAI       │
│                                                               │
│   ┌─────────────────────────────────────────────────────┐    │
│   │ ⚠ 注意                                               │    │
│   │ • モデルIDにはリージョンプレフィックスが必要です     │    │
│   │ • モデルによって出力トークン上限が異なります         │    │
│   └─────────────────────────────────────────────────────┘    │
│                                                               │
│   Access Key ID:     [________________________]               │
│   Secret Access Key: [________________________]               │
│   Region:            [ap-northeast-1__________]               │
│   Max Tokens:        [10000___________________]               │
│                                                               │
│   モデル:                                                     │
│   [global.anthropic.claude-haiku-4-5-20251001-v1:0] [×]      │
│   [global.anthropic.claude-sonnet-4-5-20250929-v1:0] [×]     │
│   [apac.amazon.nova-pro-v1:0                       ] [×]     │
│   [apac.amazon.nova-micro-v1:0                     ] [×]     │
│   [+ モデルを追加]                                            │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ ■ specTypes（規約種別）                                       │
│   ┌────────────────────┬──────────────────────────────┬──┐   │
│   │ 種別                │ 注意事項                      │   │   │
│   ├────────────────────┼──────────────────────────────┼──┤   │
│   │ コーディング規約    │ コードがこの規約に...         │ × │   │
│   │ ネーミングルール    │ 命名規則に従っている...       │ × │   │
│   │ ...                 │ ...                           │ × │   │
│   └────────────────────┴──────────────────────────────┴──┘   │
│   [+ 行を追加]                                                │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│ ■ systemPrompts（システムプロンプト）                         │
│                                                               │
│   ┌─ 標準監査プリセット ───────────────────────────[×]─┐     │
│   │ プリセット名: [標準監査プリセット_______________]   │     │
│   │ 役割:        [あなたはコーディング規約の...______]   │     │
│   │ 目的:        [提供されるコーディング規約に...    ]   │     │
│   │ フォーマット: [マークダウン形式で、以下の順に...   ]   │     │
│   │ 注意事項:    [- メイン規約の内容に基づいて...    ]   │     │
│   └────────────────────────────────────────────────────┘     │
│   [+ プリセットを追加]                                        │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│                   [📥 auditor-config.md をダウンロード]       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## 設計方針

### アーキテクチャ

v0.3.0ではReact + TypeScriptで実装され、以下の構成となる。

```
frontend/src/features/config-file-generator/
├── index.tsx                    # メインコンポーネント
├── schema/
│   └── configSchema.ts          # スキーマ定義（差し替え可能）
├── types/
│   └── index.ts                 # TypeScript型定義
├── hooks/
│   ├── useConfigState.ts        # フォーム状態管理
│   └── useValidation.ts         # バリデーション
├── components/
│   ├── InfoSection.tsx          # info セクション
│   ├── LlmSection.tsx           # LLM設定セクション
│   ├── ProviderSelector.tsx     # プロバイダー選択
│   ├── DynamicFieldArray.tsx    # 動的配列フィールド
│   ├── SpecTypesTable.tsx       # 規約種別テーブル
│   ├── SystemPromptsSection.tsx # システムプロンプトセクション
│   └── DownloadButton.tsx       # ダウンロードボタン
└── services/
    └── markdownGenerator.ts     # Markdown生成・ダウンロード
```

```
┌─────────────────────────────────────────────────────────────┐
│                ConfigFileGenerator (React)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                 hooks/useConfigState                    │ │
│  │  - フォーム状態管理（useState/useReducer）              │ │
│  │  - プロバイダー切替、フィールド更新                      │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                 hooks/useValidation                     │ │
│  │  - スキーマに基づくバリデーション                        │ │
│  │  - 必須チェック、型チェック                              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │             services/markdownGenerator                  │ │
│  │  - フォーム状態からMarkdown生成                          │ │
│  │  - ファイルダウンロード処理                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↑                                  │
│                    スキーマ定義を読み込み                      │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           schema/configSchema.ts (差し替え可能)         │ │
│  │  - 出力タイトル、バージョン                               │ │
│  │  - セクション定義（フィールド、型、デフォルト値）          │ │
│  │  - TypeScript型による型安全性                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### スキーマ定義仕様

`configSchema.ts` でTypeScriptオブジェクトとしてスキーマを定義する。スキーマを差し替えるだけで別の設定ファイル形式に対応可能。

アプリケーションのバージョン更新時は、スキーマのバージョン番号も更新する。

```typescript
import type { ConfigSchema } from '../types'

export const CONFIG_SCHEMA: ConfigSchema = {
  // メタ情報
  meta: {
    outputTitle: 'コーディング規約-Javaプログラム AIオーディター 設定ファイル',
    outputFileName: 'auditor-config.md',
    version: 'v0.3.0',
  },

  // セクション定義（配列順にUIに表示）
  sections: [
    {
      id: 'info',
      title: 'info',
      description: '設定ファイル情報',
      outputFormat: 'list',
      fields: [
        {
          id: 'version',
          label: 'version',
          type: 'fixed',
          value: 'v0.3.0',
        },
        {
          id: 'created_at',
          label: 'created_at',
          type: 'auto',
          generator: 'timestamp_iso8601',
        },
      ],
    },
    {
      id: 'llm',
      title: 'llm',
      description: 'LLMプロバイダー設定',
      outputFormat: 'list',
      conditional: {
        switchField: 'provider',
        cases: {
          anthropic: {
            fields: [
              { id: 'provider', type: 'fixed', value: 'anthropic' },
              { id: 'apiKey', label: 'API Key', type: 'password', required: true },
              { id: 'maxTokens', label: 'Max Tokens', type: 'number', default: 16384, required: true },
              {
                id: 'models',
                label: 'モデル',
                type: 'array',
                itemType: 'text',
                placeholder: 'claude-sonnet-4-5-20250929',
                defaults: ['claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001'],
              },
            ],
          },
          bedrock: {
            notes: [
              'モデルIDにはリージョンプレフィックス（例: us., apac., global.）が必要です。',
              'モデルによって設定可能な出力トークン上限が異なります（例: Nova系は10,000、Claude系は最大128,000）。',
              '設定可能な上限値を超えた出力トークン数を指定した場合、エラーが発生します。',
            ],
            fields: [
              { id: 'provider', type: 'fixed', value: 'bedrock' },
              { id: 'accessKeyId', label: 'Access Key ID', type: 'password', required: true },
              { id: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
              { id: 'region', label: 'Region', type: 'text', default: 'ap-northeast-1', required: true },
              { id: 'maxTokens', label: 'Max Tokens', type: 'number', default: 10000, required: true },
              {
                id: 'models',
                label: 'モデル',
                type: 'array',
                itemType: 'text',
                placeholder: 'global.anthropic.claude-haiku-4-5-20251001-v1:0',
                defaults: [
                  'global.anthropic.claude-haiku-4-5-20251001-v1:0',
                  'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
                  'apac.amazon.nova-pro-v1:0',
                  'apac.amazon.nova-micro-v1:0',
                ],
              },
            ],
          },
          openai: {
            fields: [
              { id: 'provider', type: 'fixed', value: 'openai' },
              { id: 'apiKey', label: 'API Key', type: 'password', required: true },
              { id: 'maxTokens', label: 'Max Tokens', type: 'number', default: 16384, required: true },
              {
                id: 'models',
                label: 'モデル',
                type: 'array',
                itemType: 'text',
                placeholder: 'gpt-5.2',
                defaults: ['gpt-5.2', 'gpt-5.2-chat-latest', 'gpt-5.2-pro', 'gpt-5.1', 'gpt-4o', 'gpt-4o-mini'],
              },
            ],
          },
        },
      },
    },
    {
      id: 'specTypes',
      title: 'specTypes',
      description: '規約種別',
      outputFormat: 'table',
      columns: [
        { id: 'type', label: '種別', type: 'text', width: '30%' },
        { id: 'note', label: '注意事項', type: 'text', width: '70%' },
      ],
      defaults: [
        { type: 'コーディング規約', note: 'コードがこの規約に準拠しているかを確認してください' },
        { type: 'ネーミングルール', note: '命名規則に従っているかを確認してください' },
        { type: 'セキュリティポリシー', note: 'セキュリティ要件を満たしているかを確認してください' },
        { type: 'コード品質規約', note: 'コード品質基準を満たしているかを確認してください' },
        { type: '製造ガイド', note: 'このガイドラインに従って実装されているかを確認してください' },
        { type: '設計ガイド', note: 'この設計方針に従って実装されているかを確認してください' },
      ],
      editable: true,
      minRows: 0,
    },
    {
      id: 'systemPrompts',
      title: 'systemPrompts',
      description: 'システムプロンプトのプリセット定義',
      outputFormat: 'sections',
      itemKey: 'name',
      fields: [
        { id: 'name', label: 'プリセット名' },
        { id: 'role', label: '役割', rows: 2 },
        { id: 'purpose', label: '目的', rows: 6 },
        { id: 'format', label: 'フォーマット', rows: 4 },
        { id: 'notes', label: '注意事項', rows: 6 },
      ],
      defaults: [
        {
          name: '標準監査プリセット',
          role: 'あなたはコーディング規約の監査を行う専門家です。コードの品質と保守性を重視します。',
          purpose: `提供されるコーディング規約に基づいてプログラムコードを監査し、違反箇所を特定してください。

各違反について、以下の情報を提供してください：
1. 行番号
2. 違反内容の説明（具体的な問題点を明記）
3. 修正案（具体的なコード例を含む）
4. 重要度（明確な違反の場合は「NG」、判断が難しい場合は「要確認」）`,
          format: `マークダウン形式で、以下の順に出力してください：
1. サマリー（監査日時、ファイル名、総合判定）
2. 監査結果一覧（テーブル形式：行番号、違反内容、重要度）
3. 詳細（違反箇所の説明と修正案）`,
          notes: `- メイン規約の内容に基づいて監査してください。
- 判定は「OK」「NG」「要確認」の3段階で行ってください。
- 軽微な違反も見逃さないでください。
- 重要度が高い問題を優先して報告してください。
- 規約を引用する際は、見出し番号や項目番号を明示してください。
- プログラムを引用する際は、行番号を必ず添えてください。
- 各規約の冒頭に記載されている役割、種別、注意事項を考慮してください。
- メイン以外の規約は必要な場合に参照してください。
- 静的解析結果は参考情報として利用してください。監査は規約の内容に基づいて実行してください。`,
        },
        {
          name: '詳細分析プリセット',
          role: 'あなたはコーディング規約の監査を行うシニアエンジニアです。コードの品質と保守性を重視します。',
          purpose: `提供されるコーディング規約に基づいてプログラムコードを詳細に監査し、違反箇所を特定してください。

各違反について、以下の情報を詳細に提供してください：
1. 行番号
2. 違反内容の説明（具体的な問題点を明記）
3. 修正案（具体的なコード例を含む）
4. 重要度（明確な違反の場合は「NG」、判断が難しい場合は「要確認」）
5. 違反がコードの品質や保守性に与える影響`,
          format: `マークダウン形式で、以下の順に出力してください：
1. サマリー（監査日時、ファイル名、総合判定、違反件数の内訳）
2. 監査結果一覧（テーブル形式：行番号、違反内容、重要度、影響度）
3. 詳細（違反箇所の説明、修正案、品質への影響）
4. 改善提案（コード品質向上のための追加提案）`,
          notes: `- メイン規約の内容に基づいて監査してください。
- 判定は「OK」「NG」「要確認」の3段階で行ってください。
- 軽微な違反も見逃さないでください。コードの品質と保守性を重視して監査してください。
- 重要度が高い問題を優先して報告してください。
- 規約を引用する際は、見出し番号や項目番号を明示してください。
- プログラムを引用する際は、行番号を必ず添えてください。
- 各規約の冒頭に記載されている役割、種別、注意事項を考慮してください。
- メイン以外の規約は必要な場合に参照してください。
- 規約に明示されていないが、一般的なベストプラクティスに反する箇所も報告してください。
- 静的解析結果は参考情報として利用してください。監査は規約の内容に基づいて実行してください。`,
        },
      ],
      editable: true,
      minRows: 0,
    },
  ],
}
```

### フィールドタイプ

| type | 説明 | 追加プロパティ |
|------|------|---------------|
| `fixed` | 固定値（編集不可、出力時に使用） | `value` |
| `auto` | 自動生成値（ダウンロード時に生成） | `generator` |
| `text` | テキスト入力 | `default`, `placeholder`, `required`, `width` |
| `textarea` | 複数行テキスト入力 | `rows`, `default`, `placeholder`, `required`, `width` |
| `password` | パスワード入力（マスク表示） | `required` |
| `number` | 数値入力 | `default`, `min`, `max`, `required` |
| `array` | 複数値入力（追加・削除可能） | `itemType`, `defaults`, `placeholder` |

**textareaの補足:**
- `table` フォーマットのテーブルセル内で使用可能（複数行テキストの入力に対応）
- `table` フォーマットでのMarkdown出力時、改行は `<br>` に変換される
- `sections` フォーマットでは改行がそのまま出力される（視認性が高い）
- `rows` プロパティで表示行数を指定（デフォルト: 3）
- 長文の複数行テキストには `sections` フォーマットの使用を推奨

### テーブル列プロパティ

| プロパティ | 説明 | 例 |
|-----------|------|-----|
| `width` | 列の幅（CSS値） | `"20%"`, `"200px"` |

### 自動生成タイプ（generator）

| generator | 説明 | 出力例 |
|-----------|------|--------|
| `timestamp_iso8601` | ISO 8601形式のタイムスタンプ | `2026-01-18T10:30:00+09:00` |

### 出力フォーマット

| outputFormat | 説明 | Markdown出力例 |
|--------------|------|---------------|
| `list` | リスト形式 | `- key: value` |
| `table` | テーブル形式 | `\| col1 \| col2 \|` |
| `sections` | 見出し+セクション形式 | `### 名前`<br>`#### field`<br>`内容...` |

**sectionsの補足:**
- 複数行テキストを含む構造化データに適している
- `itemKey` で指定したフィールドが `###` 見出しとして出力される
- 他のフィールドは `#### フィールドID` の形式で出力される
- UIはカード形式で表示

### 条件分岐（conditional）

`conditional` プロパティを使用すると、選択値に応じてフィールドを動的に切り替えることができる。

| プロパティ | 説明 | 例 |
|-----------|------|-----|
| `switchField` | 切り替えの基準となるフィールドID | `"provider"` |
| `cases` | 各ケースの定義（キーは選択値） | `{ anthropic: {...}, bedrock: {...} }` |

**各ケースのプロパティ:**

| プロパティ | 説明 | 例 |
|-----------|------|-----|
| `fields` | そのケースで表示するフィールド配列 | `[{ id: "apiKey", ... }]` |
| `notes` | プロバイダー固有の注意事項（オプション） | `["モデルIDには...", "トークン上限は..."]` |

**notesの補足:**
- `notes` はUI上でフィールドの前に警告ボックス（lucide-react AlertTriangle アイコン付き）として表示される
- 配列で複数の注意事項を指定可能
- 省略可能（指定しない場合は注意事項ボックスは表示されない）
- スキーマを差し替える際、アプリ固有の注意事項を設定できる

### 拡張性

**バージョンアップ時**: `meta.version` とフィールド定義を更新

**別アプリへの転用時**:
- `configSchema.ts` のスキーマオブジェクト全体を差し替え
- TypeScript型定義により、スキーマ変更時にコンパイルエラーで不整合を検出可能

## 技術要件

- **Vite + React + TypeScript**で実装
- Tailwind CSS v4でスタイリング
- ブラウザ上で完結、サーバー通信なし
- lucide-reactでアイコン表示

## 機能要件

### 1. 動的フォーム生成
- TypeScriptスキーマに基づいてUIを自動生成
- 条件分岐（`conditional`）に対応（プロバイダー選択で入力欄が切り替わる）
- 配列フィールドの追加・削除
- 数値フィールドの入力サポート

### 2. テーブル編集
- 行の追加・編集・削除

### 3. 自動生成フィールド
- `auto` タイプのフィールドはダウンロード時に自動生成
- `timestamp_iso8601`: 現在時刻をISO 8601形式で出力

### 4. バリデーション
- 必須フィールドチェック
- スキーマ定義に基づく型チェック
- 数値フィールドの範囲チェック（min/max指定時）
- エラー時はアラート表示

### 5. 出力
- 「ダウンロード」ボタンで設定ファイルをダウンロード

## 配置場所

```
frontend/src/features/config-file-generator/
```

React Routerにより `/config-file-generator` でアクセス可能。

## 対象バージョン

v0.3.0

## E2E試験項目

### CFG-GEN: 設定ファイルジェネレーターテスト

| # | 試験項目 | 前提条件 | 操作手順 | 期待結果 | 結果 |
|---|---------|---------|---------|---------|------|
| E2E-GEN-001 | 画面表示 | - | /config-file-generator にアクセス | 設定ファイルジェネレーター画面が表示される | |
| E2E-GEN-002 | プロバイダー切替（Anthropic） | 画面表示済み | プロバイダーで「Anthropic」を選択 | API Key入力欄が表示される | |
| E2E-GEN-003 | プロバイダー切替（Bedrock） | 画面表示済み | プロバイダーで「Bedrock」を選択 | Access Key ID、Secret Access Key、Region入力欄と注意事項ボックスが表示される | |
| E2E-GEN-004 | プロバイダー切替（OpenAI） | 画面表示済み | プロバイダーで「OpenAI」を選択 | API Key入力欄が表示される | |
| E2E-GEN-005 | モデル追加 | プロバイダー選択済み | 「+ モデルを追加」ボタン押下 | モデル入力欄が追加される | |
| E2E-GEN-006 | モデル削除 | モデルが2つ以上ある | モデルの「×」ボタン押下 | 該当モデルが削除される | |
| E2E-GEN-007 | specTypes行追加 | 画面表示済み | 「+ 行を追加」ボタン押下 | 種別テーブルに新しい行が追加される | |
| E2E-GEN-008 | specTypes行削除 | 種別テーブルに行がある | 行の「×」ボタン押下 | 該当行が削除される | |
| E2E-GEN-009 | specTypes編集 | 種別テーブルに行がある | 種別と注意事項を編集 | 入力内容が反映される | |
| E2E-GEN-010 | systemPromptsプリセット追加 | 画面表示済み | 「+ プリセットを追加」ボタン押下 | 新しいプリセット入力欄が追加される | |
| E2E-GEN-011 | systemPromptsプリセット削除 | プリセットがある | プリセットの「×」ボタン押下 | 該当プリセットが削除される | |
| E2E-GEN-012 | systemPromptsプリセット編集 | プリセットがある | role、purpose、format、notesを編集 | 入力内容が反映される | |
| E2E-GEN-013 | ダウンロード | 必須項目入力済み | 「ダウンロード」ボタン押下 | reviewer-config.mdがダウンロードされ、info、llm、specTypes、systemPromptsセクションが含まれる | |
| E2E-GEN-014 | created_at自動生成 | - | ダウンロードボタン押下 | infoセクションのcreated_atにダウンロード時刻がISO8601形式で設定される | |
| E2E-GEN-015 | 必須項目バリデーション | API Key未入力 | 「ダウンロード」ボタン押下 | エラー表示、ダウンロードされない | |
