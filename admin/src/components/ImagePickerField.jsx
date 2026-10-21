import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { imageUrl } from '../api/media';
import { useLanguage } from '../i18n';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// RU: Выбрать логотип устройства, проверить его и показать предварительный просмотр.
// EN: Select a device image, validate it, and show a preview.
export default function ImagePickerField({ value, onChange }) {
  const { t } = useLanguage();
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const previewUrl = useRef('');
  const isFile = typeof File !== 'undefined' && value instanceof File;

  useEffect(() => {
    return () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); };
  }, []);

  // RU: Не принимать неподдерживаемые или слишком большие файлы.
  // EN: Reject unsupported files and files that exceed the upload limit.
  function selectFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setError('');
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { setError(t('Выберите изображение JPEG, PNG или WebP.')); return; }
    if (file.size > MAX_IMAGE_SIZE) { setError(t('Изображение должно быть не больше 2 МБ.')); return; }
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = URL.createObjectURL(file);
    setPreview(previewUrl.current);
    onChange(file);
  }

  const previewSource = isFile ? preview : value ? imageUrl(value) : '';

  return <div className="image-picker">
    <span className="image-preview">{previewSource ? <img src={previewSource} alt={t('Предварительный просмотр логотипа')} /> : <ImagePlus size={24} />}</span>
    <div className="image-picker-actions">
      <label className="button button-secondary image-picker-button"><ImagePlus size={16} />{t('Выбрать из галереи')}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} />
      </label>
      {value && <button className="button button-quiet image-remove" type="button" onClick={() => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); previewUrl.current = ''; setPreview(''); onChange(''); setError(''); }}><Trash2 size={15} />{t('Убрать')}</button>}
      <small>{t('JPEG, PNG или WebP · до 2 МБ')}</small>
      {error && <small className="image-picker-error" role="alert">{error}</small>}
    </div>
  </div>;
}
