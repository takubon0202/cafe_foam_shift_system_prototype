/**
 * 共創カフェ 統合シフト・勤怠管理システム - 設定ファイル
 * attendance-system + cafe-shift-system 統合版
 */

const CONFIG = {
    // =======================================================================
    // API設定
    // =======================================================================

    // Google Apps Script WebアプリURL
    GAS_URL: {
        production: 'https://script.google.com/macros/s/AKfycbxqWXUs4Z7XHWtOamIxp0NV3xFwLlU2MytWoLx8-bB8XugyuyhaO_MfTAdtwwQumVQ2/exec',
        development: 'https://script.google.com/macros/s/AKfycbxqWXUs4Z7XHWtOamIxp0NV3xFwLlU2MytWoLx8-bB8XugyuyhaO_MfTAdtwwQumVQ2/exec'
    },

    // 現在の環境
    ENV: 'development',

    // デモモード（trueの場合、常に本日を営業日として扱う）
    DEMO_MODE: false,

    // 管理画面パスワード
    ADMIN_PASSWORD: 'gakkan2025',

    // =======================================================================
    // カフェ情報
    // =======================================================================

    CAFE_NAME: '共創カフェ',

    // 営業期間
    OPERATION_PERIOD: {
        // プレオープン期間
        preopen: {
            start: '2026-01-14',  // レセプション
            end: '2026-01-30'
        },
        // グランドオープン期間
        grandopen: {
            start: '2026-04-06',
            end: '2026-04-30'  // 仮の終了日（必要に応じて延長）
        },
        // 現在のアクティブ期間（プレオープンまたはグランドオープン）
        start: '2026-01-14',
        end: '2026-01-30'
    },

    // 特別日（レセプション等）
    SPECIAL_DATES: {
        '2026-01-14': {
            type: 'reception',
            label: 'レセプション',
            note: '午後のみ営業'
        }
    },

    // 営業時間情報
    BUSINESS_HOURS: {
        morning: '10:00〜12:30',
        afternoon: '15:00〜17:00'
    },

    // =======================================================================
    // シフト枠定義（90分単位・重複OK）
    // =======================================================================

    SHIFT_SLOTS: {
        AM_A: {
            id: 'AM_A',
            label: '午前A',
            start: '10:00',
            end: '11:30',
            period: 'morning',
            duration: 90,
            requiredStaff: 3  // この枠の必要人数（個別設定可能）
        },
        AM_B: {
            id: 'AM_B',
            label: '午前B',
            start: '11:00',
            end: '12:30',
            period: 'morning',
            duration: 90,
            requiredStaff: 3
        },
        PM_A: {
            id: 'PM_A',
            label: '午後A',
            start: '15:00',
            end: '16:30',
            period: 'afternoon',
            duration: 90,
            requiredStaff: 3
        },
        PM_B: {
            id: 'PM_B',
            label: '午後B',
            start: '15:30',
            end: '17:00',
            period: 'afternoon',
            duration: 90,
            requiredStaff: 3
        }
    },

    // =======================================================================
    // 営業日・営業枠設定
    // =======================================================================

    // 営業日リスト（プレオープン期間: 2026年1月）
    // 火・金 = 午前+午後、月・水・木 = 午後のみ、土日 = 休み
    OPERATION_DATES: [
        // 1/14週（レセプション + プレオープン開始）
        { date: '2026-01-14', weekday: 3, hasMorning: false, hasAfternoon: true, isSpecial: true, label: 'レセプション' },
        { date: '2026-01-15', weekday: 4, hasMorning: false, hasAfternoon: true, label: 'プレオープン初日' },
        { date: '2026-01-16', weekday: 5, hasMorning: true, hasAfternoon: true },
        // 1/19週
        { date: '2026-01-19', weekday: 1, hasMorning: false, hasAfternoon: true },
        { date: '2026-01-20', weekday: 2, hasMorning: true, hasAfternoon: true },
        { date: '2026-01-21', weekday: 3, hasMorning: false, hasAfternoon: true },
        { date: '2026-01-22', weekday: 4, hasMorning: false, hasAfternoon: true },
        { date: '2026-01-23', weekday: 5, hasMorning: true, hasAfternoon: true },
        // 1/26週
        { date: '2026-01-26', weekday: 1, hasMorning: false, hasAfternoon: true },
        { date: '2026-01-27', weekday: 2, hasMorning: true, hasAfternoon: true },
        { date: '2026-01-28', weekday: 3, hasMorning: false, hasAfternoon: true },
        { date: '2026-01-29', weekday: 4, hasMorning: false, hasAfternoon: true },
        { date: '2026-01-30', weekday: 5, hasMorning: true, hasAfternoon: true, label: 'プレオープン最終日' }
    ],

    // 日付ごとの営業枠設定（DEMO_MODE=false時に使用）
    DATE_SLOTS: {
        // 1/14週
        '2026-01-14': ['PM_A', 'PM_B'],  // レセプション（午後のみ）
        '2026-01-15': ['PM_A', 'PM_B'],  // 木曜（午後のみ）
        '2026-01-16': ['AM_A', 'AM_B', 'PM_A', 'PM_B'],  // 金曜（午前+午後）
        // 1/19週
        '2026-01-19': ['PM_A', 'PM_B'],  // 月曜
        '2026-01-20': ['AM_A', 'AM_B', 'PM_A', 'PM_B'],  // 火曜
        '2026-01-21': ['PM_A', 'PM_B'],  // 水曜
        '2026-01-22': ['PM_A', 'PM_B'],  // 木曜
        '2026-01-23': ['AM_A', 'AM_B', 'PM_A', 'PM_B'],  // 金曜
        // 1/26週
        '2026-01-26': ['PM_A', 'PM_B'],  // 月曜
        '2026-01-27': ['AM_A', 'AM_B', 'PM_A', 'PM_B'],  // 火曜
        '2026-01-28': ['PM_A', 'PM_B'],  // 水曜
        '2026-01-29': ['PM_A', 'PM_B'],  // 木曜
        '2026-01-30': ['AM_A', 'AM_B', 'PM_A', 'PM_B']   // 金曜（最終日）
    },

    // =======================================================================
    // 週定義（週1制約用）
    // =======================================================================

    // 週の定義（weekKey = その週の月曜日の日付）
    WEEKS: [
        {
            weekKey: '2026-01-12',
            label: '1/12週',
            description: 'レセプション〜プレオープン開始',
            dates: ['2026-01-14', '2026-01-15', '2026-01-16']
        },
        {
            weekKey: '2026-01-19',
            label: '1/19週',
            description: 'プレオープン第2週',
            dates: ['2026-01-19', '2026-01-20', '2026-01-21', '2026-01-22', '2026-01-23']
        },
        {
            weekKey: '2026-01-26',
            label: '1/26週',
            description: 'プレオープン最終週',
            dates: ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29', '2026-01-30']
        }
    ],

    // 週1制約（1週間に登録できるシフト数）
    WEEKLY_SHIFT_LIMIT: 1,

    // 各シフトの必要人数
    REQUIRED_STAFF_PER_SLOT: 3,

    // =======================================================================
    // スタッフリスト（32名・学生番号・役職付き）
    // =======================================================================

    STAFF_LIST: [
        { id: '25011003', name: '小畑 璃海', role: 'staff' },
        { id: '25011008', name: '志鎌 智果', role: 'staff' },
        { id: '25011018', name: '薄井 菜々歩', role: 'staff' },
        { id: '25011034', name: '小野寺 陸斗', role: 'staff' },
        { id: '25011039', name: '和根崎 悠平', role: 'staff' },
        { id: '25011045', name: '石井 陽大', role: 'staff' },
        { id: '25011152', name: '鶴巻 結衣', role: 'staff' },
        { id: '25011174', name: '武山 海瑠', role: 'staff' },
        { id: '25011192', name: '福田 蒼馬', role: 'staff' },
        { id: '25011229', name: '山本 凛人', role: 'staff' },
        { id: '25011253', name: '川村 悠紅', role: 'staff' },
        { id: '25011315', name: '鈴木 初美', role: 'staff' },
        { id: '25011335', name: '石原 礼野', role: 'staff' },
        { id: '25011370', name: '鈴木 心美', role: 'staff' },
        { id: '25011422', name: '山田 暁', role: 'staff' },
        { id: '25011444', name: '河鰭 寧々', role: 'staff' },
        { id: '25011466', name: '鈴木 大翔', role: 'staff' },
        { id: '25011472', name: '伊藤 凛香', role: 'staff' },
        { id: '25011490', name: '鈴木 らら', role: 'staff' },
        { id: '25011571', name: '鈴木 悠敏', role: 'staff' },
        { id: '25011584', name: '柴田 悠登', role: 'staff' },
        { id: '25011605', name: '高山 琉音', role: 'staff' },
        { id: '25011614', name: '高橋 奏', role: 'staff' },
        { id: '25011621', name: '門間 琉央', role: 'staff' },
        { id: '25011627', name: '加藤 大青', role: 'staff' },
        { id: '25011690', name: '木村 苺香', role: 'staff' },
        { id: '25011698', name: '佐々 眞陽', role: 'staff' },
        { id: '25011754', name: '山﨑 琢己', role: 'admin' },
        { id: '25011845', name: '延谷 碧', role: 'staff' },
        { id: '25011920', name: '佐藤 斗和', role: 'staff' },
        { id: '25011958', name: '渡邉 瑛介', role: 'staff' },
        { id: '25011985', name: '中村 星翔', role: 'staff' }
    ],

    // 役割定義
    ROLES: {
        admin: { label: '管理者', color: '#DC2626' },
        leader: { label: 'リーダー', color: '#FF9800' },
        staff: { label: 'スタッフ', color: '#16a34a' }
    },

    // =======================================================================
    // 打刻設定
    // =======================================================================

    // 打刻の許容範囲（分）
    PUNCH_TOLERANCE: {
        early: 10,  // 開始10分前から打刻可能
        late: 30    // 開始30分後まで遅刻として記録
    },

    // =======================================================================
    // ローカルストレージ設定
    // =======================================================================

    STORAGE_KEYS: {
        // 新システムのキー
        LAST_STAFF_ID: 'cafe_unified_last_staff_id',
        AUTH_TOKEN: 'cafe_unified_auth',
        SHIFTS: 'cafe_unified_shifts',
        CLOCK_RECORDS: 'cafe_unified_clock',

        // 旧システムのキー（移行用）
        OLD_ATTENDANCE_RECORDS: 'attendance_records',
        OLD_ATTENDANCE_SHIFTS: 'attendance_shift_requests',
        OLD_CAFE_SHIFTS: 'shift_submissions',
        OLD_CAFE_CLOCK: 'clock_records'
    },

    // =======================================================================
    // その他設定
    // =======================================================================

    // メッセージ表示時間（ミリ秒）
    MESSAGE_DURATION: 3000,

    // APIタイムアウト（ミリ秒）
    API_TIMEOUT: 30000
};

// =======================================================================
// ヘルパー関数
// =======================================================================

/**
 * 現在の環境に応じたGAS URLを取得
 */
function getGasUrl() {
    return CONFIG.GAS_URL[CONFIG.ENV];
}

/**
 * 設定が正しく行われているかチェック
 */
function isConfigValid() {
    const url = getGasUrl();
    return url && url !== 'YOUR_GAS_WEB_APP_URL_HERE' && url.startsWith('https://');
}

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 */
function formatDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD形式の文字列からDateオブジェクトを作成
 * タイムゾーンの問題を避けるため、ローカル時間の午前0時を使用
 */
function parseDateStr(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        console.warn('[parseDateStr] 無効な日付文字列:', dateStr);
        return new Date(NaN);
    }

    // アポストロフィを除去
    if (dateStr.startsWith("'")) {
        dateStr = dateStr.substring(1);
    }

    // ISO形式の場合は正しくパースしてローカル日付を取得
    if (dateStr.includes('T')) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            // ローカルタイムゾーンでの日付のみを取得して再作成
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        }
    }

    // YYYY-MM-DD形式
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
        console.warn('[parseDateStr] 不正な形式:', dateStr);
        return new Date(NaN);
    }

    const [year, month, day] = parts.map(Number);

    // 値の検証
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.warn('[parseDateStr] 数値変換エラー:', dateStr);
        return new Date(NaN);
    }

    // 1899/1900年の無効な日付をチェック
    if (year < 1901) {
        console.warn('[parseDateStr] 無効な年:', year);
        return new Date(NaN);
    }

    // ローカルタイムゾーンの午前0時でDateを作成
    return new Date(year, month - 1, day);
}

/**
 * 曜日名を取得
 */
function getWeekdayName(weekday) {
    const names = ['日', '月', '火', '水', '木', '金', '土'];
    return names[weekday];
}

/**
 * 日付を表示用にフォーマット（例: 1/15（木））
 * 無効な日付の場合は空文字列を返す
 */
function formatDateDisplay(dateStr) {
    if (!dateStr) {
        return '';
    }

    const d = parseDateStr(dateStr);

    // 無効な日付の場合
    if (isNaN(d.getTime())) {
        console.warn('[formatDateDisplay] 無効な日付:', dateStr);
        return '';
    }

    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = getWeekdayName(d.getDay());
    return `${month}/${day}（${weekday}）`;
}

/**
 * 日付から週キーを取得
 * DEMO_MODE時は動的に生成された週リストを使用
 */
function getWeekKey(dateStr) {
    // DEMO_MODEの場合は動的に週リストを取得
    const weeks = getWeeks();

    for (const week of weeks) {
        if (week.dates.includes(dateStr)) {
            return week.weekKey;
        }
    }

    // 見つからない場合は、日付から月曜日を計算して週キーを生成
    if (dateStr && CONFIG.DEMO_MODE) {
        const date = parseDateStr(dateStr);
        if (!isNaN(date.getTime())) {
            const dayOfWeek = date.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(date);
            monday.setDate(date.getDate() + diff);
            return formatDateStr(monday);
        }
    }

    return null;
}

/**
 * 週キーから週情報を取得
 * DEMO_MODE時は動的に生成された週リストを使用
 */
function getWeekInfo(weekKey) {
    if (!weekKey) return null;

    // DEMO_MODEの場合は動的に週リストを取得
    const weeks = getWeeks();
    const found = weeks.find(w => w.weekKey === weekKey);

    if (found) return found;

    // 見つからない場合は、weekKeyから週情報を生成
    if (CONFIG.DEMO_MODE && weekKey) {
        const monday = parseDateStr(weekKey);
        if (!isNaN(monday.getTime())) {
            const dates = [];
            for (let d = 0; d < 5; d++) {
                const date = new Date(monday);
                date.setDate(monday.getDate() + d);
                dates.push(formatDateStr(date));
            }
            const month = monday.getMonth() + 1;
            const day = monday.getDate();
            return {
                weekKey: weekKey,
                label: `${month}/${day}週`,
                dates: dates
            };
        }
    }

    return null;
}

/**
 * 日付の営業情報を取得
 */
function getOperationDate(dateStr) {
    if (CONFIG.DEMO_MODE) {
        const date = parseDateStr(dateStr);
        const dayOfWeek = date.getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return null;
        }

        return {
            date: dateStr,
            weekday: dayOfWeek,
            hasMorning: dayOfWeek === 2 || dayOfWeek === 5,
            hasAfternoon: true
        };
    }
    return CONFIG.OPERATION_DATES.find(d => d.date === dateStr) || null;
}

/**
 * 指定日が営業日かどうか
 */
function isOperationDate(dateStr) {
    if (CONFIG.DEMO_MODE) {
        const date = parseDateStr(dateStr);
        const dayOfWeek = date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5;
    }
    return CONFIG.OPERATION_DATES.some(d => d.date === dateStr);
}

/**
 * 指定日の営業枠を取得
 */
function getAvailableSlots(dateStr) {
    const opDate = getOperationDate(dateStr);
    if (!opDate) return [];

    const slots = [];
    if (opDate.hasMorning) {
        slots.push(CONFIG.SHIFT_SLOTS.AM_A, CONFIG.SHIFT_SLOTS.AM_B);
    }
    if (opDate.hasAfternoon) {
        slots.push(CONFIG.SHIFT_SLOTS.PM_A, CONFIG.SHIFT_SLOTS.PM_B);
    }
    return slots;
}

/**
 * 指定日の営業枠ID配列を取得
 */
function getAvailableSlotIds(dateStr) {
    if (CONFIG.DEMO_MODE) {
        const date = parseDateStr(dateStr);
        const dayOfWeek = date.getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return [];
        }

        if (dayOfWeek === 2 || dayOfWeek === 5) {
            return ['AM_A', 'AM_B', 'PM_A', 'PM_B'];
        } else {
            return ['PM_A', 'PM_B'];
        }
    }
    return CONFIG.DATE_SLOTS[dateStr] || [];
}

/**
 * 指定日に指定シフト枠が営業しているか
 */
function isSlotAvailable(dateStr, slotId) {
    const slots = getAvailableSlotIds(dateStr);
    return slots.includes(slotId);
}

/**
 * スタッフIDから名前を取得
 */
function getStaffName(staffId) {
    const staff = CONFIG.STAFF_LIST.find(s => s.id === staffId);
    return staff ? staff.name : '';
}

/**
 * スタッフIDからスタッフ情報を取得
 */
function getStaffById(staffId) {
    return CONFIG.STAFF_LIST.find(s => s.id === staffId) || null;
}

/**
 * 名前からスタッフ情報を取得
 */
function getStaffByName(name) {
    return CONFIG.STAFF_LIST.find(s => s.name === name) || null;
}

/**
 * 営業日リストを取得
 */
function getOperationDates() {
    if (CONFIG.DEMO_MODE) {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayOfWeek = date.getDay();

            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                dates.push(formatDateStr(date));
            }
        }
        return dates;
    }
    return CONFIG.OPERATION_DATES.map(d => d.date);
}

/**
 * 営業期間を取得
 */
function getOperationPeriod() {
    if (CONFIG.DEMO_MODE) {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 13);
        return {
            start: formatDateStr(today),
            end: formatDateStr(endDate)
        };
    }
    return CONFIG.OPERATION_PERIOD;
}

/**
 * 週リストを取得（DEMO_MODE対応）
 */
function getWeeks() {
    if (CONFIG.DEMO_MODE) {
        const weeks = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 今週の月曜日を取得
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);

        // 3週間分を生成
        for (let w = 0; w < 3; w++) {
            const weekStart = new Date(monday);
            weekStart.setDate(monday.getDate() + (w * 7));

            const weekKey = formatDateStr(weekStart);
            const dates = [];

            for (let d = 0; d < 5; d++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + d);
                dates.push(formatDateStr(date));
            }

            const month = weekStart.getMonth() + 1;
            const day = weekStart.getDate();

            weeks.push({
                weekKey: weekKey,
                label: `${month}/${day}週`,
                dates: dates
            });
        }

        return weeks;
    }
    return CONFIG.WEEKS;
}

/**
 * 総シフト枠数を計算
 */
function getTotalSlotCount() {
    const dates = getOperationDates();
    let count = 0;
    dates.forEach(date => {
        const slots = getAvailableSlotIds(date);
        count += slots.length;
    });
    return count;
}

/**
 * 特定シフト枠の必要人数を取得
 * @param {string} slotId - シフト枠ID (例: 'AM_A', 'PM_B')
 * @returns {number} - 必要人数（デフォルト: 3）
 */
function getRequiredStaff(slotId) {
    const slot = CONFIG.SHIFT_SLOTS[slotId];
    if (slot && typeof slot.requiredStaff === 'number') {
        return slot.requiredStaff;
    }
    // フォールバック: グローバル設定を使用
    return CONFIG.REQUIRED_STAFF_PER_SLOT || 3;
}

/**
 * シフト枠情報を取得
 * @param {string} slotId - シフト枠ID
 * @returns {Object|null} - シフト枠情報
 */
function getSlotInfo(slotId) {
    return CONFIG.SHIFT_SLOTS[slotId] || null;
}
