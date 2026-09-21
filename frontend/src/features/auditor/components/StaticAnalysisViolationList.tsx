import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, XCircle, Info } from 'lucide-react'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@core/index'
import type { StaticAnalysisViolation } from '../types'

interface StaticAnalysisViolationListProps {
  violations: StaticAnalysisViolation[]
}

export function StaticAnalysisViolationList({ violations }: StaticAnalysisViolationListProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')

  const filteredViolations =
    filter === 'all' ? violations : violations.filter((v) => v.severity === filter)

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
      default:
        return null
    }
  }

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50'
      case 'warning':
        return 'bg-yellow-50'
      case 'info':
        return 'bg-blue-50'
      default:
        return ''
    }
  }

  if (violations.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span>違反一覧 ({violations.length}件)</span>
      </button>

      {isOpen && (
        <div className="mt-2">
          {/* Filter buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setFilter('all')}
              className={`text-xs px-2 py-1 rounded ${
                filter === 'all'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              すべて ({violations.length})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`text-xs px-2 py-1 rounded ${
                filter === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              Error ({violations.filter((v) => v.severity === 'error').length})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`text-xs px-2 py-1 rounded ${
                filter === 'warning'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
              }`}
            >
              Warning ({violations.filter((v) => v.severity === 'warning').length})
            </button>
            <button
              onClick={() => setFilter('info')}
              className={`text-xs px-2 py-1 rounded ${
                filter === 'info'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              Info ({violations.filter((v) => v.severity === 'info').length})
            </button>
          </div>

          {/* Violations table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <Table className="min-w-full text-sm">
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="w-20">重要度</TableHeaderCell>
                  <TableHeaderCell className="w-24">ツール</TableHeaderCell>
                  <TableHeaderCell>ファイル</TableHeaderCell>
                  <TableHeaderCell className="w-16">行</TableHeaderCell>
                  <TableHeaderCell className="w-32">ルール</TableHeaderCell>
                  <TableHeaderCell>メッセージ</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredViolations.map((v, index) => (
                  <TableRow key={index} className={getSeverityBgColor(v.severity)}>
                    <TableCell className="whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        {getSeverityIcon(v.severity)}
                        <span className="text-xs">{v.severity}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{v.tool}</TableCell>
                    <TableCell className="text-xs font-mono truncate max-w-xs" title={v.file}>
                      {v.file}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {v.line}:{v.column}
                    </TableCell>
                    <TableCell className="text-xs font-mono truncate max-w-xs" title={v.rule_id}>
                      {v.rule_id}
                    </TableCell>
                    <TableCell className="text-xs">{v.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredViolations.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500">
              該当する違反はありません
            </div>
          )}
        </div>
      )}
    </div>
  )
}
