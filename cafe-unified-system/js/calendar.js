/**
 * 共創カフェ 統合シフト・勤怠管理システム - カレンダー画面
 * v3.0 - 月別表示・ナビゲーション・特別日対応
 */

(function() {
    'use strict';

    const elements = {
        filterStaff: document.getElementById('filterStaff'),
        periodInfo: document.getElementById('periodInfo'),
        monthTitle: document.getElementById('monthTitle'),
        btnPrevMonth: document.getElementById('btnPrevMonth'),
        btnNextMonth: document.getElementById('btnNextMonth'),
        btnToday: document.getElementById('btnToday'),
        calendarGrid: document.getElementById('calendarGrid'),
        dayDetail: document.getElementById('dayDetail'),
        selectedDateTitle: document.getElementById('selectedDateTitle'),
        dayDetailContent: document.getElementById('dayDetailContent'),
        statTotalSlots: document.getElementById('statTotalSlots'),
        statFilledSlots: document.getElementById('statFilledSlots'),
        statShortageSlots: document.getElementById('statShortageSlots'),
        statMyShifts: document.getElementById('statMyShifts'),
        btnRefresh: document.getElementById('btnRefresh')
    };

    let allShiftRequests = [];
    let selectedDate = null;
    let currentDisplayMonth = null; // 現在表示中の月 (Date)

    /**
     * 初期化
     */
    async function init() {
        try {
            Utils.showLoading(true, 'データを読み込み中...');

            // 営業期間の最初の月を表示月として設定
            const period = getOperationPeriod();
            console.log('[calendar:init] 営業期間:', period);
            console.log('[calendar:init] DEMO_MODE:', CONFIG.DEMO_MODE);

            const startDate = parseDateStr(period.start);
            if (isNaN(startDate.getTime())) {
                console.error('[calendar:init] 開始日のパースに失敗:', period.start);
                // フォールバック: 2026年1月に設定
                currentDisplayMonth = new Date(2026, 0, 1);
            } else {
                // 月の1日に設定
                currentDisplayMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            }
            console.log('[calendar:init] 表示月:', currentDisplayMonth);

            populateStaffFilter();
            renderPeriodInfo();
            setupEventListeners();
            updateTodayButton();
            await loadShiftData();
        } catch (error) {
            console.error('カレンダー初期化エラー:', error);
            Utils.showMessage('データの読み込みに失敗しました', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    /**
     * 営業期間情報を表示
     */
    function renderPeriodInfo() {
        if (!elements.periodInfo) return;

        const period = CONFIG.OPERATION_PERIOD;
        const startDate = parseDateStr(period.start);
        const endDate = parseDateStr(period.end);

        const formatDate = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

        let html = `
            <div class="period-info__badge">プレオープン期間</div>
            <div class="period-info__dates">${formatDate(startDate)} 〜 ${formatDate(endDate)}</div>
        `;

        // 特別日情報
        if (CONFIG.SPECIAL_DATES) {
            const specialDays = Object.entries(CONFIG.SPECIAL_DATES).map(([date, info]) => {
                const d = parseDateStr(date);
                return `${d.getMonth() + 1}/${d.getDate()} ${info.label}`;
            });
            if (specialDays.length > 0) {
                html += `<div class="period-info__special">${specialDays.join(' / ')}</div>`;
            }
        }

        elements.periodInfo.innerHTML = html;
    }

    /**
     * スタッフフィルターを生成
     */
    function populateStaffFilter() {
        const options = CONFIG.STAFF_LIST.map(staff => {
            const roleLabel = CONFIG.ROLES[staff.role]?.label || '';
            const roleSuffix = roleLabel && roleLabel !== 'スタッフ' ? `（${roleLabel}）` : '';
            return `<option value="${staff.id}">${staff.name}${roleSuffix}</option>`;
        }).join('');
        elements.filterStaff.innerHTML = '<option value="">全員表示</option>' + options;

        // 前回選択したスタッフを復元
        const lastStaffId = Utils.getFromStorage(CONFIG.STORAGE_KEYS.LAST_STAFF_ID);
        if (lastStaffId) {
            elements.filterStaff.value = lastStaffId;
        }
    }

    /**
     * イベントリスナーを設定
     */
    function setupEventListeners() {
        elements.filterStaff.addEventListener('change', () => {
            renderCalendar();
            updateStats();
        });

        // 月ナビゲーション
        if (elements.btnPrevMonth) {
            elements.btnPrevMonth.addEventListener('click', () => navigateMonth(-1));
        }
        if (elements.btnNextMonth) {
            elements.btnNextMonth.addEventListener('click', () => navigateMonth(1));
        }
        if (elements.btnToday) {
            elements.btnToday.addEventListener('click', goToToday);
        }

        // 更新ボタン
        if (elements.btnRefresh) {
            elements.btnRefresh.addEventListener('click', async () => {
                await loadShiftData();
            });
        }
    }

    /**
     * 月を移動
     */
    function navigateMonth(delta) {
        currentDisplayMonth.setMonth(currentDisplayMonth.getMonth() + delta);
        renderCalendar();
        updateMonthTitle();
    }

    /**
     * 今日の月へ移動（営業期間内の場合）
     */
    function goToToday() {
        const today = new Date();
        const period = getOperationPeriod();
        const startDate = parseDateStr(period.start);
        const endDate = parseDateStr(period.end);

        // 営業期間内なら今日へ、そうでなければ開始月へ
        if (today >= startDate && today <= endDate) {
            currentDisplayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        } else {
            currentDisplayMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        }

        renderCalendar();
        updateMonthTitle();
    }

    /**
     * 月タイトルを更新
     */
    function updateMonthTitle() {
        if (elements.monthTitle) {
            const year = currentDisplayMonth.getFullYear();
            const month = currentDisplayMonth.getMonth() + 1;
            elements.monthTitle.textContent = `${year}年${month}月`;
        }
    }

    /**
     * 今日ボタンのテキストを更新（今日の日付を表示）
     */
    function updateTodayButton() {
        if (elements.btnToday) {
            const today = new Date();
            const month = today.getMonth() + 1;
            const day = today.getDate();
            const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
            const weekday = weekdays[today.getDay()];
            elements.btnToday.textContent = `今日 ${month}/${day}(${weekday})`;
        }
    }

    /**
     * シフトデータをロード（GAS優先）
     */
    async function loadShiftData() {
        console.log('[calendar:loadShiftData] 開始');

        // まずローカルストレージから読み込み
        allShiftRequests = Utils.getFromStorage(CONFIG.STORAGE_KEYS.SHIFTS) || [];
        console.log('[calendar:loadShiftData] ローカルから読み込み:', allShiftRequests.length, '件');

        // GASが設定されている場合は、GASからも取得
        if (isConfigValid()) {
            try {
                Utils.showLoading(true, 'サーバーからデータを取得中...');
                console.log('[calendar:loadShiftData] GASから取得開始...');
                const response = await Utils.apiRequest('getAllShifts', {});
                console.log('[calendar:loadShiftData] GASレスポンス:', response);

                if (response.success && response.shifts) {
                    allShiftRequests = response.shifts;
                    Utils.saveToStorage(CONFIG.STORAGE_KEYS.SHIFTS, allShiftRequests);
                    console.log('[calendar:loadShiftData] GASからシフトデータを取得:', allShiftRequests.length, '件');
                }
            } catch (error) {
                console.warn('[calendar:loadShiftData] GASからのデータ取得に失敗:', error);
            } finally {
                Utils.showLoading(false);
            }
        }

        // データを正規化
        allShiftRequests = allShiftRequests.map(shift => {
            let dateStr = normalizeCalendarDate(shift.date);
            return {
                ...shift,
                date: dateStr,
                staffId: String(shift.staffId || ''),
                slotId: String(shift.slotId || '')
            };
        });

        renderCalendar();
        updateStats();
        updateMonthTitle();
    }

    /**
     * 日付文字列を正規化
     */
    function normalizeCalendarDate(dateValue) {
        if (!dateValue || dateValue === 'undefined' || dateValue === 'null') {
            return '';
        }

        if (typeof dateValue === 'object' && dateValue instanceof Date) {
            return formatDateStr(dateValue);
        }

        if (typeof dateValue === 'string') {
            let str = dateValue.startsWith("'") ? dateValue.substring(1) : dateValue;

            if (str.startsWith('1899') || str.startsWith('1900')) {
                return '';
            }

            if (str.includes('T')) {
                try {
                    const date = new Date(str);
                    if (!isNaN(date.getTime())) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }
                } catch (e) {
                    console.warn('[normalizeCalendarDate] パースエラー:', str, e);
                }
                str = str.split('T')[0];
            }

            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                return str;
            }

            return str;
        }

        return String(dateValue);
    }

    /**
     * カレンダーをレンダリング
     */
    function renderCalendar() {
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const selectedStaffId = elements.filterStaff.value;
        const today = Utils.formatDate();

        // ヘッダー行
        let html = weekdays.map((w, i) => {
            let cls = 'calendar-header';
            if (i === 0) cls += ' calendar-header--sun';
            if (i === 6) cls += ' calendar-header--sat';
            return `<div class="${cls}">${w}</div>`;
        }).join('');

        // 現在表示中の月の1日
        const year = currentDisplayMonth.getFullYear();
        const month = currentDisplayMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // カレンダーの開始日（前月の日曜日から）
        const calendarStart = new Date(firstDay);
        calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());

        // カレンダーの終了日（次月の土曜日まで）
        const calendarEnd = new Date(lastDay);
        calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));

        // 営業期間を取得
        const period = getOperationPeriod();
        const periodStart = parseDateStr(period.start);
        const periodEnd = parseDateStr(period.end);

        // カレンダーを生成
        let currentDate = new Date(calendarStart);
        let weekHtml = '';

        while (currentDate <= calendarEnd) {
            const dateStr = formatDateStr(currentDate);
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const dayOfWeek = currentDate.getDay();
            const opDate = getOperationDate(dateStr);

            // 営業期間内かどうか
            const isInPeriod = currentDate >= periodStart && currentDate <= periodEnd;

            // 特別日かどうか
            const specialInfo = CONFIG.SPECIAL_DATES?.[dateStr];
            const isSpecial = !!specialInfo;

            let dayClass = 'calendar-day';
            if (!isCurrentMonth) dayClass += ' calendar-day--other-month';
            if (isToday) dayClass += ' calendar-day--today';
            if (isSelected) dayClass += ' calendar-day--selected';
            if (dayOfWeek === 0) dayClass += ' calendar-day--sun';
            if (dayOfWeek === 6) dayClass += ' calendar-day--sat';
            if (isSpecial) dayClass += ' calendar-day--special';

            if (!opDate || !isInPeriod) {
                dayClass += ' calendar-day--empty';
                html += `
                    <div class="${dayClass}">
                        <div class="calendar-day__date">${currentDate.getDate()}</div>
                        ${!isInPeriod && isCurrentMonth ? '<div class="calendar-day__note">営業なし</div>' : ''}
                    </div>
                `;
            } else {
                const dayShifts = allShiftRequests.filter(r => r.date === dateStr);
                const slotsHtml = renderDaySlots(dateStr, dayShifts, selectedStaffId, opDate);

                // 特別日ラベル
                let specialLabel = '';
                if (isSpecial) {
                    specialLabel = `<div class="calendar-day__special-label">${specialInfo.label}</div>`;
                } else if (opDate.label) {
                    specialLabel = `<div class="calendar-day__label">${opDate.label}</div>`;
                }

                html += `
                    <div class="${dayClass}" data-date="${dateStr}">
                        <div class="calendar-day__header">
                            <span class="calendar-day__date">${currentDate.getDate()}</span>
                            ${specialLabel}
                        </div>
                        <div class="calendar-day__slots">
                            ${slotsHtml}
                        </div>
                    </div>
                `;
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        elements.calendarGrid.innerHTML = html;

        // クリックイベント
        elements.calendarGrid.querySelectorAll('.calendar-day:not(.calendar-day--empty)').forEach(day => {
            day.addEventListener('click', () => showDayDetail(day.dataset.date));
        });
    }

    /**
     * 日付のスロットをレンダリング
     */
    function renderDaySlots(dateStr, dayShifts, selectedStaffId, opDate) {
        let html = '';

        // 午前・午後でグループ化
        const periods = [
            { label: '午前', slots: ['AM_A', 'AM_B'], has: opDate.hasMorning },
            { label: '午後', slots: ['PM_A', 'PM_B'], has: opDate.hasAfternoon }
        ];

        periods.forEach(period => {
            if (!period.has) return;

            let periodTotal = 0;
            let periodFilled = 0;
            let hasMine = false;

            period.slots.forEach(slotId => {
                const slot = CONFIG.SHIFT_SLOTS[slotId];
                if (!slot) return;

                const slotShifts = dayShifts.filter(s => String(s.slotId) === slotId);
                const count = slotShifts.length;
                const required = getRequiredStaff(slotId);

                periodTotal += required;
                periodFilled += Math.min(count, required);

                if (selectedStaffId && slotShifts.some(s => String(s.staffId) === selectedStaffId)) {
                    hasMine = true;
                }
            });

            let statusClass = 'calendar-period';
            if (hasMine) {
                statusClass += ' calendar-period--mine';
            } else if (periodFilled >= periodTotal) {
                statusClass += ' calendar-period--full';
            } else if (periodFilled > 0) {
                statusClass += ' calendar-period--partial';
            } else {
                statusClass += ' calendar-period--empty';
            }

            html += `<div class="${statusClass}">${period.label} ${periodFilled}/${periodTotal}</div>`;
        });

        return html;
    }

    /**
     * 日付詳細を表示
     */
    function showDayDetail(dateStr) {
        selectedDate = dateStr;
        renderCalendar();

        const date = parseDateStr(dateStr);
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const specialInfo = CONFIG.SPECIAL_DATES?.[dateStr];
        const opDate = CONFIG.OPERATION_DATES.find(d => d.date === dateStr);

        let titleText = `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
        if (specialInfo) {
            titleText += ` - ${specialInfo.label}`;
        } else if (opDate?.label) {
            titleText += ` - ${opDate.label}`;
        }

        elements.selectedDateTitle.textContent = titleText;

        const dayShifts = allShiftRequests.filter(r => r.date === dateStr);
        const availableSlots = getAvailableSlots(dateStr);
        let html = '';

        Object.entries(CONFIG.SHIFT_SLOTS).forEach(([slotId, slot]) => {
            const isAvailable = availableSlots.some(s => s.id === slotId);
            const slotShifts = dayShifts.filter(s => String(s.slotId) === slotId);
            const count = slotShifts.length;
            const required = getRequiredStaff(slotId);

            let statusClass = 'day-detail__slot';
            if (!isAvailable) {
                statusClass += ' day-detail__slot--closed';
            } else if (count >= required) {
                statusClass += ' day-detail__slot--full';
            } else if (count > 0) {
                statusClass += ' day-detail__slot--partial';
            } else {
                statusClass += ' day-detail__slot--empty';
            }

            html += `
                <div class="${statusClass}">
                    <div class="day-detail__slot-header">
                        <span class="day-detail__slot-label">${slot.label}（${slot.start}〜${slot.end}）</span>
                        <span class="day-detail__slot-count">${isAvailable ? `${count}/${required}名` : '営業なし'}</span>
                    </div>
                    <div class="day-detail__staff">
            `;

            if (!isAvailable) {
                html += `<span class="day-detail__empty">この時間帯は営業していません</span>`;
            } else if (slotShifts.length > 0) {
                const selectedStaffId = elements.filterStaff.value;
                slotShifts.forEach(shift => {
                    const isMine = selectedStaffId && String(shift.staffId) === selectedStaffId;
                    if (isMine) {
                        html += `
                            <div class="day-detail__staff-row day-detail__staff-row--mine">
                                <span class="day-detail__staff-name">${Utils.escapeHtml(shift.staffName)}</span>
                                <button type="button" class="btn btn--small btn--danger"
                                    onclick="cancelShiftFromCalendar('${shift.id}', '${Utils.escapeHtml(shift.staffName)}', '${dateStr}', '${slotId}')">
                                    キャンセル
                                </button>
                            </div>
                        `;
                    } else {
                        html += `<span class="day-detail__staff-name">${Utils.escapeHtml(shift.staffName)}</span>`;
                    }
                });
                if (count < required) {
                    html += `<span class="day-detail__need">あと${required - count}名必要</span>`;
                } else {
                    html += `<span class="day-detail__sufficient">スタッフ足りてます</span>`;
                }
            } else {
                html += `<span class="day-detail__empty">申請者なし（${required}名必要）</span>`;
            }

            html += `
                    </div>
                </div>
            `;
        });

        elements.dayDetailContent.innerHTML = html;
        elements.dayDetail.style.display = 'block';
    }

    /**
     * 統計を更新
     */
    function updateStats() {
        const selectedStaffId = elements.filterStaff.value;
        const operationDates = getOperationDates();

        let totalSlots = 0;
        let filledSlots = 0;
        let shortageCount = 0;

        operationDates.forEach(dateStr => {
            const slots = getAvailableSlots(dateStr);
            slots.forEach(slot => {
                totalSlots++;
                const count = allShiftRequests.filter(r =>
                    String(r.date) === dateStr && String(r.slotId) === slot.id
                ).length;
                const required = getRequiredStaff(slot.id);

                if (count >= required) {
                    filledSlots++;
                } else {
                    shortageCount++;
                }
            });
        });

        if (elements.statTotalSlots) elements.statTotalSlots.textContent = totalSlots;
        if (elements.statFilledSlots) elements.statFilledSlots.textContent = filledSlots;
        if (elements.statShortageSlots) elements.statShortageSlots.textContent = shortageCount;

        if (elements.statMyShifts) {
            if (selectedStaffId) {
                const myShifts = allShiftRequests.filter(r => String(r.staffId) === selectedStaffId);
                elements.statMyShifts.textContent = myShifts.length;
            } else {
                elements.statMyShifts.textContent = '-';
            }
        }
    }

    /**
     * カレンダーからシフトをキャンセル
     */
    async function cancelShiftFromCalendar(shiftId, staffName, dateStr, slotId) {
        const slot = CONFIG.SHIFT_SLOTS[slotId];
        const slotLabel = slot ? slot.label : slotId;
        const date = parseDateStr(dateStr);
        const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;

        if (!confirm(`${dateLabel} ${slotLabel}のシフトをキャンセルしますか？\n\n※一度キャンセルすると、再度提出が必要です。`)) {
            return;
        }

        try {
            Utils.showLoading(true, 'キャンセル中...');

            // GASに削除リクエスト
            if (isConfigValid()) {
                try {
                    const response = await Utils.apiRequest('deleteShift', { shiftId });
                    if (!response.success) {
                        throw new Error(response.message || 'キャンセルに失敗しました');
                    }
                } catch (error) {
                    console.error('GASでのキャンセルに失敗:', error);
                    throw error;
                }
            }

            // ローカルストレージからも削除
            allShiftRequests = allShiftRequests.filter(s => s.id !== shiftId);
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.SHIFTS, allShiftRequests);

            Utils.showMessage('シフトをキャンセルしました', 'success');

            // 画面を更新
            renderCalendar();
            updateStats();
            showDayDetail(dateStr);

        } catch (error) {
            console.error('キャンセルエラー:', error);
            Utils.showMessage('キャンセルに失敗しました: ' + error.message, 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    // グローバルスコープに公開（onclick用）
    window.cancelShiftFromCalendar = cancelShiftFromCalendar;

    // 初期化
    document.addEventListener('DOMContentLoaded', init);
})();
