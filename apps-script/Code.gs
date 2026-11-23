// Rumbo a la IPO — receptor de resultados. Pega este archivo en Extensiones → Apps Script de tu Google Sheet.
// Ver README.md para los pasos de publicación.

const SHEET = 'Intentos';
const HEADERS = ['runId', 'timestamp', 'classCode', 'playerId', 'playerName', 'runNumber', 'seed', 'outcome',
  'endingId', 'stageReached', 'quarterReached', 'checkpointItems', 'checkpointCorrect', 'checkpointPts', 'outcomePts',
  'firmValue', 'benchmarkValue', 'valuePts', 'total', 'openText', 'galleryCount', 'decisionLog'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) sh = ss.insertSheet(SHEET);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const row = JSON.parse(e.postData.contents);
    const sh = sheet_();
    const dup = sh.getRange('A:A').createTextFinder(String(row.runId)).matchEntireCell(true).findNext();
    if (!dup) sh.appendRow(HEADERS.map(function (h) { return row[h] === undefined ? '' : row[h]; }));
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

// Ejecútala una vez a mano: crea la pestaña "Mejor intento" (mejor total por estudiante).
function setupBestTab() {
  sheet_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Mejor intento') || ss.insertSheet('Mejor intento');
  sh.clear();
  sh.getRange('A1').setFormula(
    '=QUERY(Intentos!A:V, "select D, max(E), max(S), count(A), max(U) where D is not null group by D order by max(S) desc ' +
    'label D \'Matrícula\', max(E) \'Nombre\', max(S) \'Mejor total\', count(A) \'Intentos\', max(U) \'Finales descubiertos\'", 1)');
}
