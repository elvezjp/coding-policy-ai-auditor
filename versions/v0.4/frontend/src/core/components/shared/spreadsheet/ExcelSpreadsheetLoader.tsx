/**
 * 汎用Excelスプレッドシートローダーコンポーネント
 * Excelファイルのアップロードと解析、SpreadsheetViewerでの表示を行う
 */

import { useState } from 'react';
import { FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';
import { SpreadsheetViewer } from './SpreadsheetViewer';
import type { SpreadsheetSheet, ExcelSpreadsheetLoaderProps } from './types';

export function ExcelSpreadsheetLoader({
  parseExcel,
  onSheetsChange,
  emptyMessage = 'Excelファイルを選択してください',
  selectedRows,
  onRowSelectionChange,
}: ExcelSpreadsheetLoaderProps) {
  const [sheets, setSheets] = useState<SpreadsheetSheet[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    // 拡張子チェック
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setError('Excel (.xlsx, .xls) ファイルを選択してください。');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await parseExcel(file);

      if (result.success) {
        setSheets(result.sheets);
        setFilename(result.filename);
        onSheetsChange?.(result.sheets);
      } else {
        setError(result.error || 'ファイルの解析に失敗しました。');
      }
    } catch (err) {
      setError('ファイルのアップロードに失敗しました。');
      console.error('Failed to parse excel:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // シート数の合計を計算
  const totalSheets = sheets.length;

  return (
    <div className="flex flex-col gap-4">
      {/* ファイルアップロードセクション */}
      <div className="flex items-center gap-4 flex-wrap">
        <label
          className={`cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition text-sm inline-flex items-center gap-2 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              読み込み中...
            </>
          ) : (
            <>
              <FileSpreadsheet size={16} />
              ファイルを選択
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                handleFileSelect(files);
              }
              // リセットして同じファイルを再選択可能にする
              e.target.value = '';
            }}
            disabled={isLoading}
          />
        </label>

        {filename && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-700">
            <FileSpreadsheet size={16} />
            <span>{filename}</span>
            <span className="text-gray-500">({totalSheets}シート)</span>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ファイル選択後の注意書き */}
      {sheets.length > 0 && (
        <div className="text-xs text-gray-400">
          <p>※ 1シート目で選択したコーディング規約がマークダウンに変換されます。</p>
          <p>※ 2シート目以降は、選択した行からリンクされたシートが自動的に追加されます。</p>
        </div>
      )}

      {/* スプレッドシート表示 */}
      {sheets.length > 0 && (
        <SpreadsheetViewer
          sheets={sheets}
          selectedRows={selectedRows}
          onRowSelectionChange={onRowSelectionChange}
        />
      )}

      {/* 空状態 */}
      {sheets.length === 0 && !isLoading && !error && (
        <div className="text-center py-8 text-gray-500">{emptyMessage}</div>
      )}
    </div>
  );
}
