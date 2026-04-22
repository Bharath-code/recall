import { colors } from './colors.ts';
import { SPACING } from './format.ts';

export interface Column {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

export interface TableOptions {
  columns: Column[];
  rows: string[][];
  showHeader?: boolean;
  indent?: number;
}

export function formatTable(options: TableOptions): string[] {
  const { columns, rows, showHeader = true, indent = 0 } = options;
  const prefix = SPACING.indent.repeat(indent);
  const lines: string[] = [];

  // Calculate column widths
  const colWidths = columns.map((col) => col.width);

  // Format header
  if (showHeader) {
    const header = columns.map((col, i) => {
      const text = col.header.padEnd(colWidths[i]);
      return colors.bold(text);
    }).join(SPACING.columnGap);
    lines.push(prefix + header);
    const separatorWidth = colWidths.reduce((a, b) => a + b, 0) + (colWidths.length - 1) * SPACING.columnGap.length;
    lines.push(prefix + SPACING.separator.repeat(separatorWidth));
  }

  // Format rows
  for (const row of rows) {
    const formatted = row.map((cell, i) => {
      const col = columns[i];
      const width = colWidths[i];
      
      let text: string;
      if (col.align === 'right') {
        text = cell.padStart(width);
      } else if (col.align === 'center') {
        text = cell.padStart(Math.floor((width - cell.length) / 2) + cell.length).padEnd(width);
      } else {
        text = cell.padEnd(width);
      }
      
      return text;
    }).join(SPACING.columnGap);
    
    lines.push(prefix + formatted);
  }

  return lines;
}

export function formatKeyValueTable(pairs: Record<string, string>, indent: number = 0): string[] {
  const prefix = SPACING.indent.repeat(indent);
  const lines: string[] = [];
  
  const maxKeyLength = Math.max(...Object.keys(pairs).map((k) => k.length));
  
  for (const [key, value] of Object.entries(pairs)) {
    const paddedKey = key.padEnd(maxKeyLength);
    lines.push(prefix + colors.textDim(paddedKey) + ': ' + value);
  }
  
  return lines;
}

export function formatGrid(items: string[], columns: number, indent: number = 0): string[] {
  const prefix = SPACING.indent.repeat(indent);
  const lines: string[] = [];
  
  for (let i = 0; i < items.length; i += columns) {
    const row = items.slice(i, i + columns);
    lines.push(prefix + row.join(SPACING.columnGap));
  }
  
  return lines;
}
