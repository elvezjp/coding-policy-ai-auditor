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
 * 1シート目の選択行からリンクされているシート名を抽出
 */
function extractLinkedSheetNames(
  firstSheet: SpreadsheetSheet,
  selectedRowIndices: number[] | undefined
): Set<string> {
  const linkedSheetNames = new Set<string>()

  if (!firstSheet.hyperlinks) {
    return linkedSheetNames
  }

  // 選択行を決定（選択がなければ全行）
  const rowIndicesToCheck =
    selectedRowIndices && selectedRowIndices.length > 0
      ? [...new Set(selectedRowIndices)]
          .filter((index) => Number.isInteger(index) && index >= 0 && index < firstSheet.data.length)
          .sort((a, b) => a - b)
      : Array.from({ length: firstSheet.data.length }, (_, i) => i)

  // 選択行に含まれるハイパーリンクからシート名を抽出
  for (const [key, hyperlink] of Object.entries(firstSheet.hyperlinks)) {
    const [rowStr] = key.split(',')
    const rowIndex = parseInt(rowStr, 10)
    if (rowIndicesToCheck.includes(rowIndex)) {
      linkedSheetNames.add(hyperlink.sheetName)
    }
  }

  return linkedSheetNames
}

/**
 * スプレッドシートデータをMarkdown形式に変換
 *
 * - 1シート目: 選択された行のみを含める
 * - 2シート目以降: 1シート目の選択行からリンクされているシートのみを含める
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

  const firstSheet = sheets[0]
  const firstSheetKey = firstSheet.key
  const selectedRowIndices = selection?.[firstSheetKey]

  // 1シート目の選択行からリンクされているシート名を抽出
  const linkedSheetNames = extractLinkedSheetNames(firstSheet, selectedRowIndices)

  const lines: string[] = ['# コーディング規約一覧', '']

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i]
    const isFirstSheet = i === 0

    if (isFirstSheet) {
      // 1シート目: 選択行のみ（選択がなければ全行）
      const rowsToProcess =
        selectedRowIndices && selectedRowIndices.length > 0
          ? [...new Set(selectedRowIndices)]
              .filter((index) => Number.isInteger(index) && index >= 0 && index < sheet.data.length)
              .sort((a, b) => a - b)
              .map((index) => sheet.data[index])
          : sheet.data

      lines.push(`## ${sheet.title}`)
      lines.push('')

      for (const row of rowsToProcess) {
        if (!row) continue
        const rowText = row.join('\t')
        if (rowText.trim()) {
          lines.push(rowText)
        }
      }
      lines.push('')
    } else {
      // 2シート目以降: リンクされているシートのみ含める
      if (!linkedSheetNames.has(sheet.title)) {
        continue // リンクされていないシートはスキップ
      }

      lines.push(`## ${sheet.title}`)
      lines.push('')

      for (const row of sheet.data) {
        if (!row) continue
        const rowText = row.join('\t')
        if (rowText.trim()) {
          lines.push(rowText)
        }
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
