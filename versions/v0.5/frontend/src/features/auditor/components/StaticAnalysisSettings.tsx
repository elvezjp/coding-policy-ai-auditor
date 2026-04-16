import { useState } from 'react'
import { CheckCircle, AlertCircle, ChevronDown, XCircle } from 'lucide-react'
import type { StaticAnalysisToolsResponse } from '../types'

interface StaticAnalysisSettingsProps {
  toolsInfo: StaticAnalysisToolsResponse | null
  isEnabled: boolean
  onEnabledChange: (enabled: boolean) => void
  isLoading: boolean
}

export function StaticAnalysisSettings({
  toolsInfo,
  isEnabled,
  onEnabledChange,
  isLoading,
}: StaticAnalysisSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasAnyTool = toolsInfo && (toolsInfo.java_available || toolsInfo.python_available)

  // ツールを言語別にグループ化
  const javaTools = toolsInfo?.tools.filter((t) => t.language === 'java') || []
  const pythonTools = toolsInfo?.tools.filter((t) => t.language === 'python') || []

  // 詳細コンテンツ
  const detailContent = (
    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
      {/* Java tools */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {toolsInfo?.java_available ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-gray-400" />
          )}
          <span
            className={`text-sm font-medium ${toolsInfo?.java_available ? 'text-gray-700' : 'text-gray-400'}`}
          >
            Java静的解析ツール
          </span>
        </div>
        {/* Java解析が利用不可の場合、理由を表示 */}
        {toolsInfo && !toolsInfo.java_available && toolsInfo.java_unavailable_reason && (
          <div className="ml-6 mb-2 text-xs text-yellow-600">
            {toolsInfo.java_unavailable_reason}
          </div>
        )}
        {javaTools.length > 0 && (
          <div className="ml-6 space-y-1">
            {javaTools.map((tool) => (
              <div key={tool.name} className="flex items-center gap-1 text-xs">
                {tool.available ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-gray-300" />
                )}
                <span className={tool.available ? 'text-gray-700' : 'text-gray-400'}>
                  {tool.name}
                  {tool.available && tool.version && ` (${tool.version})`}
                </span>
                {!tool.available && tool.unavailable_reason && (
                  <span className="text-gray-400 ml-1">- {tool.unavailable_reason}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Python tools */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {toolsInfo?.python_available ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-gray-400" />
          )}
          <span
            className={`text-sm font-medium ${toolsInfo?.python_available ? 'text-gray-700' : 'text-gray-400'}`}
          >
            Python静的解析ツール
          </span>
        </div>
        {/* Python解析が利用不可の場合、理由を表示 */}
        {toolsInfo && !toolsInfo.python_available && toolsInfo.python_unavailable_reason && (
          <div className="ml-6 mb-2 text-xs text-yellow-600">
            {toolsInfo.python_unavailable_reason}
          </div>
        )}
        {pythonTools.length > 0 && (
          <div className="ml-6 space-y-1">
            {pythonTools.map((tool) => (
              <div key={tool.name} className="flex items-center gap-1 text-xs">
                {tool.available ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-gray-300" />
                )}
                <span className={tool.available ? 'text-gray-700' : 'text-gray-400'}>
                  {tool.name}
                  {tool.available && tool.version && ` (${tool.version})`}
                </span>
                {!tool.available && tool.unavailable_reason && (
                  <span className="text-gray-400 ml-1">- {tool.unavailable_reason}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* ヘッダー: タイトルと開閉アイコン */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center text-lg font-semibold text-gray-800"
      >
        <span>静的解析設定</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Toggle - 左側に配置 */}
      <div className="flex items-center gap-3 mt-4">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            disabled={isLoading || !hasAnyTool}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
        </label>
        <span className="text-gray-700 font-medium">
          Java/Pythonファイルに対して静的解析ツールを実行する
        </span>
      </div>

      {/* 利用可能状態のサブテキスト - トグルボタンの下に常に表示 */}
      {!isLoading && toolsInfo && (
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1">
            {toolsInfo.java_available ? (
              <CheckCircle className="w-3 h-3 text-green-500" />
            ) : (
              <XCircle className="w-3 h-3 text-gray-300" />
            )}
            <span className={toolsInfo.java_available ? 'text-gray-600' : 'text-gray-400'}>
              Java静的解析: {toolsInfo.java_available ? '利用可能' : '利用不可'}
            </span>
          </span>
          <span className="flex items-center gap-1">
            {toolsInfo.python_available ? (
              <CheckCircle className="w-3 h-3 text-green-500" />
            ) : (
              <XCircle className="w-3 h-3 text-gray-300" />
            )}
            <span className={toolsInfo.python_available ? 'text-gray-600' : 'text-gray-400'}>
              Python静的解析: {toolsInfo.python_available ? '利用可能' : '利用不可'}
            </span>
          </span>
        </div>
      )}

      {/* Warning if no tools available - 常に表示 */}
      {!isLoading && toolsInfo && !hasAnyTool && (
        <div className="flex items-center gap-2 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-700">
            静的解析ツールがインストールされていません。
          </span>
        </div>
      )}

      {/* Tool availability - 開閉式 */}
      {isLoading ? (
        <div className="text-sm text-gray-500 mt-4">ツール情報を読み込み中...</div>
      ) : toolsInfo ? (
        <div className={isExpanded ? '' : 'hidden'}>{detailContent}</div>
      ) : (
        <div className="text-sm text-red-500 mt-4">ツール情報の取得に失敗しました</div>
      )}
    </div>
  )
}
