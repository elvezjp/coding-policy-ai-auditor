import { useState, useCallback, useEffect } from 'react'
import type { LlmConfig, SystemPromptValues } from '../types'
import type { SpecType, SystemPromptPreset, ReviewerConfig, LlmSettings } from '@core/types'
import { DEFAULT_LLM_SETTINGS } from '@core/hooks/useSettings'

// Auditor用のデフォルト規約種別（configSchemaと同じ内容）
const AUDITOR_DEFAULT_SPEC_TYPES: SpecType[] = [
  { type: 'コーディング規約', note: 'コードがこの規約に準拠しているかを確認してください' },
  { type: 'ネーミングルール', note: '命名規則に従っているかを確認してください' },
  { type: 'セキュリティポリシー', note: 'セキュリティ要件を満たしているかを確認してください' },
  { type: 'コード品質規約', note: 'コード品質基準を満たしているかを確認してください' },
  { type: '製造ガイド', note: 'このガイドラインに従って実装されているかを確認してください' },
  { type: '設計ガイド', note: 'この設計方針に従って実装されているかを確認してください' },
]

// Auditor用のデフォルトシステムプロンプト
const AUDITOR_DEFAULT_SYSTEM_PROMPTS: SystemPromptPreset[] = [
  {
    name: '標準監査プリセット',
    role: 'あなたはコーディング規約の監査を行う専門家です。コードの品質と保守性を重視します。',
    purpose: `提供されるコーディング規約に基づいてプログラムコードを監査し、違反箇所を特定してください。

各違反について、以下の情報を提供してください：
1. 行番号
2. 違反内容の説明（具体的な問題点を明記）
3. 修正案（具体的なコード例を含む）
4. 重要度（明確な違反の場合は「NG」、判断が難しい場合は「要確認」）`,
    format: `マークダウン形式で、以下の順に出力してください：
1. サマリー（監査日時、ファイル名、総合判定）
2. 監査結果一覧（テーブル形式：行番号、違反内容、重要度）
3. 詳細（違反箇所の説明と修正案）`,
    notes: `- メイン規約の内容に基づいて監査してください。
- 判定は「OK」「NG」「要確認」の3段階で行ってください。
- 軽微な違反も見逃さないでください。
- 重要度が高い問題を優先して報告してください。
- 規約を引用する際は、見出し番号や項目番号を明示してください。
- プログラムを引用する際は、行番号を必ず添えてください。
- 各規約ファイルの冒頭に記載されている役割、種別、注意事項を考慮してください。
- メイン以外の規約は必要な場合に参照してください。
- 静的解析結果は参考情報として利用してください。監査は規約の内容に基づいて実行してください。`,
  },
  {
    name: '詳細分析プリセット',
    role: 'あなたはコーディング規約の監査を行うシニアエンジニアです。コードの品質と保守性を重視します。',
    purpose: `提供されるコーディング規約に基づいてプログラムコードを詳細に監査し、違反箇所を特定してください。

各違反について、以下の情報を詳細に提供してください：
1. 行番号
2. 違反内容の説明（具体的な問題点を明記）
3. 修正案（具体的なコード例を含む）
4. 重要度（明確な違反の場合は「NG」、判断が難しい場合は「要確認」）
5. 違反がコードの品質や保守性に与える影響`,
    format: `マークダウン形式で、以下の順に出力してください：
1. サマリー（監査日時、ファイル名、総合判定、違反件数の内訳）
2. 監査結果一覧（テーブル形式：行番号、違反内容、重要度、影響度）
3. 詳細（違反箇所の説明、修正案、品質への影響）
4. 改善提案（コード品質向上のための追加提案）`,
    notes: `- メイン規約の内容に基づいて監査してください。
- 判定は「OK」「NG」「要確認」の3段階で行ってください。
- 軽微な違反も見逃さないでください。コードの品質と保守性を重視して監査してください。
- 重要度が高い問題を優先して報告してください。
- 規約を引用する際は、見出し番号や項目番号を明示してください。
- プログラムを引用する際は、行番号を必ず添えてください。
- 各規約ファイルの冒頭に記載されている役割、種別、注意事項を考慮してください。
- メイン以外の規約は必要な場合に参照してください。
- 規約に明示されていないが、一般的なベストプラクティスに反する箇所も報告してください。
- 静的解析結果は参考情報として利用してください。監査は規約の内容に基づいて実行してください。`,
  },
]

// AuditorConfig is aliased from ReviewerConfig (same structure)
type AuditorConfig = ReviewerConfig

export interface ConfigLoadStatus {
  llm?: string
  specTypes?: string
  prompts?: string
}

interface UseAuditorSettingsReturn {
  // LLM settings
  llmConfig: LlmConfig | null
  selectedModel: string
  setSelectedModel: (model: string) => void

  // Spec types
  specTypesConfig: SpecType[]
  getTypeNote: (type: string) => string
  getSpecTypesList: () => string[]

  // System prompts
  systemPromptPresets: SystemPromptPreset[]
  selectedPreset: string
  currentPromptValues: SystemPromptValues
  selectPreset: (presetName: string) => void
  updatePromptValue: (field: keyof SystemPromptValues, value: string) => void

  // Config file
  auditorConfig: AuditorConfig | null
  configFilename: string | null
  configModified: boolean
  configLoadStatus: ConfigLoadStatus | null
  loadConfigFile: (file: File) => Promise<void>
  saveConfigToBrowser: () => void
  clearSavedConfig: () => void
  hasSavedConfig: () => boolean
}

const STORAGE_KEY = 'auditor-config'
const SELECTED_MODEL_KEY = 'selected-model'
const SELECTED_PROMPT_KEY = 'selected-system-prompt'

// 最初の:でのみ分割（モデル名に:が含まれる場合に対応）
const parseSelectedModelKey = (key: string): { provider: string; model: string } | null => {
  const firstColonIndex = key.indexOf(':')
  if (firstColonIndex === -1) return null
  return {
    provider: key.substring(0, firstColonIndex),
    model: key.substring(firstColonIndex + 1),
  }
}

export function useAuditorSettings(): UseAuditorSettingsReturn {
  const [auditorConfig, setAuditorConfig] = useState<AuditorConfig | null>(null)
  const [configFilename, setConfigFilename] = useState<string | null>(null)
  const [configModified, setConfigModified] = useState(false)
  const [configLoadStatus, setConfigLoadStatus] = useState<ConfigLoadStatus | null>(null)
  const [selectedModel, setSelectedModelState] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')
  const [currentPromptValues, setCurrentPromptValues] = useState<SystemPromptValues>({
    role: '',
    purpose: '',
    format: '',
    notes: '',
  })

  // Derived values
  const specTypesConfig: SpecType[] =
    auditorConfig?.specTypes && auditorConfig.specTypes.length > 0
      ? auditorConfig.specTypes
      : AUDITOR_DEFAULT_SPEC_TYPES

  const systemPromptPresets: SystemPromptPreset[] =
    auditorConfig?.systemPrompts && auditorConfig.systemPrompts.length > 0
      ? auditorConfig.systemPrompts
      : AUDITOR_DEFAULT_SYSTEM_PROMPTS

  const llmConfig: LlmConfig | null = auditorConfig?.llm?.provider
    ? {
        provider: auditorConfig.llm.provider as LlmConfig['provider'],
        model: selectedModel || auditorConfig.llm.models?.[0] || '',
        maxTokens: auditorConfig.llm.maxTokens || DEFAULT_LLM_SETTINGS.maxTokens,
        apiKey: auditorConfig.llm.apiKey,
        accessKeyId: auditorConfig.llm.accessKeyId,
        secretAccessKey: auditorConfig.llm.secretAccessKey,
        region: auditorConfig.llm.region,
      }
    : null

  // モデル選択変更時にlocalStorageにも保存
  const setSelectedModel = useCallback(
    (model: string) => {
      setSelectedModelState(model)
      // プロバイダーとモデルをセットで保存（v0.5.2互換）
      if (model && auditorConfig?.llm?.provider) {
        localStorage.setItem(SELECTED_MODEL_KEY, `${auditorConfig.llm.provider}:${model}`)
      }
    },
    [auditorConfig?.llm?.provider]
  )

  const getTypeNote = useCallback(
    (type: string): string => {
      const found = specTypesConfig.find((item) => item.type === type)
      if (found) return found.note
      const defaultFound = AUDITOR_DEFAULT_SPEC_TYPES.find((item) => item.type === type)
      return defaultFound ? defaultFound.note : ''
    },
    [specTypesConfig]
  )

  const getSpecTypesList = useCallback((): string[] => {
    return specTypesConfig.map((item) => item.type)
  }, [specTypesConfig])

  const normalizePromptText = (text: string | undefined): string => {
    if (!text) return ''
    return String(text).replace(/<br\s*\/?>/gi, '\n')
  }

  const selectPreset = useCallback(
    (presetName: string) => {
      const preset =
        systemPromptPresets.find((p) => p.name === presetName) || systemPromptPresets[0]
      if (!preset) return

      setSelectedPreset(preset.name)
      setCurrentPromptValues({
        role: normalizePromptText(preset.role),
        purpose: normalizePromptText(preset.purpose),
        format: normalizePromptText(preset.format),
        notes: normalizePromptText(preset.notes),
      })
      localStorage.setItem(SELECTED_PROMPT_KEY, preset.name)
    },
    [systemPromptPresets]
  )

  const updatePromptValue = useCallback((field: keyof SystemPromptValues, value: string) => {
    setCurrentPromptValues((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  const parseAuditorConfig = (content: string): ReviewerConfig => {
    const result: ReviewerConfig = {
      info: { version: '', created_at: '' },
      llm: undefined,
      specTypes: [],
      systemPrompts: [],
    }

    // Initialize LLM with partial values - will be completed during parsing
    const llmData: Partial<LlmSettings> = {
      models: [],
    }

    const llmKeyMap: Record<string, string> = {
      api_key: 'apiKey',
      access_key_id: 'accessKeyId',
      secret_access_key: 'secretAccessKey',
      max_tokens: 'maxTokens',
    }
    const normalizeLLMKey = (key: string) => llmKeyMap[key] || key

    const lines = content.split('\n')
    let currentSection: string | null = null
    let currentSubSection: string | null = null
    let inModels = false
    let currentPrompt: Partial<SystemPromptPreset> | null = null
    let currentPromptField: string | null = null
    let currentPromptFieldContent: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Section header detection
      if (trimmed.startsWith('## ')) {
        // Save current prompt if exists
        if (currentPrompt && currentPrompt.name) {
          if (currentPromptField && currentPromptFieldContent.length > 0) {
            (currentPrompt as Record<string, unknown>)[currentPromptField] = currentPromptFieldContent.join('\n')
          }
          if (!result.systemPrompts) result.systemPrompts = []
          result.systemPrompts.push(currentPrompt as SystemPromptPreset)
          currentPrompt = null
          currentPromptField = null
          currentPromptFieldContent = []
        }

        currentSection = trimmed.substring(3).toLowerCase().trim()
        currentSubSection = null
        inModels = false
        continue
      }

      // Sub-section header detection
      if (trimmed.startsWith('### ')) {
        // Save current prompt if exists
        if (currentPrompt && currentPrompt.name) {
          if (currentPromptField && currentPromptFieldContent.length > 0) {
            (currentPrompt as Record<string, unknown>)[currentPromptField] = currentPromptFieldContent.join('\n')
          }
          if (!result.systemPrompts) result.systemPrompts = []
          result.systemPrompts.push(currentPrompt as SystemPromptPreset)
        }

        currentSubSection = trimmed.substring(4).trim()
        currentPromptField = null
        currentPromptFieldContent = []

        if (currentSection === 'systemprompts') {
          currentPrompt = { name: currentSubSection }
        }
        continue
      }

      // Field header detection for systemPrompts
      if (currentSection === 'systemprompts' && currentPrompt && trimmed.startsWith('#### ')) {
        // Save previous field
        if (currentPromptField && currentPromptFieldContent.length > 0) {
          (currentPrompt as Record<string, unknown>)[currentPromptField] = currentPromptFieldContent.join('\n')
        }

        const fieldName = trimmed.substring(5).toLowerCase().trim()
        currentPromptField = fieldName
        currentPromptFieldContent = []
        continue
      }

      // Collect field content for systemPrompts
      if (currentSection === 'systemprompts' && currentPrompt && currentPromptField) {
        if (trimmed !== '') {
          currentPromptFieldContent.push(line)
        } else if (currentPromptFieldContent.length > 0) {
          currentPromptFieldContent.push('')
        }
        continue
      }

      // LLM section
      if (currentSection === 'llm') {
        // モデルリスト項目の処理（  - model-name）
        if (inModels && trimmed.startsWith('- ')) {
          const model = trimmed.substring(2).trim()
          if (model && llmData.models) {
            llmData.models.push(model)
          }
          continue
        }

        // - models: の検出
        if (trimmed === '- models:') {
          inModels = true
          llmData.models = []
          continue
        }

        // 通常のプロパティ（- key: value）
        const match = trimmed.match(/^-\s*(\w+):\s*(.+)$/)
        if (match) {
          inModels = false
          const key = normalizeLLMKey(match[1])
          let value: string | number = match[2]

          if (key === 'maxTokens') {
            value = parseInt(value as string, 10)
          }
          (llmData as Record<string, unknown>)[key] = value
        }
      }

      // specTypes section
      if (currentSection === 'spectypes') {
        if (trimmed.startsWith('|') && !trimmed.includes('---')) {
          const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean)
          if (cells.length >= 2 && cells[0] !== '種別' && cells[0] !== 'type') {
            if (!result.specTypes) result.specTypes = []
            result.specTypes.push({
              type: cells[0],
              note: cells[1] || '',
            })
          }
        }
      }

      // info section
      if (currentSection === 'info') {
        if (trimmed.startsWith('- ')) {
          const keyValue = trimmed.substring(2)
          const colonIndex = keyValue.indexOf(':')
          if (colonIndex !== -1) {
            const key = keyValue.substring(0, colonIndex).trim()
            const value = keyValue.substring(colonIndex + 1).trim()
            if (!result.info) result.info = { version: '', created_at: '' }
            if (key === 'version') {
              result.info.version = value
            } else if (key === 'generated_at' || key === 'created_at') {
              result.info.created_at = value
            }
          }
        }
      }
    }

    // Save last prompt
    if (currentPrompt && currentPrompt.name) {
      if (currentPromptField && currentPromptFieldContent.length > 0) {
        (currentPrompt as Record<string, unknown>)[currentPromptField] = currentPromptFieldContent.join('\n')
      }
      if (!result.systemPrompts) result.systemPrompts = []
      result.systemPrompts.push(currentPrompt as SystemPromptPreset)
    }

    // Only set llm if provider is set
    if (llmData.provider) {
      result.llm = llmData as LlmSettings
    }

    return result
  }

  const loadConfigFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.md')) {
      throw new Error('Markdownファイル (.md) を選択してください')
    }

    const content = await file.text()
    const parsed = parseAuditorConfig(content)

    setAuditorConfig(parsed)
    setConfigFilename(file.name)
    setConfigModified(true)

    // 更新結果のステータスを生成
    const llmUpdated = !!(parsed.llm && parsed.llm.provider)
    const specUpdated = !!(parsed.specTypes && parsed.specTypes.length > 0)
    const promptsUpdated = !!(parsed.systemPrompts && parsed.systemPrompts.length > 0)

    setConfigLoadStatus({
      llm: llmUpdated
        ? '・LLM設定を更新しました'
        : '・LLM設定は更新されませんでした',
      specTypes: specUpdated
        ? '・規約種別と注意事項を更新しました'
        : '・規約種別と注意事項は更新されませんでした',
      prompts: promptsUpdated
        ? `・システムプロンプトプリセットを更新しました（${parsed.systemPrompts?.length}件）`
        : '・システムプロンプトプリセットは更新されませんでした',
    })

    // 保存済みのモデル選択を復元、なければ最初のモデルを選択
    if (parsed.llm?.models && parsed.llm.models.length > 0) {
      const savedModelKey = localStorage.getItem(SELECTED_MODEL_KEY)
      let modelToSelect = parsed.llm.models[0] // デフォルトは最初のモデル

      if (savedModelKey) {
        const parsed_model = parseSelectedModelKey(savedModelKey)
        // プロバイダーが一致し、モデルリストに含まれている場合のみ復元
        if (parsed_model && parsed_model.provider === parsed.llm.provider && parsed.llm.models.includes(parsed_model.model)) {
          modelToSelect = parsed_model.model
        }
      }
      setSelectedModelState(modelToSelect)
    }
  }, [])

  const saveConfigToBrowser = useCallback(() => {
    if (!auditorConfig) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auditorConfig))
    setConfigModified(false)
  }, [auditorConfig])

  const clearSavedConfig = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SELECTED_MODEL_KEY)
    setAuditorConfig(null)
    setConfigFilename(null)
    setConfigModified(false)
    setConfigLoadStatus(null)
    setSelectedModelState('')
  }, [])

  const hasSavedConfig = useCallback((): boolean => {
    return localStorage.getItem(STORAGE_KEY) !== null
  }, [])

  // Load saved config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY)
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as AuditorConfig
        setAuditorConfig(parsed)
        setConfigFilename('保存済み設定')
        setConfigModified(false)

        // 保存済み設定のステータスを生成
        const llmUpdated = !!(parsed.llm && parsed.llm.provider)
        const specUpdated = !!(parsed.specTypes && parsed.specTypes.length > 0)
        const promptsUpdated = !!(parsed.systemPrompts && parsed.systemPrompts.length > 0)

        setConfigLoadStatus({
          llm: llmUpdated
            ? '・LLM設定を読み込みました'
            : '・LLM設定は設定されていません',
          specTypes: specUpdated
            ? '・規約種別と注意事項を読み込みました'
            : '・規約種別と注意事項は設定されていません',
          prompts: promptsUpdated
            ? `・システムプロンプトプリセットを読み込みました（${parsed.systemPrompts?.length}件）`
            : '・システムプロンプトプリセットは設定されていません',
        })

        // 保存済みのモデル選択を復元
        if (parsed.llm?.models && parsed.llm.models.length > 0) {
          const savedModelKey = localStorage.getItem(SELECTED_MODEL_KEY)
          let modelToSelect = parsed.llm.models[0] // デフォルトは最初のモデル

          if (savedModelKey) {
            const parsed_model = parseSelectedModelKey(savedModelKey)
            // プロバイダーが一致し、モデルリストに含まれている場合のみ復元
            if (parsed_model && parsed_model.provider === parsed.llm.provider && parsed.llm.models.includes(parsed_model.model)) {
              modelToSelect = parsed_model.model
            }
          }
          setSelectedModelState(modelToSelect)
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Load saved preset selection and apply default preset
  useEffect(() => {
    if (systemPromptPresets.length > 0) {
      const savedPreset = localStorage.getItem(SELECTED_PROMPT_KEY)
      const presetToSelect =
        systemPromptPresets.find((p) => p.name === savedPreset)?.name ||
        systemPromptPresets[0].name
      selectPreset(presetToSelect)
    }
  }, [systemPromptPresets, selectPreset])

  return {
    llmConfig,
    selectedModel,
    setSelectedModel,
    specTypesConfig,
    getTypeNote,
    getSpecTypesList,
    systemPromptPresets,
    selectedPreset,
    currentPromptValues,
    selectPreset,
    updatePromptValue,
    auditorConfig,
    configFilename,
    configModified,
    configLoadStatus,
    loadConfigFile,
    saveConfigToBrowser,
    clearSavedConfig,
    hasSavedConfig,
  }
}
