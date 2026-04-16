import {
  XCircle,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  FileText,
  Clipboard,
  Save,
  Package,
  Download,
  Search,
} from 'lucide-react'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@core/index'
import type { AuditExecutionData, SimpleJudgment, AuditMeta, StaticAnalysisResult, CodeFile } from '../types'
import { StaticAnalysisTabContent } from './StaticAnalysisTabContent'

type TabType = 'static-analysis' | 'audit-1' | 'audit-2'

interface AuditResultProps {
  results: (AuditExecutionData | null)[]
  staticAnalysisResult?: StaticAnalysisResult | null
  codeFiles: CodeFile[]
  currentTab: TabType
  onTabChange: (tab: TabType) => void
  onCopyReport: (report: string) => void
  onDownloadReport: (report: string, executionNumber: number) => void
  onDownloadZip: (data: AuditExecutionData, executionNumber: number) => void
  onDownloadStaticAnalysisZip: () => void
  getSimpleJudgment: (reportText: string) => SimpleJudgment
  onBack: () => void
}

export function AuditResult({
  results,
  staticAnalysisResult,
  codeFiles,
  currentTab,
  onTabChange,
  onCopyReport,
  onDownloadReport,
  onDownloadZip,
  onDownloadStaticAnalysisZip,
  getSimpleJudgment,
  onBack,
}: AuditResultProps) {
  const currentAuditResult =
    currentTab === 'audit-1' ? results[0] : currentTab === 'audit-2' ? results[1] : null
  const showStaticAnalysisTab = !!staticAnalysisResult

  const statusConfig = {
    ng: {
      label: '問題あり',
      icon: <XCircle className="w-6 h-6 text-red-600" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      iconBg: 'bg-red-100',
    },
    warning: {
      label: '確認が必要',
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      iconBg: 'bg-yellow-100',
    },
    ok: {
      label: '問題なし',
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      iconBg: 'bg-green-100',
    },
    unknown: {
      label: '不明',
      icon: <HelpCircle className="w-6 h-6 text-gray-600" />,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-700',
      iconBg: 'bg-gray-100',
    },
  }

  const renderSimpleJudgment = (judgment: SimpleJudgment) => {
    const config = statusConfig[judgment.status]
    const countParts = []
    if (judgment.ngCount > 0) {
      countParts.push(`NG: ${judgment.ngCount}件`)
    }
    if (judgment.warningCount > 0) {
      countParts.push(`要確認: ${judgment.warningCount}件`)
    }
    if (judgment.okCount > 0) {
      countParts.push(`OK: ${judgment.okCount}件`)
    }
    const countText = countParts.length > 0 ? countParts.join(' / ') : '検出なし'

    return (
      <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}>
        <div className="flex items-center gap-3">
          <span className={`${config.iconBg} rounded-full p-2`}>{config.icon}</span>
          <div>
            <div className={`font-bold ${config.textColor} text-lg`}>{config.label}</div>
            <div className="text-sm text-gray-600">{countText}</div>
          </div>
        </div>
      </div>
    )
  }

  const renderAuditMeta = (meta: AuditMeta) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-600">バージョン:</div>
          <div className="text-gray-800">{meta.version || '-'}</div>
          <div className="text-gray-600">モデルID:</div>
          <div className="text-gray-800">{meta.modelId || '-'}</div>
          <div className="text-gray-600">監査実行日時:</div>
          <div className="text-gray-800">{meta.executedAt || '-'}</div>
          <div className="text-gray-600">トークン数:</div>
          <div className="text-gray-800">
            入力 {(meta.inputTokens || 0).toLocaleString()} / 出力{' '}
            {(meta.outputTokens || 0).toLocaleString()}
          </div>
        </div>

        {meta.rules && meta.rules.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">規約:</h3>
            <div className="overflow-x-auto">
              <Table className="min-w-full text-sm">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>ファイル名</TableHeaderCell>
                    <TableHeaderCell>役割</TableHeaderCell>
                    <TableHeaderCell>種別</TableHeaderCell>
                    <TableHeaderCell>ツール</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {meta.rules.map((r) => (
                    <TableRow key={r.filename}>
                      <TableCell>{r.filename}</TableCell>
                      <TableCell>{r.role}</TableCell>
                      <TableCell>{r.type}</TableCell>
                      <TableCell>{r.tool}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {meta.programs && meta.programs.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">プログラム:</h3>
            <div className="overflow-x-auto">
              <Table className="min-w-full text-sm">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>ファイル名</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {meta.programs.map((p) => (
                    <TableRow key={p.filename}>
                      <TableCell>{p.filename}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    )
  }

  const getDownloadFiles = (auditResult: AuditExecutionData | null) => {
    const baseFiles = [
      { name: 'README.md', desc: '監査情報と同梱ファイルの説明' },
      { name: 'system-prompt.md', desc: 'システムプロンプト（役割・目的・出力形式・注意事項）' },
      { name: 'rule-markdown.md', desc: '変換後の規約（マークダウン形式）' },
      { name: 'code-numbered.txt', desc: '行番号付きプログラム' },
    ]

    if (auditResult?.staticAnalysisSummaryMarkdown) {
      baseFiles.push({ name: 'static-analysis-summary.md', desc: '静的解析サマリー（AI監査に渡された内容）' })
    }

    baseFiles.push({ name: 'audit-result.md', desc: 'AI監査結果' })

    return baseFiles
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    ...(showStaticAnalysisTab
      ? [{ id: 'static-analysis' as TabType, label: '静的解析', icon: <Search className="w-4 h-4" /> }]
      : []),
    { id: 'audit-1' as TabType, label: 'AI監査1回目', icon: <FileText className="w-4 h-4" /> },
    { id: 'audit-2' as TabType, label: 'AI監査2回目', icon: <FileText className="w-4 h-4" /> },
  ]

  const getExecutionNumber = (tab: TabType): number => {
    return tab === 'audit-1' ? 1 : 2
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with tabs */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-800">監査結果</h1>
          <button onClick={onBack} className="text-blue-500 hover:text-blue-700">
            ← 戻る
          </button>
        </div>
        {/* Tab buttons */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                currentTab === tab.id
                  ? 'text-white bg-blue-500'
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          {showStaticAnalysisTab
            ? '※ 静的解析とAI監査（2回）の結果を確認できます。'
            : '※ 同じ設定で2回監査を実行しました。それぞれ個別に結果を確認できます。'}
        </p>
      </div>

      {/* Static Analysis Tab Content */}
      {currentTab === 'static-analysis' && staticAnalysisResult && (
        <StaticAnalysisTabContent
          result={staticAnalysisResult}
          codeFiles={codeFiles}
          onDownloadZip={onDownloadStaticAnalysisZip}
        />
      )}

      {/* AI Audit Tab Content */}
      {(currentTab === 'audit-1' || currentTab === 'audit-2') && currentAuditResult && (
        <>
          {/* Simple judgment */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">簡易判定</h2>
            {renderSimpleJudgment(getSimpleJudgment(currentAuditResult.report))}
            <p className="text-xs text-gray-400 mt-3">
              ※
              この判定はキーワードに基づく簡易的なものです。AIの出力によっては正しく判定されない場合があります。詳細レポートを確認してください。
            </p>
          </div>

          {/* Audit meta */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">監査情報</h2>
            {renderAuditMeta(currentAuditResult.auditMeta)}
          </div>

          {/* Detailed report */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" /> 詳細レポート
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96 mb-4">
              <pre className="whitespace-pre-wrap text-gray-700">{currentAuditResult.report}</pre>
            </div>
            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => onCopyReport(currentAuditResult.report)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 rounded-lg shadow-md transition text-sm flex items-center justify-center gap-2"
              >
                <Clipboard className="w-4 h-4" /> コピー
              </button>
              <button
                onClick={() => onDownloadReport(currentAuditResult.report, getExecutionNumber(currentTab))}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg shadow-md transition text-sm flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> ダウンロード
              </button>
            </div>
          </div>

          {/* Zip download */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" /> 監査実行データ一式ダウンロード
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              監査実行の入出力データを一式ダウンロードできます。
            </p>

            {/* Download file list */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">ダウンロード内容:</h3>
              <Table className="text-sm text-gray-600">
                <TableBody>
                  {getDownloadFiles(currentAuditResult).map((f) => (
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
              onClick={() => onDownloadZip(currentAuditResult, getExecutionNumber(currentTab))}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg shadow-md transition flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" /> 一式ダウンロード（ZIP）
            </button>
          </div>
        </>
      )}
    </div>
  )
}
