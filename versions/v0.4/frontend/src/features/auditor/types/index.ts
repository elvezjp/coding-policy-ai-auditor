// Auditor feature types

export interface RuleFile {
  file: File
  filename: string
  isMain: boolean
  type: string
  tool: string
  markdown?: string
  note?: string
}

// Alias for backward compatibility with spec-related naming
export type DesignFile = RuleFile

export interface CodeFile {
  file: File
  filename: string
  rawContent?: string // 行番号なしの元のコンテンツ（静的解析用）
  contentWithLineNumbers?: string // 行番号付きコンテンツ（AI監査用）
}

export interface ConversionTool {
  name: string
  display_name: string
}

export interface AuditResult {
  report: string
  auditMeta: AuditMeta
}

export interface AuditMeta {
  version: string
  modelId: string
  executedAt: string
  inputTokens: number
  outputTokens: number
  rules: RuleFileMeta[]
  programs: ProgramFileMeta[]
}

export interface RuleFileMeta {
  filename: string
  role: string
  type: string
  tool: string
}

export interface ProgramFileMeta {
  filename: string
}

export interface AuditExecutionData {
  systemPrompt: SystemPromptValues
  ruleMarkdown: string
  codeWithLineNumbers: string
  report: string
  auditMeta: AuditMeta
  staticAnalysisResult?: StaticAnalysisResult | null
  staticAnalysisSummaryMarkdown?: string | null
}

export interface SystemPromptValues {
  role: string
  purpose: string
  format: string
  notes: string
}

export interface SimpleJudgment {
  status: 'ok' | 'warning' | 'ng' | 'unknown'
  ngCount: number
  warningCount: number
  okCount: number
}

export interface LlmConfig {
  provider: 'anthropic' | 'openai' | 'bedrock'
  model: string
  maxTokens: number
  apiKey?: string
  accessKeyId?: string
  secretAccessKey?: string
  region?: string
}

export interface AuditorState {
  // Files
  ruleFiles: RuleFile[]
  codeFiles: CodeFile[]

  // Conversion results
  ruleMarkdown: string | null
  codeWithLineNumbers: string | null

  // Available tools
  availableTools: ConversionTool[]

  // Audit results (2 executions)
  auditResults: (AuditExecutionData | null)[]

  // UI state
  isConverting: boolean
  isAuditing: boolean
  currentTab: number
}

export interface AuditRequest {
  ruleMarkdown: string
  ruleFilename: string
  codeWithLineNumbers: string
  codeFilename: string
  rules: RuleFileForApi[]
  codes: CodeFileForApi[]
  systemPrompt: SystemPromptValues
  executedAt: string
  executionNumber: number
  llmConfig?: LlmConfig
  staticAnalysisSummaryMarkdown?: string
}

export interface RuleFileForApi {
  filename: string
  content: string
  role: string
  isMain: boolean
  type: string
  tool: string
  note: string
}

export interface CodeFileForApi {
  filename: string
  contentWithLineNumbers: string
}

// ===== 静的解析関連の型定義 =====

/** 静的解析ツールの利用可能性 */
export interface StaticAnalysisToolAvailability {
  name: string // ツール名 (checkstyle, pmd, ruff, flake8, pylint)
  available: boolean // 利用可能かどうか
  version: string | null // バージョン情報（利用可能な場合）
  language: 'java' | 'python' // 対象言語
  unavailable_reason: string | null // 利用不可の理由（available=falseの場合）
}

/** 静的解析ツール一覧レスポンス */
export interface StaticAnalysisToolsResponse {
  java_available: boolean // Java解析が可能か（java + checkstyle/pmd）
  python_available: boolean // Python解析が可能か（ruff/flake8/pylint）
  java_unavailable_reason: string | null // Java解析不可の理由
  python_unavailable_reason: string | null // Python解析不可の理由
  tools: StaticAnalysisToolAvailability[]
}

/** 静的解析の違反 */
export interface StaticAnalysisViolation {
  tool: string
  file: string
  line: number
  column: number
  severity: 'error' | 'warning' | 'info'
  rule_id: string
  message: string
}

/** 静的解析ツールの実行結果 */
export interface StaticAnalysisToolResult {
  name: string
  version: string | null
  status: string // 'executed' | 'skipped_not_installed' | 'skipped_no_files' | 'skipped_timeout'等
  exit_code: number | null
  duration_ms: number | null
  config_used: string
  findings: StaticAnalysisViolation[]
  skipped_reason: string | null
}

/** 静的解析結果のサマリー */
export interface StaticAnalysisSummary {
  total_findings: number
  by_tool: Record<string, number>
  by_severity: Record<string, number>
}

/** 静的解析の実行結果 */
export interface StaticAnalysisResult {
  run_id: string
  timestamp: string
  tools: StaticAnalysisToolResult[]
  skipped_tools: Array<{ name: string; reason: string }>
  summary: StaticAnalysisSummary
  violations: StaticAnalysisViolation[]
}

/** 静的解析リクエスト */
export interface StaticAnalysisRequest {
  files: Array<{
    name: string
    path?: string
    content: string
  }>
  enabled: boolean
}

/** 静的解析レスポンス */
export interface StaticAnalysisResponse {
  success: boolean
  result: StaticAnalysisResult | null
  summaryMarkdown: string | null
  error: string | null
}
