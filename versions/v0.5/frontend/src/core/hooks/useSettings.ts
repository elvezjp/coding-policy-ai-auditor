import { useState, useCallback, useEffect } from 'react'
import type { Settings, LlmSettings, SpecType, SystemPromptPreset, ReviewerConfig } from '../types'

const STORAGE_KEY = 'reviewer-settings'

// デフォルトのLLM設定
const DEFAULT_LLM_SETTINGS: LlmSettings = {
  provider: 'bedrock',
  maxTokens: 10000,
  models: [],
  selectedModel: undefined,
}

// デフォルトの設計書種別
const DEFAULT_SPEC_TYPES: SpecType[] = [
  { type: '設計書', note: '機能仕様が正しく実装されているかを確認してください' },
  { type: '要件定義書', note: '要件が漏れなく実装されているかを確認してください' },
  { type: '処理ロジック', note: '処理手順やアルゴリズムが正しく実装されているかを確認してください' },
  { type: '処理フロー', note: '処理の流れが正しく実装されているかを確認してください' },
  { type: 'コーディング規約', note: 'コードがこの規約に準拠しているかを確認してください' },
  { type: 'ネーミング規約', note: '変数名・関数名・クラス名がこの規約に準拠しているかを確認してください' },
  { type: '製造ガイド', note: 'このガイドラインに従って実装されているかを確認してください' },
  { type: '設計ガイド', note: 'この設計方針に従って実装されているかを確認してください' },
  { type: '設計書とソースのマッピング', note: 'このマッピングに基づいて突合を行ってください' },
]

// デフォルトのシステムプロンプト（共通汎用）
const DEFAULT_SYSTEM_PROMPTS: SystemPromptPreset[] = [
  {
    name: '標準監査プリセット',
    role: 'あなたはコーディング規約とプログラムコードを突合し、整合性を検証するオーディターです。',
    purpose: `規約の内容がプログラムに正しく反映されているかを検証し、差異や問題点を報告してください。

以下の観点で監査を行ってください：
1. 規約準拠性: 規約に記載されたルールがコードに反映されているか
2. 仕様整合性: 関数名・変数名・データ型・処理フローが規約と一致しているか
3. エラー処理: 規約に記載されたエラー処理が実装されているか
4. 境界値・制約: 規約に記載された制約条件がコードに反映されているか`,
    format: `マークダウン形式で、以下の順に出力してください：
1. サマリー（突合日時、ファイル名、総合判定）
2. 突合結果一覧（テーブル形式）
3. 詳細（問題点と推奨事項）`,
    notes: `- メイン規約の内容について突合してください。
- 判定は「OK」「NG」「要確認」の3段階で行ってください
- 重要度が高い問題を優先して報告してください。
- 規約を引用する際は、見出し番号や項目番号を明示してください。
- プログラムを引用する際は、行番号を必ず添えてください。
- 各規約ファイルの冒頭に記載されている役割、種別、注意事項を考慮してください。
- メイン以外の規約は必要な場合に参照してください。`,
  },
]

const DEFAULT_SETTINGS: Settings = {
  llm: DEFAULT_LLM_SETTINGS,
  specTypes: DEFAULT_SPEC_TYPES,
  systemPrompts: DEFAULT_SYSTEM_PROMPTS,
}

interface UseSettingsReturn {
  settings: Settings
  updateLlmSettings: (llm: Partial<LlmSettings>) => void
  updateSpecTypes: (specTypes: SpecType[]) => void
  updateSystemPrompts: (prompts: SystemPromptPreset[]) => void
  loadFromConfig: (config: ReviewerConfig) => void
  saveToStorage: () => void
  clearStorage: () => void
  isModified: boolean
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [isModified, setIsModified] = useState(false)

  // 初期読み込み
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Settings>
        setSettings({
          llm: { ...DEFAULT_LLM_SETTINGS, ...parsed.llm },
          specTypes: parsed.specTypes || DEFAULT_SPEC_TYPES,
          systemPrompts: parsed.systemPrompts || DEFAULT_SYSTEM_PROMPTS,
        })
      } catch {
        // パース失敗時はデフォルト値を使用
      }
    }
  }, [])

  const updateLlmSettings = useCallback((llm: Partial<LlmSettings>) => {
    setSettings((prev) => ({
      ...prev,
      llm: { ...prev.llm, ...llm },
    }))
    setIsModified(true)
  }, [])

  const updateSpecTypes = useCallback((specTypes: SpecType[]) => {
    setSettings((prev) => ({ ...prev, specTypes }))
    setIsModified(true)
  }, [])

  const updateSystemPrompts = useCallback((prompts: SystemPromptPreset[]) => {
    setSettings((prev) => ({ ...prev, systemPrompts: prompts }))
    setIsModified(true)
  }, [])

  const loadFromConfig = useCallback((config: ReviewerConfig) => {
    setSettings((prev) => ({
      llm: config.llm ? { ...prev.llm, ...config.llm } : prev.llm,
      specTypes: config.specTypes || prev.specTypes,
      systemPrompts: config.systemPrompts || prev.systemPrompts,
    }))
    setIsModified(true)
  }, [])

  const saveToStorage = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    setIsModified(false)
  }, [settings])

  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSettings(DEFAULT_SETTINGS)
    setIsModified(false)
  }, [])

  return {
    settings,
    updateLlmSettings,
    updateSpecTypes,
    updateSystemPrompts,
    loadFromConfig,
    saveToStorage,
    clearStorage,
    isModified,
  }
}

export { DEFAULT_SPEC_TYPES, DEFAULT_SYSTEM_PROMPTS, DEFAULT_LLM_SETTINGS }
