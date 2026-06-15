export function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(';')).join('\n');
}

export function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(rows, filename) {
  downloadBlob(new Blob(['\uFEFF' + rowsToCsv(rows)], { type: 'text/csv;charset=utf-8;' }), filename);
}
