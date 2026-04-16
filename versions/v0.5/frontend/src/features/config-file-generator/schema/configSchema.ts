import type { ConfigSchema } from '../types'

export const CONFIG_SCHEMA: ConfigSchema = {
  meta: {
    outputTitle: 'コーディング規約-Javaプログラム AIオーディター 設定ファイル',
    outputFileName: 'auditor-config.md',
    version: 'v0.4.0',
  },
  sections: [
    {
      id: 'info',
      title: 'info',
      description: '設定ファイル情報',
      outputFormat: 'list',
      fields: [
        {
          id: 'version',
          label: 'version',
          type: 'fixed',
          value: 'v0.4.0',
        },
        {
          id: 'created_at',
          label: 'created_at',
          type: 'auto',
          generator: 'timestamp_iso8601',
        },
      ],
    },
    {
      id: 'llm',
      title: 'llm',
      description: 'LLMプロバイダー設定',
      outputFormat: 'list',
      conditional: {
        switchField: 'provider',
        cases: {
          anthropic: {
            fields: [
              { id: 'provider', type: 'fixed', value: 'anthropic' },
              { id: 'apiKey', label: 'API Key', type: 'password', required: true },
              { id: 'maxTokens', label: 'Max Tokens', type: 'number', default: 16384, required: true },
              {
                id: 'models',
                label: 'モデル',
                type: 'array',
                itemType: 'text',
                placeholder: 'claude-sonnet-4-5-20250929',
                defaults: ['claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001'],
              },
            ],
          },
          bedrock: {
            notes: [
              'モデルIDにはリージョンプレフィックス（例: us., apac., global.）が必要です。',
              'モデルによって設定可能な出力トークン上限が異なります（例: Nova系は10,000、Claude系は最大128,000）。',
              '設定可能な上限値を超えた出力トークン数を指定した場合、エラーが発生します。',
            ],
            fields: [
              { id: 'provider', type: 'fixed', value: 'bedrock' },
              { id: 'accessKeyId', label: 'Access Key ID', type: 'password', required: true },
              { id: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
              { id: 'region', label: 'Region', type: 'text', default: 'ap-northeast-1', required: true },
              { id: 'maxTokens', label: 'Max Tokens', type: 'number', default: 10000, required: true },
              {
                id: 'models',
                label: 'モデル',
                type: 'array',
                itemType: 'text',
                placeholder: 'global.anthropic.claude-haiku-4-5-20251001-v1:0',
                defaults: [
                  'global.anthropic.claude-haiku-4-5-20251001-v1:0',
                  'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
                  'apac.amazon.nova-pro-v1:0',
                  'apac.amazon.nova-micro-v1:0',
                ],
              },
            ],
          },
          openai: {
            fields: [
              { id: 'provider', type: 'fixed', value: 'openai' },
              { id: 'apiKey', label: 'API Key', type: 'password', required: true },
              { id: 'maxTokens', label: 'Max Tokens', type: 'number', default: 16384, required: true },
              {
                id: 'models',
                label: 'モデル',
                type: 'array',
                itemType: 'text',
                placeholder: 'gpt-5.2',
                defaults: ['gpt-5.2', 'gpt-5.2-chat-latest', 'gpt-5.2-pro', 'gpt-5.1', 'gpt-4o', 'gpt-4o-mini'],
              },
            ],
          },
        },
      },
    },
    {
      id: 'specTypes',
      title: 'specTypes',
      description: '規約種別',
      outputFormat: 'table',
      columns: [
        { id: 'type', label: '種別', type: 'text', width: '30%' },
        { id: 'note', label: '注意事項', type: 'text', width: '70%' },
      ],
      defaults: [
        { type: 'コーディング規約', note: 'コードがこの規約に準拠しているかを確認してください' },
        { type: 'ネーミングルール', note: '命名規則に従っているかを確認してください' },
        { type: 'セキュリティポリシー', note: 'セキュリティ要件を満たしているかを確認してください' },
        { type: 'コード品質規約', note: 'コード品質基準を満たしているかを確認してください' },
        { type: '製造ガイド', note: 'このガイドラインに従って実装されているかを確認してください' },
        { type: '設計ガイド', note: 'この設計方針に従って実装されているかを確認してください' },
      ],
      editable: true,
      minRows: 0,
    },
    {
      id: 'systemPrompts',
      title: 'systemPrompts',
      description: 'システムプロンプトのプリセット定義',
      outputFormat: 'sections',
      itemKey: 'name',
      fields: [
        { id: 'name', label: 'プリセット名' },
        { id: 'role', label: '役割', rows: 2 },
        { id: 'purpose', label: '目的', rows: 6 },
        { id: 'format', label: 'フォーマット', rows: 4 },
        { id: 'notes', label: '注意事項', rows: 6 },
      ],
      defaults: [
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
- 各規約の冒頭に記載されている役割、種別、注意事項を考慮してください。
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
- 各規約の冒頭に記載されている役割、種別、注意事項を考慮してください。
- メイン以外の規約は必要な場合に参照してください。
- 規約に明示されていないが、一般的なベストプラクティスに反する箇所も報告してください。
- 静的解析結果は参考情報として利用してください。監査は規約の内容に基づいて実行してください。`,
        },
      ],
      editable: true,
      minRows: 0,
    },
  ],
}
