/**
 * 汎用スプレッドシートビューアーコンポーネント
 * TabulatorのスプレッドシートモードでExcelデータを表示
 *
 * 選択機能は1シート目のみで有効。2シート目以降は選択不可。
 * 選択状態は親コンポーネントで一元管理（Controlled Component）
 */

import { useEffect, useRef, useState, useCallback } from 'react';
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

// 行インデックス配列を正規化（重複除去・ソート・範囲チェック）
function normalizeIndices(indices: number[] | undefined, maxRows: number): number[] {
  if (!indices || indices.length === 0) return [];
  return [...new Set(indices)]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < maxRows)
    .sort((a, b) => a - b);
}

// 2つの配列が等しいか比較
function areIndicesEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
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

  // 現在1シート目を表示中かどうか（CSSでチェックボックス表示を制御）
  const [isFirstSheet, setIsFirstSheet] = useState(true);

  // sheets を key でアクセスできるMapとして保持
  const sheetsMapRef = useRef<Map<string, SpreadsheetSheet>>(new Map());

  // 現在表示中のシートキー
  const currentSheetKeyRef = useRef<string>('');

  // 1シート目のキー（初期化時に設定）
  const firstSheetKeyRef = useRef<string>('');

  // 内部更新中フラグ（プログラムによる選択変更時にイベント通知を抑制）
  const isInternalUpdateRef = useRef<boolean>(false);

  // シート切り替え中フラグ（シート切り替え中の選択変更イベントを無視）
  const isSheetSwitchingRef = useRef<boolean>(false);

  // 選択変更の遅延通知用タイマーID
  const selectionChangeTimerRef = useRef<number | null>(null);

  // コールバックとpropsの最新参照を保持
  const onRowSelectionChangeRef = useRef(onRowSelectionChange);
  onRowSelectionChangeRef.current = onRowSelectionChange;

  const selectedRowsRef = useRef(selectedRows);
  selectedRowsRef.current = selectedRows;

  // propsから現在の選択インデックスを取得するヘルパー
  const getSelectionFromProps = useCallback((): number[] => {
    const firstSheetKey = firstSheetKeyRef.current;
    const firstSheet = sheetsMapRef.current.get(firstSheetKey);
    if (!firstSheet) return [];

    const indices = selectedRowsRef.current?.[firstSheetKey];
    return normalizeIndices(indices, firstSheet.data.length);
  }, []);

  useEffect(() => {
    if (!tableRef.current || sheets.length === 0) return;

    // 既にインスタンスがある場合は破棄
    if (tabulatorRef.current) {
      tabulatorRef.current.destroy();
      tabulatorRef.current = null;
    }

    // sheetsをMapに変換して保持
    sheetsMapRef.current = new Map(sheets.map((s) => [s.key, s]));

    // 1シート目のキーを設定
    const firstSheetKey = sheets[0].key;
    firstSheetKeyRef.current = firstSheetKey;
    currentSheetKeyRef.current = firstSheetKey;

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
      return result - 1;
    };

    // 列フィールド名から列インデックスを取得
    const getColumnIndex = (field: string): number => {
      if (field.startsWith('col')) {
        return parseInt(field.substring(3), 10);
      }
      return columnLetterToIndex(field);
    };

    // セルのフォーマッター：ハイパーリンクがあれば青下線で表示
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hyperlinkFormatter = (cell: any) => {
      const value = cell.getValue();
      const rowIndex = cell.getRow().getPosition() - 1;
      const field = cell.getColumn().getField();
      if (!field) return value;

      const colIndex = getColumnIndex(field);
      const hyperlink = hasHyperlink(rowIndex, colIndex);
      if (hyperlink) {
        return `<span class="cell-hyperlink">${value}</span>`;
      }
      return value;
    };

    // スプレッドシート用のシート定義を作成
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
        resizable: 'header',
        minWidth: 150,
      },
      height: 'max(200px, 60vh)',
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

    // 親に選択変更を通知
    const notifySelectionChange = (indices: number[]) => {
      if (!onRowSelectionChangeRef.current) return;
      const payload: SpreadsheetRowSelection = {
        [firstSheetKey]: indices,
      };
      onRowSelectionChangeRef.current(payload);
    };

    // Tabulatorから現在の選択状態を取得
    const getSelectionFromTabulator = (): number[] => {
      if (!tabulatorRef.current) return [];
      const selectedRowComponents = tabulatorRef.current.getSelectedRows();
      return selectedRowComponents
        .map((row: RowComponent) => {
          const pos = row.getPosition();
          return pos !== false ? pos - 1 : -1;
        })
        .filter((idx: number) => idx >= 0)
        .sort((a: number, b: number) => a - b);
    };

    // 選択状態をTabulatorに適用（1シート目のみ）
    const applySelectionToTabulator = (indices: number[]) => {
      if (!tabulatorRef.current) return;

      // 1シート目以外は何もしない
      if (currentSheetKeyRef.current !== firstSheetKey) {
        return;
      }

      isInternalUpdateRef.current = true;

      // 一旦全解除
      tabulatorRef.current.deselectRow();

      const rows = tabulatorRef.current.getRows();
      const sheet = sheetsMapRef.current.get(firstSheetKey);
      const maxRows = sheet?.data.length || 0;

      if (indices.length === 0 || indices.length === maxRows) {
        // 空または全行 = 全行選択
        tabulatorRef.current.selectRow();
      } else {
        // 指定行を選択
        const selectedSet = new Set(indices);
        rows.forEach((row: RowComponent) => {
          const pos = row.getPosition();
          if (pos !== false && selectedSet.has(pos - 1)) {
            tabulatorRef.current?.selectRow(row);
          }
        });
      }

      // 次のイベントループでフラグを解除
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 0);
    };

    // 列幅を調整する関数
    const adjustColumnWidths = () => {
      if (!tabulatorRef.current || !tableRef.current) return;

      const columns = tabulatorRef.current.getColumns();
      const dataColumns = columns.filter((col: ColumnComponent) => col.getField() !== undefined);
      if (dataColumns.length === 0) return;

      const tableWidth = tableRef.current.clientWidth;
      const rowHeaderWidth = 40;
      const availableWidth = tableWidth - rowHeaderWidth - 20;
      const columnWidth = Math.max(150, Math.floor(availableWidth / dataColumns.length));

      dataColumns.forEach((col: ColumnComponent) => {
        col.setWidth(columnWidth);
      });
    };

    // テーブル構築完了後にイベントをセットアップ
    tabulatorRef.current.on('tableBuilt', () => {
      adjustColumnWidths();

      // タブクリックを検知してシート切り替え開始フラグを立てる
      const tabContainer = tableRef.current?.querySelector('.tabulator-spreadsheet-tabs');
      if (tabContainer) {
        tabContainer.addEventListener('click', () => {
          isSheetSwitchingRef.current = true;
        });
      }

      // シート切り替え時に現在のシートキーを更新し、選択を復元
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabulatorRef.current?.on('sheetLoaded', (sheet: any) => {
        // 遅延通知をキャンセル（シート切り替え前の選択変更を無視）
        if (selectionChangeTimerRef.current !== null) {
          window.clearTimeout(selectionChangeTimerRef.current);
          selectionChangeTimerRef.current = null;
        }

        isSheetSwitchingRef.current = true;

        currentSheetKeyRef.current = sheet.getKey();
        const isFirst = currentSheetKeyRef.current === firstSheetKey;
        setIsFirstSheet(isFirst);

        // 再描画後に列幅調整と選択復元
        setTimeout(() => {
          adjustColumnWidths();
          // 1シート目の場合のみ選択を復元
          if (isFirst) {
            const propsSelection = getSelectionFromProps();
            applySelectionToTabulator(propsSelection);
          }
          // シート切り替え完了
          isSheetSwitchingRef.current = false;
        }, 0);
      });

      // セルクリック時にハイパーリンクがあればシート切り替え
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabulatorRef.current?.on('cellClick', (_e: Event, cell: any) => {
        const rowIndex = cell.getRow().getPosition() - 1;
        const colField = cell.getColumn().getField();
        if (!colField) return;

        const colIndex = getColumnIndex(colField);
        const hyperlink = hasHyperlink(rowIndex, colIndex);
        if (hyperlink) {
          const targetSheetKey = makeSheetKey(hyperlink.sheetName);
          tabulatorRef.current?.activeSheet(targetSheetKey);
        }
      });

      // 行選択変更イベント
      tabulatorRef.current?.on('rowSelectionChanged', () => {
        // 既存の遅延通知をキャンセル
        if (selectionChangeTimerRef.current !== null) {
          window.clearTimeout(selectionChangeTimerRef.current);
          selectionChangeTimerRef.current = null;
        }

        // 内部更新中またはシート切り替え中は無視
        if (isInternalUpdateRef.current || isSheetSwitchingRef.current) {
          return;
        }

        // 1シート目以外は何もしない（親への通知も行わない）
        if (currentSheetKeyRef.current !== firstSheetKey) {
          return;
        }

        // 選択変更を遅延通知（シート切り替え時はsheetLoadedでキャンセルされる）
        selectionChangeTimerRef.current = window.setTimeout(() => {
          selectionChangeTimerRef.current = null;
          // 再度チェック（遅延中にシート切り替えが開始された場合）
          if (isSheetSwitchingRef.current) {
            return;
          }
          if (currentSheetKeyRef.current !== firstSheetKey) {
            return;
          }
          const indices = getSelectionFromTabulator();
          notifySelectionChange(indices);
        }, 50);
      });

      // 初回表示時の選択適用（propsから）
      const initialSelection = getSelectionFromProps();
      applySelectionToTabulator(initialSelection);

      // 初期選択を親に通知
      setTimeout(() => {
        const indices = getSelectionFromTabulator();
        notifySelectionChange(indices);
      }, 0);
    });

    return () => {
      if (selectionChangeTimerRef.current !== null) {
        window.clearTimeout(selectionChangeTimerRef.current);
        selectionChangeTimerRef.current = null;
      }
      tabulatorRef.current?.destroy();
      tabulatorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheets]);

  // 親からの選択状態変更を反映
  useEffect(() => {
    if (sheets.length === 0) return;
    if (!tabulatorRef.current) return;
    // 内部更新中は反映しない
    if (isInternalUpdateRef.current) return;

    const firstSheetKey = firstSheetKeyRef.current;
    const firstSheet = sheetsMapRef.current.get(firstSheetKey);
    if (!firstSheet) return;

    // 1シート目が表示中でない場合はスキップ
    if (currentSheetKeyRef.current !== firstSheetKey) return;

    // propsから選択を取得
    const incomingIndices = selectedRows?.[firstSheetKey];
    const normalized = normalizeIndices(incomingIndices, firstSheet.data.length);

    // 現在のTabulator選択状態と比較
    const currentSelection = tabulatorRef.current.getSelectedRows()
      .map((row: RowComponent) => {
        const pos = row.getPosition();
        return pos !== false ? pos - 1 : -1;
      })
      .filter((idx: number) => idx >= 0)
      .sort((a: number, b: number) => a - b);

    // 全選択の正規化
    const maxRows = firstSheet.data.length;
    const normalizedCurrent = currentSelection.length === maxRows ? [] : currentSelection;
    const normalizedIncoming = normalized.length === maxRows ? [] : normalized;

    // 変更がない場合はスキップ
    if (areIndicesEqual(normalizedCurrent, normalizedIncoming)) {
      return;
    }

    // 選択状態を適用
    isInternalUpdateRef.current = true;
    tabulatorRef.current.deselectRow();

    if (normalized.length === 0 || normalized.length === maxRows) {
      tabulatorRef.current.selectRow();
    } else {
      const rows = tabulatorRef.current.getRows();
      const selectedSet = new Set(normalized);
      rows.forEach((row: RowComponent) => {
        const pos = row.getPosition();
        if (pos !== false && selectedSet.has(pos - 1)) {
          tabulatorRef.current?.selectRow(row);
        }
      });
    }

    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 0);
  }, [selectedRows, sheets]);

  return (
    <div
      ref={tableRef}
      className="spreadsheet-viewer"
      data-first-sheet={isFirstSheet ? 'true' : 'false'}
    />
  );
}
