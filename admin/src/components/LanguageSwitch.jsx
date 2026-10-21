import { useLanguage } from '../i18n';

// RU: Переключить интерфейс панели между русским и кыргызским языками.
// EN: Switch the admin interface between Russian and Kyrgyz.
export default function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();
  return <label className="language-switch"><span className="sr-only">{t('Язык интерфейса')}</span><select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('Язык интерфейса')}><option value="ru">RU</option><option value="ky">KY</option></select></label>;
}
