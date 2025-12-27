# 共創カフェ 統合シフト・勤怠管理システム

山形大学 共創カフェのプレオープン期間（2026年1月）に使用するシフト提出・打刻・管理システムです。

## 目次

1. [システム概要](#システム概要)
2. [ファイル構造](#ファイル構造)
3. [機能一覧](#機能一覧)
4. [セットアップ手順](#セットアップ手順)
5. [システム設定](#システム設定)
6. [サブエージェント・スキル](#サブエージェントスキル)
7. [更新・メンテナンス手順](#更新メンテナンス手順)
8. [トラブルシューティング](#トラブルシューティング)
9. [技術仕様](#技術仕様)

---

## システム概要

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    ブラウザ（クライアント）                  │
├─────────────────────────────────────────────────────────────┤
│  index.html   │  clock.html   │  calendar.html  │  admin.html │
│  (シフト提出)  │    (打刻)     │   (カレンダー)   │   (管理)    │
└───────┬───────────────┬───────────────┬───────────────┬─────┘
        │               │               │               │
        └───────────────┴───────────────┴───────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  JavaScript (js/)     │
                    │  config.js / utils.js │
                    │  submit.js / clock.js │
                    │  calendar.js / admin.js│
                    └───────────┬───────────┘
                                │ JSON API
                    ┌───────────▼───────────┐
                    │  Google Apps Script   │
                    │    (gas/Code.gs)      │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Google スプレッドシート │
                    │  - シフト提出シート    │
                    │  - 打刻履歴シート      │
                    └───────────────────────┘
```

### 主な特徴

- **週1制約**: 1週間に1つだけシフト登録可能（90分/枠）
- **シフト枠制**: 午前A/B、午後A/Bの4枠制
- **遅刻・早退自動判定**: 打刻時に自動でステータスを記録
- **GAS連携**: Google スプレッドシートをデータベースとして使用
- **レスポンシブ対応**: スマホ・タブレット・PCに対応

---

## ファイル構造

```
/
├── README.md                      # このファイル（システム説明書）
├── CLAUDE.md                      # Claude Code用プロジェクト設定
├── .claude/
│   └── commands/                  # サブエージェントスキル
│       ├── workflow.md            # ワークフロー管理 v5.0
│       ├── design.md              # デザインエージェント
│       ├── coding.md              # コーディングエージェント v5.0
│       ├── backend.md             # バックエンドエージェント v2.0
│       ├── gas-setup.md           # GASセットアップガイド
│       ├── image-gen.md           # 画像生成エージェント
│       ├── debug.md               # デバッグエージェント v6.0
│       ├── responsive.md          # レスポンシブ対応エージェント v1.0
│       ├── persona.md             # ペルソナ評価エージェント
│       └── evaluator.md           # 評価者エージェント v3.0
│
├── cafe-unified-system/           # メインシステム（統合版）
│   ├── index.html                 # シフト提出画面
│   ├── clock.html                 # 打刻画面
│   ├── calendar.html              # カレンダー画面
│   ├── admin.html                 # 管理画面
│   ├── SETUP.md                   # クイックセットアップガイド
│   ├── .gitignore
│   ├── css/
│   │   └── style.css              # 統一スタイルシート（モバイルファースト）
│   ├── js/
│   │   ├── config.js              # 設定ファイル（GAS URL、スタッフリスト等）
│   │   ├── utils.js               # ユーティリティ関数
│   │   ├── submit.js              # シフト提出ロジック
│   │   ├── clock.js               # 打刻ロジック
│   │   ├── calendar.js            # カレンダー表示ロジック
│   │   └── admin.js               # 管理画面ロジック
│   └── gas/
│       └── Code.gs                # Google Apps Script APIコード
│
├── index.html                     # ルートのシフト提出（GitHub Pages用）
├── clock.html                     # ルートの打刻
├── calendar.html                  # ルートのカレンダー
├── admin.html                     # ルートの管理画面
│
├── src/                           # その他ソースコード
│   ├── index.html
│   ├── css/
│   │   ├── variables.css
│   │   ├── reset.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   └── responsive.css
│   ├── js/
│   │   └── main.js
│   └── assets/
│       └── images/
│
└── docs/                          # ドキュメント
    ├── image-prompts.md
    └── evaluation-report.md
```

---

## 機能一覧

### 1. シフト提出画面（index.html）

| 機能 | 説明 |
|------|------|
| スタッフ選択 | 検索フィルター付きドロップダウン |
| 週別シフト選択 | 3週間分を表示、週1枠のみ選択可能 |
| 他スタッフ状況表示 | 各枠の充足状況をバッジで表示（○/△/●） |
| シフト提出 | GAS + ローカルストレージに保存 |
| シフトキャンセル | モーダル確認後にキャンセル可能 |
| オンボーディング | 使い方ガイドを常時表示 |

### 2. 打刻画面（clock.html）

| 機能 | 説明 |
|------|------|
| リアルタイム時刻表示 | 1秒ごとに更新 |
| 本日のシフト表示 | 選択スタッフの本日シフトを表示 |
| シフト枠選択 | 打刻対象の枠を選択 |
| 出勤・退勤ボタン | 打刻を記録 |
| 遅刻・早退判定 | 開始5分後→遅刻、終了15分前→早退 |
| 二重打刻防止 | 同じ枠で重複打刻を防止 |
| 打刻履歴表示 | 本日の打刻履歴を表示 |

### 3. カレンダー画面（calendar.html）

| 機能 | 説明 |
|------|------|
| 月別カレンダー表示 | 営業日のみ表示 |
| スタッフフィルター | 特定スタッフのシフトをハイライト |
| 枠充足状況 | 色分けで人員状況を表示 |
| シフト統計 | 総枠数、申請済み、人員不足、自分の枠 |
| 日付別詳細 | クリックで詳細表示 |

### 4. 管理画面（admin.html）

| タブ | 機能 |
|------|------|
| 勤怠一覧 | 日付・スタッフ別フィルター、CSV出力 |
| 週別確認 | 週1制約違反の検出 |
| シフト管理 | 日付別シフト状況確認 |
| スタッフ | 登録スタッフ一覧・統計 |
| データ管理 | JSONエクスポート、データクリア、旧システム移行 |

---

## セットアップ手順

### ステップ1: Google スプレッドシート作成（5分）

1. **新規スプレッドシート作成**
   - https://sheets.google.com にアクセス
   - 「+ 空白」をクリック
   - ファイル名: 「共創カフェ シフト管理」

2. **Apps Script を開く**
   - メニュー「拡張機能」→「Apps Script」
   - プロジェクト名を設定（例: 「CafeAPI」）

3. **コードを貼り付け**
   - `cafe-unified-system/gas/Code.gs` の内容をコピー
   - エディタに貼り付け
   - 保存（Ctrl+S）

4. **初期化を実行**
   - ドロップダウンで `initializeSheets` を選択
   - 「実行」をクリック
   - 権限を許可（「詳細」→「プロジェクト名に移動」→「許可」）

5. **シート確認**
   - スプレッドシートに「シフト提出」「打刻履歴」シートが作成されていることを確認

### ステップ2: ウェブアプリとしてデプロイ（3分）

1. **デプロイメニュー**
   - 右上「デプロイ」→「新しいデプロイ」

2. **設定**
   - 種類: ウェブアプリ
   - 説明: 「共創カフェAPI v1.0」
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**

3. **デプロイ実行**
   - 「デプロイ」をクリック
   - 表示された **ウェブアプリURL** をコピー

### ステップ3: config.js にURL設定（1分）

`cafe-unified-system/js/config.js` を編集:

```javascript
GAS_URL: {
    production: 'https://script.google.com/macros/s/XXXXX/exec',
    development: 'https://script.google.com/macros/s/XXXXX/exec'
},
```

### ステップ4: GitHub Pages で公開（5分）

1. **GitHubリポジトリ作成**
   - リポジトリ名: `cafe-shift-system`

2. **ファイルをアップロード**
   - ルートのHTMLファイル、cafe-unified-systemフォルダをアップロード

3. **Pages設定**
   - Settings → Pages → Source: main branch
   - 公開URL: `https://ユーザー名.github.io/cafe-shift-system/`

### 動作確認

ブラウザで以下にアクセス:
```
https://script.google.com/macros/s/XXXXX/exec?action=status
```

正常なら以下が表示:
```json
{"success":true,"message":"Cafe Unified System API","version":"1.0"}
```

---

## システム設定

### config.js 主要設定

```javascript
const CONFIG = {
    // API設定
    GAS_URL: { ... },              // GASのURL
    ENV: 'development',            // 環境（production/development）
    DEMO_MODE: false,              // デモモード（trueで本日を営業日に）
    ADMIN_PASSWORD: 'gakkan2025',  // 管理画面パスワード

    // 営業期間
    OPERATION_PERIOD: {
        start: '2026-01-14',       // 開始日
        end: '2026-01-30'          // 終了日
    },

    // シフト枠定義（90分単位）
    SHIFT_SLOTS: {
        AM_A: { label: '午前A', start: '10:00', end: '11:30' },
        AM_B: { label: '午前B', start: '11:00', end: '12:30' },
        PM_A: { label: '午後A', start: '15:00', end: '16:30' },
        PM_B: { label: '午後B', start: '15:30', end: '17:00' }
    },

    // 週1制約
    WEEKLY_SHIFT_LIMIT: 1,

    // 各枠の必要人数
    REQUIRED_STAFF_PER_SLOT: 3,

    // 打刻許容時間
    PUNCH_TOLERANCE: {
        early: 10,                 // 開始10分前から打刻可能
        late: 30                   // 開始30分後まで遅刻として記録
    },

    // スタッフリスト（32名）
    STAFF_LIST: [
        { id: '25011003', name: '小畑 璃海', role: 'staff' },
        { id: '25011754', name: '山﨑 琢己', role: 'admin' },
        // ... 他30名
    ],

    // 役割定義
    ROLES: {
        admin: { label: '管理者', color: '#DC2626' },
        leader: { label: 'リーダー', color: '#FF9800' },
        staff: { label: 'スタッフ', color: '#16a34a' }
    }
};
```

### 営業日設定

`OPERATION_DATES` 配列で営業日を定義:

```javascript
OPERATION_DATES: [
    { date: '2026-01-14', weekday: 3, hasMorning: false, hasAfternoon: true, isSpecial: true, label: 'レセプション' },
    { date: '2026-01-15', weekday: 4, hasMorning: false, hasAfternoon: true },
    { date: '2026-01-16', weekday: 5, hasMorning: true, hasAfternoon: true },
    // ...
]
```

- **hasMorning**: 午前営業（true: AM_A, AM_B枠あり）
- **hasAfternoon**: 午後営業（true: PM_A, PM_B枠あり）
- **isSpecial**: 特別日（レセプション等）

---

## サブエージェント・スキル

Claude Codeで使用できる開発支援スキルです。

### スキル一覧

| コマンド | バージョン | 説明 |
|---------|-----------|------|
| `/workflow` | v5.0 | 開発ワークフロー全体を統括 |
| `/design` | - | UI/UXデザイン設計 |
| `/coding` | v5.0 | フロントエンド実装 |
| `/backend` | v2.0 | GAS・サーバーサイド実装 |
| `/gas-setup` | - | GASセットアップガイド |
| `/image-gen` | - | 画像生成プロンプト作成 |
| `/debug` | v6.0 | バグ修正・動作確認 |
| `/responsive` | v1.0 | レスポンシブ・クロスブラウザ対応 |
| `/persona` | - | ペルソナ視点評価 |
| `/evaluator` | v3.0 | 超厳格品質評価 |
| `/ux-tester` | v1.0 | 初回ユーザー視点評価 |

### 開発ワークフロー

```
[要件定義] → [デザイン] → [コーディング] → [バックエンド]
    → [GASセットアップ] → [画像生成] → [デバッグ]
    → [ペルソナ評価] → [評価者] → [改善ループ]
```

### 各スキルの詳細

#### `/workflow` - ワークフロー管理エージェント v5.0

全体の開発フローを統括:
1. 現状把握（既存ファイル確認）
2. 要件定義
3. デザインフェーズ（`/design`呼び出し）
4. 実装フェーズ（`/coding`, `/backend`呼び出し）
5. 品質保証フェーズ（`/debug`, `/persona`, `/evaluator`呼び出し）
6. 改善ループ（各項目7点以上になるまで）

#### `/debug` - デバッグエージェント v6.0

確認項目:
- 全機能の動作確認
- GAS連携テスト
- レスポンシブ確認（320px〜1920px）
- パフォーマンス（Lighthouse）
- アクセシビリティ
- セキュリティ

特徴:
- 問題を発見したら即座に修正
- console.logでデバッグ情報を出力
- データフローを追跡（GAS→フロント→ローカルストレージ）

#### `/responsive` - レスポンシブ対応エージェント v1.0

対応プラットフォーム:
- iOS Safari (iOS 14+)
- Android Chrome (Android 10+)
- iPad OS Safari (iPadOS 14+)
- デスクトップ各種ブラウザ

ブレークポイント:
```css
/* 320px〜479px: 小型スマホ（デフォルト） */
@media (min-width: 480px) { }  /* 大型スマホ */
@media (min-width: 768px) { }  /* タブレット縦 */
@media (min-width: 1024px) { } /* タブレット横 */
@media (min-width: 1280px) { } /* デスクトップ */
```

#### `/evaluator` - 評価者エージェント v3.0

評価カテゴリ（各100点、合計400点満点）:
1. 機能完成度
2. UI/UXデザイン
3. コード品質
4. ユーザビリティ

合格基準: 各カテゴリ70点以上、合計280点以上

---

## 更新・メンテナンス手順

### GASコード更新

1. **Apps Script を開く**
   - スプレッドシート → 拡張機能 → Apps Script

2. **コードを更新**
   - 変更を加えて保存

3. **新バージョンをデプロイ**
   - 「デプロイ」→「デプロイを管理」
   - 編集アイコンをクリック
   - バージョン: 「新しいバージョン」
   - 「デプロイ」

**重要**: デプロイURLは変わりません。新バージョンをデプロイするだけで更新されます。

### スタッフリスト更新

`cafe-unified-system/js/config.js` の `STAFF_LIST` を編集:

```javascript
STAFF_LIST: [
    { id: '学生番号', name: '名前', role: 'staff' },
    // role: 'admin'（管理者）, 'leader'（リーダー）, 'staff'（スタッフ）
]
```

### 営業日追加・変更

1. **OPERATION_DATES を更新**
```javascript
OPERATION_DATES: [
    { date: '2026-02-01', weekday: 1, hasMorning: false, hasAfternoon: true },
    // 新しい営業日を追加
]
```

2. **DATE_SLOTS を更新**
```javascript
DATE_SLOTS: {
    '2026-02-01': ['PM_A', 'PM_B'],  // 午後のみ
    // または ['AM_A', 'AM_B', 'PM_A', 'PM_B'] で午前+午後
}
```

3. **WEEKS を更新**
```javascript
WEEKS: [
    {
        weekKey: '2026-01-26',
        label: '1/26週',
        dates: ['2026-01-26', '2026-01-27', ...]
    },
    // 新しい週を追加
]
```

### 管理画面パスワード変更

`config.js` を編集:
```javascript
ADMIN_PASSWORD: '新しいパスワード',
```

### GitHub Pagesへのデプロイ

```bash
# 変更をコミット
git add .
git commit -m "変更内容の説明"

# プッシュ
git push origin main
```

---

## トラブルシューティング

### よくある問題

#### データが保存されない

1. **config.js のURL確認**
   - GAS_URLが正しく設定されているか
   - 「https://」で始まっているか

2. **デプロイ設定確認**
   - アクセスできるユーザー: **全員**になっているか

3. **コンソールでエラー確認**
   - F12でDevTools開く
   - Consoleタブでエラーを確認

#### 「このアプリは確認されていません」と表示

- 「詳細」→「（安全ではないページ）に移動」で進む
- 自分のスクリプトなので問題なし

#### シフトが表示されない

1. **GAS APIテスト**
   ```
   https://script.google.com/macros/s/XXXXX/exec?action=getAllShifts
   ```

2. **ローカルストレージ確認**
   - DevTools → Application → Local Storage
   - `cafe_unified_shifts` キーを確認

#### 週1制約で登録できない

- 同じ週に既にシフトが登録されている
- 既存のシフトをキャンセルしてから再登録

#### CORSエラー

- GASは自動的にCORS対応済み
- フロントエンドのfetch設定を確認
- mode: 'cors' が正しく設定されているか

---

## 技術仕様

### GAS API エンドポイント

#### POST リクエスト

| アクション | 説明 | パラメータ |
|-----------|------|-----------|
| submitShifts | シフト提出（週1制約チェック） | submissions[] |
| deleteShift | シフト削除（ID指定） | shiftId |
| punch | 打刻記録 | staffId, date, slotId, type, time |
| getShifts | シフト取得 | staffId?, date?, weekKey? |
| getClockRecords | 打刻取得 | staffId?, date?, slotId? |
| getAllShifts | 全シフト取得 | - |
| getAllClockRecords | 全打刻取得 | - |
| checkViolations | 週1違反検出 | - |
| getStats | 統計情報取得 | - |

#### レスポンス形式

```json
{
    "success": true,
    "shifts": [...],
    "message": "処理完了"
}
```

### データベーススキーマ

#### シフト提出シート

| カラム | 説明 |
|--------|------|
| ID | ユニークID |
| スタッフID | 学生番号 |
| スタッフ名 | 名前 |
| 週キー | 週の識別子（月曜日の日付） |
| 日付 | YYYY-MM-DD形式 |
| シフト枠ID | AM_A, AM_B, PM_A, PM_B |
| シフト枠名 | 午前A, 午前B, 午後A, 午後B |
| 開始時刻 | HH:MM形式 |
| 終了時刻 | HH:MM形式 |
| 提出日時 | ISO形式 |

#### 打刻履歴シート

| カラム | 説明 |
|--------|------|
| ID | ユニークID |
| スタッフID | 学生番号 |
| スタッフ名 | 名前 |
| 日付 | YYYY-MM-DD形式 |
| シフト枠ID | AM_A, AM_B, PM_A, PM_B |
| シフト枠名 | 午前A, 午前B, 午後A, 午後B |
| 種別 | IN（出勤）/ OUT（退勤） |
| 時刻 | HH:MM:SS形式 |
| 状態 | normal / late / early_leave |
| タイムスタンプ | ISO形式 |

### ローカルストレージキー

| キー | 説明 |
|------|------|
| cafe_unified_last_staff_id | 最後に選択したスタッフID |
| cafe_unified_auth | 管理画面認証トークン |
| cafe_unified_shifts | シフトデータキャッシュ |
| cafe_unified_clock | 打刻データキャッシュ |

### CSSカラースキーム

| 用途 | カラーコード |
|------|-------------|
| プライマリ（緑） | #2E7D32 |
| セカンダリ（グレー） | #546E7A |
| 出勤（青） | #1976D2 |
| 退勤（オレンジ） | #E64A19 |
| エラー（赤） | #E53935 |
| 成功（緑） | #43A047 |

### レスポンシブブレークポイント

| サイズ | 対象デバイス |
|--------|-------------|
| 〜359px | 小型スマホ |
| 360px〜479px | 標準スマホ |
| 480px〜767px | 大型スマホ |
| 768px〜1023px | タブレット縦 |
| 1024px〜 | タブレット横・PC |

---

## ライセンス・クレジット

- 開発: 山形大学 共創カフェ
- 技術支援: Claude Code

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2024-12-27 | 1.0 | 初版リリース |
| 2024-12-27 | 1.1 | UX改善（検索機能、オンボーディング、キャンセル機能） |
| 2024-12-27 | 1.2 | 打刻許容時間を10分前に変更、管理者役職追加 |
