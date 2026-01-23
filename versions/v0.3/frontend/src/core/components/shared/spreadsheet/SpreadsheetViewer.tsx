/**
 * 汎用スプレッドシートビューアーコンポーネント
 * TabulatorのスプレッドシートモードでExcelデータを表示
 */

import { useEffect, useRef } from 'react';
import { TabulatorFull as Tabulator, type ColumnComponent } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator_simple.min.css';
import './SpreadsheetViewer.css';
import type { SpreadsheetSheet, CellHyperlink, SpreadsheetViewerProps } from './types';

// シート名からキーを生成
function makeSheetKey(title: string): string {
  return title.replace(/[^a-zA-Z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/g, '_');
}

export function SpreadsheetViewer({ sheets }: SpreadsheetViewerProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const tabulatorRef = useRef<Tabulator | null>(null);
  // sheets を key でアクセスできるMapとして保持
  const sheetsMapRef = useRef<Map<string, SpreadsheetSheet>>(new Map());
  // 現在表示中のシートキー
  const currentSheetKeyRef = useRef<string>('');
  // シート切り替え後の再描画が必要かどうか
  const needsRedrawAfterSheetLoadRef = useRef<boolean>(false);

  useEffect(() => {
    if (!tableRef.current || sheets.length === 0) return;

    // 既にインスタンスがある場合は破棄
    if (tabulatorRef.current) {
      tabulatorRef.current.destroy();
      tabulatorRef.current = null;
    }

    // sheetsをMapに変換して保持
    sheetsMapRef.current = new Map(sheets.map((s) => [s.key, s]));

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
      rowHeader: {
        resizable: false,
        frozen: true,
        width: 40,
        hozAlign: 'center',
        formatter: 'rownum',
      },
    } as any);

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
    });

    return () => {
      tabulatorRef.current?.destroy();
      tabulatorRef.current = null;
    };
  }, [sheets]);

  return <div ref={tableRef} />;
}
