# coding-policy-ai-auditor v0.3

このドキュメントは、本ツールの設計思想・技術詳細・内部構造に関する開発者向け情報です。

---

## 目的

- 判断系ルール（意味的・主観的な規約）について、レビューの手間を減らしつつ漏れを減らす
- 規約ごとにプロンプトを明確化し、**LLMの出力を安定化**させる
- 監査結果をCIやレビュー工程に組み込みやすい形式で出力する

## 設計方針

### 1) 規約は「機械検出」と「判断系」に分ける
- **機械検出ルール**：構文・パターンで安定検出できる（Lint/静的解析を推奨）
- **判断系ルール**：意味/主観が絡み、絶対判定は不可。ここを本ツールの対象とする

### 2) 精度のため「規約1件 × コード」を繰り返し評価する
LLMは入力が増えると精度が落ちるため、**規約をまとめて一括判定しない**。
規約N件ならN回の推論が基本（＝コスト増）だが、精度を優先する。

### 3) 行番号付きコードを必須にする
違反箇所提示の精度を上げ、レビューで追跡しやすくするため、入力コードは必ず行番号付与する。

### 4) 出力形式を固定し、後段処理しやすくする
結果はMarkdown/JSONで整形し、集計・差分・CI判定に利用できるようにする。

## 技術スタック

### アーキテクチャ
- **Option A（外部ツールとして実行）**: 機械検出ルールと判断系ルールを分離し、疎結合で統合

### 機械検出ルール（構文・パターンベース）
- **Checkstyle**: コーディング規約チェック（命名規則、インデント、行の長さ等）
  - XML設定ファイルでプロジェクト固有のルールをカスタマイズ可能
  - 出力形式: XML / JSON
- **PMD**: 複雑なパターン検出（未使用変数、空のcatchブロック、複雑度等）
  - 出力形式: XML / JSON / HTML

### 判断系ルール（意味的・主観的）
- **LLM API**: Claude / GPT等を使用
  - 規約1件ずつコードを評価し、違反箇所を行番号付きで提示
  - 曖昧な場合は「要確認」として報告

### バックエンド
- **Python 3.11+**: 高速で読みやすいバックエンド
- **FastAPI**: モダンで高速なAPIフレームワーク
- **AWS Bedrock**: Claude 3.5 Sonnetを使用したLLM統合
- **WebSocket**: リアルタイム進捗配信
- **機能**:
  - Javaコードに行番号を付与
  - 規約プロンプトに基づくLLM監査
  - WebSocket経由のリアルタイム進捗更新
  - 違反箇所の詳細レポート生成

### フロントエンド
- **Vite + React + TypeScript**: 高速な開発環境とモダンなUI
- **Tailwind CSS**: ユーティリティファーストのスタイリング
- **WebSocket Client**: バックエンドとのリアルタイム通信
- **機能**:
  - Javaファイルのアップロード（ドラッグ&ドロップ対応）
  - 規約プロンプト管理（追加・編集・削除）
  - 監査実行とリアルタイム進捗表示
  - 結果表示（違反/要確認のフィルタリング）
  - レポートのMarkdownダウンロード

### 統合フロー
```
機械検出ルール
  ├─ Checkstyle 実行 → JSON/XML出力
  └─ PMD 実行 → JSON/XML出力
         ↓
判断系ルール
  └─ 本ツール（LLMベース）→ Markdown/JSON出力
         ↓
   統合レポート生成（Webページで可視化）
```

## 対象スコープ

### 対象
- Java ソースコード（`.java`）複数ファイル（ディレクトリ単位）

### 対象規約
- 判断系ルールのうち、**説明シート（詳細ルール・具体例）が整備されている規約**を推奨
  - 具体例（準拠/違反）が不足する規約は、誤検出が増える可能性があるため、プロンプト整備を推奨

### 非対象（推奨方針）
- 「1行120文字」「インデント」等の機械検出可能な規約
  → 既存の Lint / formatter / 静的解析へ委譲

## 機能一覧

- [ ] Javaファイル収集（ディレクトリ指定）
- [ ] Javaコード行番号付与（前処理）
- [ ] 規約プロンプト（Markdown）を読み込み
- [ ] 規約 **1件ずつ** LLM に判定させる
- [ ] 出力を Markdown（人間向け）と JSON（機械向け）で保存
- [ ] （オプション）LLM出力の**精査ステップ**（誤検出抑制）を追加可能
- [ ] しきい値・対象除外・並列度・コスト上限などの設定

## ディレクトリ構造

```
versions/v0.3/
├── frontend/       # フロントエンドアプリケーション
├── backend/        # バックエンドアプリケーション
├── spec.md         # 詳細仕様書
└── README.md       # 本ファイル
```

## 静的解析ツール（オプション）

AI監査に加えて静的解析を使用する場合の設定について説明します。

> **Note**: 静的解析ツールが未インストールの場合でも、AI監査機能は正常に動作します。静的解析はスキップされ、AI監査のみが実行されます。

### Java静的解析ツール

Java静的解析（Checkstyle、PMD）を使用する場合は、以下を参考に実行環境に合わせてインストールしてください。

**macOS（Homebrew を使う場合）:**

```bash
brew install openjdk
brew install checkstyle
brew install pmd
```

**macOS（パッケージをダウンロードする場合）:**

1. Java: [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) から DMG ファイルをダウンロードしてインストール
2. Checkstyle: [GitHub Releases](https://github.com/checkstyle/checkstyle/releases) から最新版のリリースをダウンロード
3. PMD: [GitHub Releases](https://github.com/pmd/pmd/releases) から最新版のリリースをダウンロード

**Windows:**

1. **Java**: [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) 等から Windows 用インストーラーをダウンロードして実行
2. **Checkstyle**: [GitHub Releases](https://github.com/checkstyle/checkstyle/releases) から `checkstyle-X.X.X-all.jar` をダウンロードし、任意のフォルダに配置
3. **PMD**: [公式サイト](https://pmd.github.io/) から ZIP ファイルをダウンロードし、任意のフォルダに解凍。環境変数 PATH に `bin` フォルダを追加

配置や設定方法は各ツールの最新版のドキュメントを参照してください。


### Python静的解析ツール

- **Pylint**: デフォルトでインストールされます
- **Ruff/Flake8**: 静的解析内容が類似するため、どちらかを選択して追加インストールしてください。

```bash
# デフォルト: Pylint のみ
uv sync

# Ruff を使う場合（推奨）
uv sync --extra ruff

# Flake8 を使う場合
uv sync --extra flake8
```

**動作:**
- Ruff と Flake8 の両方がインストールされている場合、両方実行されます

## 静的解析ルールのカスタマイズ

静的解析ルールをカスタマイズしたい場合は、以下の設定ファイルを編集してください。

| ツール | 設定ファイル | 用途 |
|--------|--------------|------|
| Checkstyle | `backend/app/services/static_analysis/configs/checkstyle.xml` | 命名規則、インデント、空白等のチェック |
| PMD | `backend/app/services/static_analysis/configs/pmd_ruleset.xml` | 未使用変数、空のcatchブロック等の検出 |
| Ruff | `backend/app/services/static_analysis/configs/ruff.toml` | PythonのLint設定 |
| Pylint | `backend/app/services/static_analysis/configs/pylintrc` | PythonのLint設定 |

### Checkstyle ルールの追加例

`TreeWalker` モジュール内にルールを追加します：

```xml
<module name="TreeWalker">
  <!-- 既存のルール -->
  <module name="TypeName"/>

  <!-- 新しいルールを追加 -->
  <module name="MagicNumber"/>
</module>
```

### PMD ルールの追加例

```xml
<ruleset name="Custom PMD Rules" ...>
  <!-- 既存のルール -->
  <rule ref="category/java/bestpractices.xml/UnusedPrivateField"/>

  <!-- 新しいルールを追加 -->
  <rule ref="category/java/bestpractices.xml/AvoidReassigningParameters"/>
</ruleset>
```

利用可能なルールの一覧は各ツールの公式ドキュメントを参照してください：
- Checkstyle: https://checkstyle.org/checks.html
- PMD: https://pmd.github.io/latest/pmd_rules_java.html

## 入出力仕様

### 入力

#### 1) 規約プロンプト（Markdown）
- 規約1件につき1ファイル
- 推奨構造（例）：

```md
# 規約概要
【規約番号】: 規約9
【概要】: Javaソースファイルはコンパイル単位要素を適切な順序で記述する

# 詳細ルール
...（判断基準を明文化）...

# 準拠の具体例
```java
...
```
