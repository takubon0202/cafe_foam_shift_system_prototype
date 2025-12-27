/**
 * 共創カフェ 統合シフト・勤怠管理システム - シフト提出（週1制約）
 * v2.0 - GAS連携・キャンセル機能完全実装
 */

(function() {
    'use strict';

    const elements = {
        memberSelect: document.getElementById('memberSelect'),
        memberSearch: document.getElementById('memberSearch'),
        selectedName: document.getElementById('selectedName'),
        shiftSection: document.getElementById('shiftSection'),
        submitSection: document.getElementById('submitSection'),
        selectionSummary: document.getElementById('selectionSummary'),
        btnSubmit: document.getElementById('btnSubmit'),
        myShiftsSection: document.getElementById('myShiftsSection'),
        myShiftsList: document.getElementById('myShiftsList'),
        btnClearSearch: document.getElementById('btnClearSearch')
    };

    // 週ごとの選択状態
    let weekSelections = {};
    // 全シフトデータ（GAS + ローカル統合）
    let allShifts = [];

    /**
     * 初期化
     */
    async function init() {
        console.log('[submit:init] 初期化開始');
        console.log('[submit:init] DEMO_MODE:', CONFIG.DEMO_MODE);
        console.log('[submit:init] OPERATION_PERIOD:', CONFIG.OPERATION_PERIOD);
        console.log('[submit:init] WEEKS:', CONFIG.WEEKS);
        console.log('[submit:init] getWeeks():', getWeeks());

        populateMemberSelect();
        setupEventListeners();

        // シフトデータを読み込み
        await loadAllShifts();

        restoreLastSelection();
    }

    /**
     * 全シフトデータを読み込み（GAS優先）
     */
    async function loadAllShifts() {
        console.log('[loadAllShifts] 開始');

        // まずローカルストレージから読み込み
        allShifts = Utils.getFromStorage(CONFIG.STORAGE_KEYS.SHIFTS) || [];
        console.log('[loadAllShifts] ローカルから読み込み:', allShifts.length, '件');

        // GASが設定されている場合は、GASからも取得
        if (isConfigValid()) {
            try {
                console.log('[loadAllShifts] GASから取得開始...');
                const response = await Utils.apiRequest('getAllShifts', {});
                console.log('[loadAllShifts] GASレスポンス:', response);

                if (response.success && response.shifts) {
                    // GASのデータで上書き（GASが正）
                    allShifts = response.shifts;
                    // ローカルストレージも同期
                    Utils.saveToStorage(CONFIG.STORAGE_KEYS.SHIFTS, allShifts);
                    console.log('[loadAllShifts] GASからシフトデータを取得:', allShifts.length, '件');
                } else {
                    console.warn('[loadAllShifts] GASレスポンスにshiftsがない:', response);
                }
            } catch (error) {
                console.warn('[loadAllShifts] GASからのデータ取得に失敗、ローカルデータを使用:', error);
            }
        } else {
            console.log('[loadAllShifts] GAS未設定、ローカルデータのみ使用');
        }

        console.log('[loadAllShifts] 最終データ:', allShifts.length, '件');
    }

    /**
     * メンバー選択肢を生成
     */
    function populateMemberSelect() {
        const options = CONFIG.STAFF_LIST.map(staff => {
            const roleLabel = CONFIG.ROLES[staff.role]?.label || '';
            const roleSuffix = roleLabel && roleLabel !== 'スタッフ' ? `（${roleLabel}）` : '';
            return `<option value="${staff.id}">${staff.id} - ${staff.name}${roleSuffix}</option>`;
        }).join('');

        elements.memberSelect.innerHTML = '<option value="">-- 選択してください --</option>' + options;
    }

    /**
     * イベントリスナーを設定
     */
    function setupEventListeners() {
        elements.memberSelect.addEventListener('change', handleMemberChange);
        elements.btnSubmit.addEventListener('click', handleSubmit);

        // 検索フィルター機能
        if (elements.memberSearch) {
            elements.memberSearch.addEventListener('input', handleMemberSearch);
        }

        // 検索クリアボタン
        if (elements.btnClearSearch) {
            elements.btnClearSearch.addEventListener('click', handleClearSearch);
        }
    }

    /**
     * 検索をクリア
     */
    function handleClearSearch() {
        if (elements.memberSearch) {
            elements.memberSearch.value = '';
            // 全オプションを表示
            const options = elements.memberSelect.querySelectorAll('option');
            options.forEach(option => option.style.display = '');
            // クリアボタンを非表示
            if (elements.btnClearSearch) {
                elements.btnClearSearch.style.display = 'none';
            }
            // 検索ボックスにフォーカス
            elements.memberSearch.focus();
        }
    }

    /**
     * メンバー検索フィルター
     */
    function handleMemberSearch(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        const options = elements.memberSelect.querySelectorAll('option');

        // クリアボタンの表示/非表示
        if (elements.btnClearSearch) {
            elements.btnClearSearch.style.display = e.target.value.length > 0 ? 'flex' : 'none';
        }

        options.forEach(option => {
            if (option.value === '') {
                // デフォルトオプションは常に表示
                option.style.display = '';
                return;
            }
            const text = option.textContent.toLowerCase();
            if (searchTerm === '' || text.includes(searchTerm)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });

        // 検索結果が1件のみの場合は自動選択
        const visibleOptions = Array.from(options).filter(o => o.value && o.style.display !== 'none');
        if (visibleOptions.length === 1 && searchTerm.length >= 2) {
            elements.memberSelect.value = visibleOptions[0].value;
            handleMemberChange();
        }
    }

    /**
     * 前回の選択を復元
     */
    function restoreLastSelection() {
        const lastStaffId = Utils.getFromStorage(CONFIG.STORAGE_KEYS.LAST_STAFF_ID);
        if (lastStaffId) {
            elements.memberSelect.value = lastStaffId;
            handleMemberChange();
        }
    }

    /**
     * メンバー選択変更時の処理
     */
    async function handleMemberChange() {
        const staffId = elements.memberSelect.value;
        console.log('[handleMemberChange] スタッフID:', staffId);

        if (staffId) {
            const staff = getStaffById(staffId);
            elements.selectedName.textContent = staff ? staff.name : '';

            // 選択を保存
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.LAST_STAFF_ID, staffId);

            // GASから最新データを取得
            Utils.showLoading(true, 'シフトデータを読み込み中...');
            await loadAllShifts();
            Utils.showLoading(false);

            // 既存のシフト選択をロード・表示
            const existingShifts = getStaffShifts(staffId);
            console.log('[handleMemberChange] 既存シフト:', existingShifts.length, '件', existingShifts);

            renderMyShifts(existingShifts);

            weekSelections = {};
            renderShiftSection(existingShifts);
            elements.shiftSection.style.display = 'block';
            elements.submitSection.style.display = 'block';
        } else {
            elements.selectedName.textContent = '';
            elements.shiftSection.style.display = 'none';
            elements.submitSection.style.display = 'none';
            elements.myShiftsSection.style.display = 'none';
        }
        updateSubmitButton();
    }

    /**
     * スタッフのシフトを取得
     */
    function getStaffShifts(staffId) {
        // staffIdを文字列に正規化して比較
        const normalizedStaffId = String(staffId);
        const result = allShifts.filter(s => String(s.staffId) === normalizedStaffId);
        console.log('[getStaffShifts] staffId:', normalizedStaffId, '結果:', result.length, '件');
        return result;
    }

    /**
     * 特定の日付・枠に登録されている他のスタッフを取得
     * GASからのデータ形式の違いを考慮して日付を正規化
     */
    function getOtherStaffForSlot(dateStr, slotId, currentStaffId) {
        return allShifts.filter(s => {
            // 日付を正規化して比較
            let shiftDate = s.date || '';
            if (shiftDate.includes('T')) {
                shiftDate = shiftDate.split('T')[0];
            }
            // 無効な日付は除外
            if (shiftDate.startsWith('1899') || shiftDate.startsWith('1900')) {
                return false;
            }
            return shiftDate === dateStr &&
                s.slotId === slotId &&
                String(s.staffId) !== String(currentStaffId);
        });
    }

    /**
     * シフト選択セクションをレンダリング（登録済み週を除外、他スタッフの選択状況表示）
     */
    function renderShiftSection(existingShifts = []) {
        const weeks = getWeeks();
        const registeredWeeks = new Set(existingShifts.map(s => s.weekKey));
        const currentStaffId = elements.memberSelect.value;
        let html = '';

        // 現在のスタッフの登録済み枠をMapで管理
        const myRegisteredSlots = new Map();
        existingShifts.forEach(s => {
            const normalized = normalizeShiftData(s);
            if (normalized.date) {
                myRegisteredSlots.set(`${normalized.date}_${s.slotId}`, normalized);
            }
        });

        weeks.forEach(week => {
            const isRegistered = registeredWeeks.has(week.weekKey);

            html += `
                <section class="card week-card ${isRegistered ? 'week-card--registered' : ''}">
                    <h2 class="card__title week-title">${week.label}（${formatWeekRange(week)}）</h2>
            `;

            if (isRegistered) {
                const registeredShift = existingShifts.find(s => s.weekKey === week.weekKey);
                const normalized = normalizeShiftData(registeredShift);
                const dateDisplay = normalized.date ? formatDateDisplay(normalized.date) : '不明';
                html += `
                    <p class="week-registered-note">この週は登録済みです: ${dateDisplay} ${normalized.slotLabel}</p>
                `;
            } else {
                html += `<p class="week-note">この週で1つだけ選択してください</p>
                    <div class="shift-options" data-week="${week.weekKey}">`;

                week.dates.forEach(dateStr => {
                    const opDate = getOperationDate(dateStr);
                    if (!opDate) return;

                    const slots = getAvailableSlots(dateStr);
                    if (slots.length === 0) return;

                    html += `<div class="date-group">
                        <p class="date-label">${formatDateDisplay(dateStr)}</p>
                        <div class="slot-options">`;

                    slots.forEach(slot => {
                        // この枠に登録している他のスタッフを取得
                        const otherStaff = getOtherStaffForSlot(dateStr, slot.id, currentStaffId);
                        const staffCount = otherStaff.length;
                        const requiredStaff = getRequiredStaff(slot.id);

                        // 自分が登録済みかどうか
                        const isMySlot = myRegisteredSlots.has(`${dateStr}_${slot.id}`);

                        // 枠の状態を判定
                        let slotClass = '';
                        let statusBadge = '';

                        if (isMySlot) {
                            slotClass = 'slot-radio--mine';
                            statusBadge = '<span class="slot-badge slot-badge--mine">自分</span>';
                        } else if (staffCount >= requiredStaff) {
                            slotClass = 'slot-radio--full';
                            statusBadge = `<span class="slot-badge slot-badge--full">満員(${staffCount}/${requiredStaff})</span>`;
                        } else if (staffCount > 0) {
                            slotClass = 'slot-radio--partial';
                            statusBadge = `<span class="slot-badge slot-badge--partial">${staffCount}/${requiredStaff}人</span>`;
                        } else {
                            statusBadge = `<span class="slot-badge slot-badge--empty">0/${requiredStaff}人</span>`;
                        }

                        html += `
                            <label class="slot-radio ${slotClass}">
                                <input type="radio"
                                       name="week_${week.weekKey}"
                                       value="${dateStr}_${slot.id}"
                                       data-week="${week.weekKey}"
                                       data-date="${dateStr}"
                                       data-slot="${slot.id}"
                                       ${isMySlot ? 'disabled' : ''}>
                                <span class="slot-radio__box">
                                    <span class="slot-radio__header">
                                        <span class="slot-radio__label">${slot.label}</span>
                                        ${statusBadge}
                                    </span>
                                    <span class="slot-radio__time">${slot.start}〜${slot.end}</span>
                                </span>
                            </label>
                        `;
                    });

                    html += `</div></div>`;
                });

                // 選択しないオプション
                html += `
                    <div class="date-group">
                        <label class="slot-radio slot-radio--none">
                            <input type="radio"
                                   name="week_${week.weekKey}"
                                   value="none"
                                   data-week="${week.weekKey}"
                                   checked>
                            <span class="slot-radio__box slot-radio__box--none">
                                <span class="slot-radio__label">この週は入らない</span>
                            </span>
                        </label>
                    </div>
                </div>`;
            }

            html += `</section>`;
        });

        elements.shiftSection.innerHTML = html;

        // ラジオボタンのイベントリスナー追加
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', handleSlotChange);
        });
    }

    /**
     * 週の日付範囲をフォーマット
     */
    function formatWeekRange(week) {
        if (week.dates.length === 0) return '';
        const first = formatDateDisplay(week.dates[0]).split('（')[0];
        const last = formatDateDisplay(week.dates[week.dates.length - 1]).split('（')[0];
        return `${first}〜${last}`;
    }

    /**
     * シフト枠選択変更時の処理
     */
    function handleSlotChange(e) {
        const weekKey = e.target.dataset.week;
        const value = e.target.value;

        if (value === 'none') {
            delete weekSelections[weekKey];
        } else {
            // value形式: "2024-12-26_PM_A" → dateStr="2024-12-26", slotId="PM_A"
            const parts = value.split('_');
            const dateStr = parts[0]; // YYYY-MM-DD
            const slotId = parts.slice(1).join('_'); // PM_A, AM_B など
            weekSelections[weekKey] = {
                date: dateStr,
                slotId: slotId,
                slot: CONFIG.SHIFT_SLOTS[slotId]
            };
        }

        updateSelectionSummary();
        updateSubmitButton();
    }

    /**
     * 選択内容サマリーを更新
     */
    function updateSelectionSummary() {
        const selections = Object.entries(weekSelections);

        if (selections.length === 0) {
            elements.selectionSummary.innerHTML = '<p class="no-selection">シフトが選択されていません</p>';
            return;
        }

        const weeks = getWeeks();
        let html = '<ul class="selection-list">';

        selections.forEach(([weekKey, sel]) => {
            const week = weeks.find(w => w.weekKey === weekKey);
            html += `
                <li class="selection-item">
                    <span class="selection-week">${week ? week.label : weekKey}</span>
                    <span class="selection-detail">${formatDateDisplay(sel.date)} ${sel.slot.label}（${sel.slot.start}〜${sel.slot.end}）</span>
                </li>
            `;
        });
        html += '</ul>';

        elements.selectionSummary.innerHTML = html;
    }

    /**
     * 提出ボタンの有効/無効を更新
     */
    function updateSubmitButton() {
        const staffId = elements.memberSelect.value;
        const hasSelections = Object.keys(weekSelections).length > 0;
        elements.btnSubmit.disabled = !staffId || !hasSelections;
    }

    /**
     * シフト提出処理
     */
    async function handleSubmit() {
        const staffId = elements.memberSelect.value;
        const staff = getStaffById(staffId);

        if (!staffId || !staff) {
            Utils.showMessage('メンバーを選択してください', 'error');
            return;
        }

        const selections = Object.entries(weekSelections);
        if (selections.length === 0) {
            Utils.showMessage('少なくとも1つのシフトを選択してください', 'error');
            return;
        }

        // 提出データを作成
        const submissions = selections.map(([weekKey, sel]) => ({
            id: Utils.generateId(),
            staffId: staff.id,
            staffName: staff.name,
            weekKey: weekKey,
            date: sel.date,
            slotId: sel.slotId,
            slotLabel: sel.slot.label,
            startTime: sel.slot.start,
            endTime: sel.slot.end,
            createdAt: new Date().toISOString()
        }));

        // GASに送信
        if (isConfigValid()) {
            try {
                // 二重送信防止
                elements.btnSubmit.disabled = true;
                Utils.showLoading(true, 'シフトを送信中...');

                const response = await Utils.apiRequest('submitShifts', { submissions });

                if (response.ok || response.success) {
                    // 成功したらローカルストレージにも保存
                    allShifts = [...allShifts, ...submissions];
                    Utils.saveToStorage(CONFIG.STORAGE_KEYS.SHIFTS, allShifts);

                    Utils.showMessage(`${submissions.length}件のシフトを提出しました`, 'success');
                    await resetForm();
                } else if (response.error === 'WEEKLY_LIMIT') {
                    Utils.showMessage('同じ週に既にシフトが登録されています。週に1回のみ登録可能です。', 'error');
                } else {
                    Utils.showMessage(response.error || '提出に失敗しました', 'error');
                }
            } catch (error) {
                console.error('Submit error:', error);
                Utils.showMessage('通信エラーが発生しました', 'error');
            } finally {
                Utils.showLoading(false);
            }
        } else {
            // GAS未設定時はローカルのみ
            const result = saveToLocalStorage(submissions);
            if (result.success) {
                Utils.showMessage(`${submissions.length}件のシフトを提出しました`, 'success');
                await resetForm();
            }
        }
    }

    /**
     * ローカルストレージに保存
     */
    function saveToLocalStorage(submissions) {
        try {
            // 週1制約チェック（ローカル）
            for (const sub of submissions) {
                const duplicate = allShifts.find(e =>
                    e.staffId === sub.staffId && e.weekKey === sub.weekKey
                );
                if (duplicate) {
                    Utils.showMessage(`${sub.weekKey}週には既にシフトが登録されています`, 'error');
                    return { success: false };
                }
            }

            allShifts = [...allShifts, ...submissions];
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.SHIFTS, allShifts);

            console.log('保存されたシフト:', allShifts.length, '件');

            return { success: true };
        } catch (error) {
            console.error('保存エラー:', error);
            Utils.showMessage('保存に失敗しました: ' + error.message, 'error');
            return { success: false };
        }
    }

    /**
     * フォームをリセット
     */
    async function resetForm() {
        const staffId = elements.memberSelect.value;

        // 最新データを再取得
        await loadAllShifts();

        // リセット前に提出済みシフトを更新
        if (staffId) {
            const existingShifts = getStaffShifts(staffId);
            renderMyShifts(existingShifts);
            renderShiftSection(existingShifts);
        }

        weekSelections = {};
        updateSubmitButton();
        updateSelectionSummary();
    }

    /**
     * シフトデータを正規化（GASからのデータ形式を統一）
     * タイムゾーンを考慮した堅牢な日付処理
     */
    function normalizeShiftData(shift) {
        // 日付の正規化
        let dateStr = normalizeDateString(shift.date);

        // 時刻の正規化（ISO形式からHH:MM形式へ）
        let startTime = shift.startTime || '';
        let endTime = shift.endTime || '';

        // ISO形式または無効な形式の場合はCONFIGから取得
        if (!startTime || startTime.includes('T') || startTime.includes('1899') || startTime.includes('1900')) {
            const slot = CONFIG.SHIFT_SLOTS[shift.slotId];
            if (slot) {
                startTime = slot.start;
                endTime = slot.end;
            }
        }

        // slotLabelの正規化
        let slotLabel = shift.slotLabel || '';
        if (!slotLabel || slotLabel === 'undefined') {
            const slot = CONFIG.SHIFT_SLOTS[shift.slotId];
            slotLabel = slot ? slot.label : shift.slotId || '';
        }

        return {
            ...shift,
            date: dateStr,
            startTime: startTime,
            endTime: endTime,
            slotLabel: slotLabel
        };
    }

    /**
     * 日付文字列を正規化（YYYY-MM-DD形式に統一）
     * ISO形式の場合はタイムゾーンを考慮して正しい日付を抽出
     */
    function normalizeDateString(dateValue) {
        if (!dateValue || dateValue === 'undefined' || dateValue === 'null') {
            return '';
        }

        // Dateオブジェクトの場合
        if (typeof dateValue === 'object' && dateValue instanceof Date) {
            return formatDateStr(dateValue);
        }

        // 文字列の場合
        if (typeof dateValue === 'string') {
            // アポストロフィを除去
            let str = dateValue.startsWith("'") ? dateValue.substring(1) : dateValue;

            // 1899/1900年の無効な日付をスキップ
            if (str.startsWith('1899') || str.startsWith('1900')) {
                return '';
            }

            // ISO形式 (例: 2024-12-21T15:00:00.000Z) の場合
            // タイムゾーンを考慮して日本時間での日付を取得
            if (str.includes('T')) {
                try {
                    const date = new Date(str);
                    if (!isNaN(date.getTime())) {
                        // ローカルタイムゾーン（日本）での日付を取得
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }
                } catch (e) {
                    console.warn('[normalizeDateString] ISO日付のパースに失敗:', str, e);
                }
                // パース失敗時はTより前を使用
                str = str.split('T')[0];
            }

            // YYYY-MM-DD形式かチェック
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                return str;
            }

            // その他の形式
            return str;
        }

        return String(dateValue);
    }

    /**
     * 提出済みシフトを表示
     */
    function renderMyShifts(shifts) {
        console.log('[renderMyShifts] シフト数:', shifts ? shifts.length : 0, shifts);

        if (!shifts || shifts.length === 0) {
            console.log('[renderMyShifts] シフトなし - セクションを非表示');
            elements.myShiftsSection.style.display = 'none';
            return;
        }

        let html = '<ul class="my-shifts-items">';

        shifts.forEach(shift => {
            // データを正規化
            const normalized = normalizeShiftData(shift);

            // 日付が無効な場合はスキップ
            if (!normalized.date) {
                console.warn('[renderMyShifts] 無効な日付:', shift);
                return;
            }

            const dateDisplay = formatDateDisplay(normalized.date);
            const weekInfo = getWeekInfo(normalized.weekKey);
            const weekLabel = weekInfo ? weekInfo.label : '';

            html += `
                <li class="my-shift-item">
                    <div class="my-shift-info">
                        <span class="my-shift-week">${weekLabel}</span>
                        <span class="my-shift-date">${dateDisplay}</span>
                        <span class="my-shift-slot">${normalized.slotLabel}（${normalized.startTime}〜${normalized.endTime}）</span>
                    </div>
                    <button type="button"
                            class="btn btn--cancel"
                            data-shift-id="${shift.id}"
                            onclick="window.cancelShift('${shift.id}')">
                        キャンセル
                    </button>
                </li>
            `;
        });

        html += '</ul>';
        elements.myShiftsList.innerHTML = html;
        elements.myShiftsSection.style.display = 'block';
        console.log('[renderMyShifts] セクションを表示:', shifts.length, '件のシフト');
    }

    /**
     * キャンセル確認モーダルを表示
     */
    function showCancelConfirmModal(shiftId, shiftInfo) {
        // 既存のモーダルを削除
        const existingModal = document.getElementById('cancelModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'cancelModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">シフトをキャンセル</h3>
                </div>
                <div class="modal-body">
                    <p class="modal-text">以下のシフトをキャンセルしますか？</p>
                    <div class="modal-shift-info">
                        <div class="modal-shift-detail">
                            <span class="modal-shift-date">${shiftInfo.dateDisplay}</span>
                            <span class="modal-shift-slot">${shiftInfo.slotLabel}</span>
                            <span class="modal-shift-time">${shiftInfo.startTime}〜${shiftInfo.endTime}</span>
                        </div>
                    </div>
                    <p class="modal-warning">この操作は取り消せません。スプレッドシートからも削除されます。</p>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn--secondary modal-btn-cancel" onclick="window.closeCancelModal()">
                        戻る
                    </button>
                    <button type="button" class="btn btn--danger modal-btn-confirm" onclick="window.confirmCancelShift('${shiftId}')">
                        キャンセルする
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // アニメーション用
        setTimeout(() => modal.classList.add('modal-overlay--visible'), 10);

        // 背景クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.closeCancelModal();
            }
        });

        // ESCキーで閉じる
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                window.closeCancelModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    /**
     * モーダルを閉じる
     */
    window.closeCancelModal = function() {
        const modal = document.getElementById('cancelModal');
        if (modal) {
            modal.classList.remove('modal-overlay--visible');
            setTimeout(() => modal.remove(), 200);
        }
    };

    /**
     * シフトをキャンセル（グローバル関数として公開）
     */
    window.cancelShift = function(shiftId) {
        // シフト情報を取得
        const shift = allShifts.find(s => s.id === shiftId);
        if (!shift) {
            Utils.showMessage('シフトが見つかりません', 'error');
            return;
        }

        const normalized = normalizeShiftData(shift);
        const shiftInfo = {
            dateDisplay: normalized.date ? formatDateDisplay(normalized.date) : '不明',
            slotLabel: normalized.slotLabel || '不明',
            startTime: normalized.startTime || '',
            endTime: normalized.endTime || ''
        };

        showCancelConfirmModal(shiftId, shiftInfo);
    };

    /**
     * キャンセルを確定する
     */
    window.confirmCancelShift = async function(shiftId) {
        window.closeCancelModal();

        try {
            Utils.showLoading(true, 'キャンセル中...');

            // GASに削除リクエスト
            if (isConfigValid()) {
                const response = await Utils.apiRequest('deleteShift', { shiftId: shiftId });

                if (!response.success && !response.ok) {
                    // GASでの削除に失敗した場合でも続行（ローカルからは削除）
                    console.warn('GAS削除エラー:', response.error);
                }
            }

            // ローカルストレージからも削除
            allShifts = allShifts.filter(s => s.id !== shiftId);
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.SHIFTS, allShifts);

            Utils.showMessage('シフトをキャンセルしました', 'success');

            // 表示を更新
            const staffId = elements.memberSelect.value;
            if (staffId) {
                const existingShifts = getStaffShifts(staffId);
                renderMyShifts(existingShifts);
                renderShiftSection(existingShifts);
            }

        } catch (error) {
            console.error('キャンセルエラー:', error);
            Utils.showMessage('キャンセルに失敗しました: ' + error.message, 'error');
        } finally {
            Utils.showLoading(false);
        }
    };

    // 初期化
    document.addEventListener('DOMContentLoaded', init);
})();
