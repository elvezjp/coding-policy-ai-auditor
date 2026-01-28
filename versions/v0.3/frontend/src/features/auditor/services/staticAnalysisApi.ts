// Static analysis API service

import type {
  StaticAnalysisToolsResponse,
  StaticAnalysisRequest,
  StaticAnalysisResponse,
} from '../types'

const getBackendUrl = (): string => {
  return ''
}

/**
 * 静的解析ツールの利用可能性を取得
 */
export async function fetchStaticAnalysisTools(): Promise<StaticAnalysisToolsResponse> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/static-analysis/tools`)
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('静的解析ツール情報の取得に失敗:', error)
    return {
      java_available: false,
      python_available: false,
      java_unavailable_reason: 'ツール情報の取得に失敗しました',
      python_unavailable_reason: 'ツール情報の取得に失敗しました',
      tools: [],
    }
  }
}

/**
 * 静的解析を実行
 */
export async function runStaticAnalysis(
  request: StaticAnalysisRequest
): Promise<StaticAnalysisResponse> {
  const response = await fetch(`${getBackendUrl()}/api/static-analysis/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    return {
      success: false,
      result: null,
      summaryMarkdown: null,
      error: `HTTP error: ${response.status}`,
    }
  }

  return await response.json()
}
