import { useCallback, useState } from 'react';
import { CalendarDays, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import api from '../api/axios';
import CollectionPage from '../components/CollectionPage';
import EntityDialog from '../components/EntityDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import Feedback from '../components/Feedback';
import { useCollection } from '../hooks/useCollection';
import { useLanguage } from '../i18n';

// RU: Управлять публикациями и объявлениями турнира.
// EN: Manage tournament news and announcements.
export default function News() {
  const { t, locale } = useLanguage();
  const list = useCollection('news', { sort: '-date' });
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [notice, setNotice] = useState('');
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeRemove = useCallback(() => setRemoving(null), []);

  // RU: Создать публикацию или сохранить изменения выбранной новости.
  // EN: Create a post or save edits to the selected news item.
  async function save(values) {
    const body = { title: values.title.trim(), content: values.content.trim(), titleKy: values.titleKy.trim(), contentKy: values.contentKy.trim() };
    if (editing?._id) await api.put(`/news/${editing._id}`, body); else await api.post('/news', body);
    setNotice(editing?._id ? t('Новость обновлена.') : t('Новость опубликована.'));
    list.refresh();
  }
  // RU: Удалить выбранную публикацию и обновить список.
  // EN: Delete the selected post and refresh the list.
  async function remove() { await api.delete(`/news/${removing._id}`); setNotice(t('Новость удалена.')); list.refresh(); }
  const fields = [{ name: 'title', label: 'Заголовок (русский)', required: true, maxLength: 200, placeholder: 'Коротко о главном' },
    { name: 'content', label: 'Текст новости (русский)', type: 'textarea', required: true, rows: 5, maxLength: 20000, placeholder: 'Введите текст объявления…' },
    { name: 'titleKy', label: 'Заголовок (кыргызский)', maxLength: 200, placeholder: 'Кыргызча аталышы (необязательно)' },
    { name: 'contentKy', label: 'Текст новости (кыргызский)', type: 'textarea', rows: 5, maxLength: 20000, placeholder: 'Кыргызча текст (необязательно)' }];
  const displayedTitle = (item) => locale.startsWith('ky') ? item.titleKy || item.title : item.title;
  const displayedContent = (item) => locale.startsWith('ky') ? item.contentKy || item.content : item.content;

  return <>
    <Feedback message={notice} onDismiss={() => setNotice('')} />
    <CollectionPage title="Новости" description="Объявления и сообщения для участников турнира." {...list} action={<button className="button button-primary" onClick={() => setEditing({})}><Plus size={18} />{t('Создать новость')}</button>}>
      <div className="news-grid">{list.data.map((item) => <article className="news-card surface" key={item._id}><div className="news-card-top"><span className="news-icon"><Send size={18} /></span><div className="row-actions"><button className="icon-button" aria-label={`${t('Изменить')}: ${item.title}`} onClick={() => setEditing(item)}><Pencil size={16} /></button><button className="icon-button danger-hover" aria-label={`${t('Удалить')}: ${item.title}`} onClick={() => setRemoving(item)}><Trash2 size={16} /></button></div></div><h2>{displayedTitle(item)}</h2><p>{displayedContent(item)}</p><time className="news-date" dateTime={item.date}><CalendarDays size={15} />{new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Bishkek', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(item.date))}</time></article>)}</div>
    </CollectionPage>
    {editing && <EntityDialog title={editing._id ? 'Изменить новость' : 'Новая новость'} fields={fields} initial={{ title: editing.title || '', content: editing.content || '', titleKy: editing.titleKy || '', contentKy: editing.contentKy || '' }} onClose={closeEdit} onSubmit={save} submitLabel={editing._id ? 'Сохранить изменения' : 'Опубликовать'} />}
    {removing && <ConfirmDialog title="Удалить новость?" description={t('Удалить объявление «{title}»?', { title: removing.title })} onClose={closeRemove} onConfirm={remove} />}
  </>;
}
