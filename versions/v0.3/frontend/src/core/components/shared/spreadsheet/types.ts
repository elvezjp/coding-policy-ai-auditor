/**
 * Spreadsheet関連の型定義
 */

/** セルのハイパーリンク情報 */
export interface CellHyperlink {
  sheetName: string;  // リンク先シート名
  cell: string;       // リンク先セル（例: "A1"）
}

/** スプレッドシートのシートデータ */
export interface SpreadsheetSheet {
  title: string;                              // シート名
  key: string;                                // 識別キー
  data: string[][];                           // 2次元配列データ
  rows: number;                               // 行数
  columns: number;                            // 列数
  hyperlinks: Record<string, CellHyperlink>;  // ハイパーリンク情報 {"row,col": {sheetName, cell}}
}

/** 全シートの選択状態（シートkey -> 選択行index配列） */
export type SpreadsheetRowSelection = Record<string, number[]>;

/** SpreadsheetViewer コンポーネントのProps */
export interface SpreadsheetViewerProps {
  sheets: SpreadsheetSheet[];
  selectedRows?: SpreadsheetRowSelection;
  onRowSelectionChange?: (selection: SpreadsheetRowSelection) => void;
}

/** スプレッドシート解析結果 */
export interface SpreadsheetParseResult {
  success: boolean;
  sheets: SpreadsheetSheet[];
  filename: string;
  error?: string;
}

/** ExcelSpreadsheetLoader コンポーネントのProps */
export interface ExcelSpreadsheetLoaderProps {
  parseExcel: (file: File) => Promise<SpreadsheetParseResult>;
  onSheetsChange?: (sheets: SpreadsheetSheet[]) => void;
  emptyMessage?: string;
  selectedRows?: SpreadsheetRowSelection;
  onRowSelectionChange?: (selection: SpreadsheetRowSelection) => void;
}
