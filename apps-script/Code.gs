// Rumbo a la IPO v2 — receptor de resultados. Pega este archivo en Extensiones → Apps Script de tu Google Sheet.
// Ver README.md para los pasos de publicación.

const SHEET = 'Intentos v2';
const HEADERS = ['runId', 'timestamp', 'classCode', 'playerId', 'playerName', 'runNumber', 'seed', 'line', 'endingId',
  'monthReached', 'bestSustained', 'ipoTarget', 'valuationPts', 'crisesOccurred', 'crisesSurvived', 'crisesPts', 'questionsAsked',
  'questionsCorrect', 'questionsPts', 'total', 'galleryCount', 'log'];

function sanitize_(v) {
  return (typeof v === 'string' && /^[=+\-@\t\r]/.test(v)) ? "'" + v : v;
}

// Force text so all-digit IDs keep leading zeros and never mix types in the QUERY tab.
function asText_(v) {
  v = String(v);
  return v.charAt(0) === "'" ? v : "'" + v;
}

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
    if (!dup) sh.appendRow(HEADERS.map(function (h) { if (h === 'playerId' || h === 'classCode') return asText_(row[h] === undefined ? '' : row[h]);
      return row[h] === undefined ? '' : sanitize_(row[h]); }));
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

// Ejecútala una vez a mano: crea la pestaña "Mejor intento v2" (mejor total por estudiante).
// Columnas: D matrícula, E nombre, K mejor valuación sostenida, T total, U finales descubiertos.
function setupBestTab() {
  sheet_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Mejor intento v2') || ss.insertSheet('Mejor intento v2');
  sh.clear();
  sh.getRange('A1').setFormula(
    '=QUERY(\'Intentos v2\'!A:V, "select D, max(E), max(T), count(A), max(K), max(U) where D is not null group by D order by max(T) desc ' +
    'label D \'Matrícula\', max(E) \'Nombre\', max(T) \'Mejor total\', count(A) \'Intentos\', max(K) \'Mejor valuación\', max(U) \'Finales descubiertos\'", 1)');
}
