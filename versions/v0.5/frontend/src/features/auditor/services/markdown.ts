// Markdown generation utilities for auditor feature

import type { DesignFile, CodeFile, SystemPromptValues, StaticAnalysisResult } from '../types'

export function generateSpecMarkdown(
  files: DesignFile[],
  getTypeNote: (type: string) => string
): string {
  return files
    .filter((f) => f.markdown)
    .map((f) => {
      const note = getTypeNote(f.type)
      const role = f.isMain ? 'メイン' : '参照'
      return `# 規約ファイル: ${f.filename}\n- 役割: ${role}\n- 種別: ${f.type}\n- 注意事項: ${note}\n\n${f.markdown}`
    })
    .join('\n\n---\n\n')
}

export function generateCodeWithLineNumbers(files: CodeFile[]): string {
  return files
    .filter((f) => f.contentWithLineNumbers)
    .map((f) => `# プログラム: ${f.filename}\n\n${f.contentWithLineNumbers}`)
    .join('\n\n---\n\n')
}

export function generateSystemPromptMarkdown(prompt: SystemPromptValues): string {
  return `# システムプロンプト

## 役割

${prompt.role}

## 目的

${prompt.purpose}

## 出力形式

${prompt.format}

## 注意事項

${prompt.notes}
`
}

export function generateReadmeMarkdown(
  auditMeta: {
    version: string
    modelId: string
    executedAt: string
    inputTokens: number
    outputTokens: number
    rules?: { filename: string; role: string; type: string; tool: string }[]
    programs?: { filename: string }[]
  },
  executionNumber: number,
  hasStaticAnalysisSummary: boolean = false
): string {
  const rulesList =
    auditMeta.rules
      ?.map((r) => `  - ${r.filename}（${r.role} / ${r.type} / ${r.tool}）`)
      .join('\n') || '  - なし'
  const programsList =
    auditMeta.programs?.map((p) => `  - ${p.filename}`).join('\n') || '  - なし'

  const staticAnalysisSummaryRow = hasStaticAnalysisSummary
    ? '| static-analysis-summary.md | 静的解析サマリー（AI監査に渡された内容） |\n'
    : ''

  return `# 監査実行データ（${executionNumber}回目）

このZIPファイルには、AI監査実行時の入出力データが含まれています。

## 監査情報

| 項目 | 内容 |
|------|------|
| バージョン | ${auditMeta.version || '-'} |
| モデルID | ${auditMeta.modelId || '-'} |
| 監査実行日時 | ${auditMeta.executedAt || '-'} |
| 実行回数 | ${executionNumber}回目 |
| 入力トークン数 | ${(auditMeta.inputTokens || 0).toLocaleString()} |
| 出力トークン数 | ${(auditMeta.outputTokens || 0).toLocaleString()} |

### 規約ファイル

${rulesList}

### プログラム

${programsList}

## 同梱ファイル

| ファイル名 | 説明 |
|-----------|------|
| README.md | このファイル（監査情報とファイル説明） |
| system-prompt.md | システムプロンプト（役割・目的・出力形式・注意事項） |
| rule-markdown.md | 変換後の規約ファイル（マークダウン形式） |
| code-numbered.txt | 行番号付きプログラム |
${staticAnalysisSummaryRow}| audit-result.md | AI監査結果 |
`
}

export function generateStaticAnalysisMarkdown(result: StaticAnalysisResult): string {
  const summaryLines = [
    `# 静的解析結果`,
    ``,
    `## サマリー`,
    ``,
    `| 項目 | 内容 |`,
    `|------|------|`,
    `| 実行ID | ${result.run_id} |`,
    `| 実行日時 | ${result.timestamp} |`,
    `| 総指摘数 | ${result.summary.total_findings} |`,
    ``,
  ]

  // ツール別集計
  if (Object.keys(result.summary.by_tool).length > 0) {
    summaryLines.push(`### ツール別指摘数`)
    summaryLines.push(``)
    summaryLines.push(`| ツール | 件数 |`)
    summaryLines.push(`|--------|------|`)
    for (const [tool, count] of Object.entries(result.summary.by_tool)) {
      summaryLines.push(`| ${tool} | ${count} |`)
    }
    summaryLines.push(``)
  }

  // 重要度別集計
  if (Object.keys(result.summary.by_severity).length > 0) {
    summaryLines.push(`### 重要度別指摘数`)
    summaryLines.push(``)
    summaryLines.push(`| 重要度 | 件数 |`)
    summaryLines.push(`|--------|------|`)
    for (const [severity, count] of Object.entries(result.summary.by_severity)) {
      summaryLines.push(`| ${severity} | ${count} |`)
    }
    summaryLines.push(``)
  }

  // ツール実行結果
  summaryLines.push(`## ツール実行結果`)
  summaryLines.push(``)
  summaryLines.push(`| ツール | バージョン | ステータス | 実行時間 | 検出数 |`)
  summaryLines.push(`|--------|-----------|----------|---------|--------|`)
  for (const tool of result.tools) {
    const version = tool.version || '-'
    const duration = tool.duration_ms !== null ? `${tool.duration_ms}ms` : '-'
    summaryLines.push(`| ${tool.name} | ${version} | ${tool.status} | ${duration} | ${tool.findings.length} |`)
  }
  summaryLines.push(``)

  // 違反一覧
  if (result.violations.length > 0) {
    summaryLines.push(`## 違反一覧`)
    summaryLines.push(``)
    summaryLines.push(`| # | 重要度 | ツール | ファイル | 行 | ルール | メッセージ |`)
    summaryLines.push(`|---|--------|--------|----------|-----|--------|----------|`)
    result.violations.forEach((v, index) => {
      summaryLines.push(`| ${index + 1} | ${v.severity} | ${v.tool} | ${v.file} | ${v.line}:${v.column} | ${v.rule_id} | ${v.message} |`)
    })
    summaryLines.push(``)
  } else {
    summaryLines.push(`## 違反一覧`)
    summaryLines.push(``)
    summaryLines.push(`違反は検出されませんでした。`)
    summaryLines.push(``)
  }

  return summaryLines.join('\n')
}

export function generateStaticAnalysisReadmeMarkdown(
  result: StaticAnalysisResult,
  programFiles: string[]
): string {
  const programsList = programFiles.length > 0
    ? programFiles.map((f) => `  - ${f}`).join('\n')
    : '  - なし'

  const filesList = [
    `| README.md | このファイル（静的解析情報とファイル説明） |`,
    `| static-analysis-result.md | 静的解析結果 |`,
    ...programFiles.map((f) => `| ${f} | 解析対象プログラム |`),
  ].join('\n')

  return `# 静的解析データ

このZIPファイルには、静的解析実行時の結果データが含まれています。

## 解析情報

| 項目 | 内容 |
|------|------|
| 実行ID | ${result.run_id} |
| 実行日時 | ${result.timestamp} |
| 総指摘数 | ${result.summary.total_findings} |

### 解析対象プログラム

${programsList}

## 同梱ファイル

| ファイル名 | 説明 |
|-----------|------|
${filesList}
`
}
