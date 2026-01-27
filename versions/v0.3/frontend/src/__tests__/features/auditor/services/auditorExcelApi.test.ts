import { describe, it, expect } from 'vitest'
import { convertSheetsToMarkdown } from '@features/auditor/services/auditorExcelApi'
import type { SpreadsheetSheet, SpreadsheetRowSelection } from '@core/components/shared/spreadsheet'

describe('convertSheetsToMarkdown', () => {
  const createMockSheet = (
    title: string,
    key: string,
    data: string[][]
  ): SpreadsheetSheet => ({
    title,
    key,
    data,
    rows: data.length,
    columns: data[0]?.length || 0,
    hyperlinks: {},
  })

  describe('基本機能', () => {
    it('空のシート配列は空文字列を返す', () => {
      expect(convertSheetsToMarkdown([])).toBe('')
    })

    it('シートが1つの場合、全行をMarkdownに変換', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [
          ['A1', 'B1', 'C1'],
          ['A2', 'B2', 'C2'],
          ['A3', 'B3', 'C3'],
        ]),
      ]

      const result = convertSheetsToMarkdown(sheets)
      expect(result).toContain('## Sheet1')
      expect(result).toContain('A1\tB1\tC1')
      expect(result).toContain('A2\tB2\tC2')
      expect(result).toContain('A3\tB3\tC3')
    })

    it('複数シートの場合、すべてのシートが含まれる', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [['A1', 'B1']]),
        createMockSheet('Sheet2', 'Sheet2', [['A2', 'B2']]),
      ]

      const result = convertSheetsToMarkdown(sheets)
      expect(result).toContain('## Sheet1')
      expect(result).toContain('## Sheet2')
      expect(result).toContain('A1\tB1')
      expect(result).toContain('A2\tB2')
    })
  })

  describe('選択行フィルタ', () => {
    it('選択がない場合は全行を含む', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [
          ['A1', 'B1'],
          ['A2', 'B2'],
          ['A3', 'B3'],
        ]),
      ]

      const result = convertSheetsToMarkdown(sheets, {})
      expect(result).toContain('A1\tB1')
      expect(result).toContain('A2\tB2')
      expect(result).toContain('A3\tB3')
    })

    it('選択行がある場合、選択行のみを含む', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [
          ['A1', 'B1'],
          ['A2', 'B2'],
          ['A3', 'B3'],
        ]),
      ]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [0, 2], // 1行目と3行目を選択
      }

      const result = convertSheetsToMarkdown(sheets, selection)
      expect(result).toContain('A1\tB1')
      expect(result).not.toContain('A2\tB2')
      expect(result).toContain('A3\tB3')
    })

    it('複数シートで選択がある場合、各シートの選択行のみを含む', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [
          ['A1', 'B1'],
          ['A2', 'B2'],
        ]),
        createMockSheet('Sheet2', 'Sheet2', [
          ['C1', 'D1'],
          ['C2', 'D2'],
          ['C3', 'D3'],
        ]),
      ]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [0], // Sheet1の1行目のみ
        Sheet2: [1, 2], // Sheet2の2行目と3行目
      }

      const result = convertSheetsToMarkdown(sheets, selection)
      // Sheet1
      expect(result).toContain('A1\tB1')
      expect(result).not.toContain('A2\tB2')
      // Sheet2
      expect(result).not.toContain('C1\tD1')
      expect(result).toContain('C2\tD2')
      expect(result).toContain('C3\tD3')
    })

    it('選択行が重複している場合、一意化される', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [
          ['A1', 'B1'],
          ['A2', 'B2'],
          ['A3', 'B3'],
        ]),
      ]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [0, 1, 0, 1], // 重複あり
      }

      const result = convertSheetsToMarkdown(sheets, selection)
      const lines = result.split('\n')
      const a1Count = lines.filter((line) => line.includes('A1')).length
      const a2Count = lines.filter((line) => line.includes('A2')).length
      expect(a1Count).toBe(1)
      expect(a2Count).toBe(1)
    })

    it('選択行が昇順でソートされる', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [
          ['A1', 'B1'],
          ['A2', 'B2'],
          ['A3', 'B3'],
        ]),
      ]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [2, 0, 1], // 順序がバラバラ
      }

      const result = convertSheetsToMarkdown(sheets, selection)
      const lines = result.split('\n')
      const a1Index = lines.findIndex((line) => line.includes('A1'))
      const a2Index = lines.findIndex((line) => line.includes('A2'))
      const a3Index = lines.findIndex((line) => line.includes('A3'))

      expect(a1Index).toBeLessThan(a2Index)
      expect(a2Index).toBeLessThan(a3Index)
    })
  })

  describe('エッジケース', () => {
    it('存在しない行インデックスは無視される', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [
          ['A1', 'B1'],
          ['A2', 'B2'],
        ]),
      ]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [0, 5, 10], // 存在しない行インデックスを含む
      }

      const result = convertSheetsToMarkdown(sheets, selection)
      expect(result).toContain('A1\tB1')
      expect(result).not.toContain('A2\tB2')
    })

    it('負の行インデックスは無視される', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [
          ['A1', 'B1'],
          ['A2', 'B2'],
        ]),
      ]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [-1, 0, 1],
      }

      const result = convertSheetsToMarkdown(sheets, selection)
      expect(result).toContain('A1\tB1')
      expect(result).toContain('A2\tB2')
    })

    it('空のシート（0行）で選択操作してもエラーが発生しない', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', []),
      ]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [0],
      }

      expect(() => convertSheetsToMarkdown(sheets, selection)).not.toThrow()
      const result = convertSheetsToMarkdown(sheets, selection)
      expect(result).toContain('## Sheet1')
    })

    it('1行のみのシートで選択・解除が正常に動作', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [['A1', 'B1']]),
      ]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [0],
      }

      const result = convertSheetsToMarkdown(sheets, selection)
      expect(result).toContain('A1\tB1')

      const resultNoSelection = convertSheetsToMarkdown(sheets, {})
      expect(resultNoSelection).toContain('A1\tB1')
    })

    it('存在しないシートキーの選択は無視される', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [['A1', 'B1']]),
      ]

      const selection: SpreadsheetRowSelection = {
        NonExistentSheet: [0],
      }

      const result = convertSheetsToMarkdown(sheets, selection)
      expect(result).toContain('A1\tB1') // 全行が含まれる
    })

    it('空行はスキップされる', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [
          ['A1', 'B1'],
          ['', ''], // 空行
          ['A3', 'B3'],
        ]),
      ]

      const result = convertSheetsToMarkdown(sheets)
      expect(result).toContain('A1\tB1')
      expect(result).toContain('A3\tB3')
      // 空行は含まれない
      const lines = result.split('\n')
      const emptyLineCount = lines.filter((line) => line.trim() === '').length
      expect(emptyLineCount).toBeLessThanOrEqual(3) // 見出しの空行のみ
    })
  })
})
