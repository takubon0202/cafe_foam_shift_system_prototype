# 画像生成プロンプト集 - KOMOREBI COFFEE

## 1. ヒーロー背景画像

**ファイル名**: `hero-bg.jpg`
**サイズ**: 1920 x 1080px
**用途**: トップページ背景

### 生成プロンプト
```
A warm, inviting Japanese kominka (traditional farmhouse) cafe interior with natural wooden beams, morning sunlight streaming through large windows, creating dappled light patterns on wooden tables. Shallow depth of field focusing on a steaming ceramic coffee cup in the foreground. Muted earth tones, cream and brown color palette. Shot on film, slightly desaturated. No people visible.
```

### ネガティブプロンプト
```
purple tones, neon colors, modern minimalist, sterile, artificial lighting, stock photo style, overly saturated, digital looking, text, logos, watermarks
```

---

## 2. About セクション画像

**ファイル名**: `about-image.jpg`
**サイズ**: 800 x 600px
**用途**: 私たちについてセクション

### 生成プロンプト
```
Hands of a Japanese barista carefully pouring water from a copper kettle over a pour-over coffee dripper. Warm morning light from a window. Wooden counter surface with coffee beans scattered. Focus on the hands and brewing process. Authentic, documentary style photography. Warm brown and cream tones. Natural, not overly polished look.
```

### ネガティブプロンプト
```
stock photo smile, perfect skin, artificial lighting, purple or neon colors, sterile environment, corporate looking, overly staged
```

---

## 3. メニュー用画像（オプション）

### 3-1. コーヒー
**ファイル名**: `menu-coffee.jpg`
**サイズ**: 600 x 400px

```
A simple ceramic cup of black coffee on a wooden saucer, steam rising gently. Natural window light from the side. Rustic wooden table surface. Minimalist composition. Warm earth tones. Shot from 45-degree angle. Slightly moody, not overly bright.
```

### 3-2. スイーツ
**ファイル名**: `menu-sweets.jpg`
**サイズ**: 600 x 400px

```
A rustic homemade fruit tart with seasonal berries on a simple white ceramic plate. Wooden table background. Natural daylight. Imperfect, handmade look. Warm color palette with natural fruit colors. Fork visible at the edge. Not overly styled or perfect.
```

---

## 画像最適化ガイドライン

### フォーマット
- **ヒーロー背景**: WebP (JPEG fallback), 品質80%
- **その他画像**: WebP (JPEG fallback), 品質85%

### 圧縮
- TinyPNG または Squoosh で圧縮
- 目標ファイルサイズ:
  - ヒーロー: 200KB以下
  - その他: 100KB以下

### レスポンシブ対応
```html
<picture>
  <source srcset="image-800w.webp 800w, image-1200w.webp 1200w, image-1920w.webp 1920w" type="image/webp">
  <img src="image-1200w.jpg" alt="説明文" loading="lazy">
</picture>
```

---

## 代替案（ストックフォト検索キーワード）

### Unsplash / Pexels 検索用
- `japanese cafe interior wood`
- `pour over coffee brewing hands`
- `rustic coffee cup morning light`
- `homemade tart natural light`
- `kominka cafe atmosphere`

### 注意点
- 明らかにAI生成と分かる画像は避ける
- 過度に完璧な構図は避ける
- 自然光を活かした温かみのある写真を選ぶ
- 紫・ネオン系の色味が入った写真は避ける
