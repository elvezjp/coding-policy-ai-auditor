import { useCallback } from 'react'
import JSZip from 'jszip'
import type { AuditExecutionData, StaticAnalysisResult, CodeFile } from '../types'
import {
  generateSystemPromptMarkdown,
  generateReadmeMarkdown,
  generateStaticAnalysisMarkdown,
  generateStaticAnalysisReadmeMarkdown,
} from '../services/markdown'

interface UseZipExportReturn {
  downloadZip: (data: AuditExecutionData, executionNumber: number) => Promise<void>
  downloadStaticAnalysisZip: (result: StaticAnalysisResult, codeFiles: CodeFile[]) => Promise<void>
  downloadReport: (report: string, executionNumber: number) => void
  copyReport: (report: string) => Promise<void>
  downloadRuleMarkdown: (markdown: string) => void
  downloadCodeWithLineNumbers: (code: string) => void
}

export function useZipExport(): UseZipExportReturn {
  const downloadZip = useCallback(
    async (data: AuditExecutionData, executionNumber: number) => {
      const zip = new JSZip()

      // Generate timestamp from executedAt (YYYY/MM/DD HH:MM:SS → YYYYMMDD-HHMMSS)
      const timestamp = data.auditMeta.executedAt
        .replace(/[\/\s:]/g, '')
        .replace(/(\d{8})(\d{6})/, '$1-$2')
      const executionNumberFormatted = String(executionNumber).padStart(3, '0')

      // Add system prompt
      const systemPromptMd = generateSystemPromptMarkdown(data.systemPrompt)
      zip.file('system-prompt.md', systemPromptMd)

      // Add rule markdown
      zip.file('rule-markdown.md', data.ruleMarkdown)

      // Add code with line numbers
      zip.file('code-numbered.txt', data.codeWithLineNumbers)

      // Add static analysis summary if available
      const hasStaticAnalysisSummary = !!data.staticAnalysisSummaryMarkdown
      if (hasStaticAnalysisSummary) {
        zip.file('static-analysis-summary.md', data.staticAnalysisSummaryMarkdown!)
      }

      // Add audit result
      zip.file('audit-result.md', data.report)

      // Add README
      const readme = generateReadmeMarkdown(data.auditMeta, executionNumber, hasStaticAnalysisSummary)
      zip.file('README.md', readme)

      // Generate and download
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${timestamp}-${executionNumberFormatted}-audit-data.zip`
      a.click()
      URL.revokeObjectURL(url)
    },
    []
  )

  const downloadStaticAnalysisZip = useCallback(
    async (result: StaticAnalysisResult, codeFiles: CodeFile[]) => {
      const zip = new JSZip()

      // Generate timestamp from result.timestamp (YYYY/MM/DD HH:MM:SS → YYYYMMDD-HHMMSS)
      const timestamp = result.timestamp
        .replace(/[\/\s:]/g, '')
        .replace(/(\d{8})(\d{6})/, '$1-$2')
        .replace(/[-T:]/g, '')
        .substring(0, 15)

      // Add static analysis result markdown
      const resultMd = generateStaticAnalysisMarkdown(result)
      zip.file('static-analysis-result.md', resultMd)

      // Add program files
      const programFilenames: string[] = []
      for (const codeFile of codeFiles) {
        if (codeFile.rawContent) {
          zip.file(codeFile.filename, codeFile.rawContent)
          programFilenames.push(codeFile.filename)
        }
      }

      // Add README
      const readme = generateStaticAnalysisReadmeMarkdown(result, programFilenames)
      zip.file('README.md', readme)

      // Generate and download
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${timestamp}-static-analysis-data.zip`
      a.click()
      URL.revokeObjectURL(url)
    },
    []
  )

  const downloadReport = useCallback((report: string, executionNumber: number) => {
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-report-${executionNumber}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const copyReport = useCallback(async (report: string) => {
    await navigator.clipboard.writeText(report)
  }, [])

  const downloadRuleMarkdown = useCallback((markdown: string) => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rule-markdown.md'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const downloadCodeWithLineNumbers = useCallback((code: string) => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'code-numbered.txt'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return {
    downloadZip,
    downloadStaticAnalysisZip,
    downloadReport,
    copyReport,
    downloadRuleMarkdown,
    downloadCodeWithLineNumbers,
  }
}
