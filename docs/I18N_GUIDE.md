# 国際化(i18n)実装ガイド

## 概要

`i18n-js` を使用してアプリの文言を日本語・英語で管理します。

## 基本的な使い方

### 1. インポート

```typescript
import i18n from '@/app/core/i18n';
```

### 2. 翻訳の取得

```typescript
// 単純な文字列
const title = i18n.t('quest.title'); // "Quest"

// プレースホルダー付き
const message = i18n.t('validation.bookLimitReached', {
  limit: 3,
  plan: 'Free Plan'
});
```

### 3. 言語の切り替え

```typescript
// 日本語に切り替え
i18n.locale = 'ja';

// 英語に切り替え
i18n.locale = 'en';

// デバイスの言語を使用
import * as Localization from 'expo-localization';
i18n.locale = Localization.locale.startsWith('ja') ? 'ja' : 'en';
```

## コンポーネントでの使用例

### Before（ハードコード）

```typescript
<Text style={styles.title}>Quest</Text>
<Text style={styles.subtitle}>今日のクエスト</Text>
```

### After（i18n対応）

```typescript
import i18n from '@/app/core/i18n';

<Text style={styles.title}>{i18n.t('quest.title')}</Text>
<Text style={styles.subtitle}>{i18n.t('quest.subtitle')}</Text>
```

## 新しい翻訳の追加

### 1. 日本語（ja.ts）

```typescript
export default {
  newFeature: {
    title: '新機能',
    description: 'この機能は新しく追加されました',
  },
};
```

### 2. 英語（en.ts）

```typescript
export default {
  newFeature: {
    title: 'New Feature',
    description: 'This feature is newly added',
  },
};
```

### 3. 使用

```typescript
i18n.t('newFeature.title'); // "新機能" or "New Feature"
```

## 動的な文言

### プレースホルダーの使用

```typescript
// 翻訳ファイル
{
  welcome: 'こんにちは、{{name}}さん',
  itemCount: '{{count}}個のアイテム',
}

// コンポーネント
i18n.t('welcome', { name: 'ユーザー' }); // "こんにちは、ユーザーさん"
i18n.t('itemCount', { count: 5 }); // "5個のアイテム"
```

### 複数形の扱い

```typescript
// 翻訳ファイル
{
  cards: {
    zero: 'カードがありません',
    one: '{{count}}枚のカード',
    other: '{{count}}枚のカード',
  },
}

// コンポーネント
i18n.t('cards', { count: 0 }); // "カードがありません"
i18n.t('cards', { count: 1 }); // "1枚のカード"
i18n.t('cards', { count: 5 }); // "5枚のカード"
```

## 設定画面での言語切り替え

```typescript
// app/(tabs)/settings.tsx
import i18n from '@/app/core/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const [language, setLanguage] = useState<'ja' | 'en'>('ja');

useEffect(() => {
  loadLanguage();
}, []);

const loadLanguage = async () => {
  const savedLang = await AsyncStorage.getItem('app_language');
  if (savedLang) {
    i18n.locale = savedLang;
    setLanguage(savedLang as 'ja' | 'en');
  }
};

const changeLanguage = async (lang: 'ja' | 'en') => {
  i18n.locale = lang;
  setLanguage(lang);
  await AsyncStorage.setItem('app_language', lang);
};

// UI
<TouchableOpacity onPress={() => changeLanguage('ja')}>
  <Text>日本語</Text>
</TouchableOpacity>
<TouchableOpacity onPress={() => changeLanguage('en')}>
  <Text>English</Text>
</TouchableOpacity>
```

## ベストプラクティス

### 1. キー名は階層的に

```typescript
// Good
quest.title
quest.subtitle
quest.noDueCards

// Bad
questTitle
questSubtitle
questNoDueCards
```

### 2. 共通の文言は common に

```typescript
common: {
  save: '保存',
  cancel: 'キャンセル',
  delete: '削除',
}
```

### 3. 長い文章は改行を含める

```typescript
description: '長い説明文は\n改行を使って\n読みやすくします'
```

## 移行手順

### 1. 既存のハードコードされた文言を洗い出す

```bash
# "〜" で囲まれた文字列を検索
grep -r "['\"]\p{Hiragana}" app/
```

### 2. 翻訳ファイルに追加

### 3. コンポーネントを i18n.t() に置き換え

### 4. テスト

```typescript
// 言語を切り替えてUIを確認
i18n.locale = 'en';
// スクリーンショットを撮る
i18n.locale = 'ja';
```

## 注意事項

- モーダルやアラートの文言も忘れずに翻訳
- エラーメッセージも多言語対応
- 日付フォーマットは `Intl.DateTimeFormat` を使用
- 数値フォーマットも `Intl.NumberFormat` を使用
