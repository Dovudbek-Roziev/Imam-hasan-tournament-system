import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../i18n';

// RU: Доступный диалог с закрытием по Escape и блокировкой прокрутки фона.
// EN: Accessible dialog with Escape dismissal and background scroll lock.
// RU: Обеспечить общий модальный контейнер с закрытием по Escape и фону.
// EN: Provide a shared modal shell with Escape and backdrop dismissal.
export default function Modal({ title, onClose, children, wide = false }) {
  const { t } = useLanguage();
  useEffect(() => {
    const dismiss = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', dismiss);
    document.body.classList.add('dialog-open');
    return () => {
      window.removeEventListener('keydown', dismiss);
      document.body.classList.remove('dialog-open');
    };
  }, [onClose]);

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`dialog ${wide ? 'dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <header className="dialog-header"><h2 id="dialog-title">{t(title)}</h2><button className="icon-button" type="button" onClick={onClose} aria-label={t('Закрыть')}><X size={20} /></button></header>
      {children}
    </section>
  </div>;
}
