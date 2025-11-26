import { I18n } from 'i18n-js';
import ja from './locales/ja';
import en from './locales/en';

const i18n = new I18n({
  ja,
  en,
});

// デフォルトは日本語
i18n.locale = 'ja';
i18n.enableFallback = true;
i18n.defaultLocale = 'ja';

export default i18n;
