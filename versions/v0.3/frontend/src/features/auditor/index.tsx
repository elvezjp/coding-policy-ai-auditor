import { useEffect, useMemo, useCallback, useState } from 'react'
import { Settings, FileText } from 'lucide-react'
import {
  Layout,
  Header,
  Card,
  Button,
  FileInputButton,
  SettingsModal,
  TokenEstimator,
  SystemPromptEditor,
  ScreenContainer,
  useModal,
  useScreenManager,
  useTokenEstimation,
} from '@core/index'
import type { ScreenState } from '@core/types'
import {
  SpecTypesSection,
  CodeFileList,
  AuditResult,
  ExecutingScreen,
  RuleInputSection,
  StaticAnalysisSettings,
  type AuditorRuleInfo,
} from './components'
import { useFileConversion, useAuditExecution, useAuditorSettings, useZipExport, useStaticAnalysis } from './hooks'
import { testLlmConnection } from './services/api'
import type { StaticAnalysisResult } from './types'

type ResultTabType = 'static-analysis' | 'audit-1' | 'audit-2'

const APP_INFO = {
  name: 'coding-policy-ai-auditor',
  version: 'v0.3.0',
  description: 'コーディング規約-Javaプログラム AIオーディター',
  copyright: '© 株式会社エルブズ',
  url: 'https://elvez.co.jp',
}

export function Auditor() {
  const settingsModal = useModal()
  const screenManager = useScreenManager()

  // File conversion
  const {
    specFiles,
    specMarkdown,
    isSpecConverting,
    specStatus,
    addSpecFiles,
    setMainSpec,
    setSpecType,
    setSpecTool,
    applyToolToAll,
    convertSpecs,
    codeFiles,
    codeWithLineNumbers,
    isCodeConverting,
    codeStatus,
    addCodeFiles,
    convertCodes,
    availableTools,
    loadTools,
  } = useFileConversion()

  // Settings
  const {
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
  } = useAuditorSettings()

  // Audit execution
  const {
    auditResults,
    currentExecution,
    totalExecutions,
    executeAudit,
    getSimpleJudgment,
  } = useAuditExecution()

  // Zip export
  const { downloadZip, downloadStaticAnalysisZip, downloadReport, copyReport, downloadRuleMarkdown, downloadCodeWithLineNumbers } =
    useZipExport()

  // Static analysis
  const {
    toolsInfo,
    isLoadingTools,
    isEnabled: isStaticAnalysisEnabled,
    setIsEnabled: setStaticAnalysisEnabled,
    isAnalyzing,
    runAnalysis: runStaticAnalysis,
  } = useStaticAnalysis()

  // AIオーディター形式のマークダウン（タブ切り替えで使用）
  const [auditorMarkdown, setAuditorMarkdown] = useState<string>('')
  // AIオーディター形式のファイル情報
  const [auditorFileInfo, setAuditorFileInfo] = useState<AuditorRuleInfo | null>(null)

  // 結果画面のタブ状態
  const [resultTab, setResultTab] = useState<ResultTabType>('audit-1')
  // 静的解析結果（監査実行後に保持）
  const [staticAnalysisResultForDisplay, setStaticAnalysisResultForDisplay] = useState<StaticAnalysisResult | null>(null)

  // 実際に使用するマークダウン（AIオーディター形式またはExcel変換）
  const effectiveRuleMarkdown = auditorMarkdown || specMarkdown

  // System prompt text for token estimation
  const systemPromptText = useMemo(() => {
    return [
      currentPromptValues.role,
      currentPromptValues.purpose,
      currentPromptValues.format,
      currentPromptValues.notes,
    ].join('\n')
  }, [currentPromptValues])

  // Token estimation
  const tokenEstimation = useTokenEstimation(
    effectiveRuleMarkdown || '',
    codeWithLineNumbers || '',
    systemPromptText
  )

  // Load tools on mount
  useEffect(() => {
    loadTools()
  }, [loadTools])

  const isAuditEnabled = effectiveRuleMarkdown && codeWithLineNumbers

  const handleAuditExecute = async () => {
    if (!effectiveRuleMarkdown || !codeWithLineNumbers) return

    screenManager.showExecuting()

    // AIオーディター形式の場合は専用のRuleFileを作成
    const effectiveRuleFiles = auditorFileInfo
      ? [
          {
            file: new File([], auditorFileInfo.filename),
            filename: auditorFileInfo.filename,
            isMain: true,
            type: '規約',
            tool: 'AIオーディター形式',
            markdown: effectiveRuleMarkdown,
            note: `${auditorFileInfo.sheetCount}シート`,
          },
        ]
      : specFiles

    try {
      // 静的解析を実行（有効な場合）
      let staticResult: StaticAnalysisResult | null = null
      let summaryMarkdownForAudit: string | null = null
      if (isStaticAnalysisEnabled) {
        const analysisResponse = await runStaticAnalysis(codeFiles)
        staticResult = analysisResponse.result
        summaryMarkdownForAudit = analysisResponse.summaryMarkdown
      }
      setStaticAnalysisResultForDisplay(staticResult)

      // 結果画面の初期タブを設定
      if (staticResult) {
        setResultTab('static-analysis')
      } else {
        setResultTab('audit-1')
      }

      await executeAudit({
        ruleFiles: effectiveRuleFiles,
        codeFiles,
        ruleMarkdown: effectiveRuleMarkdown,
        codeWithLineNumbers,
        systemPrompt: currentPromptValues,
        llmConfig: llmConfig || undefined,
        staticAnalysisSummaryMarkdown: summaryMarkdownForAudit ?? undefined,
      })
      screenManager.showResult()
    } catch (error) {
      screenManager.showMain()
      const errorMessage = error instanceof Error ? error.message : '監査実行に失敗しました'
      alert(errorMessage)
    }
  }

  const handleConvertSpecs = () => {
    convertSpecs(getTypeNote)
  }

  // Config file load handler - adapts File to string content
  const handleConfigFileLoad = async (content: string, filename: string) => {
    // Create a File object from the content
    const file = new File([content], filename, { type: 'text/markdown' })
    await loadConfigFile(file)
  }

  // LLM connection test handler
  const handleTestConnection = useCallback(async () => {
    try {
      // Build request based on config
      if (llmConfig) {
        const result = await testLlmConnection({
          provider: llmConfig.provider,
          model: selectedModel || llmConfig.model,
          apiKey: llmConfig.apiKey,
          accessKeyId: llmConfig.accessKeyId,
          secretAccessKey: llmConfig.secretAccessKey,
          region: llmConfig.region,
        })
        return {
          success: result.status === 'connected',
          model: result.model,
          provider: result.provider,
          error: result.error,
        }
      } else {
        // No config - test system LLM
        const result = await testLlmConnection({})
        return {
          success: result.status === 'connected',
          model: result.model,
          provider: result.provider,
          error: result.error,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '接続エラー',
      }
    }
  }, [llmConfig, selectedModel])

  // Render main screen content
  const mainScreen = (
    <Layout>
      {/* Header */}
      <Header
        title={APP_INFO.description}
        rightContent={
          <button
            onClick={settingsModal.open}
            className="text-gray-500 hover:text-gray-700"
            title="設定"
          >
            <Settings className="w-6 h-6" />
          </button>
        }
      />

      {/* Rule files section (タブ切り替え: AIオーディター形式 / Excelマークダウン変換) */}
      <Card className="mb-6">
        <RuleInputSection
          files={specFiles}
          availableTools={availableTools}
          specTypesList={getSpecTypesList()}
          specMarkdown={specMarkdown}
          specStatus={specStatus}
          isConverting={isSpecConverting}
          onMainChange={setMainSpec}
          onTypeChange={setSpecType}
          onToolChange={setSpecTool}
          onApplyToolToAll={applyToolToAll}
          onConvert={handleConvertSpecs}
          onDownload={() => specMarkdown && downloadRuleMarkdown(specMarkdown)}
          onFilesSelect={addSpecFiles}
          onAuditorMarkdownChange={setAuditorMarkdown}
          onAuditorFileChange={setAuditorFileInfo}
        />
      </Card>

      {/* Code files section */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">プログラム</h2>
        <div className="flex items-center gap-2 mb-2">
          <FileInputButton
            multiple
            onFilesSelect={addCodeFiles}
            label="ファイルを選択"
          />
          <span className="text-gray-600 text-sm flex items-center gap-1">
            {codeFiles.length > 0 ? (
              <>
                <FileText className="w-4 h-4" />
                {codeFiles.map((f) => f.filename).join(', ')}
              </>
            ) : (
              '選択してください'
            )}
          </span>
        </div>
        <CodeFileList
          files={codeFiles}
          codeWithLineNumbers={codeWithLineNumbers}
          codeStatus={codeStatus}
          isConverting={isCodeConverting}
          onConvert={convertCodes}
          onDownload={() => codeWithLineNumbers && downloadCodeWithLineNumbers(codeWithLineNumbers)}
        />
      </Card>

      {/* System prompt settings */}
      <SystemPromptEditor
        presets={systemPromptPresets}
        selectedPreset={selectedPreset}
        currentValues={currentPromptValues}
        onPresetChange={selectPreset}
        onValueChange={updatePromptValue}
        isCollapsible={true}
        defaultExpanded={false}
      />

      {/* Token estimate */}
      <TokenEstimator
        totalTokens={tokenEstimation.totalTokens}
        isWarning={tokenEstimation.isWarning}
        isVisible={!!(effectiveRuleMarkdown || codeWithLineNumbers)}
      />

      {/* Static analysis settings */}
      <StaticAnalysisSettings
        toolsInfo={toolsInfo}
        isEnabled={isStaticAnalysisEnabled}
        onEnabledChange={setStaticAnalysisEnabled}
        isLoading={isLoadingTools}
      />

      {/* Audit button */}
      <Card>
        <Button
          variant="success"
          size="lg"
          disabled={!isAuditEnabled}
          onClick={handleAuditExecute}
        >
          監査実行
        </Button>
        {!isAuditEnabled && (
          <p className="text-xs text-orange-500 mt-3 text-center">
            ※ 監査を実行するには、規約とプログラムを両方変換してください。
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1 text-center">
          ※ 同じ設定で監査を2回実行します。それぞれ個別に結果を確認できます。
        </p>
      </Card>

      {/* Settings modal */}
      <SettingsModal
        isOpen={settingsModal.isOpen}
        onClose={settingsModal.close}
        appInfo={APP_INFO}
        llmSettings={
          auditorConfig?.llm
            ? { ...auditorConfig.llm, selectedModel }
            : undefined
        }
        onModelChange={setSelectedModel}
        onConfigFileLoad={handleConfigFileLoad}
        onSaveToStorage={saveConfigToBrowser}
        onClearStorage={clearSavedConfig}
        loadedConfigFilename={configFilename || undefined}
        configLoadStatus={configLoadStatus || undefined}
        isConfigSavedToBrowser={hasSavedConfig()}
        isConfigModified={configModified}
        onTestConnection={handleTestConnection}
        isSystemFallback={!auditorConfig?.llm}
        systemPromptPresets={systemPromptPresets}
        extensionSections={[<SpecTypesSection key="spec-types" specTypes={specTypesConfig} />]}
      />
    </Layout>
  )

  const executingScreen = (
    <ExecutingScreen
      currentExecution={currentExecution}
      totalExecutions={totalExecutions}
      isStaticAnalysisEnabled={isStaticAnalysisEnabled}
      isAnalyzingStatic={isAnalyzing}
    />
  )

  const handleDownloadStaticAnalysisZip = useCallback(() => {
    if (staticAnalysisResultForDisplay) {
      downloadStaticAnalysisZip(staticAnalysisResultForDisplay, codeFiles)
    }
  }, [staticAnalysisResultForDisplay, codeFiles, downloadStaticAnalysisZip])

  const resultScreen = (
    <AuditResult
      results={auditResults}
      staticAnalysisResult={staticAnalysisResultForDisplay}
      codeFiles={codeFiles}
      currentTab={resultTab}
      onTabChange={setResultTab}
      onCopyReport={copyReport}
      onDownloadReport={downloadReport}
      onDownloadZip={downloadZip}
      onDownloadStaticAnalysisZip={handleDownloadStaticAnalysisZip}
      getSimpleJudgment={getSimpleJudgment}
      onBack={screenManager.showMain}
    />
  )

  return (
    <ScreenContainer
      currentScreen={screenManager.currentScreen as ScreenState}
      mainScreen={mainScreen}
      executingScreen={executingScreen}
      resultScreen={resultScreen}
    />
  )
}
