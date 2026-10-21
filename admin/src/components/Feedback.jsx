import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '../i18n';

// RU: Показать результат операции и убрать сообщение через несколько секунд.
// EN: Show operation feedback and dismiss it after a short delay.
// RU: Показать доступное временное уведомление об успешной операции.
// EN: Show an accessible transient success notification.
export default function Feedback({ message, onDismiss }) {
  const { t } = useLanguage();
  useEffect(() => { if (message) { const timer = window.setTimeout(onDismiss, 4000); return () => window.clearTimeout(timer); } }, [message, onDismiss]);
  if (!message) return null;
  return <div className="notice notice-success toast-message" role="status"><CheckCircle2 size={17} /><span>{message}</span><button className="text-button" onClick={onDismiss} aria-label={t('Закрыть уведомление')}><X size={17} /></button></div>;
}
