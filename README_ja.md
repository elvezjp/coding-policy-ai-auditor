# coding-policy-ai-auditor

[English](./README.md) | [日本語](./README_ja.md)

[![Elvez](https://img.shields.io/badge/Elvez-Product-3F61A7?style=flat-square)](https://elvez.co.jp/)
[![IXV Ecosystem](https://img.shields.io/badge/IXV-Ecosystem-3F61A7?style=flat-square)](https://elvez.co.jp/ixv/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Stars](https://img.shields.io/github/stars/elvezjp/coding-policy-ai-auditor?style=social)](https://github.com/elvezjp/coding-policy-ai-auditor/stargazers)

Javaコードに対して、**判断系コーディング規約**（意味的・主観的でLint等では検出しづらい規約）の準拠性を、LLM を使って点検するオーディターです。

本ツールは、コーディング規約を「1件ずつ」コードに適用し、**違反箇所を行番号付きで具体提示**し、**修正案**まで出力します。
※判断系ルールは「絶対的な判定」が原理的に困難なため、**曖昧な場合は `要確認：` を付けて違反として報告**し、人間のレビューにつなげる設計です。

https://github.com/user-attachments/assets/8e52e2da-aad2-4572-acd8-396f618302b1

---

## セットアップ手順

### 動作環境

- **OS**: macOS / Linux / Windows（WSL推奨）
- **Node.js**: 20.0.0 以上
- **Python**: 3.10 以上

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
cd versions/v0.4/frontend
npm install
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスしてWebアプリを使用できます。

### 3. バックエンドを起動する

```bash
cd versions/v0.4/backend

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
FRONTEND_URL=http://localhost:5173
```

**注意**: AWS Bedrockの利用には、AWSアカウントとClaude Haikuモデルへのアクセス権限が必要です。

---

## 使い方

### 実行例

```bash
# フロントエンドを起動（ターミナル1）
cd versions/v0.4/frontend && npm run dev

# バックエンドを起動（ターミナル2）
cd versions/v0.4/backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

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
│   ├── v0.4/               # 最新版（推奨）
│   │   ├── frontend/       # フロントエンドアプリケーション
│   │   ├── backend/        # バックエンドアプリケーション
│   │   └── spec.md         # 詳細仕様書
│   └── v0.3/               # 旧バージョン
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

---
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
