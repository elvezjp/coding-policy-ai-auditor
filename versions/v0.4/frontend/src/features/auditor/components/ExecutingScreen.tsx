interface ExecutingScreenProps {
  currentExecution: number
  totalExecutions?: number
  isStaticAnalysisEnabled?: boolean
  isAnalyzingStatic?: boolean
}

export function ExecutingScreen({
  currentExecution,
  totalExecutions = 2,
  isStaticAnalysisEnabled = false,
  isAnalyzingStatic = false,
}: ExecutingScreenProps) {
  const getStatusText = () => {
    if (isStaticAnalysisEnabled && isAnalyzingStatic) {
      return '静的解析を実行中...'
    }
    if (currentExecution === 0) {
      return '準備中...'
    }
    return `${currentExecution}回目の監査を実行しています${
      totalExecutions > 1 ? ` (${currentExecution}/${totalExecutions})` : ''
    }`
  }

  const getMainText = () => {
    if (isStaticAnalysisEnabled && isAnalyzingStatic) {
      return '静的解析ツールが実行中...'
    }
    return 'AIが監査を実行中...'
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-6"></div>
        <p className="text-gray-600 text-lg">{getMainText()}</p>
        <p className="text-gray-400 mt-2">{getStatusText()}</p>
        {isStaticAnalysisEnabled && (
          <div className="mt-4 text-sm text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isAnalyzingStatic ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                }`}
              ></span>
              <span>静的解析</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  !isAnalyzingStatic && currentExecution > 0 ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                }`}
              ></span>
              <span>AI監査</span>
            </div>
          </div>
        )}
        <p className="text-gray-400 text-xs mt-4">
          ※ 5分以上かかる場合はタイムアウトする可能性があります
        </p>
      </div>
    </div>
  )
}
