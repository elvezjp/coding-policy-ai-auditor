import { useState, useCallback } from 'react'
import type {
  RuleFile,
  CodeFile,
  AuditExecutionData,
  SystemPromptValues,
  LlmConfig,
  SimpleJudgment,
} from '../types'
import * as api from '../services/api'

interface UseAuditExecutionReturn {
  auditResults: (AuditExecutionData | null)[]
  isAuditing: boolean
  currentExecution: number
  totalExecutions: number
  currentTab: number
  auditError: string | null
  executeAudit: (params: {
    ruleFiles: RuleFile[]
    codeFiles: CodeFile[]
    ruleMarkdown: string
    codeWithLineNumbers: string
    systemPrompt: SystemPromptValues
    llmConfig?: LlmConfig
    staticAnalysisSummaryMarkdown?: string
  }) => Promise<void>
  setCurrentTab: (tab: number) => void
  clearResults: () => void
  getSimpleJudgment: (reportText: string) => SimpleJudgment
}

const AUDIT_EXECUTION_COUNT = 2

export function useAuditExecution(): UseAuditExecutionReturn {
  const [auditResults, setAuditResults] = useState<(AuditExecutionData | null)[]>([null, null])
  const [isAuditing, setIsAuditing] = useState(false)
  const [currentExecution, setCurrentExecution] = useState(0)
  const [currentTab, setCurrentTab] = useState(1)
  const [auditError, setAuditError] = useState<string | null>(null)

  const getSimpleJudgment = useCallback((reportText: string): SimpleJudgment => {
    if (!reportText) {
      return { status: 'unknown', ngCount: 0, warningCount: 0, okCount: 0 }
    }

    const text = reportText

    // NG keywords detection
    const ngMatches = text.match(/\bNG\b/gi) || []
    const ngEmojiMatches = text.match(/❌/g) || []
    const ngCount = ngMatches.length + ngEmojiMatches.length

    // Warning keywords detection
    const warningMatches = text.match(/要確認/g) || []
    const warningEmojiMatches = text.match(/⚠️/g) || []
    const warningCount = warningMatches.length + warningEmojiMatches.length

    // OK keywords detection
    const okMatches = text.match(/\bOK\b/gi) || []
    const okEmojiMatches = text.match(/✅/g) || []
    const okCount = okMatches.length + okEmojiMatches.length

    // Determine status
    let status: SimpleJudgment['status']
    if (ngCount > 0) {
      status = 'ng'
    } else if (warningCount > 0) {
      status = 'warning'
    } else {
      status = 'ok'
    }

    return { status, ngCount, warningCount, okCount }
  }, [])

  const executeAudit = useCallback(
    async (params: {
      ruleFiles: RuleFile[]
      codeFiles: CodeFile[]
      ruleMarkdown: string
      codeWithLineNumbers: string
      systemPrompt: SystemPromptValues
      llmConfig?: LlmConfig
      staticAnalysisSummaryMarkdown?: string
    }) => {
      const {
        ruleFiles,
        codeFiles,
        ruleMarkdown,
        codeWithLineNumbers,
        systemPrompt,
        llmConfig,
        staticAnalysisSummaryMarkdown,
      } = params

      setIsAuditing(true)
      setAuditError(null)
      setAuditResults([null, null])
      setCurrentExecution(1)

      const ruleFilename = ruleFiles.map((f) => f.filename).join(', ')
      const codeFilename = codeFiles.map((f) => f.filename).join(', ')

      try {
        const results: (AuditExecutionData | null)[] = [null, null]

        for (let i = 1; i <= AUDIT_EXECUTION_COUNT; i++) {
          setCurrentExecution(i)
          const executedAt = new Date().toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })

          const rules = ruleFiles
            .filter((f) => f.markdown)
            .map((f) => ({
              filename: f.filename,
              content: f.markdown!,
              role: f.isMain ? 'メイン' : '参照',
              isMain: f.isMain,
              type: f.type,
              tool: f.tool,
              note: f.note || '',
            }))

          const codes = codeFiles
            .filter((f) => f.contentWithLineNumbers)
            .map((f) => ({
              filename: f.filename,
              contentWithLineNumbers: f.contentWithLineNumbers!,
            }))

          const result = await api.executeAudit({
            ruleMarkdown,
            ruleFilename,
            codeWithLineNumbers,
            codeFilename,
            rules,
            codes,
            systemPrompt,
            executedAt,
            executionNumber: i,
            llmConfig,
            staticAnalysisSummaryMarkdown,
          })

          if (!result.success) {
            throw new Error(result.error || `監査実行に失敗しました（${i}回目）`)
          }

          results[i - 1] = {
            systemPrompt,
            ruleMarkdown,
            codeWithLineNumbers,
            report: result.report!,
            auditMeta: result.auditMeta!,
            staticAnalysisSummaryMarkdown: staticAnalysisSummaryMarkdown ?? null,
          }

          // Update results immediately so UI can show progress
          setAuditResults([...results])
        }

        setCurrentTab(1)
      } catch (error) {
        setAuditError(error instanceof Error ? error.message : '監査実行に失敗しました')
        throw error
      } finally {
        setIsAuditing(false)
      }
    },
    []
  )

  const clearResults = useCallback(() => {
    setAuditResults([null, null])
    setCurrentTab(1)
    setAuditError(null)
  }, [])

  return {
    auditResults,
    isAuditing,
    currentExecution,
    totalExecutions: AUDIT_EXECUTION_COUNT,
    currentTab,
    auditError,
    executeAudit,
    setCurrentTab,
    clearResults,
    getSimpleJudgment,
  }
}
