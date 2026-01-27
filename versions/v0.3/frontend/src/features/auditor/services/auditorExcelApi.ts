/**
 * AIオーディター形式Excel API クライアント
 */

import type {
  SpreadsheetParseResult,
  SpreadsheetSheet,
  SpreadsheetRowSelection,
} from '@core/components/shared/spreadsheet'

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
export function convertSheetsToMarkdown(
  sheets: SpreadsheetSheet[],
  selection?: SpreadsheetRowSelection
): string {
  if (sheets.length === 0) {
    return ''
  }

  const lines: string[] = ['# コーディング規約一覧', '']

  for (const sheet of sheets) {
    const selectedRowIndices = selection?.[sheet.key]

    // 選択行がある場合のみフィルタを適用（シート単位）
    const rowsToProcess =
      selectedRowIndices && selectedRowIndices.length > 0
        ? [...new Set(selectedRowIndices)]
            .filter((index) => Number.isInteger(index) && index >= 0 && index < sheet.data.length)
            .sort((a, b) => a - b)
            .map((index) => sheet.data[index])
        : sheet.data

    // シート名を見出しに
    lines.push(`## ${sheet.title}`)
    lines.push('')

    // 各行をタブ区切りで結合
    for (const row of rowsToProcess) {
      if (!row) continue
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
