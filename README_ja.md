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

## 想定する利用環境

本ツールはローカル実行を前提としており、アプリケーション自体に認証・認可はありません。到達できる相手は、サーバーに設定された認証情報で LLM を呼び出し、課金を発生させる可能性があります。

- バックエンドは `--host 127.0.0.1` を指定して起動してください。
- ネットワークに公開する場合は、リバースプロキシ等で認証を必須にし、バックエンドへの直接アクセスを制限してください。
- CORS の既定値は `http://localhost:5173`、`http://127.0.0.1:5173`、`http://localhost:4173`、`http://127.0.0.1:4173` のみです。未設定・空白の場合もこの既定値を使います。
- 別オリジンを使う場合は `CORS_ORIGINS` に明示してください。`*` を含む設定では認証情報を許可しません。全許可は避けてください。CORS は認証やネットワークアクセス制限の代わりにはなりません。


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
- **Node.js**: 20.19以上（20.x）、22.12以上（22.x）、または24以上
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
cd frontend
npm install
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスしてWebアプリを使用できます。

### 3. バックエンドを起動する

```bash
cd backend

# 環境変数を設定
cp .env.example .env
# .envファイルを編集してAWS認証情報を設定

# uvを使用して依存関係をインストール＆サーバーを起動
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
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
cd frontend && npm run dev

# バックエンドを起動（ターミナル2）
cd backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

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
├── backend/                # バックエンドアプリケーション（FastAPI）
├── frontend/               # フロントエンドアプリケーション（Vite + React）
├── docs/
│   ├── spec.md             # 詳細仕様書
│   ├── design.md           # 設計ドキュメント（開発者向け）
│   ├── config-file-generator-spec.md  # 設定ファイルジェネレーター仕様書
│   ├── ai-auditor-format/  # AIオーディター形式サンプルファイル
│   └── samples/            # サンプルコード
└── ...
```

## 関連プロジェクト

以下の自社ツールを依存関係として使用しています（uv により PyPI または git ソースからインストール。`backend/pyproject.toml` 参照）。

| パッケージ | リポジトリ | 説明 |
|------------|-----------|------|
| add-line-numbers | https://github.com/elvezjp/add-line-numbers | ファイルに行番号を追加するツール |
| excel2md | https://github.com/elvezjp/excel2md | Excel→CSVマークダウン変換ツール |

ソースを参照したい場合は、各上流リポジトリを直接 clone してください（例: `git clone https://github.com/elvezjp/excel2md.git`）。これらのリポジトリは以前 git subtree としてリポジトリ直下に取り込まれており、その構成は `v0.5.1` タグに保存されています。

## バージョン管理

リポジトリのルートでは最新のコードのみを保持し、バージョン管理は git tag で行います。

- `main` ブランチには次バージョンの変更を [CHANGELOG_ja.md](CHANGELOG_ja.md) の `## [X.Y.Z] - Unreleased` 見出しの下に蓄積します
- リリース時に見出しの日付を確定し、`backend/pyproject.toml` のバージョン（およびフロントエンドのバージョン表記）を確認のうえ、`vX.Y.Z` タグを作成します（手順は [CONTRIBUTING_ja.md](CONTRIBUTING_ja.md#バージョン管理) を参照）

### 旧バージョンを利用する場合

旧バージョン（v0.3〜v0.5.1）は、以前は `versions/` ディレクトリ配下にスナップショットとして保持していました。この構成（同梱していた `add-line-numbers/`・`excel2md/` を含む）は `v0.5.1` タグに保存されています。

```bash
git checkout v0.5.1
# 旧バージョンは versions/v0.3 〜 versions/v0.5.1 配下にあります
```

**注意**:

- `v0.5.1` タグ配下のコードは凍結スナップショットであり、v0.6.0 以降のセキュリティ修正（パストラバーサル、CORS 設定など。詳細は [CHANGELOG_ja.md](CHANGELOG_ja.md)）を含みません。参照・検証用途に限り、実際の利用には最新版を使用してください
- `v0.5.1` タグは旧構成のアーカイブ参照点のため、削除・付け替えを行わないでください

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

- [詳細仕様書](docs/spec.md) - 仕様書
- [設計ドキュメント](docs/design.md) - 設計思想・技術詳細・内部構造（開発者向け）
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

本リポジトリはルート直下（`backend/` / `frontend/`）に最新コードのみを保持し、旧バージョンは git tag で参照するため、旧バージョンは Dependabot のスキャン対象になりません。自社ツール（`add-line-numbers`、`excel2md`）は uv の依存関係として取得しており、それらの脆弱性はルートの lockfile 経由で検出されます。これらを踏まえ、Dependabot アラートは以下のとおり運用します。

#### Malware タブ

- **必ず修正対応する**

#### Vulnerable タブ

| 対象 | 対応 |
|------|------|
| ルートの lockfile（`backend/uv.lock`、`frontend/package-lock.json`） | **修正対応する**（依存更新／PR 作成） |

Dismiss したアラートは同一 manifest × 同一パッケージ × 同一 CVE の組み合わせでは再発生しませんが、同パッケージで別の CVE が将来公開された場合は新規アラートとして再通知されます。

## コントリビューション

コントリビューションを歓迎します。詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

- バグ報告: [GitHub Issues](https://github.com/elvezjp/coding-policy-ai-auditor/issues)
- 機能提案: [GitHub Issues](https://github.com/elvezjp/coding-policy-ai-auditor/issues)
- プルリクエスト: [GitHub Pull Requests](https://github.com/elvezjp/coding-policy-ai-auditor/pulls)

## 更新履歴

詳細な変更履歴は [CHANGELOG.md](CHANGELOG.md) を参照してください。

## 開発の背景

本ツールは、日本の開発現場でAIを活かすためのAI開発エコシステム **IXV（イクシブ）** の開発過程で生まれた小さな実用品です。

IXVでは、開発方法論とOSSを提供することで、AI活用を現場に根付かせる取り組みを進めており、本リポジトリでは、その一部を切り出して公開しています。

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。

## 問い合わせ先

- **メールアドレス**: info@elvez.co.jp
- **宛先**: 株式会社エルブズ
