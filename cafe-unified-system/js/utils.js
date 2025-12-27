/**
 * 共創カフェ 統合シフト・勤怠管理システム - ユーティリティ関数
 */

const Utils = {
    // =======================================================================
    // 日時関連
    // =======================================================================

    /**
     * 現在の日本時間を取得
     * @returns {Date} 日本時間のDateオブジェクト
     */
    getJSTDate() {
        const now = new Date();
        const jstOffset = 9 * 60; // 日本は UTC+9
        const utcOffset = now.getTimezoneOffset();
        return new Date(now.getTime() + (jstOffset + utcOffset) * 60 * 1000);
    },

    /**
     * 日付を YYYY-MM-DD 形式でフォーマット
     * @param {Date} date - 日付
     * @returns {string} フォーマットされた日付文字列
     */
    formatDate(date) {
        const d = date || this.getJSTDate();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 日付を日本語形式でフォーマット
     * @param {Date} date - 日付
     * @returns {string} フォーマットされた日付文字列
     */
    formatDateJP(date) {
        const d = date || this.getJSTDate();
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[d.getDay()];
        return `${year}年${month}月${day}日（${weekday}）`;
    },

    /**
     * 日付を短い日本語形式でフォーマット（例: 1/15（木））
     * @param {string} dateStr - YYYY-MM-DD形式の日付文字列
     * @returns {string} フォーマットされた日付文字列
     */
    formatDateShortJP(dateStr) {
        const d = parseDateStr(dateStr);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[d.getDay()];
        return `${month}/${day}（${weekday}）`;
    },

    /**
     * 時刻を HH:MM:SS 形式でフォーマット
     * @param {Date} date - 日付
     * @returns {string} フォーマットされた時刻文字列
     */
    formatTime(date) {
        const d = date || this.getJSTDate();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    },

    /**
     * 時刻を HH:MM 形式でフォーマット
     * @param {Date} date - 日付
     * @returns {string} フォーマットされた時刻文字列
     */
    formatTimeShort(date) {
        const d = date || this.getJSTDate();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    // =======================================================================
    // 勤務時間計算
    // =======================================================================

    /**
     * 勤務時間を計算
     * @param {string} inTime - 出勤時刻（HH:MM形式）
     * @param {string} outTime - 退勤時刻（HH:MM形式）
     * @returns {string} 勤務時間（H:MM形式）
     */
    calculateWorkHours(inTime, outTime) {
        if (!inTime || !outTime) return '-';

        const [inH, inM] = inTime.split(':').map(Number);
        const [outH, outM] = outTime.split(':').map(Number);

        let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        if (totalMinutes < 0) totalMinutes += 24 * 60;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return `${hours}:${String(minutes).padStart(2, '0')}`;
    },

    /**
     * 合計勤務時間を計算
     * @param {Array<string>} workHoursList - 勤務時間のリスト（H:MM形式）
     * @returns {string} 合計勤務時間（H:MM形式）
     */
    calculateTotalHours(workHoursList) {
        let totalMinutes = 0;

        workHoursList.forEach(hours => {
            if (hours && hours !== '-') {
                const [h, m] = hours.split(':').map(Number);
                totalMinutes += h * 60 + m;
            }
        });

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return `${hours}:${String(minutes).padStart(2, '0')}`;
    },

    // =======================================================================
    // UI関連
    // =======================================================================

    /**
     * ローディング表示を制御
     * @param {boolean} show - 表示するかどうか
     * @param {string} text - 表示テキスト
     */
    showLoading(show, text = '処理中...') {
        let loading = document.getElementById('loading');

        if (show) {
            if (!loading) {
                loading = document.createElement('div');
                loading.id = 'loading';
                loading.className = 'loading';
                loading.innerHTML = `
                    <div class="loading__spinner"></div>
                    <p class="loading__text">${text}</p>
                `;
                document.body.appendChild(loading);
            } else {
                loading.style.display = 'flex';
                const textEl = loading.querySelector('.loading__text');
                if (textEl) textEl.textContent = text;
            }
        } else {
            if (loading) {
                loading.style.display = 'none';
            }
        }
    },

    /**
     * メッセージを表示
     * @param {string} message - メッセージ
     * @param {string} type - タイプ（'success' または 'error'）
     */
    showMessage(message, type = 'success') {
        // 既存のメッセージを削除
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = `message message--${type}`;
        messageEl.textContent = message;
        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.remove();
        }, CONFIG.MESSAGE_DURATION);
    },

    // =======================================================================
    // ストレージ関連
    // =======================================================================

    /**
     * ローカルストレージに保存
     * @param {string} key - キー
     * @param {*} value - 値
     */
    saveToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('ローカルストレージへの保存に失敗:', e);
        }
    },

    /**
     * ローカルストレージから取得
     * @param {string} key - キー
     * @returns {*} 保存された値
     */
    getFromStorage(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.error('ローカルストレージからの取得に失敗:', e);
            return null;
        }
    },

    /**
     * ローカルストレージから削除
     * @param {string} key - キー
     */
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('ローカルストレージからの削除に失敗:', e);
        }
    },

    // =======================================================================
    // データ移行関連
    // =======================================================================

    /**
     * attendance-systemのシフト申請を新形式に変換
     */
    convertAttendanceShift(shift) {
        if (!shift.staffId || !shift.date || !shift.slot) return null;

        return {
            id: `migrated_att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            staffId: shift.staffId,
            staffName: shift.staffName || getStaffName(shift.staffId),
            weekKey: getWeekKey(shift.date) || '',
            date: shift.date,
            slotId: shift.slot,
            slotLabel: shift.slotLabel || CONFIG.SHIFT_SLOTS[shift.slot]?.label || '',
            startTime: CONFIG.SHIFT_SLOTS[shift.slot]?.start || '',
            endTime: CONFIG.SHIFT_SLOTS[shift.slot]?.end || '',
            createdAt: shift.createdAt || new Date().toISOString(),
            source: 'attendance-system'
        };
    },

    /**
     * cafe-shift-systemのシフト提出を新形式に変換
     */
    convertCafeShift(shift) {
        if (!shift.memberId || !shift.date || !shift.slotKey) return null;

        return {
            id: `migrated_cafe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            staffId: shift.memberId,
            staffName: shift.memberName || getStaffName(shift.memberId),
            weekKey: shift.weekKey || getWeekKey(shift.date) || '',
            date: shift.date,
            slotId: shift.slotKey,
            slotLabel: CONFIG.SHIFT_SLOTS[shift.slotKey]?.label || '',
            startTime: shift.startTime || CONFIG.SHIFT_SLOTS[shift.slotKey]?.start || '',
            endTime: shift.endTime || CONFIG.SHIFT_SLOTS[shift.slotKey]?.end || '',
            createdAt: shift.createdAt || new Date().toISOString(),
            source: 'cafe-shift-system'
        };
    },

    /**
     * attendance-systemの打刻記録を新形式に変換
     */
    convertAttendanceClockRecord(record) {
        if (!record.name || !record.date || !record.type) return null;

        const staff = getStaffByName(record.name);

        return {
            id: `migrated_att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            staffId: record.staffId || staff?.id || '',
            staffName: record.name,
            clockType: record.type.toLowerCase() === 'in' ? 'in' : 'out',
            date: record.date,
            time: record.time,
            slotId: record.slot || '',
            slotLabel: record.slotLabel || '',
            status: record.status || 'normal',
            timestamp: record.timestamp || new Date().toISOString(),
            source: 'attendance-system'
        };
    },

    /**
     * cafe-shift-systemの打刻記録を新形式に変換
     */
    convertCafeClockRecord(record) {
        if (!record.memberId || !record.date || !record.clockType) return null;

        return {
            id: `migrated_cafe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            staffId: record.memberId,
            staffName: record.memberName || getStaffName(record.memberId),
            clockType: record.clockType,
            date: record.date,
            time: record.time,
            slotId: '',
            slotLabel: '',
            status: 'normal',
            timestamp: record.timestamp || new Date().toISOString(),
            source: 'cafe-shift-system'
        };
    },

    /**
     * 旧システムのデータがあるかチェック
     * @returns {boolean}
     */
    hasOldSystemData() {
        const oldKeys = [
            CONFIG.STORAGE_KEYS.OLD_ATTENDANCE_RECORDS,
            CONFIG.STORAGE_KEYS.OLD_ATTENDANCE_SHIFTS,
            CONFIG.STORAGE_KEYS.OLD_CAFE_SHIFTS,
            CONFIG.STORAGE_KEYS.OLD_CAFE_CLOCK
        ];

        return oldKeys.some(key => {
            const data = this.getFromStorage(key);
            return data && Array.isArray(data) && data.length > 0;
        });
    },

    /**
     * 移行データを削除
     */
    clearOldSystemData() {
        const oldKeys = [
            CONFIG.STORAGE_KEYS.OLD_ATTENDANCE_RECORDS,
            CONFIG.STORAGE_KEYS.OLD_ATTENDANCE_SHIFTS,
            CONFIG.STORAGE_KEYS.OLD_CAFE_SHIFTS,
            CONFIG.STORAGE_KEYS.OLD_CAFE_CLOCK
        ];

        oldKeys.forEach(key => {
            this.removeFromStorage(key);
        });
    },

    /**
     * 旧システムからデータを移行（簡易版）
     * @returns {Object} 移行結果
     */
    migrateOldData() {
        let shifts = 0;
        let clock = 0;

        // 既存データを取得
        const existingShifts = this.getFromStorage(CONFIG.STORAGE_KEYS.SHIFTS) || [];
        const existingClockRecords = this.getFromStorage(CONFIG.STORAGE_KEYS.CLOCK_RECORDS) || [];

        // === シフトデータの移行 ===

        // attendance-systemのシフト申請
        const oldAttendanceShifts = this.getFromStorage(CONFIG.STORAGE_KEYS.OLD_ATTENDANCE_SHIFTS) || [];
        oldAttendanceShifts.forEach(shift => {
            const newShift = this.convertAttendanceShift(shift);
            if (newShift && !this.isDuplicateShift(newShift, existingShifts)) {
                existingShifts.push(newShift);
                shifts++;
            }
        });

        // cafe-shift-systemのシフト提出
        const oldCafeShifts = this.getFromStorage(CONFIG.STORAGE_KEYS.OLD_CAFE_SHIFTS) || [];
        oldCafeShifts.forEach(shift => {
            const newShift = this.convertCafeShift(shift);
            if (newShift && !this.isDuplicateShift(newShift, existingShifts)) {
                existingShifts.push(newShift);
                shifts++;
            }
        });

        // === 打刻データの移行 ===

        // attendance-systemの打刻記録
        const oldAttendanceRecords = this.getFromStorage(CONFIG.STORAGE_KEYS.OLD_ATTENDANCE_RECORDS) || [];
        oldAttendanceRecords.forEach(record => {
            const newRecord = this.convertAttendanceClockRecord(record);
            if (newRecord && !this.isDuplicateClockRecord(newRecord, existingClockRecords)) {
                existingClockRecords.push(newRecord);
                clock++;
            }
        });

        // cafe-shift-systemの打刻記録
        const oldCafeClockRecords = this.getFromStorage(CONFIG.STORAGE_KEYS.OLD_CAFE_CLOCK) || [];
        oldCafeClockRecords.forEach(record => {
            const newRecord = this.convertCafeClockRecord(record);
            if (newRecord && !this.isDuplicateClockRecord(newRecord, existingClockRecords)) {
                existingClockRecords.push(newRecord);
                clock++;
            }
        });

        // 新システムに保存
        if (shifts > 0 || clock > 0) {
            this.saveToStorage(CONFIG.STORAGE_KEYS.SHIFTS, existingShifts);
            this.saveToStorage(CONFIG.STORAGE_KEYS.CLOCK_RECORDS, existingClockRecords);

            // 旧データをクリア
            this.clearOldSystemData();

            return { success: true, shifts, clock };
        }

        return { success: false, shifts: 0, clock: 0 };
    },

    /**
     * 重複シフトかどうかをチェック
     */
    isDuplicateShift(newShift, existingShifts) {
        return existingShifts.some(s =>
            s.staffId === newShift.staffId &&
            s.date === newShift.date &&
            s.slotId === newShift.slotId
        );
    },

    /**
     * 重複打刻記録かどうかをチェック
     */
    isDuplicateClockRecord(newRecord, existingRecords) {
        return existingRecords.some(r =>
            r.staffId === newRecord.staffId &&
            r.date === newRecord.date &&
            r.time === newRecord.time &&
            r.clockType === newRecord.clockType
        );
    },

    // =======================================================================
    // CSV関連
    // =======================================================================

    /**
     * CSVファイルをダウンロード
     * @param {string} content - CSVコンテンツ
     * @param {string} filename - ファイル名
     */
    downloadCSV(content, filename) {
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
        const blob = new Blob([bom, content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * JSONファイルをダウンロード
     * @param {Object} data - データオブジェクト
     * @param {string} filename - ファイル名
     */
    downloadJSON(data, filename) {
        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    // =======================================================================
    // API関連
    // =======================================================================

    /**
     * APIリクエストを送信
     * @param {string} action - アクション
     * @param {Object} data - 送信データ
     * @returns {Promise<Object>} レスポンス
     */
    async apiRequest(action, data = {}) {
        if (!isConfigValid()) {
            throw new Error('GAS URLが設定されていません。config.jsを確認してください。');
        }

        const url = getGasUrl();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

        try {
            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: JSON.stringify({ action, ...data }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTPエラー: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('リクエストがタイムアウトしました');
            }
            throw error;
        }
    },

    // =======================================================================
    // その他
    // =======================================================================

    /**
     * HTMLエスケープ
     * @param {string} str - エスケープする文字列
     * @returns {string} エスケープされた文字列
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * UUIDを生成
     * @returns {string} UUID
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * 遅刻・早退のステータスを判定
     * @param {string} clockType - 'in' または 'out'
     * @param {string} time - HH:MM形式の時刻
     * @param {Object} slot - シフト枠オブジェクト
     * @returns {string} ステータス（'normal', 'late', 'early_leave'）
     */
    determineClockStatus(clockType, time, slot) {
        if (!slot) return 'normal';

        const [h, m] = time.split(':').map(Number);
        const timeMinutes = h * 60 + m;

        if (clockType === 'in') {
            const [startH, startM] = slot.start.split(':').map(Number);
            const startMinutes = startH * 60 + startM;

            if (timeMinutes > startMinutes) {
                return 'late';
            }
        } else if (clockType === 'out') {
            const [endH, endM] = slot.end.split(':').map(Number);
            const endMinutes = endH * 60 + endM;

            if (timeMinutes < endMinutes) {
                return 'early_leave';
            }
        }

        return 'normal';
    }
};
