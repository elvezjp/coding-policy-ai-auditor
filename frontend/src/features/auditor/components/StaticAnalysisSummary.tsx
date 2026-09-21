import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'
import type { StaticAnalysisSummary as SummaryType } from '../types'

interface StaticAnalysisSummaryProps {
  summary: SummaryType
}

export function StaticAnalysisSummary({ summary }: StaticAnalysisSummaryProps) {
  const hasFindings = summary.total_findings > 0
  const errorCount = summary.by_severity.error || 0
  const warningCount = summary.by_severity.warning || 0
  const infoCount = summary.by_severity.info || 0

  return (
    <div
      className={`rounded-lg p-4 ${
        errorCount > 0
          ? 'bg-red-50 border border-red-200'
          : warningCount > 0
          ? 'bg-yellow-50 border border-yellow-200'
          : hasFindings
          ? 'bg-blue-50 border border-blue-200'
          : 'bg-green-50 border border-green-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full p-2 ${
            errorCount > 0
              ? 'bg-red-100'
              : warningCount > 0
              ? 'bg-yellow-100'
              : hasFindings
              ? 'bg-blue-100'
              : 'bg-green-100'
          }`}
        >
          {errorCount > 0 ? (
            <XCircle className="w-6 h-6 text-red-600" />
          ) : warningCount > 0 ? (
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          ) : hasFindings ? (
            <Info className="w-6 h-6 text-blue-600" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-600" />
          )}
        </span>
        <div>
          <div
            className={`font-bold text-lg ${
              errorCount > 0
                ? 'text-red-700'
                : warningCount > 0
                ? 'text-yellow-700'
                : hasFindings
                ? 'text-blue-700'
                : 'text-green-700'
            }`}
          >
            {hasFindings ? `${summary.total_findings}件の指摘` : '指摘なし'}
          </div>
          {hasFindings && (
            <div className="text-sm text-gray-600 flex gap-3 mt-1">
              {errorCount > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-500" />
                  Error: {errorCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                  Warning: {warningCount}
                </span>
              )}
              {infoCount > 0 && (
                <span className="flex items-center gap-1">
                  <Info className="w-3 h-3 text-blue-500" />
                  Info: {infoCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* By tool breakdown */}
      {Object.keys(summary.by_tool).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">ツール別:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.by_tool).map(([tool, count]) => (
              <span
                key={tool}
                className="text-xs px-2 py-1 bg-white rounded border border-gray-300"
              >
                {tool}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
