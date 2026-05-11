import { describe, it, expect } from 'vitest'
import { convertSheetsToMarkdown } from '@features/auditor/services/auditorExcelApi'
import type { SpreadsheetSheet, SpreadsheetRowSelection } from '@core/components/shared/spreadsheet'

describe('convertSheetsToMarkdown', () => {
  const createMockSheet = (
    title: string,
    key: string,
    data: string[][],
    hyperlinks: Record<string, { sheetName: string; cell: string }> = {}
  ): SpreadsheetSheet => ({
    title,
    key,
    data,
    rows: data.length,
    columns: data[0]?.length || 0,
    hyperlinks,
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

    it('複数シートでリンクがない場合、1シート目のみ含まれる', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('Sheet1', 'Sheet1', [['A1', 'B1']]),
        createMockSheet('Sheet2', 'Sheet2', [['A2', 'B2']]),
      ]

      const result = convertSheetsToMarkdown(sheets)
      expect(result).toContain('## Sheet1')
      expect(result).not.toContain('## Sheet2')
      expect(result).toContain('A1\tB1')
      expect(result).not.toContain('A2\tB2')
    })

    it('複数シートでリンクがある場合、リンク先シートも含まれる', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('規約一覧', 'Sheet1', [['規約1', '詳細']], {
          '0,1': { sheetName: '詳細シート', cell: 'A1' },
        }),
        createMockSheet('詳細シート', 'Sheet2', [['詳細内容', '説明']]),
      ]

      const result = convertSheetsToMarkdown(sheets)
      expect(result).toContain('## 規約一覧')
      expect(result).toContain('## 詳細シート')
      expect(result).toContain('規約1\t詳細')
      expect(result).toContain('詳細内容\t説明')
    })
  })

  describe('1シート目の選択行フィルタ', () => {
    it('選択がない場合は1シート目の全行を含む', () => {
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

    it('選択行がある場合、1シート目の選択行のみを含む', () => {
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

  describe('2シート目以降のリンクベースフィルタ', () => {
    it('選択行からリンクされているシートのみ含まれる', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet(
          '規約一覧',
          'Sheet1',
          [
            ['規約1', '詳細A'],
            ['規約2', '詳細B'],
            ['規約3', '詳細C'],
          ],
          {
            '0,1': { sheetName: '詳細シートA', cell: 'A1' },
            '1,1': { sheetName: '詳細シートB', cell: 'A1' },
            '2,1': { sheetName: '詳細シートC', cell: 'A1' },
          }
        ),
        createMockSheet('詳細シートA', 'Sheet2', [['詳細A内容']]),
        createMockSheet('詳細シートB', 'Sheet3', [['詳細B内容']]),
        createMockSheet('詳細シートC', 'Sheet4', [['詳細C内容']]),
      ]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [0, 2], // 規約1と規約3を選択（詳細シートAとCにリンク）
      }

      const result = convertSheetsToMarkdown(sheets, selection)
      expect(result).toContain('## 規約一覧')
      expect(result).toContain('## 詳細シートA')
      expect(result).not.toContain('## 詳細シートB') // 規約2は選択されていない
      expect(result).toContain('## 詳細シートC')
      expect(result).toContain('詳細A内容')
      expect(result).not.toContain('詳細B内容')
      expect(result).toContain('詳細C内容')
    })

    it('複数の規約が同一シートにリンクしている場合、いずれか選択されていれば含まれる', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet(
          '規約一覧',
          'Sheet1',
          [
            ['規約1', '詳細'],
            ['規約2', '詳細'],
            ['規約3', '詳細'],
          ],
          {
            '0,1': { sheetName: '共通詳細シート', cell: 'A1' },
            '1,1': { sheetName: '共通詳細シート', cell: 'A1' },
            '2,1': { sheetName: '共通詳細シート', cell: 'A1' },
          }
        ),
        createMockSheet('共通詳細シート', 'Sheet2', [['共通詳細内容']]),
      ]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [1], // 規約2のみ選択
      }

      const result = convertSheetsToMarkdown(sheets, selection)
      expect(result).toContain('## 共通詳細シート')
      expect(result).toContain('共通詳細内容')
    })

    it('選択がない場合、全リンク先シートが含まれる', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet(
          '規約一覧',
          'Sheet1',
          [
            ['規約1', '詳細A'],
            ['規約2', '詳細B'],
          ],
          {
            '0,1': { sheetName: '詳細シートA', cell: 'A1' },
            '1,1': { sheetName: '詳細シートB', cell: 'A1' },
          }
        ),
        createMockSheet('詳細シートA', 'Sheet2', [['詳細A内容']]),
        createMockSheet('詳細シートB', 'Sheet3', [['詳細B内容']]),
      ]

      const result = convertSheetsToMarkdown(sheets, {})
      expect(result).toContain('## 詳細シートA')
      expect(result).toContain('## 詳細シートB')
    })

    it('リンクがないシートは2シート目以降に含まれない', () => {
      const sheets: SpreadsheetSheet[] = [
        createMockSheet('規約一覧', 'Sheet1', [['規約1', '詳細']], {
          '0,1': { sheetName: '詳細シートA', cell: 'A1' },
        }),
        createMockSheet('詳細シートA', 'Sheet2', [['詳細A内容']]),
        createMockSheet('未リンクシート', 'Sheet3', [['未リンク内容']]),
      ]

      const result = convertSheetsToMarkdown(sheets)
      expect(result).toContain('## 詳細シートA')
      expect(result).not.toContain('## 未リンクシート')
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
      const sheets: SpreadsheetSheet[] = [createMockSheet('Sheet1', 'Sheet1', [])]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [0],
      }

      expect(() => convertSheetsToMarkdown(sheets, selection)).not.toThrow()
      const result = convertSheetsToMarkdown(sheets, selection)
      expect(result).toContain('## Sheet1')
    })

    it('1行のみのシートで選択・解除が正常に動作', () => {
      const sheets: SpreadsheetSheet[] = [createMockSheet('Sheet1', 'Sheet1', [['A1', 'B1']])]

      const selection: SpreadsheetRowSelection = {
        Sheet1: [0],
      }

      const result = convertSheetsToMarkdown(sheets, selection)
      expect(result).toContain('A1\tB1')

      const resultNoSelection = convertSheetsToMarkdown(sheets, {})
      expect(resultNoSelection).toContain('A1\tB1')
    })

    it('存在しないシートキーの選択は無視される', () => {
      const sheets: SpreadsheetSheet[] = [createMockSheet('Sheet1', 'Sheet1', [['A1', 'B1']])]

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

    it('ハイパーリンクがないシートでも正常に動作', () => {
      const sheets: SpreadsheetSheet[] = [
        {
          title: 'Sheet1',
          key: 'Sheet1',
          data: [['A1', 'B1']],
          rows: 1,
          columns: 2,
          hyperlinks: {},
        },
      ]

      const result = convertSheetsToMarkdown(sheets)
      expect(result).toContain('## Sheet1')
      expect(result).toContain('A1\tB1')
    })
  })
})
