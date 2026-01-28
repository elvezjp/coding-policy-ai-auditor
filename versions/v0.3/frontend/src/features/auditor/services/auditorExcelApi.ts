/**
 * AIオーディター形式Excel API クライアント
 */

import type { SpreadsheetParseResult, SpreadsheetSheet } from '@core/components/shared/spreadsheet'

const getBackendUrl = (): string => {
  return ''
}

/**
 * AIオーディター形式Excelをスプレッドシート形式で解析
 */
export async function parseAuditorExcelSpreadsheet(file: File): Promise<SpreadsheetParseResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${getBackendUrl()}/api/convert/auditor-excel-spreadsheet`, {
    method: 'POST',
    body: formData,
  })

  return await response.json()
}

/**
 * スプレッドシートデータをMarkdown形式に変換
 *
 * - 各シートのタイトルを見出し(##)にする
 * - 各行をタブ区切りで結合
 */
export function convertSheetsToMarkdown(sheets: SpreadsheetSheet[]): string {
  if (sheets.length === 0) {
    return ''
  }

  const lines: string[] = ['# コーディング規約一覧', '']

  for (const sheet of sheets) {
    // シート名を見出しに
    lines.push(`## ${sheet.title}`)
    lines.push('')

    // 各行をタブ区切りで結合
    for (const row of sheet.data) {
      const rowText = row.join('\t')
      // 空行はスキップ
      if (rowText.trim()) {
        lines.push(rowText)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}
