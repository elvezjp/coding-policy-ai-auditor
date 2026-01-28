/**
 * 規約入力セクション
 * AIオーディター形式とExcelマークダウン変換をタブで切り替え
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Download, ChevronDown, ChevronRight } from 'lucide-react'
import { Tabs, ExcelSpreadsheetLoader } from '@core/index'
import type {
  SpreadsheetParseResult,
  SpreadsheetSheet,
  SpreadsheetRowSelection,
} from '@core/components/shared/spreadsheet'
import type { DesignFile, ConversionTool } from '../types'
import { parseAuditorExcelSpreadsheet, convertSheetsToMarkdown } from '../services/auditorExcelApi'
import { SpecFileList } from './SpecFileList'

export type RuleInputMode = 'auditor' | 'excel-markdown'

export interface AuditorRuleInfo {
  filename: string
  sheetCount: number
}

interface RuleInputSectionProps {
  // Excel Markdown変換用
  files: DesignFile[]
  availableTools: ConversionTool[]
  specTypesList: string[]
  specMarkdown: string | null
  specStatus: string
  isConverting: boolean
  onMainChange: (filename: string) => void
  onTypeChange: (filename: string, type: string) => void
  onToolChange: (filename: string, tool: string) => void
  onApplyToolToAll: (tool: string) => void
  onConvert: () => void
  onDownload: () => void
  onFilesSelect: (files: File[]) => void

  // AIオーディター形式用
  onAuditorMarkdownChange: (markdown: string) => void
  onAuditorFileChange?: (info: AuditorRuleInfo | null) => void
}

const RULE_INPUT_TABS = [
  { id: 'auditor', label: 'AIオーディター形式' },
  { id: 'excel-markdown', label: 'Excelマークダウン変換' },
]

export function RuleInputSection({
  files,
  availableTools,
  specTypesList,
  specMarkdown,
  specStatus,
  isConverting,
  onMainChange,
  onTypeChange,
  onToolChange,
  onApplyToolToAll,
  onConvert,
  onDownload,
  onFilesSelect,
  onAuditorMarkdownChange,
  onAuditorFileChange,
}: RuleInputSectionProps) {
  const [activeTab, setActiveTab] = useState<RuleInputMode>('auditor')
  const [auditorSheets, setAuditorSheets] = useState<SpreadsheetSheet[]>([])
  const [auditorMarkdown, setAuditorMarkdown] = useState<string>('')
  const [_auditorFilename, setAuditorFilename] = useState<string>('')
  const [auditorSelection, setAuditorSelection] = useState<SpreadsheetRowSelection>({})
  const [isAuditorPreviewOpen, setIsAuditorPreviewOpen] = useState(true)
  const selectionDebounceRef = useRef<number | null>(null)

  const clearSelectionDebounce = useCallback(() => {
    if (selectionDebounceRef.current !== null) {
      window.clearTimeout(selectionDebounceRef.current)
      selectionDebounceRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearSelectionDebounce()
    }
  }, [clearSelectionDebounce])

  const normalizeSelectionForSheets = useCallback(
    (selection: SpreadsheetRowSelection, sheets: SpreadsheetSheet[]): SpreadsheetRowSelection => {
      const normalized: SpreadsheetRowSelection = {}
      for (const sheet of sheets) {
        const indices = selection[sheet.key]
        if (!indices || indices.length === 0) continue
        const validIndices = [...new Set(indices)]
          .filter((index) => Number.isInteger(index) && index >= 0 && index < sheet.data.length)
          .sort((a, b) => a - b)
        if (validIndices.length > 0) {
          normalized[sheet.key] = validIndices
        }
      }
      return normalized
    },
    []
  )

  const areSelectionsEqual = useCallback(
    (a: SpreadsheetRowSelection, b: SpreadsheetRowSelection): boolean => {
      const aKeys = Object.keys(a).sort()
      const bKeys = Object.keys(b).sort()
      if (aKeys.length !== bKeys.length) return false
      for (let i = 0; i < aKeys.length; i++) {
        if (aKeys[i] !== bKeys[i]) return false
        const aVals = a[aKeys[i]] || []
        const bVals = b[bKeys[i]] || []
        if (aVals.length !== bVals.length) return false
        for (let j = 0; j < aVals.length; j++) {
          if (aVals[j] !== bVals[j]) return false
        }
      }
      return true
    },
    []
  )

  const selectedRowCount = useMemo(() => {
    return Object.values(auditorSelection).reduce((sum, indices) => sum + indices.length, 0)
  }, [auditorSelection])

  const regenerateAuditorMarkdown = useCallback(
    (sheets: SpreadsheetSheet[], selection: SpreadsheetRowSelection) => {
      const markdown = convertSheetsToMarkdown(sheets, selection)
      setAuditorMarkdown(markdown)
      onAuditorMarkdownChange(markdown)
    },
    [onAuditorMarkdownChange]
  )

  // AIオーディター形式Excel解析（スプレッドシート表示用）
  const handleAuditorExcelParse = useCallback(
    async (file: File): Promise<SpreadsheetParseResult> => {
      // スプレッドシート表示用の解析
      const spreadsheetResult = await parseAuditorExcelSpreadsheet(file)

      if (spreadsheetResult.success) {
        clearSelectionDebounce()
        setAuditorSheets(spreadsheetResult.sheets)
        setAuditorFilename(file.name)
        setAuditorSelection({})
        // シートデータからマークダウンを生成
        regenerateAuditorMarkdown(spreadsheetResult.sheets, {})
        // 親にファイル情報を通知
        onAuditorFileChange?.({
          filename: file.name,
          sheetCount: spreadsheetResult.sheets.length,
        })
      } else {
        // 失敗時はクリア
        clearSelectionDebounce()
        setAuditorFilename('')
        setAuditorSelection({})
        onAuditorFileChange?.(null)
      }

      return spreadsheetResult
    },
    [clearSelectionDebounce, onAuditorFileChange, regenerateAuditorMarkdown]
  )

  const handleAuditorRowSelectionChange = useCallback(
    (nextSelection: SpreadsheetRowSelection) => {
      if (auditorSheets.length === 0) return

      const normalizedSelection = normalizeSelectionForSheets(nextSelection, auditorSheets)
      if (areSelectionsEqual(normalizedSelection, auditorSelection)) {
        return
      }

      setAuditorSelection(normalizedSelection)
      clearSelectionDebounce()

      selectionDebounceRef.current = window.setTimeout(() => {
        regenerateAuditorMarkdown(auditorSheets, normalizedSelection)
        selectionDebounceRef.current = null
      }, 100)
    },
    [
      auditorSheets,
      auditorSelection,
      clearSelectionDebounce,
      normalizeSelectionForSheets,
      areSelectionsEqual,
      regenerateAuditorMarkdown,
    ]
  )

  const handleClearSelection = useCallback(() => {
    if (auditorSheets.length === 0) return
    clearSelectionDebounce()
    setAuditorSelection({})
    regenerateAuditorMarkdown(auditorSheets, {})
  }, [auditorSheets, clearSelectionDebounce, regenerateAuditorMarkdown])

  // AIオーディター形式のマークダウンダウンロード
  const handleAuditorDownload = useCallback(() => {
    if (!auditorMarkdown) return
    const blob = new Blob([auditorMarkdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rule-markdown.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [auditorMarkdown])

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">規約 (Excel)</h2>

      {/* タブ切り替え */}
      <Tabs
        tabs={RULE_INPUT_TABS}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as RuleInputMode)}
        className="mb-4"
      />

      {/* AIオーディター形式タブ */}
      {activeTab === 'auditor' && (
        <div>
          <ExcelSpreadsheetLoader
            parseExcel={handleAuditorExcelParse}
            emptyMessage="AIオーディター形式のExcelファイルを選択してください"
            selectedRows={auditorSelection}
            onRowSelectionChange={handleAuditorRowSelectionChange}
          />

          {/* シート数と変換結果 */}
          {auditorSheets.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={handleAuditorDownload}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition"
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  ダウンロード
                </button>
                <span className="text-sm text-gray-600">
                  {auditorSheets.length}シートをマークダウンに変換しました
                </span>
                <span className="text-sm text-gray-500">
                  {selectedRowCount > 0
                    ? `選択中: ${selectedRowCount}行（選択行のみ送信）`
                    : '選択なし: 全行を送信'}
                </span>
                {selectedRowCount > 0 && (
                  <button
                    onClick={handleClearSelection}
                    className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                  >
                    選択解除
                  </button>
                )}
              </div>

              {/* マークダウンプレビュー */}
              <button
                onClick={() => setIsAuditorPreviewOpen(!isAuditorPreviewOpen)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
              >
                {isAuditorPreviewOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>変換結果をプレビュー</span>
              </button>
              {isAuditorPreviewOpen && (
                <div className="mt-2">
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 max-h-64 overflow-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                      {auditorMarkdown}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Excelマークダウン変換タブ */}
      {activeTab === 'excel-markdown' && (
        <div>
          {/* ファイル選択 */}
          <div className="flex items-center gap-2 mb-2">
            <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition text-sm">
              ファイルを選択
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                multiple
                onChange={(e) => {
                  const selectedFiles = Array.from(e.target.files || [])
                  if (selectedFiles.length > 0) {
                    onFilesSelect(selectedFiles)
                  }
                  e.target.value = ''
                }}
              />
            </label>
            <span className="text-gray-600 text-sm">
              {files.length > 0
                ? files.map((f) => f.filename).join(', ')
                : '選択してください'}
            </span>
          </div>

          {/* SpecFileList */}
          <SpecFileList
            files={files}
            availableTools={availableTools}
            specTypesList={specTypesList}
            specMarkdown={specMarkdown}
            specStatus={specStatus}
            isConverting={isConverting}
            onMainChange={onMainChange}
            onTypeChange={onTypeChange}
            onToolChange={onToolChange}
            onApplyToolToAll={onApplyToolToAll}
            onConvert={onConvert}
            onDownload={onDownload}
          />
        </div>
      )}
    </div>
  )
}
