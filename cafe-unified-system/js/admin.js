/**
 * 共創カフェ 統合シフト・勤怠管理システム - 管理画面
 */

(function() {
    'use strict';

    const elements = {
        authSection: document.getElementById('authSection'),
        adminSection: document.getElementById('adminSection'),
        adminPassword: document.getElementById('adminPassword'),
        btnLogin: document.getElementById('btnLogin'),
        authError: document.getElementById('authError'),
        // タブ
        tabs: document.querySelectorAll('.tab'),
        tabContents: document.querySelectorAll('.tab-content'),
        // 勤怠一覧
        filterDate: document.getElementById('filterDate'),
        filterName: document.getElementById('filterName'),
        btnSearch: document.getElementById('btnSearch'),
        btnClear: document.getElementById('btnClear'),
        totalAttendance: document.getElementById('totalAttendance'),
        totalHours: document.getElementById('totalHours'),
        lateCount: document.getElementById('lateCount'),
        earlyLeaveCount: document.getElementById('earlyLeaveCount'),
        tableBody: document.getElementById('tableBody'),
        btnExportCsv: document.getElementById('btnExportCsv'),
        // 週別確認
        weeklyViolations: document.getElementById('weeklyViolations'),
        weeklyOverview: document.getElementById('weeklyOverview'),
        // シフト管理
        shiftDate: document.getElementById('shiftDate'),
        shiftDateTitle: document.getElementById('shiftDateTitle'),
        AM_ACount: document.getElementById('AM_ACount'),
        AM_AStaff: document.getElementById('AM_AStaff'),
        AM_BCount: document.getElementById('AM_BCount'),
        AM_BStaff: document.getElementById('AM_BStaff'),
        PM_ACount: document.getElementById('PM_ACount'),
        PM_AStaff: document.getElementById('PM_AStaff'),
        PM_BCount: document.getElementById('PM_BCount'),
        PM_BStaff: document.getElementById('PM_BStaff'),
        btnExportShiftCsv: document.getElementById('btnExportShiftCsv'),
        // スタッフ
        staffList: document.getElementById('staffList'),
        staffStatsBody: document.getElementById('staffStatsBody'),
        // データ管理
        btnExportData: document.getElementById('btnExportData'),
        btnClearData: document.getElementById('btnClearData'),
        btnMigrate: document.getElementById('btnMigrate'),
        migrationSection: document.getElementById('migrationSection'),
        // その他
        btnLogout: document.getElementById('btnLogout')
    };

    let allRecords = [];
    let allShiftRequests = [];

    /**
     * 初期化
     */
    function init() {
        checkAuth();
        setupEventListeners();
        checkMigrationNeeded();
    }

    /**
     * 認証状態をチェック
     */
    function checkAuth() {
        const token = Utils.getFromStorage(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        if (token === 'authenticated') {
            showAdminSection();
        }
    }

    /**
     * 移行が必要かチェック
     */
    function checkMigrationNeeded() {
        const hasOldData = Utils.hasOldSystemData();
        if (elements.migrationSection) {
            elements.migrationSection.style.display = hasOldData ? 'block' : 'none';
        }
    }

    /**
     * イベントリスナーを設定
     */
    function setupEventListeners() {
        // ログイン
        elements.btnLogin.addEventListener('click', handleLogin);
        elements.adminPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });

        // タブ切り替え
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => handleTabChange(tab.dataset.tab));
        });

        // 勤怠一覧
        elements.btnSearch.addEventListener('click', handleSearch);
        elements.btnClear.addEventListener('click', handleClear);
        elements.btnExportCsv.addEventListener('click', handleExportCsv);

        // シフト管理
        elements.shiftDate.addEventListener('change', handleShiftDateChange);
        elements.btnExportShiftCsv.addEventListener('click', handleExportShiftCsv);

        // データ管理
        elements.btnExportData.addEventListener('click', handleExportData);
        elements.btnClearData.addEventListener('click', handleClearData);
        elements.btnMigrate.addEventListener('click', handleMigration);

        // ログアウト
        elements.btnLogout.addEventListener('click', handleLogout);
    }

    /**
     * ログイン処理
     */
    function handleLogin() {
        const password = elements.adminPassword.value;
        if (password === CONFIG.ADMIN_PASSWORD) {
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.AUTH_TOKEN, 'authenticated');
            elements.authError.textContent = '';
            showAdminSection();
        } else {
            elements.authError.textContent = 'パスワードが正しくありません';
        }
    }

    /**
     * 管理画面を表示
     */
    function showAdminSection() {
        elements.authSection.style.display = 'none';
        elements.adminSection.style.display = 'block';
        loadData();
    }

    /**
     * データを読み込み
     */
    function loadData() {
        allRecords = Utils.getFromStorage(CONFIG.STORAGE_KEYS.CLOCK_RECORDS) || [];
        allShiftRequests = Utils.getFromStorage(CONFIG.STORAGE_KEYS.SHIFTS) || [];

        initAttendanceTab();
        initWeeklyTab();
        initShiftTab();
        initStaffTab();
    }

    /**
     * タブ切り替え
     */
    function handleTabChange(tabId) {
        elements.tabs.forEach(tab => {
            tab.classList.toggle('tab--active', tab.dataset.tab === tabId);
        });

        elements.tabContents.forEach(content => {
            const isActive = content.id === `tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`;
            content.classList.toggle('tab-content--active', isActive);
        });
    }

    // ========== 勤怠一覧タブ ==========

    function initAttendanceTab() {
        populateNameFilter();
        elements.filterDate.value = Utils.formatDate();
        handleSearch();
    }

    function populateNameFilter() {
        const options = CONFIG.STAFF_LIST.map(staff =>
            `<option value="${staff.name}">${staff.name}（${staff.id}）</option>`
        ).join('');
        elements.filterName.innerHTML = '<option value="">全員</option>' + options;
    }

    function handleSearch() {
        const filterDate = elements.filterDate.value;
        const filterName = elements.filterName.value;

        let records = [...allRecords];

        if (filterDate) {
            records = records.filter(r => r.date === filterDate);
        }
        if (filterName) {
            records = records.filter(r => r.staffName === filterName || r.name === filterName);
        }

        const processedData = processAttendanceRecords(records);
        renderAttendanceTable(processedData);
        updateAttendanceSummary(processedData);
    }

    function processAttendanceRecords(records) {
        const grouped = {};

        records.forEach(record => {
            const staffName = record.staffName || record.name || '';
            const key = `${record.date}_${staffName}_${record.slotId || record.slot || 'default'}`;
            if (!grouped[key]) {
                grouped[key] = {
                    date: record.date,
                    name: staffName,
                    staffId: record.staffId || '',
                    slotId: record.slotId || record.slot,
                    slotLabel: record.slotLabel || CONFIG.SHIFT_SLOTS[record.slotId]?.label || '-',
                    inTime: null,
                    outTime: null,
                    inStatus: null,
                    outStatus: null
                };
            }

            // clockType (新形式) または type (旧形式) に対応
            const clockType = (record.clockType || record.type || '').toLowerCase();
            if (clockType === 'in') {
                grouped[key].inTime = record.time;
                grouped[key].inStatus = record.status;
            } else if (clockType === 'out') {
                grouped[key].outTime = record.time;
                grouped[key].outStatus = record.status;
            }
        });

        return Object.values(grouped).sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return a.name.localeCompare(b.name);
        });
    }

    function renderAttendanceTable(data) {
        if (data.length === 0) {
            elements.tableBody.innerHTML = '<tr><td colspan="6" class="table__empty">データがありません</td></tr>';
            return;
        }

        const html = data.map(row => {
            let statusBadge = '';
            if (row.inStatus === 'late') {
                statusBadge = '<span class="badge badge--warning">遅刻</span>';
            } else if (row.outStatus === 'early_leave') {
                statusBadge = '<span class="badge badge--warning">早退</span>';
            } else if (row.inTime && row.outTime) {
                statusBadge = '<span class="badge badge--success">完了</span>';
            } else if (row.inTime) {
                statusBadge = '<span class="badge badge--error">未退勤</span>';
            }

            return `
                <tr>
                    <td>${Utils.escapeHtml(row.date)}</td>
                    <td>${Utils.escapeHtml(row.name)}</td>
                    <td>${Utils.escapeHtml(row.slotLabel)}</td>
                    <td>${row.inTime || '-'}</td>
                    <td>${row.outTime || '-'}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');

        elements.tableBody.innerHTML = html;
    }

    function updateAttendanceSummary(data) {
        const attendance = data.filter(d => d.inTime).length;
        elements.totalAttendance.textContent = attendance;

        let totalMinutes = 0;
        data.forEach(d => {
            if (d.inTime && d.outTime) {
                const [inH, inM] = d.inTime.split(':').map(Number);
                const [outH, outM] = d.outTime.split(':').map(Number);
                let mins = (outH * 60 + outM) - (inH * 60 + inM);
                if (mins < 0) mins += 24 * 60;
                totalMinutes += mins;
            }
        });
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        elements.totalHours.textContent = `${hours}:${String(mins).padStart(2, '0')}`;

        const lateCount = data.filter(d => d.inStatus === 'late').length;
        const earlyLeaveCount = data.filter(d => d.outStatus === 'early_leave').length;
        elements.lateCount.textContent = lateCount;
        elements.earlyLeaveCount.textContent = earlyLeaveCount;
    }

    function handleClear() {
        elements.filterDate.value = '';
        elements.filterName.value = '';
        handleSearch();
    }

    function handleExportCsv() {
        const filterDate = elements.filterDate.value;
        const filterName = elements.filterName.value;

        let records = [...allRecords];
        if (filterDate) records = records.filter(r => r.date === filterDate);
        if (filterName) records = records.filter(r => (r.staffName || r.name) === filterName);

        const data = processAttendanceRecords(records);

        if (data.length === 0) {
            Utils.showMessage('出力するデータがありません', 'error');
            return;
        }

        const headers = ['日付', '学生番号', '名前', 'シフト枠', '出勤', '退勤', '状態'];
        const rows = data.map(row => {
            let status = '';
            if (row.inStatus === 'late') status = '遅刻';
            else if (row.outStatus === 'early_leave') status = '早退';
            else if (row.inTime && row.outTime) status = '完了';
            else if (row.inTime) status = '未退勤';

            return [row.date, row.staffId, row.name, row.slotLabel, row.inTime || '', row.outTime || '', status];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        Utils.downloadCSV(csvContent, `勤怠記録_${Utils.formatDate()}.csv`);
        Utils.showMessage('CSVをエクスポートしました', 'success');
    }

    // ========== 週別確認タブ ==========

    function initWeeklyTab() {
        loadWeeklyOverview();
    }

    function loadWeeklyOverview() {
        // 週ごと・メンバーごとにグループ化
        const weeklyMap = {};
        allShiftRequests.forEach(sub => {
            const weekKey = sub.weekKey || getWeekKey(sub.date);
            const key = `${weekKey}_${sub.staffId}`;
            if (!weeklyMap[key]) {
                weeklyMap[key] = [];
            }
            weeklyMap[key].push(sub);
        });

        // 週1制約違反を検出
        const violations = [];
        Object.entries(weeklyMap).forEach(([key, subs]) => {
            if (subs.length > 1) {
                violations.push({
                    weekKey: subs[0].weekKey || getWeekKey(subs[0].date),
                    staffId: subs[0].staffId,
                    staffName: subs[0].staffName,
                    count: subs.length,
                    shifts: subs
                });
            }
        });

        // 違反表示
        if (violations.length === 0) {
            elements.weeklyViolations.innerHTML = '<p class="no-violations">週1制約違反はありません</p>';
        } else {
            let violationHtml = '<div class="violation-alert"><h3>週1制約違反が検出されました</h3><ul>';
            violations.forEach(v => {
                const week = CONFIG.WEEKS.find(w => w.weekKey === v.weekKey);
                violationHtml += `
                    <li class="violation-item">
                        <strong>${week ? week.label : v.weekKey}</strong>:
                        ${Utils.escapeHtml(v.staffName)}（${v.staffId}）- ${v.count}件登録
                    </li>
                `;
            });
            violationHtml += '</ul></div>';
            elements.weeklyViolations.innerHTML = violationHtml;
        }

        // 週別概要
        let overviewHtml = '';
        CONFIG.WEEKS.forEach(week => {
            const weekSubs = allShiftRequests.filter(s => {
                const weekKey = s.weekKey || getWeekKey(s.date);
                return weekKey === week.weekKey;
            });
            const memberCount = new Set(weekSubs.map(s => s.staffId)).size;

            overviewHtml += `
                <div class="card week-summary">
                    <h3 class="week-summary__title">${week.label}</h3>
                    <p class="week-summary__count">${memberCount}名がシフト登録済み</p>
                    <div class="week-summary__dates">
            `;

            week.dates.forEach(dateStr => {
                const dateSubs = weekSubs.filter(s => s.date === dateStr);
                if (dateSubs.length > 0) {
                    overviewHtml += `
                        <div class="date-summary">
                            <span class="date-summary__date">${formatDateDisplay(dateStr)}</span>
                            <span class="date-summary__count">${dateSubs.length}名</span>
                        </div>
                    `;
                }
            });

            overviewHtml += '</div></div>';
        });

        elements.weeklyOverview.innerHTML = overviewHtml;
    }

    // ========== シフト管理タブ ==========

    function initShiftTab() {
        populateShiftDateSelect();
        if (elements.shiftDate.value) {
            handleShiftDateChange();
        }
    }

    function populateShiftDateSelect() {
        const options = getOperationDates().map(date => {
            const d = parseDateStr(date);
            const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
            const availableSlots = getAvailableSlots(date);
            const hasMorning = availableSlots.some(s => s.id.startsWith('AM'));
            const slotInfo = hasMorning ? '午前・午後' : '午後のみ';
            return `<option value="${date}">${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）- ${slotInfo}</option>`;
        }).join('');

        elements.shiftDate.innerHTML = '<option value="">-- 日付を選択 --</option>' + options;
    }

    function parseDateStr(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    function handleShiftDateChange() {
        const date = elements.shiftDate.value;
        if (!date) return;

        const d = parseDateStr(date);
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        elements.shiftDateTitle.textContent = `${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）`;

        const dayShifts = allShiftRequests.filter(r => r.date === date);
        const required = CONFIG.REQUIRED_STAFF_PER_SLOT;
        const availableSlots = getAvailableSlots(date);
        const availableSlotIds = availableSlots.map(s => s.id);

        const slotIds = ['AM_A', 'AM_B', 'PM_A', 'PM_B'];
        slotIds.forEach(slotId => {
            const isAvailable = availableSlotIds.includes(slotId);
            const slotShifts = dayShifts.filter(s => s.slotId === slotId);
            const countEl = elements[`${slotId}Count`];
            const staffEl = elements[`${slotId}Staff`];

            if (!countEl || !staffEl) return;

            if (isAvailable) {
                countEl.textContent = `${slotShifts.length}/${required}`;
                if (slotShifts.length > 0) {
                    staffEl.innerHTML = slotShifts.map(s => {
                        const staff = getStaffById(s.staffId);
                        const roleColor = CONFIG.ROLES[staff?.role]?.color || '#ccc';
                        return `<span class="staff-tag"><span class="staff-tag__role" style="background-color: ${roleColor}"></span>${Utils.escapeHtml(s.staffName)}（${s.staffId}）</span>`;
                    }).join('');
                } else {
                    staffEl.innerHTML = '<p class="shift-slot-admin__empty">申請者なし</p>';
                }
            } else {
                countEl.textContent = '営業なし';
                staffEl.innerHTML = `<p class="shift-slot-admin__empty">この日は${CONFIG.SHIFT_SLOTS[slotId]?.label || slotId}営業なし</p>`;
            }
        });
    }

    function handleExportShiftCsv() {
        if (allShiftRequests.length === 0) {
            Utils.showMessage('出力するシフトデータがありません', 'error');
            return;
        }

        const headers = ['日付', '枠', '開始時刻', '終了時刻', '学生番号', 'スタッフ名', '週'];
        const rows = [];

        getOperationDates().forEach(date => {
            const availableSlots = getAvailableSlots(date);
            const availableSlotIds = availableSlots.map(s => s.id);

            Object.entries(CONFIG.SHIFT_SLOTS).forEach(([slotId, slot]) => {
                if (!availableSlotIds.includes(slotId)) {
                    rows.push([date, slot.label, '-', '-', '-', '営業なし', '-']);
                    return;
                }

                const shifts = allShiftRequests.filter(r => r.date === date && r.slotId === slotId);
                if (shifts.length > 0) {
                    shifts.forEach(s => {
                        const week = CONFIG.WEEKS.find(w => w.weekKey === s.weekKey);
                        rows.push([date, slot.label, slot.start, slot.end, s.staffId, s.staffName, week?.label || '-']);
                    });
                } else {
                    rows.push([date, slot.label, slot.start, slot.end, '-', '（未定）', '-']);
                }
            });
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        Utils.downloadCSV(csvContent, `シフト表_${Utils.formatDate()}.csv`);
        Utils.showMessage('シフト表をエクスポートしました', 'success');
    }

    // ========== スタッフタブ ==========

    function initStaffTab() {
        renderStaffList();
        renderStaffStats();
    }

    function renderStaffList() {
        const html = CONFIG.STAFF_LIST.map(staff => {
            const role = CONFIG.ROLES[staff.role] || { label: 'スタッフ', color: '#ccc' };
            const initial = staff.name.charAt(0);

            return `
                <div class="staff-item">
                    <div class="staff-item__avatar">${initial}</div>
                    <div class="staff-item__info">
                        <p class="staff-item__name">${Utils.escapeHtml(staff.name)}</p>
                        <p class="staff-item__id">${staff.id}</p>
                        <p class="staff-item__role" style="color: ${role.color}">${role.label}</p>
                    </div>
                </div>
            `;
        }).join('');

        elements.staffList.innerHTML = html;
    }

    function renderStaffStats() {
        const html = CONFIG.STAFF_LIST.map(staff => {
            const shiftCount = allShiftRequests.filter(r => r.staffId === staff.id).length;
            const attendanceCount = allRecords.filter(r => {
                const clockType = (r.clockType || r.type || '').toLowerCase();
                return (r.staffId === staff.id || r.name === staff.name || r.staffName === staff.name) && clockType === 'in';
            }).length;

            return `
                <tr>
                    <td>${Utils.escapeHtml(staff.id)}</td>
                    <td>${Utils.escapeHtml(staff.name)}</td>
                    <td>${shiftCount}</td>
                    <td>${attendanceCount}</td>
                </tr>
            `;
        }).join('');

        elements.staffStatsBody.innerHTML = html || '<tr><td colspan="4" class="table__empty">データなし</td></tr>';
    }

    // ========== データ管理 ==========

    function handleExportData() {
        const exportObj = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            system: 'cafe-unified-system',
            shifts: allShiftRequests,
            clockRecords: allRecords
        };

        const dataStr = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `cafe-unified-export-${Utils.formatDate()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Utils.showMessage('データをエクスポートしました', 'success');
    }

    function handleClearData() {
        if (!confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
            return;
        }

        if (!confirm('本当に削除しますか？')) {
            return;
        }

        Utils.removeFromStorage(CONFIG.STORAGE_KEYS.SHIFTS);
        Utils.removeFromStorage(CONFIG.STORAGE_KEYS.CLOCK_RECORDS);

        loadData();
        Utils.showMessage('データを削除しました', 'success');
    }

    function handleMigration() {
        if (!confirm('旧システムからデータを移行しますか？既存のデータは保持されます。')) {
            return;
        }

        const result = Utils.migrateOldData();

        if (result.success) {
            Utils.showMessage(`移行完了: シフト${result.shifts}件, 打刻${result.clock}件`, 'success');
            loadData();
            checkMigrationNeeded();
        } else {
            Utils.showMessage('移行するデータがありませんでした', 'error');
        }
    }

    function handleLogout() {
        Utils.removeFromStorage(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        elements.adminSection.style.display = 'none';
        elements.authSection.style.display = 'flex';
        elements.adminPassword.value = '';
    }

    // 初期化
    document.addEventListener('DOMContentLoaded', init);
})();
