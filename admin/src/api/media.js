import api from './axios';

// RU: Преобразовать сохранённый адрес изображения в URL доступного API.
// EN: Resolve a stored image path to a URL served by the configured API.
export function imageUrl(path) {
  if (!path) return '';
  if (/^(?:https?:)?\/\//i.test(path)) return path;
  const base = new URL(api.defaults.baseURL || '/', window.location.origin);
  return new URL(path, base).toString();
}

// RU: Отправить выбранное изображение администратором в защищённое хранилище.
// EN: Upload an administrator-selected image to protected media storage.
export async function uploadImage(file) {
  const response = await api.post('/media', file, { headers: { 'Content-Type': file.type } });
  return response.data.data.path;
}

// RU: Удалить собственное изображение только после успешного сохранения команды.
// EN: Delete an owned image only after its team update succeeds.
export async function deleteImage(path) {
  const match = /^\/api\/media\/([a-f\d]{24})$/i.exec(path || '');
  if (match) await api.delete(`/media/${match[1]}`);
}
