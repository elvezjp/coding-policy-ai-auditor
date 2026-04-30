# coding-policy-ai-auditor

[English](./README.md) | [日本語](./README_ja.md)

[![Elvez](https://img.shields.io/badge/Elvez-Product-3F61A7?style=flat-square)](https://elvez.co.jp/)
[![IXV Ecosystem](https://img.shields.io/badge/IXV-Ecosystem-3F61A7?style=flat-square)](https://elvez.co.jp/ixv/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Stars](https://img.shields.io/github/stars/elvezjp/coding-policy-ai-auditor?style=social)](https://github.com/elvezjp/coding-policy-ai-auditor/stargazers)

Javaコードに対して、**判断系コーディング規約**（意味的・主観的でLint等では検出しづらい規約）の準拠性を、LLM を使って点検するオーディターです。

本ツールは、コーディング規約を「1件ずつ」コードに適用し、**違反箇所を行番号付きで具体提示**し、**修正案**まで出力します。
※判断系ルールは「絶対的な判定」が原理的に困難なため、**曖昧な場合は `要確認：` を付けて違反として報告**し、人間のレビューにつなげる設計です。

https://github.com/user-attachments/assets/01b8fe08-861b-473a-8f1a-f4de00f751f4

---

## 特徴

- **判断系ルールの監査**: Lint等では検出できない意味的・主観的なコーディング規約違反を検出
- **行番号付きの具体的な指摘**: 違反箇所を行番号で特定し、修正案まで出力
- **曖昧さの取り扱い**: 判断が曖昧な場合は `要確認：` を付けて報告し、人間のレビューにつなげる設計
- **マルチLLMプロバイダー対応**: AWS Bedrock、OpenAI、Anthropic APIを切り替えて利用可能
- **静的解析との統合**: AI監査とCheckstyle、PMD、Ruff、Flake8、Pylintを組み合わせて実行
- **設定ファイルジェネレーター**: LLM設定やルールセットをGUIで生成
- **クロスプラットフォーム**: macOS、Linux、Windowsに対応

## ユースケース

- **コードレビューの自動化**: 静的解析ツールでは検出できない、社内固有のコーディング規約に対してJavaコードを監査
- **コンプライアンスチェック**: 命名規則、コメント品質、設計パターンなどの判断系ルールへの準拠を確認
- **レビュー支援**: 違反箇所と修正案を含む監査レポートを生成し、人間のレビューを効率化

## システム構成

- **フロントエンド**（UI）: Vite + React 19 + TypeScript + Tailwind CSS
- **バックエンド**（API・変換処理）: Python / FastAPI
  - MarkItDown / excel2md（Excel → Markdown 変換）
  - add-line-numbers（行番号付与）
  - マルチLLMプロバイダー対応（Bedrock / Anthropic / OpenAI）
  - 静的解析ツール（Checkstyle / PMD / Ruff / Flake8 / Pylint）

## セットアップ手順

### 動作環境

- **OS**: macOS / Linux / Windows（WSL推奨）
- **Node.js**: 20.0.0 以上
- **Python**: 3.11 以上

### 1. 必要なツールをインストールする

以下のツールを事前にインストールしてください。

| ツール | 用途 | インストール方法 |
|--------|------|------------------|
| uv | Python パッケージマネージャー | [公式サイト](https://docs.astral.sh/uv/) |
| Java (JDK 21以上) | 静的解析ツールの実行 | [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) 等、利用環境に応じた方法で |
| Checkstyle | コーディング規約チェック（Java） | [GitHub](https://github.com/checkstyle/checkstyle) |
| PMD | 静的コード解析（Java） | [公式サイト](https://pmd.github.io/) |

> **Note**: Java/Checkstyle/PMD は静的解析機能を使用する場合のみ必要です。未インストールでもAI監査機能は正常に動作します。Python静的解析ツール（Ruff/Flake8/Pylint）はバックエンドの依存関係として管理されています。詳細は[静的解析ツールの利用](#静的解析ツールの利用)を参照してください。

### 2. フロントエンドを起動する

```bash
cd versions/v0.5/frontend
npm install
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスしてWebアプリを使用できます。

### 3. バックエンドを起動する

```bash
cd versions/v0.5/backend

# 環境変数を設定
cp .env.example .env
# .envファイルを編集してAWS認証情報を設定

# uvを使用して依存関係をインストール＆サーバーを起動
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

バックエンドAPIは `http://localhost:8000` で起動します。

#### システムLLM設定（AWS Bedrock）

**注意**: AWS環境がない場合、この設定は不要です。Web画面から設定ファイルをアップロードすることで、利用者自身がLLM認証情報を設定して使用できます。

`.env`ファイルで以下を設定してください：

```env
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
BEDROCK_MODEL_ID=global.anthropic.claude-haiku-4-5-20251001-v1:0
BEDROCK_MAX_TOKENS=16384
CORS_ORIGINS=http://localhost:5173
```

**注意**: AWS Bedrockの利用には、AWSアカウントとClaude Haikuモデルへのアクセス権限が必要です。

---

## 使い方

### 実行例

```bash
# フロントエンドを起動（ターミナル1）
cd versions/v0.5/frontend && npm run dev

# バックエンドを起動（ターミナル2）
cd versions/v0.5/backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# ブラウザで http://localhost:5173 にアクセス
```

### Web画面

1. ブラウザで `http://localhost:5173` を開く
2. コーディング規約ファイル（Excel）をアップロード
3. javaプログラムファイルをアップロード
4. 静的解析の設定を確認
5. 「監査を開始」ボタンをクリック
6. 結果を確認し、必要に応じてレポートをダウンロード

コーディング規約ファイルは[AIオーディター形式](docs/ai-auditor-format/)または、任意のExcelファイルをマークダウン変換して利用可能です。

## ディレクトリ構造

```
coding-policy-ai-auditor/
├── README.md
├── add-line-numbers/       # 行番号付与ライブラリ
├── excel2md/               # Excel → Markdown 変換ライブラリ
├── docs/
│   └── ai-auditor-format/  # AIオーディター形式サンプルファイル
├── versions/
│   ├── v0.5/               # 最新版（推奨）
│   │   ├── frontend/       # フロントエンドアプリケーション
│   │   ├── backend/        # バックエンドアプリケーション
│   │   └── spec.md         # 詳細仕様書
│   ├── v0.4/               # 旧バージョン
│   └── v0.3/
└── ...
```

## 静的解析ツールの利用

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

2. **Checkstyle**: [GitHub Releases](https://github.com/checkstyle/checkstyle/releases) から `checkstyle-X.X.X-all.jar` をダウンロードし、任意のフォルダに配置。同じフォルダに以下の内容で `checkstyle.bat` を作成する（`checkstyle-X.X.X-all.jar` の部分はダウンロードしたファイル名に合わせること）：
   ```bat
   @echo off
   java -jar "%~dp0checkstyle-X.X.X-all.jar" %*
   ```

3. **PMD**: [公式サイト](https://pmd.github.io/) や [GitHub Releases](https://github.com/pmd/pmd/releases) から ZIP ファイルをダウンロードし、任意のフォルダに解凍。配布物によっては `pmd-dist-X.X.X-bin\pmd-bin-X.X.X\bin` のように **一段ネスト** した構成になります。PATH に追加するのは **`pmd.bat`（および `pmd`）が入っている `bin` フォルダ** のみです（親フォルダだけを追加するとコマンドが見つかりません）。

バックエンドを起動する PowerShell セッションで以下を実行し、PATH を設定してから `uv run uvicorn ...` を起動する（パスは実際の配置場所に合わせて変更）：

```powershell
$JAVA_BIN       = "C:\path\to\jdk\bin"          # java.exe がある bin（未設定だと pmd.bat が失敗することがある）
$CHECKSTYLE_DIR = "C:\path\to\checkstyle"       # checkstyle.bat を置いたフォルダ
$PMD_BIN        = "C:\path\to\...\bin"         # pmd.bat がある bin（例: ...\pmd-dist-7.23.0-bin\pmd-bin-7.23.0\bin）

$env:PATH = "$JAVA_BIN;$CHECKSTYLE_DIR;$PMD_BIN;" + $env:PATH
```

> **Note**: `where.exe java`、`where.exe checkstyle` および `where.exe pmd` で各コマンドが見つかることを確認してからバックエンドを起動してください。


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

---

## ドキュメント

- [詳細仕様書](versions/v0.5/spec.md) - v0.5 仕様書
- [CHANGELOG.md](CHANGELOG.md) - バージョン履歴
- [CONTRIBUTING.md](CONTRIBUTING.md) - コントリビューション方法
- [SECURITY.md](SECURITY.md) - セキュリティポリシー
- [AIオーディター形式](docs/ai-auditor-format/) - AIオーディター形式サンプルファイル

## セキュリティ

セキュリティに関する詳細は [SECURITY.md](SECURITY.md) を参照してください。

- 入力ファイルは信頼できるソースからのものに限定してください
- APIキーは環境変数で管理し、コードにハードコードしないでください
- 生成された監査レポートにはソースコードの内容が含まれる場合があるため、共有前に内容を確認してください

### Dependabot アラートの運用方針

本リポジトリは過去のリリースを `versions/` 配下にアーカイブしており（現在は `v0.3`, `v0.4`, `v0.5`）、それらのロックファイルに対しても Dependabot アラートが発報されます。また、`add-line-numbers/` と `excel2md/` は git subtree で取り込んでおり、依存関係は元リポジトリ側で管理されています。これらを踏まえ、Dependabot アラートは以下のとおり運用します。

#### Malware タブ

- **発生場所を問わず必ず修正対応する**
- 旧バージョンや git subtree 配下であっても放置しない

#### Vulnerable タブ

| 対象 | 対応 |
|------|------|
| 最新バージョン（現在は `versions/v0.5/`） | **修正対応する**（依存更新／PR 作成） |
| 旧バージョン（`versions/v0.3/`, `versions/v0.4/`） | **Dismiss**。既存分は一括 close、新規発生時は影響を確認のうえ close |
| git subtree ディレクトリ（`add-line-numbers/`, `excel2md/`） | **Dismiss**。subtree 元リポジトリ側で管理されているため、本リポジトリでは修正対象外 |

#### 運用フロー

1. 新規アラート発生時、まず **Malware タブ**か **Vulnerable タブ**かを確認する
2. **Malware** → 場所を問わず修正
3. **Vulnerable** → 発生場所を確認
   - 最新バージョンディレクトリ → 修正対応
   - 旧バージョン or git subtree 配下 → 影響なしを確認のうえ Dismiss

Dismiss したアラートは同一 manifest × 同一パッケージ × 同一 CVE の組み合わせでは再発生しませんが、同パッケージで別の CVE が将来公開された場合は新規アラートとして再通知されます。

## コントリビューション

コントリビューションを歓迎します。詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

- バグ報告: [GitHub Issues](https://github.com/elvezjp/coding-policy-ai-auditor/issues)
- 機能提案: [GitHub Issues](https://github.com/elvezjp/coding-policy-ai-auditor/issues)
- プルリクエスト: [GitHub Pull Requests](https://github.com/elvezjp/coding-policy-ai-auditor/pulls)

## 更新履歴

詳細な変更履歴は [CHANGELOG.md](CHANGELOG.md) を参照してください。

## 開発の背景

本ツールは、日本語の開発文書・仕様書を対象とした開発支援AI **IXV（イクシブ）** の開発過程で生まれた小さな実用品です。

IXVでは、システム開発における日本語の文書について、理解・構造化・活用という課題に取り組んでおり、本リポジトリでは、その一部を切り出して公開しています。

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。

## 問い合わせ先

- **メールアドレス**: info@elvez.co.jp
- **宛先**: 株式会社エルブズ
