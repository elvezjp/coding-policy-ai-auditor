import { useState, useCallback, useEffect } from 'react'
import type {
  StaticAnalysisToolsResponse,
  StaticAnalysisResult,
  CodeFile,
} from '../types'
import * as staticAnalysisApi from '../services/staticAnalysisApi'

const STORAGE_KEY = 'auditor_static_analysis_enabled'

interface RunAnalysisResult {
  result: StaticAnalysisResult | null
  summaryMarkdown: string | null
}

interface UseStaticAnalysisReturn {
  // ツール情報
  toolsInfo: StaticAnalysisToolsResponse | null
  isLoadingTools: boolean

  // 設定
  isEnabled: boolean
  setIsEnabled: (enabled: boolean) => void

  // 解析状態
  isAnalyzing: boolean
  analysisResult: StaticAnalysisResult | null
  summaryMarkdown: string | null
  analysisError: string | null

  // アクション
  loadTools: () => Promise<void>
  runAnalysis: (codeFiles: CodeFile[]) => Promise<RunAnalysisResult>
  clearResult: () => void
}

export function useStaticAnalysis(): UseStaticAnalysisReturn {
  const [toolsInfo, setToolsInfo] = useState<StaticAnalysisToolsResponse | null>(null)
  const [isLoadingTools, setIsLoadingTools] = useState(false)
  const [hasInitializedDefault, setHasInitializedDefault] = useState(false)

  const [isEnabled, setIsEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== null ? JSON.parse(stored) : false
  })

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<StaticAnalysisResult | null>(null)
  const [summaryMarkdown, setSummaryMarkdown] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // LocalStorageに設定を保存
  const setIsEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled))
  }, [])

  // ツール情報を読み込み
  const loadTools = useCallback(async () => {
    setIsLoadingTools(true)
    try {
      const info = await staticAnalysisApi.fetchStaticAnalysisTools()
      setToolsInfo(info)

      // 初回ロード時、LocalStorageに保存されていない場合はツールが利用可能ならONにする
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === null && !hasInitializedDefault) {
        const hasAnyTool = info.java_available || info.python_available
        if (hasAnyTool) {
          setIsEnabledState(true)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(true))
        }
        setHasInitializedDefault(true)
      }
    } catch (error) {
      console.error('静的解析ツール情報の取得に失敗:', error)
      setToolsInfo({
        java_available: false,
        python_available: false,
        java_unavailable_reason: 'ツール情報の取得に失敗しました',
        python_unavailable_reason: 'ツール情報の取得に失敗しました',
        tools: [],
      })
    } finally {
      setIsLoadingTools(false)
    }
  }, [hasInitializedDefault])

  // 静的解析を実行
  const runAnalysis = useCallback(async (codeFiles: CodeFile[]): Promise<RunAnalysisResult> => {
    if (!isEnabled) {
      return { result: null, summaryMarkdown: null }
    }

    // 解析対象ファイルを準備（rawContentを使用）
    const files = codeFiles
      .filter((cf) => cf.rawContent)
      .map((cf) => ({
        name: cf.filename,
        content: cf.rawContent!,
      }))

    if (files.length === 0) {
      setAnalysisError('解析対象のファイルがありません')
      return { result: null, summaryMarkdown: null }
    }

    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResult(null)
    setSummaryMarkdown(null)

    try {
      const response = await staticAnalysisApi.runStaticAnalysis({
        files,
        enabled: true,
      })

      if (!response.success) {
        setAnalysisError(response.error || '静的解析に失敗しました')
        return { result: null, summaryMarkdown: null }
      }

      setAnalysisResult(response.result)
      setSummaryMarkdown(response.summaryMarkdown)
      return { result: response.result, summaryMarkdown: response.summaryMarkdown }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '静的解析中にエラーが発生しました'
      setAnalysisError(errorMessage)
      return { result: null, summaryMarkdown: null }
    } finally {
      setIsAnalyzing(false)
    }
  }, [isEnabled])

  // 結果をクリア
  const clearResult = useCallback(() => {
    setAnalysisResult(null)
    setSummaryMarkdown(null)
    setAnalysisError(null)
  }, [])

  // 初回マウント時にツール情報を読み込む
  useEffect(() => {
    loadTools()
  }, [loadTools])

  return {
    toolsInfo,
    isLoadingTools,
    isEnabled,
    setIsEnabled,
    isAnalyzing,
    analysisResult,
    summaryMarkdown,
    analysisError,
    loadTools,
    runAnalysis,
    clearResult,
  }
}
