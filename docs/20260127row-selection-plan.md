# 行選択してAIに渡す範囲を絞る 実装計画（2026-01-27）

> **✅ 対応完了**: この計画は [PR #8](https://github.com/elvezjp/coding-policy-ai-auditor/pull/8) で実装され、v0.4.0 としてリリースされました。

## 目的
- 現状: AIオーディター形式Excelは「全行」をMarkdown化してAIへ渡している。
- 目標: 画面上でクリック操作により「複数行／範囲」を選択し、選択行のみをAIへ渡す。

## スコープ
- 対象: AIオーディター形式タブ（`RuleInputSection` → `ExcelSpreadsheetLoader` → `SpreadsheetViewer`）
- 非対象（今回の計画外）:
  - Excelマークダウン変換タブ（`SpecFileList` 側）
  - バックエンドのExcel解析ロジック自体

## 現状のデータフロー（把握）
1. `ExcelSpreadsheetLoader` が `parseExcel(file)` を呼ぶ
   - 実体: `handleAuditorExcelParse`（`RuleInputSection.tsx`）
2. `handleAuditorExcelParse` 内で
   - `parseAuditorExcelSpreadsheet(file)` を呼び
   - `convertSheetsToMarkdown(sheets)` でMarkdownを生成
   - `onAuditorMarkdownChange(markdown)` で親へ渡す
3. 親（`features/auditor/index.tsx`）で
   - `effectiveRuleMarkdown = auditorMarkdown || specMarkdown`
   - これをAI実行（`executeAudit`）に渡す

選択を反映させる最短の差し込み地点は `convertSheetsToMarkdown(...)` 呼び出しの直前／直後。

## 変更方針（結論）
- 方針A（推奨）: 「UIで選択状態を持つ」→「選択状態をMarkdown生成に渡す」
- 仕様:
  - 選択が1件以上ある: 選択行のみMarkdown化
  - 選択が0件: 従来どおり全行Markdown化（後方互換）

### ヘッダー行の扱い
- **仕様**: 選択した行のみをMarkdown化する（ヘッダー行も選択しなければ含まない）
- **理由**: シンプルさ優先。ヘッダーの自動判定は信頼性が低いため、ユーザーが明示的に選択する方式を採用
- **UI補助表示**: 「選択中: 12行（未選択なら"全行を送信"）」の表示で、ヘッダー行の扱いを説明する

## 実装ステップ

### 1. 選択状態の型を追加する
対象:
- `versions/v0.3/frontend/src/core/components/shared/spreadsheet/types.ts`

追加案（具体例）:
```typescript
/** 全シートの選択状態 */
export type SpreadsheetRowSelection = Record<string, number[]>;
// キー: シートのkey、値: 選択された行のインデックス配列（0-based、昇順ソート済み）
// 例: { "Sheet1": [0, 2, 5], "Sheet2": [1, 3] }
```

ポイント:
- 行indexは0-basedで統一（`sheet.data` のインデックスと一致）
- シート切り替えに耐える構造にする（各シートの選択状態を独立して保持）
- `Record<string, number[]>` を使用（MapよりシンプルでJSONシリアライズも容易）
- 選択行インデックスは昇順ソート済みを前提とする（UI操作順に依存しない）

### 2. SpreadsheetViewerで複数行／範囲選択を有効化する
対象:
- `versions/v0.3/frontend/src/core/components/shared/spreadsheet/SpreadsheetViewer.tsx`
- 必要に応じて `SpreadsheetViewer.css`

**⚠️ 重要: 実装前に技術検証が必要**

現在の `SpreadsheetViewer` は `spreadsheet: true` モードで動作しており、通常のTabulatorの `selectable` プロパティがスプレッドシートモードで正しく機能するかは**未検証**です。

**実装前に確認すべき項目:**
1. `spreadsheet: true` モードで `selectable: true` が動作するか
2. `selectableRange: true` でShift+クリックの範囲選択が動作するか
3. `rowSelectionChanged` イベントがスプレッドシートモードで発火するか

**検証方法:**
- Tabulator公式ドキュメントで `spreadsheet` モードと `selectable` の併用可否を確認
- 可能であれば、簡単なプロトタイプで動作確認

**代替案（Tabulatorの標準機能が使えない場合）:**
- `rowClick` イベントをハンドルして手動で選択状態を管理
- CSSクラス（例: `tabulator-row-selected`）を追加して視覚的フィードバック
- Shift+クリックの範囲選択は、最後にクリックした行を記録して範囲を計算

やること:
- **技術検証結果に基づいて**、以下のいずれかを実装:
  - **パターンA（推奨）**: Tabulatorの標準選択機能を使用
    - `selectable: true` を設定
    - `selectableRange: true` で範囲選択を有効化
    - `rowSelectionChanged` イベントで選択変更を検知
  - **パターンB（代替）**: カスタム実装
    - `rowClick` イベントをハンドル
    - 手動で選択状態を管理（Set/Mapで選択行インデックスを保持）
    - CSSクラスで視覚的フィードバック
    - Shift+クリックの範囲選択ロジックを実装
- 「選択が変わったら親へ通知」するコールバックを追加

設計メモ:
- `SpreadsheetViewerProps` に以下を追加:
  - `selectedRows?: SpreadsheetRowSelection` （下方向: 親から受け取る選択状態）
  - `onRowSelectionChange?: (selection: SpreadsheetRowSelection) => void` （上方向: 選択変更を通知）
- 通知内容は「全シート分の選択状態」（`SpreadsheetRowSelection`型）
- **重要**: `sheetLoaded` イベント内で、切り替え先シートの選択状態を `selectedRows` propsから取得し、該当行にハイライトを再適用する必要がある
- **重要（ループ防止）**: `selectedRows` の復元処理中は `onRowSelectionChange` の通知を抑制するガードを入れる
  - 例: `isRestoringSelectionRef` のようなフラグで「復元中は通知しない」
  - 目的: 復元 → `rowSelectionChanged` 発火 → 親state更新 → 再復元、の無限ループを防ぐ

### 3. ExcelSpreadsheetLoaderで選択状態を受け取って中継する
対象:
- `versions/v0.3/frontend/src/core/components/shared/spreadsheet/ExcelSpreadsheetLoader.tsx`
- `types.ts` の `ExcelSpreadsheetLoaderProps`

やること:
- `ExcelSpreadsheetLoaderProps` に以下を追加:
  - `selectedRows?: SpreadsheetRowSelection` （下方向: 親から受け取る選択状態）
  - `onRowSelectionChange?: (selection: SpreadsheetRowSelection) => void` （上方向: 選択変更を通知）
- `SpreadsheetViewer` にこれらのpropsをそのまま渡す
- `RuleInputSection` から受け取った選択状態を `SpreadsheetViewer` へ中継

### 4. RuleInputSectionで「選択状態に応じてMarkdownを再生成」する
対象:
- `versions/v0.3/frontend/src/features/auditor/components/RuleInputSection.tsx`
- `versions/v0.3/frontend/src/features/auditor/services/auditorExcelApi.ts`

やること（重要）:
- `convertSheetsToMarkdown` を拡張し、選択情報を受け取れるようにする
  - 例: `convertSheetsToMarkdown(sheets, selection)`
- 選択が変わるたびにMarkdownを再生成し、親へ渡す

推奨の構成:
- `RuleInputSection` に状態を追加
  - `auditorSelection`（シート別の選択行index配列）
- 以下の2箇所でMarkdown再生成
  1) Excel解析成功直後（従来どおり全行 or 選択なし）
  2) 行選択変更時（選択行のみ）

実装上の注意:
- "選択0件" の場合は全行にフォールバック
- パフォーマンス面の安全策として:
  - 行選択変更時は `auditorSheets` が空なら何もしない
  - **重要**: `onRowSelectionChange` のコールバック内でデバウンス（例: 100ms）を入れる
    - Shift+クリックで範囲選択すると、行ごとにイベントが発火する可能性があるため
    - デバウンスにより、連続する選択変更イベントを1回のMarkdown再生成にまとめる
  - **重要（ループ防止の受け側配慮）**: 復元直後の通知は無視できるようにする
    - Viewer側の「復元中ガード」に加えて、Section側でも「同一selectionなら再生成しない」条件を入れると安全

### 5. Markdown生成ロジックを「選択行フィルタ対応」にする
対象:
- `versions/v0.3/frontend/src/features/auditor/services/auditorExcelApi.ts`

仕様（提案）:
- 引数に selection を追加: `convertSheetsToMarkdown(sheets, selection?: SpreadsheetRowSelection)`
- シートごとに
  - selectionがない、または該当シートの選択がない: 全行
  - selectionがある: 指定行indexのみ

追加で入れておくと良い仕様:
- 選択行が重複しても一意化してから出力（`[...new Set(rowIndices)]`）
- indexは昇順で出力（UI操作順に依存しない）
- **重要**: 存在しない行インデックス（`index >= sheet.data.length`）は自動的に除外する
  ```typescript
  const validRowIndices = (selection[sheet.key] || []).filter(
    index => index >= 0 && index < sheet.data.length
  );
  ```

### 6. UI上の補助表示を入れる（任意だが推奨）
対象:
- `RuleInputSection.tsx`（AIオーディター形式タブの下部）

例:
- 「選択中: 12行（未選択なら“全行を送信”）」の表示
- “選択解除（全行に戻す）”ボタン

これは仕様の誤解を減らすための安全装置。

## 影響範囲（変更対象ファイルまとめ）
- 選択機能の中核
  - `versions/v0.3/frontend/src/core/components/shared/spreadsheet/types.ts`
  - `versions/v0.3/frontend/src/core/components/shared/spreadsheet/SpreadsheetViewer.tsx`
  - `versions/v0.3/frontend/src/core/components/shared/spreadsheet/ExcelSpreadsheetLoader.tsx`
- Markdown生成と配線
  - `versions/v0.3/frontend/src/features/auditor/services/auditorExcelApi.ts`
  - `versions/v0.3/frontend/src/features/auditor/components/RuleInputSection.tsx`
- （必要なら）見た目調整
  - `versions/v0.3/frontend/src/core/components/shared/spreadsheet/SpreadsheetViewer.css`

## テスト観点（最低限）

### 基本機能
1. **選択なし**
   - 従来どおり全行がMarkdownに含まれる

2. **単一シートで複数行選択**
   - 選択行のみがMarkdownに含まれる
   - 選択行の順序が正しい（昇順）

3. **シートをまたいだ選択**
   - それぞれのシートで選択行のみが反映される
   - シートAで選択 → シートBで選択 → 両方の選択が正しく反映される

4. **選択→解除**
   - Markdownが全行に戻る

### シート切り替え
5. **シート切り替え後の選択状態維持**
   - シートAで行選択 → シートBに切り替え → シートAに戻る → 選択が維持されている

### パフォーマンス
6. **大量行のパフォーマンス**
   - 1000行以上のシートで範囲選択した場合にUIがフリーズしない
   - デバウンスが正常に動作し、連続する選択変更が1回のMarkdown再生成にまとめられる

### ファイル操作
7. **Excelファイル再読み込み時の選択リセット**
   - 別ファイルを読み込んだ際に前回の選択状態がクリアされる

### エッジケース
8. **空のシート**
   - データが0行のシートで選択操作を試みた場合にエラーが発生しない

9. **1行のみのシート**
   - 1行のみのシートで選択・解除が正常に動作する

10. **存在しない行インデックスの処理**
    - 選択状態に存在しない行インデックスが含まれている場合、エラーなく無視される
    - 例: シートに10行しかないのに、選択状態に `[0, 5, 15]` が含まれている場合、`15` は無視される

11. **選択状態の整合性チェック**
    - シートが削除された場合（例: ファイル再読み込みでシート数が減った）、削除されたシートの選択状態が自動的にクリアされる

## 受け入れ条件（Definition of Done）
- 画面上でクリックにより複数行／範囲選択できる
- 選択行があるときは、AIに渡る規約Markdownが選択行のみになる
- 選択がない場合は、従来どおり全行がAIに渡る
- バージョン表記を **v0.3.1** に更新する

## 実装順（安全な進め方・修正版）

**修正理由**: ステップ4と5は密結合のため、API変更（ステップ5）を先に実施した方が、上流の変更時にコンパイルエラーで見落としを防げる。

1. **型追加（types.ts）**
   - `SpreadsheetRowSelection` 型を定義
   - `SpreadsheetViewerProps` と `ExcelSpreadsheetLoaderProps` に双方向のpropsを追加

2. **convertSheetsToMarkdownを拡張（auditorExcelApi.ts）**
   - シグネチャ変更: `convertSheetsToMarkdown(sheets, selection?: SpreadsheetRowSelection)`
   - 選択行フィルタロジックを実装
   - 存在しない行インデックスの除外処理を実装

3. **SpreadsheetViewerで選択イベントを取得**
   - **まず技術検証**: Tabulatorの `spreadsheet: true` モードで `selectable` が動作するか確認
   - 検証結果に基づいて実装:
     - 標準機能が使える場合: `selectable: true` + `rowSelectionChanged` イベント
     - 使えない場合: `rowClick` イベント + カスタム選択状態管理
   - `onRowSelectionChange` で選択変更を通知
   - `selectedRows` propsから選択状態を復元（`sheetLoaded` イベント内）

4. **Loaderで中継（双方向）**
   - `ExcelSpreadsheetLoader` で選択状態を中継

5. **RuleInputSectionで状態保持＋再生成**
   - `auditorSelection` 状態を追加
   - 選択変更時にデバウンス付きでMarkdown再生成
   - Excel解析成功時と選択変更時の2箇所でMarkdown再生成

6. **UI補助表示（必要なら）**
   - 選択行数の表示
   - 「選択解除」ボタン
7. **バージョン更新（v0.3.1）**
   - フロント: `versions/v0.3/frontend/src/features/auditor/index.tsx` の `APP_INFO.version`
   - バックエンド: `versions/v0.3/backend/pyproject.toml` の `project.version`

---

## 補足メモ（現状の要点コード位置）
- スプレッドシート表示
  - `versions/v0.3/frontend/src/core/components/shared/spreadsheet/SpreadsheetViewer.tsx`
- Excel読込→Markdown生成の起点
  - `versions/v0.3/frontend/src/features/auditor/components/RuleInputSection.tsx`
    - `handleAuditorExcelParse` 内の `convertSheetsToMarkdown(...)`
- AIに渡る最終Markdown
  - `versions/v0.3/frontend/src/features/auditor/index.tsx`
    - `effectiveRuleMarkdown = auditorMarkdown || specMarkdown`

---

## レビュー結果（2026-01-27 コードベース照合）

ソースコードを全ファイル読み込んだ上での評価。

### 総合評価

計画全体の方向性は妥当。データフローの把握、変更対象ファイルの特定、後方互換性への配慮はいずれも正確。
ただし、実装に入る前に解決すべき設計上の課題がいくつかある。

### 良い点
- データフロー（セクション「現状のデータフロー」）の記述が実コードと完全に一致している
- 変更対象ファイルの特定が正確で漏れがない
- 「選択0件→全行フォールバック」による後方互換は適切
- 実装順（型→Viewer→Loader→Section→Markdown→UI）がボトムアップで安全

---

### 指摘事項

#### 1. 【重要】Tabulatorスプレッドシートモードでの行選択の実現方法が未検証

**現状の問題:**
ステップ2で「Tabulatorの選択機能を有効化」とあるが、具体的な実現方法が記載されていない。
現在の `SpreadsheetViewer.tsx` は `spreadsheet: true` モードで動作しており（L98-99）、
通常のTabulatorの `selectable` プロパティがスプレッドシートモードで正しく機能するかは未検証。

**SpreadsheetViewerの現在のTabulator設定（L98-115）:**
```typescript
new Tabulator(tableRef.current, {
  spreadsheet: true,
  spreadsheetSheetTabs: true,
  spreadsheetSheets: spreadsheetSheets,
  // ... selectable 設定は存在しない
})
```

**必要なアクション:**
- Tabulator公式ドキュメントで `spreadsheet: true` と `selectable` の併用可否を確認する
- 併用不可の場合は、`rowClick` イベント＋CSSクラスによるカスタム実装を検討する
  - 例: クリックで `tabulator-selected` クラスをトグル、Shift+クリックで範囲選択
- この調査結果を計画に反映してから実装に入るべき

#### 2. 【重要】双方向データフローが必要（計画では片方向のみ）

**現状の計画:**
- 上方向のみ: `SpreadsheetViewer` → `onRowSelectionChange` → 親

**不足している下方向:**
- `SpreadsheetViewer` は選択状態を**受け取る**必要もある
- 理由: シート切り替え時にTabulatorはビューを再構築するため、DOM上の選択状態が消失する
- 親が保持する選択状態を `SpreadsheetViewer` にpropsとして渡し、再表示時に復元する必要がある

**修正案:**
`SpreadsheetViewerProps` に追加が必要なのは `onRowSelectionChange` だけでなく:
```typescript
interface SpreadsheetViewerProps {
  sheets: SpreadsheetSheet[];
  selectedRows?: SpreadsheetRowSelection;       // ← 追加: 下方向
  onRowSelectionChange?: (selection: SpreadsheetRowSelection) => void; // ← 上方向
}
```

同様に `ExcelSpreadsheetLoaderProps` にも双方向のpropsが必要。

#### 3. 【重要】シート切り替え時の選択状態復元

**現在のシート切り替え処理（SpreadsheetViewer.tsx L146-153）:**
```typescript
tabulatorRef.current?.on('sheetLoaded', (sheet: any) => {
  currentSheetKeyRef.current = sheet.getKey();
  needsRedrawAfterSheetLoadRef.current = true;
  tabulatorRef.current?.redraw(true);
});
```

`sheetLoaded` でビューが再構築されると、選択行のハイライトが消える。
このイベントハンドラ内で、親から受け取った `selectedRows` を参照して選択状態を復元する処理が必要。

**計画への追記案（ステップ2に追加）:**
- `sheetLoaded` イベント内で、切り替え先シートの選択状態をpropsから取得し、該当行にハイライトを再適用する

#### 4. 【中程度】行インデックスのマッピングを明示すべき

**現在のコードから確認できる事実:**
- Tabulatorの `cell.getRow().getPosition()` は **1-based**（SpreadsheetViewer.tsx L74, L166）
- `sheet.data` 配列は **0-based**
- 計画ステップ1で「行indexは0-basedで統一」としているのは正しい

**計画に明記すべき変換ルール:**
- Tabulatorから取得: `position - 1` で0-basedに変換
- `sheet.data` へのアクセス: そのまま0-basedインデックスで参照
- `convertSheetsToMarkdown` 内のフィルタ: `sheet.data[index]` で対応

#### 5. 【中程度】ヘッダー行（1行目）の扱いが未定義

Excelファイルの1行目は通常カラムヘッダーである。
ユーザーが3行目〜10行目を選択した場合、ヘッダー行を自動的に含めるかどうかの仕様が必要。

**選択肢:**
- A) ヘッダー行は常に含める（ユーザーが選択しなくても）
- B) 選択した行のみ（ヘッダーも選択しなければ含まない）
- C) 設定で切り替え可能にする

推奨: **B（選択した行のみ）** をデフォルトとし、UIの補助表示（ステップ6）でヘッダー行の扱いを説明する。
シンプルさ優先。ヘッダーの自動判定は信頼性が低い。

#### 6. 【中程度】パフォーマンス：Markdown再生成のデバウンス

**計画の記述:**
> 行選択変更時は `auditorSheets` が空なら何もしない

**追加で必要な対策:**
- 選択変更のたびに `convertSheetsToMarkdown` を同期呼び出しすると、大きなスプレッドシートでUIがブロックされる可能性がある
- Shift+クリックで範囲選択すると、行ごとにイベントが発火する可能性がある
- **`onRowSelectionChange` のコールバック内でデバウンス（例: 100ms）を入れるべき**

#### 7. 【軽微】ステップ4とステップ5は密結合 — 同時に実装すべき

計画ではステップ4（RuleInputSectionで再生成）とステップ5（convertSheetsToMarkdownを拡張）を分けているが、
ステップ4は `convertSheetsToMarkdown(sheets, selection)` の新シグネチャに依存するため、
実質的に同時に変更する必要がある。

**実装順の修正案:**
```
1. 型追加（types.ts）
2. convertSheetsToMarkdownを拡張（auditorExcelApi.ts） ← 先にAPI変更
3. SpreadsheetViewerで選択イベントを取得
4. Loaderで中継（双方向）
5. RuleInputSectionで状態保持＋再生成
6. UI補助表示
```

理由: Markdown生成関数のシグネチャ変更を先に済ませた方が、
上流の変更時にコンパイルエラーで見落としを防げる。

#### 8. 【軽微】テスト観点の追加

現在のテスト観点に以下を追加すべき:

5. **シート切り替え後の選択状態維持**
   - シートAで行選択 → シートBに切り替え → シートAに戻る → 選択が維持されている

6. **大量行のパフォーマンス**
   - 1000行以上のシートで範囲選択した場合にUIがフリーズしない

7. **Excelファイル再読み込み時の選択リセット**
   - 別ファイルを読み込んだ際に前回の選択状態がクリアされる

---

### まとめ：実装前に確認すべきこと

| # | 項目 | 重要度 | 対応 |
|---|------|--------|------|
| 1 | Tabulator spreadsheetモードでの行選択方法 | 高 | 技術検証を先に実施 |
| 2 | 双方向データフロー（selectedRows props追加） | 高 | 計画のステップ2, 3を修正 |
| 3 | シート切り替え時の選択復元 | 高 | ステップ2に追記 |
| 4 | 行インデックスの変換ルール明示 | 中 | ステップ1に追記 |
| 5 | ヘッダー行の仕様決定 | 中 | 仕様として明記 |
| 6 | Markdown再生成のデバウンス | 中 | ステップ4に追記 |
| 7 | 実装順序の調整（ステップ4,5統合） | 低 | 実装順を修正 |
| 8 | テスト観点の追加 | 低 | テストセクションに追記 |
| 9 | エラーハンドリング（存在しない行の選択） | 中 | ステップ5に追記 |
| 10 | 型定義の具体例 | 低 | ステップ1に追記 |
| 11 | エッジケースの考慮 | 低 | テスト観点に追記 |

---

### 追加の評価事項（2026-01-27 追加レビュー）

#### 9. 【中程度】エラーハンドリング：存在しない行の選択

**問題:**
- シートの行数が変更された場合（例: ファイル再読み込みで行数が減った）、選択状態に存在しない行インデックスが含まれる可能性がある
- `convertSheetsToMarkdown` で `sheet.data[index]` にアクセスする際に `undefined` が返る可能性

**対策:**
- `convertSheetsToMarkdown` 内で、選択行インデックスが `sheet.data` の範囲内かチェックする
- 範囲外のインデックスは無視する（警告ログは出さない。ユーザー体験を優先）
- または、`sheet.data.length` を超える選択行を自動的に除外する

**計画への追記案（ステップ5に追加）:**
```typescript
// 選択行の検証
const validRowIndices = selection.filter(index => 
  index >= 0 && index < sheet.data.length
);
// validRowIndices のみを使用
```

#### 10. 【軽微】型定義の具体例を追加

**現状:**
ステップ1で「追加案（イメージ）」とあるが、実際のコードに近い型定義例があると実装時の混乱を防げる。

**追加案（ステップ1に追記）:**
```typescript
// types.ts に追加する型定義の具体例

/** シート単位の選択行情報 */
export interface SheetRowSelection {
  sheetKey: string;        // シートの識別キー
  rowIndices: number[];    // 選択された行のインデックス（0-based、昇順ソート済み）
}

/** 全シートの選択状態 */
export type SpreadsheetRowSelection = Record<string, number[]>;
// Map<string, number[]> でも可だが、Recordの方がシンプルでJSONシリアライズも容易

// SpreadsheetViewerProps への追加
export interface SpreadsheetViewerProps {
  sheets: SpreadsheetSheet[];
  selectedRows?: SpreadsheetRowSelection;  // 下方向: 親から受け取る選択状態
  onRowSelectionChange?: (selection: SpreadsheetRowSelection) => void;  // 上方向: 選択変更を通知
}
```

#### 11. 【軽微】エッジケースの考慮

**追加すべきテスト観点:**

5. **シート切り替え後の選択状態維持**
   - シートAで行選択 → シートBに切り替え → シートAに戻る → 選択が維持されている

6. **大量行のパフォーマンス**
   - 1000行以上のシートで範囲選択した場合にUIがフリーズしない

7. **Excelファイル再読み込み時の選択リセット**
   - 別ファイルを読み込んだ際に前回の選択状態がクリアされる

8. **空のシート**
   - データが0行のシートで選択操作を試みた場合にエラーが発生しない

9. **1行のみのシート**
   - 1行のみのシートで選択・解除が正常に動作する

10. **存在しない行インデックスの処理**
    - 選択状態に存在しない行インデックスが含まれている場合、エラーなく無視される

11. **選択状態の整合性チェック**
    - シートが削除された場合（例: ファイル再読み込みでシート数が減った）、削除されたシートの選択状態が自動的にクリアされる

---

### 実装時の技術的注意点（補足）

#### Tabulatorの行選択実装方法の調査結果（要確認）

**調査が必要な項目:**
1. `spreadsheet: true` モードで `selectable: true` が動作するか
2. `selectableRange: true` でShift+クリックの範囲選択が動作するか
3. `rowSelectionChanged` イベントがスプレッドシートモードで発火するか

**代替案（Tabulatorの標準機能が使えない場合）:**
- `rowClick` イベントをハンドルして手動で選択状態を管理
- CSSクラス（例: `tabulator-row-selected`）を追加して視覚的フィードバック
- Shift+クリックの範囲選択は、最後にクリックした行を記録して範囲を計算

**推奨アプローチ:**
1. まずTabulator公式ドキュメントで `spreadsheet` モードと `selectable` の併用可否を確認
2. 併用可能なら標準機能を使用（実装が簡単）
3. 併用不可ならカスタム実装（実装コストは高いが確実）

---
