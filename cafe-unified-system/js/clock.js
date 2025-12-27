/**
 * 共創カフェ 統合シフト・勤怠管理システム - 打刻画面処理
 * シフト枠に対応した打刻機能（遅刻・早退自動判定）
 */

(function() {
    'use strict';

    const elements = {
        currentDate: document.getElementById('currentDate'),
        currentTime: document.getElementById('currentTime'),
        currentShift: document.getElementById('currentShift'),
        staffSelect: document.getElementById('staffSelect'),
        todayShiftSlots: document.getElementById('todayShiftSlots'),
        slotSelectGroup: document.getElementById('slotSelectGroup'),
        slotButtons: document.getElementById('slotButtons'),
        statusDisplay: document.getElementById('statusDisplay'),
        btnClockIn: document.getElementById('btnClockIn'),
        btnClockOut: document.getElementById('btnClockOut'),
        historyList: document.getElementById('historyList')
    };

    let selectedSlot = null;
    let todayRecords = [];
    let myShifts = [];

    /**
     * 初期化
     */
    function init() {
        updateDateTime();
        setInterval(updateDateTime, 1000);
        populateStaffSelect();
        setupEventListeners();
        loadLastStaff();
        updateSlotButtonsForToday();
    }

    /**
     * 日時表示を更新
     */
    function updateDateTime() {
        const now = Utils.getJSTDate();
        elements.currentDate.textContent = Utils.formatDateJP(now);
        elements.currentTime.textContent = Utils.formatTime(now);

        // 現在のシフト枠を表示
        const today = Utils.formatDate(now);
        const availableSlotIds = getAvailableSlotIds(today);
        const currentSlot = getCurrentShiftSlot(now, availableSlotIds);

        if (currentSlot) {
            elements.currentShift.textContent = `${currentSlot.label}シフト（${currentSlot.start}〜${currentSlot.end}）`;
        } else {
            const nextSlot = getNextShiftSlot(now, availableSlotIds);
            if (nextSlot) {
                elements.currentShift.textContent = `次のシフト: ${nextSlot.label}（${nextSlot.start}〜）`;
            } else if (availableSlotIds.length === 0) {
                elements.currentShift.textContent = '本日は営業枠がありません';
            } else {
                elements.currentShift.textContent = '本日のシフトは終了しました';
            }
        }
    }

    /**
     * 現在のシフト枠を取得
     */
    function getCurrentShiftSlot(now, availableSlotIds) {
        const time = Utils.formatTimeShort(now);
        for (const slotId of availableSlotIds) {
            const slot = CONFIG.SHIFT_SLOTS[slotId];
            if (time >= slot.start && time <= slot.end) {
                return slot;
            }
        }
        return null;
    }

    /**
     * 次のシフト枠を取得
     */
    function getNextShiftSlot(now, availableSlotIds) {
        const time = Utils.formatTimeShort(now);
        const slots = availableSlotIds
            .map(id => CONFIG.SHIFT_SLOTS[id])
            .sort((a, b) => a.start.localeCompare(b.start));

        for (const slot of slots) {
            if (time < slot.start) {
                return slot;
            }
        }
        return null;
    }

    /**
     * スタッフ選択肢を生成
     */
    function populateStaffSelect() {
        const options = CONFIG.STAFF_LIST.map(staff => {
            const roleLabel = CONFIG.ROLES[staff.role]?.label || '';
            const roleTag = roleLabel && roleLabel !== 'スタッフ' ? `（${roleLabel}）` : '';
            return `<option value="${staff.id}">${staff.name}（${staff.id}）${roleTag}</option>`;
        }).join('');

        elements.staffSelect.innerHTML = '<option value="">-- 選択してください --</option>' + options;
    }

    /**
     * イベントリスナーを設定
     */
    function setupEventListeners() {
        elements.staffSelect.addEventListener('change', handleStaffChange);

        // シフト枠ボタン
        elements.slotButtons.querySelectorAll('.slot-btn').forEach(btn => {
            btn.addEventListener('click', () => handleSlotSelect(btn.dataset.slot));
        });

        elements.btnClockIn.addEventListener('click', () => handlePunch('in'));
        elements.btnClockOut.addEventListener('click', () => handlePunch('out'));
    }

    /**
     * 前回選択したスタッフを復元
     */
    function loadLastStaff() {
        const lastStaffId = Utils.getFromStorage(CONFIG.STORAGE_KEYS.LAST_STAFF_ID);
        if (lastStaffId) {
            elements.staffSelect.value = lastStaffId;
            handleStaffChange();
        }
    }

    /**
     * 今日の営業枠に応じてボタンを更新
     */
    function updateSlotButtonsForToday() {
        const today = Utils.formatDate();
        const availableSlotIds = getAvailableSlotIds(today);

        elements.slotButtons.querySelectorAll('.slot-btn').forEach(btn => {
            const slotId = btn.dataset.slot;
            const isAvailable = availableSlotIds.includes(slotId);
            btn.style.display = isAvailable ? 'flex' : 'none';
            btn.classList.remove('slot-btn--selected');
            btn.disabled = !isAvailable;
        });
    }

    /**
     * スタッフ選択変更時の処理
     */
    function handleStaffChange() {
        const staffId = elements.staffSelect.value;
        if (staffId) {
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.LAST_STAFF_ID, staffId);
            loadMyShifts(staffId);
            loadTodayRecords(staffId);
        } else {
            elements.todayShiftSlots.innerHTML = '<p class="today-shift__empty">スタッフを選択してください</p>';
            elements.slotSelectGroup.style.display = 'none';
            selectedSlot = null;
            updateButtonStates();
        }
    }

    /**
     * 本日の自分のシフトをロード
     */
    function loadMyShifts(staffId) {
        const today = Utils.formatDate();
        const availableSlotIds = getAvailableSlotIds(today);

        // ローカルストレージからシフト申請を取得
        const allShifts = Utils.getFromStorage(CONFIG.STORAGE_KEYS.SHIFTS) || [];
        myShifts = allShifts.filter(s => s.staffId === staffId && s.date === today);

        if (availableSlotIds.length === 0) {
            elements.todayShiftSlots.innerHTML = '<p class="today-shift__empty">本日は営業枠がありません</p>';
            elements.slotSelectGroup.style.display = 'none';
            return;
        }

        if (myShifts.length > 0) {
            const slotsHtml = myShifts.map(shift => {
                const slotInfo = CONFIG.SHIFT_SLOTS[shift.slotId];
                if (!slotInfo) return '';
                return `<span class="today-shift__slot">${slotInfo.label}（${slotInfo.start}〜${slotInfo.end}）</span>`;
            }).join('');
            elements.todayShiftSlots.innerHTML = slotsHtml || '<p class="today-shift__empty">本日のシフト申請はありません</p>';
            elements.slotSelectGroup.style.display = 'block';

            // 申請済みのシフト枠のみ表示
            updateSlotButtons(availableSlotIds);
        } else {
            elements.todayShiftSlots.innerHTML = '<p class="today-shift__empty">本日のシフト申請はありません</p>';
            elements.slotSelectGroup.style.display = 'block';
            // 全営業枠表示
            updateSlotButtons(availableSlotIds);
        }
    }

    /**
     * シフト枠ボタンを更新
     */
    function updateSlotButtons(availableSlotIds) {
        elements.slotButtons.querySelectorAll('.slot-btn').forEach(btn => {
            const slotId = btn.dataset.slot;
            const isAvailable = availableSlotIds.includes(slotId);
            const hasShift = myShifts.length === 0 || myShifts.some(s => s.slotId === slotId);

            btn.style.display = (isAvailable && hasShift) ? 'flex' : 'none';
            btn.classList.remove('slot-btn--selected');
            btn.disabled = !isAvailable;
        });

        // 自動で最初の枠を選択
        const visibleButtons = Array.from(elements.slotButtons.querySelectorAll('.slot-btn'))
            .filter(btn => btn.style.display !== 'none' && !btn.disabled);

        if (visibleButtons.length > 0) {
            handleSlotSelect(visibleButtons[0].dataset.slot);
        }
    }

    /**
     * シフト枠選択時の処理
     */
    function handleSlotSelect(slotId) {
        selectedSlot = slotId;
        elements.slotButtons.querySelectorAll('.slot-btn').forEach(btn => {
            btn.classList.toggle('slot-btn--selected', btn.dataset.slot === slotId);
        });
        updateStatusDisplay();
        updateButtonStates();
    }

    /**
     * 今日の打刻記録をロード
     */
    async function loadTodayRecords(staffId) {
        const today = Utils.formatDate();

        if (!isConfigValid()) {
            // ローカルデータを使用
            const localRecords = Utils.getFromStorage(CONFIG.STORAGE_KEYS.CLOCK_RECORDS) || [];
            todayRecords = localRecords.filter(r => r.date === today);
            renderHistory();
            updateStatusDisplay();
            return;
        }

        try {
            Utils.showLoading(true, '記録を取得中...');
            const response = await Utils.apiRequest('getRecords', { date: today });
            if (response.success || response.ok) {
                todayRecords = response.records || [];
                renderHistory();
                updateStatusDisplay();
            }
        } catch (error) {
            console.error('記録取得エラー:', error);
            // ローカルデータにフォールバック
            const localRecords = Utils.getFromStorage(CONFIG.STORAGE_KEYS.CLOCK_RECORDS) || [];
            todayRecords = localRecords.filter(r => r.date === today);
            renderHistory();
            updateStatusDisplay();
        } finally {
            Utils.showLoading(false);
        }
    }

    /**
     * ステータス表示を更新
     */
    function updateStatusDisplay() {
        const staffId = elements.staffSelect.value;
        if (!staffId) {
            elements.statusDisplay.className = 'status';
            elements.statusDisplay.innerHTML = '<p class="status__text">スタッフを選択してください</p>';
            return;
        }

        const staffName = getStaffName(staffId);
        const today = Utils.formatDate();
        const availableSlotIds = getAvailableSlotIds(today);

        if (availableSlotIds.length === 0) {
            elements.statusDisplay.className = 'status';
            elements.statusDisplay.innerHTML = '<p class="status__text">本日は営業枠がありません</p>';
            return;
        }

        if (!selectedSlot) {
            elements.statusDisplay.className = 'status';
            elements.statusDisplay.innerHTML = `<p class="status__text">${staffName}さん: シフト枠を選択してください</p>`;
            return;
        }

        const slotInfo = CONFIG.SHIFT_SLOTS[selectedSlot];
        const slotRecords = todayRecords.filter(r =>
            r.staffId === staffId && r.slotId === selectedSlot
        );

        const lastRecord = slotRecords.sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        )[0];

        if (!lastRecord) {
            elements.statusDisplay.className = 'status';
            elements.statusDisplay.innerHTML = `<p class="status__text">${staffName}さん: ${slotInfo.label}枠 未打刻</p>`;
        } else if (lastRecord.clockType === 'in') {
            elements.statusDisplay.className = 'status status--in';
            elements.statusDisplay.innerHTML = `<p class="status__text">${staffName}さん: ${slotInfo.label}枠 出勤中（${lastRecord.time}〜）</p>`;
        } else {
            elements.statusDisplay.className = 'status status--out';
            elements.statusDisplay.innerHTML = `<p class="status__text">${staffName}さん: ${slotInfo.label}枠 退勤済み</p>`;
        }
    }

    /**
     * ボタンの有効/無効を更新
     */
    function updateButtonStates() {
        const staffId = elements.staffSelect.value;
        const hasStaff = staffId !== '';
        const hasSlot = selectedSlot !== null;
        const today = Utils.formatDate();
        const availableSlotIds = getAvailableSlotIds(today);
        const hasAvailableSlots = availableSlotIds.length > 0;

        elements.btnClockIn.disabled = !hasStaff || !hasSlot || !hasAvailableSlots;
        elements.btnClockOut.disabled = !hasStaff || !hasSlot || !hasAvailableSlots;
    }

    /**
     * 打刻処理
     */
    async function handlePunch(clockType) {
        const staffId = elements.staffSelect.value;
        const staffName = getStaffName(staffId);

        if (!staffId || !selectedSlot) {
            Utils.showMessage('スタッフとシフト枠を選択してください', 'error');
            return;
        }

        const slotInfo = CONFIG.SHIFT_SLOTS[selectedSlot];
        const slotRecords = todayRecords.filter(r =>
            r.staffId === staffId && r.slotId === selectedSlot
        );
        const lastRecord = slotRecords.sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        )[0];

        // 二重打刻チェック
        if (clockType === 'in' && lastRecord?.clockType === 'in') {
            Utils.showMessage('このシフト枠はすでに出勤済みです', 'error');
            return;
        }
        if (clockType === 'out' && lastRecord?.clockType === 'out') {
            Utils.showMessage('このシフト枠はすでに退勤済みです', 'error');
            return;
        }
        if (clockType === 'out' && !lastRecord) {
            Utils.showMessage('先に出勤打刻をしてください', 'error');
            return;
        }

        const now = Utils.getJSTDate();
        const time = Utils.formatTimeShort(now);

        // 遅刻・早退判定
        const status = Utils.determineClockStatus(clockType, time, slotInfo);

        const record = {
            id: Utils.generateId(),
            date: Utils.formatDate(now),
            staffId: staffId,
            staffName: staffName,
            slotId: selectedSlot,
            slotLabel: slotInfo.label,
            clockType: clockType,
            time: time,
            status: status,
            timestamp: now.toISOString()
        };

        if (!isConfigValid()) {
            // ローカルに保存
            const localRecords = Utils.getFromStorage(CONFIG.STORAGE_KEYS.CLOCK_RECORDS) || [];
            localRecords.push(record);
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.CLOCK_RECORDS, localRecords);
            todayRecords.push(record);
            renderHistory();
            updateStatusDisplay();

            let message = clockType === 'in'
                ? `${slotInfo.label}シフト 出勤を記録しました`
                : `${slotInfo.label}シフト 退勤を記録しました`;

            if (status === 'late') {
                message += '（遅刻）';
            } else if (status === 'early_leave') {
                message += '（早退）';
            }

            Utils.showMessage(message, 'success');
            return;
        }

        try {
            Utils.showLoading(true, '打刻中...');
            const response = await Utils.apiRequest('punch', record);

            if (response.success || response.ok) {
                todayRecords.push(record);
                renderHistory();
                updateStatusDisplay();

                let message = clockType === 'in'
                    ? `${slotInfo.label}シフト 出勤を記録しました`
                    : `${slotInfo.label}シフト 退勤を記録しました`;

                if (status === 'late') {
                    message += '（遅刻）';
                } else if (status === 'early_leave') {
                    message += '（早退）';
                }

                Utils.showMessage(message, 'success');
            } else {
                Utils.showMessage(response.message || response.error || '打刻に失敗しました', 'error');
            }
        } catch (error) {
            console.error('打刻エラー:', error);
            Utils.showMessage('通信エラーが発生しました', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    /**
     * 打刻履歴をレンダリング
     */
    function renderHistory() {
        const staffId = elements.staffSelect.value;

        const records = todayRecords
            .filter(r => !staffId || r.staffId === staffId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (records.length === 0) {
            elements.historyList.innerHTML = '<p class="no-history">打刻履歴はありません</p>';
            return;
        }

        const html = '<ul class="history-list">' + records.map(record => {
            const typeClass = record.clockType === 'in' ? 'clock-in' : 'clock-out';
            const typeLabel = record.clockType === 'in' ? '出勤' : '退勤';
            let statusBadge = '';

            if (record.status === 'late') {
                statusBadge = '<span class="badge badge--warning">遅刻</span>';
            } else if (record.status === 'early_leave') {
                statusBadge = '<span class="badge badge--warning">早退</span>';
            }

            return `
                <li class="history-item history-item--${typeClass}">
                    <div>
                        <span class="history-type">${typeLabel}</span>
                        ${record.slotLabel ? `<small style="color: var(--color-gray-500); margin-left: 0.5rem;">${record.slotLabel}</small>` : ''}
                        ${statusBadge}
                    </div>
                    <span class="history-time">${record.time}</span>
                </li>
            `;
        }).join('') + '</ul>';

        elements.historyList.innerHTML = html;
    }

    // 初期化
    document.addEventListener('DOMContentLoaded', init);
})();
