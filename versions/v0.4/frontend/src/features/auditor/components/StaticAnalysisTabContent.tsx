import { Package, Download, FileText, Clock, Wrench } from 'lucide-react'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@core/index'
import type { StaticAnalysisResult, CodeFile } from '../types'
import { StaticAnalysisSummary } from './StaticAnalysisSummary'
import { StaticAnalysisViolationList } from './StaticAnalysisViolationList'

interface StaticAnalysisTabContentProps {
  result: StaticAnalysisResult
  codeFiles: CodeFile[]
  onDownloadZip: () => void
}

export function StaticAnalysisTabContent({
  result,
  codeFiles,
  onDownloadZip,
}: StaticAnalysisTabContentProps) {
  const executedTools = result.tools.filter((tool) => tool.status === 'executed')
  const downloadFiles = [
    { name: 'README.md', desc: '静的解析情報と同梱ファイルの説明' },
    { name: 'static-analysis-result.md', desc: '静的解析結果（マークダウン形式）' },
    ...codeFiles.map((f) => ({ name: f.filename, desc: '解析対象プログラム' })),
  ]

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">解析結果サマリー</h2>
        <StaticAnalysisSummary summary={result.summary} />
      </div>

      {/* Execution info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5" /> 解析情報
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-600">実行ID:</div>
          <div className="text-gray-800 font-mono text-xs">{result.run_id}</div>
          <div className="text-gray-600">実行日時:</div>
          <div className="text-gray-800">{result.timestamp}</div>
        </div>

        {/* Tool results */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Clock className="w-4 h-4" /> ツール別実行結果
          </h3>
          {executedTools.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-full text-sm">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>ツール</TableHeaderCell>
                    <TableHeaderCell>バージョン</TableHeaderCell>
                    <TableHeaderCell>ステータス</TableHeaderCell>
                    <TableHeaderCell>実行時間</TableHeaderCell>
                    <TableHeaderCell>検出数</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {executedTools.map((tool) => (
                    <TableRow key={tool.name}>
                      <TableCell className="font-medium">{tool.name}</TableCell>
                      <TableCell className="text-xs font-mono">{tool.version || '-'}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                          {tool.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {tool.duration_ms !== null ? `${tool.duration_ms}ms` : '-'}
                      </TableCell>
                      <TableCell className="text-xs">{tool.findings.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-xs text-gray-500">実行されたツールはありません</div>
          )}
        </div>

        {/* Skipped tools */}
        {result.skipped_tools.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">スキップされたツール:</h3>
            <div className="flex flex-wrap gap-2">
              {result.skipped_tools.map((tool, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                  title={tool.reason}
                >
                  {tool.name}: {tool.reason}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Violations list */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" /> 違反詳細
        </h2>
        {result.violations.length > 0 ? (
          <StaticAnalysisViolationList violations={result.violations} />
        ) : (
          <div className="text-center py-8 text-gray-500">
            違反は検出されませんでした
          </div>
        )}
      </div>

      {/* Zip download */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" /> 静的解析データ一式ダウンロード
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          静的解析の結果とプログラムファイルを一式ダウンロードできます。
        </p>

        {/* Download file list */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">ダウンロード内容:</h3>
          <Table className="text-sm text-gray-600">
            <TableBody>
              {downloadFiles.map((f) => (
                <TableRow key={f.name}>
                  <TableCell className="font-mono text-xs py-1 pr-2 align-top whitespace-nowrap border-0">
                    {f.name}
                  </TableCell>
                  <TableCell className="py-1 border-0">{f.desc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <button
          onClick={onDownloadZip}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg shadow-md transition flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" /> 一式ダウンロード（ZIP）
        </button>
      </div>
    </div>
  )
}
