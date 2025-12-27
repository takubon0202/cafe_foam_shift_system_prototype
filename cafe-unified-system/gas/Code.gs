/**
 * 共創カフェ 統合シフト・勤怠管理システム - Google Apps Script
 * 週1制約 + シフト枠別打刻 + 遅刻/早退判定対応
 *
 * 設定手順:
 * 1. Google スプレッドシートを新規作成
 * 2. 拡張機能 > Apps Script を開く
 * 3. このコードを貼り付け
 * 4. デプロイ > 新しいデプロイ
 * 5. 種類: ウェブアプリ
 * 6. アクセスできるユーザー: 全員
 * 7. デプロイ後のURLをconfig.jsのGAS_URLに設定
 */

// シート名
const SHEET_SHIFTS = 'シフト提出';
const SHEET_CLOCK = '打刻履歴';

// シフト枠定義
const SHIFT_SLOTS = {
  AM_A: { label: '午前A', start: '10:00', end: '11:30' },
  AM_B: { label: '午前B', start: '11:00', end: '12:30' },
  PM_A: { label: '午後A', start: '15:00', end: '16:30' },
  PM_B: { label: '午後B', start: '15:30', end: '17:00' }
};

// 許容時間（分）
const LATE_THRESHOLD = 5;    // 5分以上遅刻
const EARLY_THRESHOLD = 15;  // 15分以上早退

/**
 * 日付を正規化してYYYY-MM-DD形式の文字列に変換
 * タイムゾーンの問題を回避するための堅牢な処理
 */
function normalizeDate(dateValue) {
  if (!dateValue) return '';

  // Date オブジェクトの場合
  if (dateValue instanceof Date) {
    return Utilities.formatDate(dateValue, 'Asia/Tokyo', 'yyyy-MM-dd');
  }

  // 文字列の場合
  if (typeof dateValue === 'string') {
    // アポストロフィを除去
    let str = dateValue.startsWith("'") ? dateValue.substring(1) : dateValue;

    // ISO形式 (例: 2024-12-21T15:00:00.000Z) の場合
    if (str.includes('T')) {
      // ISO文字列をパースしてJSTで日付を取得
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy-MM-dd');
      }
      // パース失敗時はTより前を使用
      str = str.split('T')[0];
    }

    // YYYY-MM-DD形式かチェック
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // 1899/1900年の無効な日付を除外
    if (str.startsWith('1899') || str.startsWith('1900')) {
      return '';
    }

    return str;
  }

  // 数値の場合（Excelシリアル値）
  if (typeof dateValue === 'number') {
    // Excelシリアル値をDateに変換
    // Excelの基準日は1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy-MM-dd');
  }

  return String(dateValue);
}

/**
 * シフト提出シートを取得または作成
 */
function getShiftSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SHIFTS);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SHIFTS);
    const headers = [
      'ID', 'スタッフID', 'スタッフ名', '週キー', '日付',
      'シフト枠ID', 'シフト枠名', '開始時刻', '終了時刻', '提出日時'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * 打刻履歴シートを取得または作成
 */
function getClockSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_CLOCK);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CLOCK);
    const headers = [
      'ID', 'スタッフID', 'スタッフ名', '日付', 'シフト枠ID',
      'シフト枠名', '種別', '時刻', '状態', 'タイムスタンプ'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * POSTリクエストを処理
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    let result;

    switch (data.action) {
      case 'submitShifts':
        result = handleSubmitShifts(data.submissions);
        break;
      case 'punch':
        result = handlePunch(data);
        break;
      case 'getShifts':
        result = handleGetShifts(data);
        break;
      case 'getClockRecords':
        result = handleGetClockRecords(data);
        break;
      case 'getAllShifts':
        result = handleGetAllShifts();
        break;
      case 'getAllClockRecords':
        result = handleGetAllClockRecords();
        break;
      case 'deleteShifts':
        result = handleDeleteShifts(data);
        break;
      case 'deleteShift':
        result = handleDeleteShiftById(data.shiftId);
        break;
      case 'checkViolations':
        result = handleCheckViolations();
        break;
      case 'getStats':
        result = handleGetStats();
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }

    return createResponse(result);
  } catch (error) {
    return createResponse({ success: false, error: error.toString() });
  }
}

/**
 * GETリクエストを処理
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'status';
    let result;

    switch (action) {
      case 'getShifts':
        result = handleGetShifts(e.parameter);
        break;
      case 'getClockRecords':
        result = handleGetClockRecords(e.parameter);
        break;
      case 'getAllShifts':
        result = handleGetAllShifts();
        break;
      case 'getAllClockRecords':
        result = handleGetAllClockRecords();
        break;
      case 'checkViolations':
        result = handleCheckViolations();
        break;
      case 'getStats':
        result = handleGetStats();
        break;
      case 'status':
      default:
        result = {
          success: true,
          message: 'Cafe Unified System API',
          version: '1.0'
        };
    }

    return createResponse(result);
  } catch (error) {
    return createResponse({ success: false, error: error.toString() });
  }
}

/**
 * シフト提出処理（週1制約チェック付き）
 */
function handleSubmitShifts(submissions) {
  if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
    return { success: false, error: 'No submissions provided' };
  }

  const sheet = getShiftSheet();
  const existingData = sheet.getDataRange().getValues();
  const rows = existingData.slice(1);

  // 週1制約チェック
  for (const sub of submissions) {
    const duplicate = rows.find(row =>
      row[1] === sub.staffId && row[3] === sub.weekKey
    );

    if (duplicate) {
      return {
        success: false,
        error: 'WEEKLY_LIMIT',
        message: `${sub.weekKey}週には既にシフトが登録されています`
      };
    }
  }

  // データを追加
  submissions.forEach(sub => {
    // クライアントが提供したIDを使用（キャンセル機能のため）
    const id = sub.id || Utilities.getUuid();
    const slot = SHIFT_SLOTS[sub.slotId] || { label: sub.slotLabel, start: sub.startTime, end: sub.endTime };

    // 日付を正規化（YYYY-MM-DD形式を保証）
    let dateStr = normalizeDate(sub.date);

    sheet.appendRow([
      String(id),
      String(sub.staffId),
      String(sub.staffName),
      String(sub.weekKey),
      "'" + dateStr,  // アポストロフィでGoogle Sheetsの自動変換を防ぐ
      String(sub.slotId),
      String(slot.label),
      String(slot.start),
      String(slot.end),
      String(sub.createdAt || new Date().toISOString())
    ]);
  });

  return {
    success: true,
    ok: true,
    count: submissions.length,
    message: `${submissions.length}件のシフトを登録しました`
  };
}

/**
 * 打刻処理（遅刻/早退判定付き）
 */
function handlePunch(data) {
  const { staffId, staffName, date, slotId, type, time, status, timestamp } = data;

  if (!staffId || !date || !slotId || !type || !time) {
    return { success: false, error: '必要なデータが不足しています' };
  }

  const sheet = getClockSheet();

  // 二重打刻チェック
  const lastRecord = getLastRecordForSlot(staffId, date, slotId);

  if (lastRecord && lastRecord.type === type) {
    return {
      success: false,
      error: type === 'IN' ? 'このシフト枠はすでに出勤済みです' : 'このシフト枠はすでに退勤済みです'
    };
  }

  if (type === 'OUT' && !lastRecord) {
    return { success: false, error: '先に出勤打刻をしてください' };
  }

  // 遅刻/早退判定
  let clockStatus = status || 'normal';
  const slot = SHIFT_SLOTS[slotId];

  if (slot) {
    if (type === 'IN') {
      clockStatus = determineClockInStatus(time, slot.start);
    } else if (type === 'OUT') {
      clockStatus = determineClockOutStatus(time, slot.end);
    }
  }

  const slotLabel = slot ? slot.label : slotId;

  // 記録を追加
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    staffId,
    staffName,
    date,
    slotId,
    slotLabel,
    type,
    time,
    clockStatus,
    timestamp || new Date().toISOString()
  ]);

  return {
    success: true,
    ok: true,
    id: id,
    status: clockStatus,
    message: type === 'IN' ? '出勤を記録しました' : '退勤を記録しました'
  };
}

/**
 * 出勤時の遅刻判定
 */
function determineClockInStatus(clockTime, slotStartTime) {
  const [clockH, clockM] = clockTime.split(':').map(Number);
  const [startH, startM] = slotStartTime.split(':').map(Number);

  const clockMinutes = clockH * 60 + clockM;
  const startMinutes = startH * 60 + startM;

  if (clockMinutes > startMinutes + LATE_THRESHOLD) {
    return 'late';
  }
  return 'normal';
}

/**
 * 退勤時の早退判定
 */
function determineClockOutStatus(clockTime, slotEndTime) {
  const [clockH, clockM] = clockTime.split(':').map(Number);
  const [endH, endM] = slotEndTime.split(':').map(Number);

  const clockMinutes = clockH * 60 + clockM;
  const endMinutes = endH * 60 + endM;

  if (clockMinutes < endMinutes - EARLY_THRESHOLD) {
    return 'early_leave';
  }
  return 'normal';
}

/**
 * スロット別最新記録を取得
 */
function getLastRecordForSlot(staffId, date, slotId) {
  const sheet = getClockSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === staffId && data[i][3] === date && data[i][4] === slotId) {
      return {
        staffId: data[i][1],
        staffName: data[i][2],
        date: data[i][3],
        slotId: data[i][4],
        slotLabel: data[i][5],
        type: data[i][6],
        time: data[i][7],
        status: data[i][8]
      };
    }
  }

  return null;
}

/**
 * シフトデータ取得（フィルター付き）
 */
function handleGetShifts(params) {
  const sheet = getShiftSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, shifts: [] };
  }

  const rows = data.slice(1);
  let shifts = rows.map(row => {
    // 日付を正規化（normalizeDate関数を使用）
    const dateValue = normalizeDate(row[4]);

    // staffIdも文字列に変換（数値として読み込まれる場合がある）
    let staffIdValue = row[1];
    if (typeof staffIdValue === 'number') {
      staffIdValue = String(staffIdValue);
    }

    // 時刻の正規化（ISO形式の場合はHH:MM形式に変換）
    let startTime = row[7];
    let endTime = row[8];

    // 時刻がDateオブジェクトの場合
    if (startTime instanceof Date) {
      startTime = Utilities.formatDate(startTime, 'Asia/Tokyo', 'HH:mm');
    } else if (typeof startTime === 'string' && startTime.includes('T')) {
      const date = new Date(startTime);
      if (!isNaN(date.getTime())) {
        startTime = Utilities.formatDate(date, 'Asia/Tokyo', 'HH:mm');
      }
    }

    if (endTime instanceof Date) {
      endTime = Utilities.formatDate(endTime, 'Asia/Tokyo', 'HH:mm');
    } else if (typeof endTime === 'string' && endTime.includes('T')) {
      const date = new Date(endTime);
      if (!isNaN(date.getTime())) {
        endTime = Utilities.formatDate(date, 'Asia/Tokyo', 'HH:mm');
      }
    }

    // slotIdからslotLabel, startTime, endTimeを補完
    const slotId = String(row[5] || '');
    const slot = SHIFT_SLOTS[slotId];
    if (slot) {
      if (!startTime || startTime.includes('1899') || startTime.includes('1900')) {
        startTime = slot.start;
      }
      if (!endTime || endTime.includes('1899') || endTime.includes('1900')) {
        endTime = slot.end;
      }
    }

    return {
      id: String(row[0] || ''),
      staffId: String(staffIdValue || ''),
      staffName: String(row[2] || ''),
      weekKey: String(row[3] || ''),
      date: dateValue,
      slotId: slotId,
      slotLabel: String(row[6] || slot?.label || ''),
      startTime: String(startTime || ''),
      endTime: String(endTime || ''),
      createdAt: String(row[9] || '')
    };
  });

  // 空のIDを持つ行を除外
  shifts = shifts.filter(s => s.id && s.staffId && s.date);

  if (params.staffId) {
    shifts = shifts.filter(s => s.staffId === params.staffId);
  }
  if (params.weekKey) {
    shifts = shifts.filter(s => s.weekKey === params.weekKey);
  }
  if (params.date) {
    shifts = shifts.filter(s => s.date === params.date);
  }

  return { success: true, shifts: shifts };
}

/**
 * 全シフトデータ取得
 */
function handleGetAllShifts() {
  return handleGetShifts({});
}

/**
 * 打刻データ取得（フィルター付き）
 */
function handleGetClockRecords(params) {
  const sheet = getClockSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, records: [] };
  }

  const rows = data.slice(1);
  let records = rows.map(row => ({
    id: row[0],
    staffId: row[1],
    staffName: row[2],
    date: row[3],
    slotId: row[4],
    slotLabel: row[5],
    type: row[6],
    time: row[7],
    status: row[8],
    timestamp: row[9]
  }));

  if (params.staffId) {
    records = records.filter(r => r.staffId === params.staffId);
  }
  if (params.date) {
    records = records.filter(r => r.date === params.date);
  }
  if (params.slotId) {
    records = records.filter(r => r.slotId === params.slotId);
  }

  return { success: true, records: records };
}

/**
 * 全打刻データ取得
 */
function handleGetAllClockRecords() {
  return handleGetClockRecords({});
}

/**
 * シフト削除（スタッフ指定）
 */
function handleDeleteShifts(data) {
  const { staffId, weekKey } = data;

  if (!staffId) {
    return { success: false, error: 'スタッフIDが指定されていません' };
  }

  const sheet = getShiftSheet();
  const sheetData = sheet.getDataRange().getValues();

  const rowsToDelete = [];
  for (let i = sheetData.length - 1; i >= 1; i--) {
    const rowStaffId = sheetData[i][1];
    const rowWeekKey = sheetData[i][3];

    if (rowStaffId === staffId) {
      if (!weekKey || rowWeekKey === weekKey) {
        rowsToDelete.push(i + 1);
      }
    }
  }

  rowsToDelete.forEach(rowNum => {
    sheet.deleteRow(rowNum);
  });

  return {
    success: true,
    message: `${rowsToDelete.length}件のシフトを削除しました`
  };
}

/**
 * シフト削除（ID指定）
 */
function handleDeleteShiftById(shiftId) {
  if (!shiftId) {
    return { success: false, error: 'シフトIDが指定されていません' };
  }

  const sheet = getShiftSheet();
  const sheetData = sheet.getDataRange().getValues();

  for (let i = sheetData.length - 1; i >= 1; i--) {
    if (sheetData[i][0] === shiftId) {
      sheet.deleteRow(i + 1);
      return {
        success: true,
        ok: true,
        message: 'シフトを削除しました'
      };
    }
  }

  return { success: false, error: '該当するシフトが見つかりません' };
}

/**
 * 週1制約違反チェック
 */
function handleCheckViolations() {
  const sheet = getShiftSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, violations: [] };
  }

  const rows = data.slice(1);
  const groups = {};

  rows.forEach(row => {
    const key = `${row[3]}_${row[1]}`; // weekKey_staffId
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push({
      id: row[0],
      staffId: row[1],
      staffName: row[2],
      weekKey: row[3],
      date: row[4],
      slotId: row[5]
    });
  });

  const violations = [];
  Object.entries(groups).forEach(([key, entries]) => {
    if (entries.length > 1) {
      violations.push({
        weekKey: entries[0].weekKey,
        staffId: entries[0].staffId,
        staffName: entries[0].staffName,
        count: entries.length,
        shifts: entries
      });
    }
  });

  return { success: true, violations: violations };
}

/**
 * 統計情報取得
 */
function handleGetStats() {
  const shiftSheet = getShiftSheet();
  const clockSheet = getClockSheet();

  const shiftCount = Math.max(0, shiftSheet.getLastRow() - 1);
  const clockCount = Math.max(0, clockSheet.getLastRow() - 1);

  // 遅刻・早退カウント
  const clockData = clockSheet.getDataRange().getValues();
  let lateCount = 0;
  let earlyLeaveCount = 0;

  for (let i = 1; i < clockData.length; i++) {
    if (clockData[i][8] === 'late') lateCount++;
    if (clockData[i][8] === 'early_leave') earlyLeaveCount++;
  }

  return {
    success: true,
    stats: {
      shiftCount: shiftCount,
      clockCount: clockCount,
      lateCount: lateCount,
      earlyLeaveCount: earlyLeaveCount
    }
  };
}

/**
 * CORSに対応したレスポンスを作成
 */
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 初期設定用関数
 */
function initializeSheets() {
  getShiftSheet();
  getClockSheet();
  Logger.log('シートを初期化しました');
}

/**
 * テスト用: サンプルデータを追加
 */
function addSampleData() {
  const shiftSheet = getShiftSheet();
  const clockSheet = getClockSheet();
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

  // サンプルシフト
  shiftSheet.appendRow([
    Utilities.getUuid(), 's23e101', 'テスト太郎', '第1週', today,
    'PM_A', '午後A', '15:00', '16:30', new Date().toISOString()
  ]);

  // サンプル打刻
  clockSheet.appendRow([
    Utilities.getUuid(), 's23e101', 'テスト太郎', today,
    'PM_A', '午後A', 'IN', '15:00', 'normal', new Date().toISOString()
  ]);

  Logger.log('サンプルデータを追加しました');
}

/**
 * デバッグ用: シートの生データを確認
 */
function debugShiftData() {
  const sheet = getShiftSheet();
  const data = sheet.getDataRange().getValues();

  Logger.log('=== シフトシートの生データ ===');
  Logger.log('行数: ' + data.length);

  data.forEach((row, index) => {
    Logger.log('行 ' + index + ': ' + JSON.stringify(row));
    if (index > 0 && row[4]) {
      const dateVal = row[4];
      Logger.log('  日付の型: ' + typeof dateVal);
      Logger.log('  日付の値: ' + dateVal);
      if (dateVal instanceof Date) {
        Logger.log('  Dateオブジェクト: ' + Utilities.formatDate(dateVal, 'Asia/Tokyo', 'yyyy-MM-dd'));
      }
    }
  });

  // 変換後のデータ
  const result = handleGetAllShifts();
  Logger.log('=== 変換後のデータ ===');
  Logger.log(JSON.stringify(result, null, 2));

  return result;
}

/**
 * デバッグ用: APIテスト
 */
function testGetAllShifts() {
  const result = handleGetAllShifts();
  Logger.log('getAllShifts結果: ' + JSON.stringify(result));
  return result;
}
