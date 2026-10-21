import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from './Modal';
import { useLanguage } from '../i18n';

// RU: Попросить явно подтвердить удаление записи, связанной с историей турнира.
// EN: Ask for explicit confirmation before deleting a tournament record.
// RU: Запросить подтверждение необратимого удаления записи.
// EN: Confirm an irreversible record deletion.
export default function ConfirmDialog({ title, description, onClose, onConfirm }) {
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  // RU: Выполнить удаление и закрыть диалог только после успеха.
  // EN: Perform the deletion and close only after it succeeds.
  async function confirm() {
    setWorking(true); setError('');
    try { await onConfirm(); onClose(); }
    catch (failure) { setError(failure.response?.data?.message || t('Не удалось удалить запись.')); }
    finally { setWorking(false); }
  }
  return <Modal title={title} onClose={working ? () => {} : onClose}>
    <div className="confirm-content"><span className="confirm-icon"><AlertTriangle size={21} /></span><p>{t(description)}</p>{error && <div className="notice notice-error" role="alert">{error}</div>}<div className="dialog-actions"><button className="button button-secondary" onClick={onClose} disabled={working}>{t('Отмена')}</button><button className="button button-danger" onClick={confirm} disabled={working}><Trash2 size={17} />{working ? t('Удаление…') : t('Удалить')}</button></div></div>
  </Modal>;
}
