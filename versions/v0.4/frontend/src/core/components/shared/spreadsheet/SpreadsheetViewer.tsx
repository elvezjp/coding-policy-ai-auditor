/**
 * 汎用スプレッドシートビューアーコンポーネント
 * TabulatorのスプレッドシートモードでExcelデータを表示
 */

import { useEffect, useRef } from 'react';
import { TabulatorFull as Tabulator, type ColumnComponent, type RowComponent } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator_simple.min.css';
import './SpreadsheetViewer.css';
import type {
  SpreadsheetSheet,
  SpreadsheetRowSelection,
  CellHyperlink,
  SpreadsheetViewerProps,
} from './types';

// シート名からキーを生成
function makeSheetKey(title: string): string {
  return title.replace(/[^a-zA-Z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/g, '_');
}

function normalizeRowIndices(rowIndices: number[] | undefined, maxRows: number): number[] {
  if (!rowIndices || rowIndices.length === 0) return [];
  return [...new Set(rowIndices)]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < maxRows)
    .sort((a, b) => a - b);
}

function normalizeSelection(
  selection: SpreadsheetRowSelection | undefined,
  sheetsMap: Map<string, SpreadsheetSheet>
): SpreadsheetRowSelection {
  if (!selection) return {};
  const normalized: SpreadsheetRowSelection = {};
  for (const [sheetKey, sheet] of sheetsMap.entries()) {
    const indices = normalizeRowIndices(selection[sheetKey], sheet.data.length);
    if (indices.length > 0) {
      normalized[sheetKey] = indices;
    }
  }
  return normalized;
}

function areSelectionsEqual(
  a: SpreadsheetRowSelection,
  b: SpreadsheetRowSelection
): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    const aVals = a[aKeys[i]] || [];
    const bVals = b[bKeys[i]] || [];
    if (aVals.length !== bVals.length) return false;
    for (let j = 0; j < aVals.length; j++) {
      if (aVals[j] !== bVals[j]) return false;
    }
  }
  return true;
}

export function SpreadsheetViewer({
  sheets,
  selectedRows,
  onRowSelectionChange,
}: SpreadsheetViewerProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const tabulatorRef = useRef<Tabulator | null>(null);
  // sheets を key でアクセスできるMapとして保持
  const sheetsMapRef = useRef<Map<string, SpreadsheetSheet>>(new Map());
  // 現在表示中のシートキー
  const currentSheetKeyRef = useRef<string>('');
  // シート切り替え後の再描画が必要かどうか
  const needsRedrawAfterSheetLoadRef = useRef<boolean>(false);
  // 選択状態（シートkey -> 行index配列）を保持
  const selectionRef = useRef<SpreadsheetRowSelection>({});
  // 選択復元中は通知を抑制する（無限ループ防止）
  const isRestoringSelectionRef = useRef<boolean>(false);
  // 復元用の関数参照（props変更時に利用）
  const restoreSelectionRef = useRef<() => void>(() => {});
  // コールバックの最新参照を保持（useEffectの依存配列に入れずにstale closureを防止）
  const onRowSelectionChangeRef = useRef(onRowSelectionChange);
  onRowSelectionChangeRef.current = onRowSelectionChange;

  useEffect(() => {
    if (!tableRef.current || sheets.length === 0) return;

    // 既にインスタンスがある場合は破棄
    if (tabulatorRef.current) {
      tabulatorRef.current.destroy();
      tabulatorRef.current = null;
    }

    // sheetsをMapに変換して保持
    sheetsMapRef.current = new Map(sheets.map((s) => [s.key, s]));
    selectionRef.current = normalizeSelection(selectedRows, sheetsMapRef.current);

    // 初期シートのキーを設定
    if (sheets.length > 0) {
      currentSheetKeyRef.current = sheets[0].key;
    }

    // ハイパーリンクがあるセルかどうかを判定
    const hasHyperlink = (row: number, col: number): CellHyperlink | null => {
      const sheet = sheetsMapRef.current.get(currentSheetKeyRef.current);
      const key = `${row},${col}`;
      return sheet?.hyperlinks?.[key] || null;
    };

    // Excelの列名（A, B, C...）を列インデックス（0, 1, 2...）に変換
    const columnLetterToIndex = (letter: string): number => {
      let result = 0;
      for (let i = 0; i < letter.length; i++) {
        result = result * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
      }
      return result - 1; // 0-based
    };

    // 列フィールド名から列インデックスを取得
    const getColumnIndex = (field: string): number => {
      // Tabulatorスプレッドシートモードでは "col0", "col1", "col2"... 形式
      if (field.startsWith('col')) {
        return parseInt(field.substring(3), 10);
      }
      // Excel形式 "A", "B", "C"... の場合
      return columnLetterToIndex(field);
    };

    // セルのフォーマッター：ハイパーリンクがあれば青下線で表示
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hyperlinkFormatter = (cell: any) => {
      const value = cell.getValue();
      const rowIndex = cell.getRow().getPosition() - 1; // 0-based
      const field = cell.getColumn().getField();
      if (!field) return value;

      const colIndex = getColumnIndex(field);

      const hyperlink = hasHyperlink(rowIndex, colIndex);
      if (hyperlink) {
        return `<span class="cell-hyperlink">${value}</span>`;
      }
      return value;
    };

    // スプレッドシート用のシート定義を作成（各シートに行数・列数を設定）
    const spreadsheetSheets = sheets.map((sheet) => ({
      title: sheet.title,
      key: sheet.key,
      data: sheet.data,
      rows: sheet.rows,
      columns: sheet.columns,
    }));

    // Tabulatorインスタンスを作成（スプレッドシートモード）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tabulatorRef.current = new Tabulator(tableRef.current, {
      spreadsheet: true,
      spreadsheetSheetTabs: true,
      spreadsheetSheets: spreadsheetSheets,
      spreadsheetColumnDefinition: {
        formatter: hyperlinkFormatter,
        resizable: 'header', // 列幅変更を有効化
        minWidth: 150, // 最小列幅を設定
      },
      height: 'max(200px, calc(100vh - 400px))',
      selectableRows: true,
      rowHeader: {
        formatter: 'rowSelection',
        titleFormatter: 'rowSelection',
        headerSort: false,
        resizable: false,
        frozen: true,
        width: 40,
        hozAlign: 'center',
      },
    } as any);

    const buildSelectionPayload = (): SpreadsheetRowSelection => {
      return normalizeSelection(selectionRef.current, sheetsMapRef.current);
    };

    const notifySelectionChange = () => {
      if (!onRowSelectionChangeRef.current) return;
      if (isRestoringSelectionRef.current) return;
      onRowSelectionChangeRef.current(buildSelectionPayload());
    };

    // Tabulatorの選択状態をselectionRefに同期
    const syncSelectionFromTabulator = () => {
      if (!tabulatorRef.current) return;
      const sheetKey = currentSheetKeyRef.current;
      const selectedRowComponents = tabulatorRef.current.getSelectedRows();
      const indices = selectedRowComponents
        .map((row: RowComponent) => {
          const pos = row.getPosition();
          return pos !== false ? pos - 1 : -1; // 0-based
        })
        .filter((idx: number) => idx >= 0)
        .sort((a: number, b: number) => a - b);
      selectionRef.current = {
        ...selectionRef.current,
        [sheetKey]: indices,
      };
    };

    // selectionRefからTabulatorの選択状態を復元
    const restoreSelectionToTabulator = () => {
      if (!tabulatorRef.current) return;
      const sheetKey = currentSheetKeyRef.current;
      const sheet = sheetsMapRef.current.get(sheetKey);
      if (!sheet) return;

      const selectedIndices = selectionRef.current[sheetKey] || [];
      const rows = tabulatorRef.current.getRows();

      // 一旦全解除
      tabulatorRef.current.deselectRow();

      if (selectedIndices.length === 0) {
        // 選択がない場合は全行選択（初期状態）
        tabulatorRef.current.selectRow();
      } else {
        // 指定行を選択
        const selectedSet = new Set(selectedIndices);
        rows.forEach((row: RowComponent) => {
          const pos = row.getPosition();
          if (pos !== false && selectedSet.has(pos - 1)) {
            tabulatorRef.current?.selectRow(row);
          }
        });
      }
    };

    const restoreSelectionForCurrentSheet = () => {
      isRestoringSelectionRef.current = true;
      restoreSelectionToTabulator();
      isRestoringSelectionRef.current = false;
    };
    restoreSelectionRef.current = restoreSelectionForCurrentSheet;

    // 列幅を調整する関数
    const adjustColumnWidths = () => {
      if (!tabulatorRef.current || !tableRef.current) return;

      const columns = tabulatorRef.current.getColumns();
      // 行番号列を除いたデータ列のみ
      const dataColumns = columns.filter((col: ColumnComponent) => col.getField() !== undefined);
      if (dataColumns.length === 0) return;

      // テーブルの表示幅から行番号列の幅を引いた利用可能幅を計算
      const tableWidth = tableRef.current.clientWidth;
      const rowHeaderWidth = 40; // rowHeader.width
      const availableWidth = tableWidth - rowHeaderWidth - 20; // 少し余裕を持たせる

      // 各列に均等に幅を分配（最小幅150pxを保証）
      const columnWidth = Math.max(150, Math.floor(availableWidth / dataColumns.length));

      dataColumns.forEach((col: ColumnComponent) => {
        col.setWidth(columnWidth);
      });
    };

    // テーブル構築完了後にイベントをセットアップ
    tabulatorRef.current.on('tableBuilt', () => {
      // 初回の列幅調整
      adjustColumnWidths();

      // シート切り替え時に現在のシートキーを更新し、再描画フラグを立てる
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabulatorRef.current?.on('sheetLoaded', (sheet: any) => {
        // 現在のシートキーを更新
        currentSheetKeyRef.current = sheet.getKey();
        // 再描画フラグを立てる
        needsRedrawAfterSheetLoadRef.current = true;
        // セルを強制的に再描画してフォーマッターを再適用
        tabulatorRef.current?.redraw(true);
      });

      // レンダリング完了時に列幅調整（シート切り替え後のみ）
      tabulatorRef.current?.on('renderComplete', () => {
        if (needsRedrawAfterSheetLoadRef.current) {
          needsRedrawAfterSheetLoadRef.current = false;
          adjustColumnWidths();
          restoreSelectionForCurrentSheet();
        }
      });

      // セルクリック時にハイパーリンクがあればシート切り替え
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabulatorRef.current?.on('cellClick', (_e: Event, cell: any) => {
        const rowIndex = cell.getRow().getPosition() - 1; // 0-based
        const colField = cell.getColumn().getField();
        if (!colField) return;

        const colIndex = getColumnIndex(colField);

        const hyperlink = hasHyperlink(rowIndex, colIndex);
        if (hyperlink) {
          // リンク先シートのキーを取得
          const targetSheetKey = makeSheetKey(hyperlink.sheetName);
          // シート切り替え
          tabulatorRef.current?.activeSheet(targetSheetKey);
        }
      });

      // 行選択変更イベントで選択状態を同期して親に通知
      tabulatorRef.current?.on('rowSelectionChanged', () => {
        syncSelectionFromTabulator();
        notifySelectionChange();
      });

      // 初回表示時に全行選択（selectedRowsが空の場合）
      const sheetKey = currentSheetKeyRef.current;
      const initialSelection = selectionRef.current[sheetKey];
      if (!initialSelection || initialSelection.length === 0) {
        // 全行選択
        isRestoringSelectionRef.current = true;
        tabulatorRef.current?.selectRow();
        syncSelectionFromTabulator();
        isRestoringSelectionRef.current = false;
        // 初期全選択を親に通知
        notifySelectionChange();
      } else {
        // 指定された選択状態を復元
        restoreSelectionForCurrentSheet();
      }
    });

    return () => {
      tabulatorRef.current?.destroy();
      tabulatorRef.current = null;
      restoreSelectionRef.current = () => {};
    };
    // selectedRowsの変更は第2のuseEffectで処理するため、ここでは初期化時のみ使用
    // onRowSelectionChangeはrefで最新を保持するため依存不要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheets]);

  // 親からの選択状態変更を現在のビューに反映（無限ループ防止のガード付き）
  useEffect(() => {
    if (sheets.length === 0) return;
    const normalizedIncoming = normalizeSelection(selectedRows, sheetsMapRef.current);
    const normalizedCurrent = normalizeSelection(selectionRef.current, sheetsMapRef.current);
    if (areSelectionsEqual(normalizedIncoming, normalizedCurrent)) {
      return;
    }
    selectionRef.current = normalizedIncoming;
    if (!tabulatorRef.current) return;
    isRestoringSelectionRef.current = true;
    restoreSelectionRef.current();
    isRestoringSelectionRef.current = false;
  }, [selectedRows, sheets]);

  return <div ref={tableRef} />;
}
