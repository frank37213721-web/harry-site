/**
 * 站內報名：把 register.html 送來的報名資料寫進這份 Google 試算表的「站內報名」分頁
 * 給沒有全國教師在職進修資訊網帳號的老師使用。部署方式見 README.md
 */
const SHEET_NAME = '站內報名';
const HEADERS = ['報名時間', '報名場次', '姓名', '服務單位', 'Email', '手機', '用餐'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }
    // 舊分頁沒有新欄位時，補上標題列（例如後來加的「用餐」）
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    const p = e.parameter;
    const now = new Date();
    // 一次勾兩場時，每一場各寫一列，方便分場統計人數
    const sessions = String(p.sessions || '').split('、').map(function (s) { return s.trim(); }).filter(String);
    if (!sessions.length) sessions.push('');
    // 手機前面加 ' 讓試算表保留開頭的 0
    const rows = sessions.map(function (s) {
      return [now, s, p.name, p.unit, p.email, "'" + (p.phone || ''), p.meal || ''];
    });
    const start = sheet.getLastRow() + 1;
    sheet.getRange(start, 1, rows.length, HEADERS.length).setValues(rows);
    // setValues 不會自動套用日期時間格式，手動指定才會顯示時分秒
    sheet.getRange(start, 1, rows.length, 1).setNumberFormat('yyyy/mm/dd hh:mm:ss');
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
