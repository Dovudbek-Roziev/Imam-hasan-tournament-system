import { useState } from 'react';
import { Save } from 'lucide-react';
import Modal from './Modal';
import { useLanguage } from '../i18n';
import { createCustomFieldUpdater } from '../utils/matchForm';

// RU: Поддержать текстовые поля, выборы, числа и флажки в форме сущности.
// EN: Render text, select, number, and checkbox fields in an entity form.
// RU: Отобразить диалог создания или редактирования сущности с общей валидацией.
// EN: Render a shared, validated dialog for creating or editing an entity.
export default function EntityDialog({ title, fields, initial, onClose, onSubmit, submitLabel = 'Сохранить' }) {
  const { t } = useLanguage();
  const [values, setValues] = useState(() => ({ ...initial }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // RU: Обновить значение поля и вызвать его дополнительную бизнес-логику.
  // EN: Update a field value and run its optional business callback.
  function update(name, value, field) { setValues((current) => ({ ...current, [name]: value })); field?.onChange?.(value, (fieldName, fieldValue) => setValues((current) => ({ ...current, [fieldName]: fieldValue }))); }

  // RU: Проверить данные формы и передать их обработчику сущности.
  // EN: Validate the form and pass its values to the entity handler.
  async function submit(event) {
    event.preventDefault(); setError('');
    const missingRequiredField = fields.some((field) => field.type !== 'custom' && field.required &&
      (values[field.name] === undefined || values[field.name] === null || (typeof values[field.name] === 'string' && !values[field.name].trim())));
    if (missingRequiredField) { setError(t('Заполните обязательные поля формы.')); return; }
    setSaving(true);
    try { await onSubmit(values); onClose(); }
    catch (failure) { setError(failure.response?.data?.message || t('Не удалось сохранить данные.')); }
    finally { setSaving(false); }
  }

  return <Modal title={title} onClose={saving ? () => {} : onClose} wide={fields.some((field) => field.type === 'custom')}>
    <form className="form-stack" onSubmit={submit} noValidate>
      {fields.map((field) => field.type === 'custom' ? <div className="custom-field" key={field.name}>{field.render({ values, update: createCustomFieldUpdater(field.name, (name, value) => update(name, value, field)) })}</div> : <label className={field.type === 'checkbox' ? 'checkbox-field' : 'field'} key={field.name}>
        {field.type !== 'checkbox' && <span>{t(field.label)}{field.required && <em> *</em>}</span>}
        {field.type === 'textarea' ? <textarea required={field.required} disabled={typeof field.disabled === 'function' ? field.disabled(values) : field.disabled} maxLength={field.maxLength} rows={field.rows || 4} value={values[field.name] ?? ''} placeholder={t(field.placeholder || '')} onChange={(event) => update(field.name, event.target.value, field)} />
          : field.type === 'select' ? <select required={field.required} disabled={typeof field.disabled === 'function' ? field.disabled(values) : field.disabled} value={values[field.name] ?? ''} onChange={(event) => update(field.name, event.target.value)}><option value="" disabled>{t(field.placeholder || 'Выберите…')}</option>{(field.optionsFor?.(values) || field.options).map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}</select>
            : field.type === 'checkbox' ? <><input type="checkbox" disabled={typeof field.disabled === 'function' ? field.disabled(values) : field.disabled} checked={Boolean(values[field.name])} onChange={(event) => update(field.name, event.target.checked, field)} /><span>{t(field.label)}</span></>
              : <input required={field.required} disabled={typeof field.disabled === 'function' ? field.disabled(values) : field.disabled} type={field.type || 'text'} min={field.min} max={field.max} maxLength={field.maxLength} step={field.step} value={values[field.name] ?? ''} placeholder={t(field.placeholder || '')} onChange={(event) => update(field.name, field.type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value, field)} />}
      </label>)}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button className="button button-secondary" type="button" disabled={saving} onClick={onClose}>{t('Отмена')}</button><button className="button button-primary" type="submit" disabled={saving}><Save size={17} />{saving ? t('Сохранение…') : t(submitLabel)}</button></div>
    </form>
  </Modal>;
}
