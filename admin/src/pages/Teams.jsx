import { useCallback, useState } from 'react';
import { Pencil, Plus, Shield, Trash2, Trophy, Users } from 'lucide-react';
import api from '../api/axios';
import CollectionPage from '../components/CollectionPage';
import EntityDialog from '../components/EntityDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import Feedback from '../components/Feedback';
import ImagePickerField from '../components/ImagePickerField';
import { deleteImage, imageUrl, uploadImage } from '../api/media';
import { useLanguage } from '../i18n';
import { useCollection } from '../hooks/useCollection';

// RU: Управлять списком команд турнира через API.
// EN: Manage the tournament team list through the API.
export default function Teams() {
  const { t } = useLanguage();
  const list = useCollection('teams', { sort: 'name' });
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [notice, setNotice] = useState('');
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeRemove = useCallback(() => setRemoving(null), []);

  // RU: Создать или сохранить изменения команды.
  // EN: Create a team or save its edits.
  async function save(values) {
    const uploadedLogo = typeof File !== 'undefined' && values.logo instanceof File;
    const logo = uploadedLogo ? await uploadImage(values.logo) : values.logo;
    const body = { name: values.name.trim(), logo: logo || '' };
    try {
      if (editing?._id) await api.put(`/teams/${editing._id}`, body); else await api.post('/teams', body);
    } catch (error) {
      if (uploadedLogo) await deleteImage(logo).catch(() => {});
      throw error;
    }
    if (editing?.logo && editing.logo !== logo) await deleteImage(editing.logo).catch(() => {});
    setNotice(editing?._id ? t('Изменения команды сохранены.') : t('Команда добавлена.'));
    list.refresh();
  }
  // RU: Удалить выбранную команду и обновить список.
  // EN: Delete the selected team and refresh the list.
  async function remove() { await api.delete(`/teams/${removing._id}`); setNotice(t('Команда удалена.')); list.refresh(); }
  const fields = [
    { name: 'name', label: 'Название команды', required: true, maxLength: 100, placeholder: 'Например, «Сокол»' },
    { name: 'logo', type: 'custom', render: ({ values, update }) => <label className="field"><span>{t('Логотип команды')}</span><ImagePickerField value={values.logo || ''} onChange={update} /></label> },
  ];

  return <>
    <Feedback message={notice} onDismiss={() => setNotice('')} />
    <CollectionPage title="Команды" description="Состав участников и текущие показатели турнира." {...list} action={<button className="button button-primary" onClick={() => setEditing({})}><Plus size={18} />{t('Добавить команду')}</button>}>
      <div className="team-grid">{list.data.map((team) => <article className="team-card surface" key={team._id}>
        <div className="team-card-head"><span className="team-logo">{team.logo ? <img src={imageUrl(team.logo)} alt={`${t('Логотип команды')} ${team.name}`} loading="lazy" /> : <Shield size={25} />}</span><span className="team-actions"><button className="icon-button" aria-label={`${t('Изменить команду')} ${team.name}`} onClick={() => setEditing(team)}><Pencil size={16} /></button><button className="icon-button danger-hover" aria-label={`${t('Удалить')} ${team.name}`} onClick={() => setRemoving(team)}><Trash2 size={16} /></button></span></div>
        <h2>{team.name}</h2><span className="team-position"><Trophy size={14} />{team.points} {t('очков')} · {team.played} {t('матчей')}</span><div className="team-card-stats"><span><Users size={16} />{t('Состав команды')}</span><b>{team.won} {t('побед')} · {team.draw} {t('ничьих')}</b></div><span className="goal-difference">{t('Разница мячей')} <b>{team.goalDifference > 0 ? '+' : ''}{team.goalDifference}</b></span>
      </article>)}</div>
    </CollectionPage>
    {editing && <EntityDialog title={editing._id ? 'Изменить команду' : 'Новая команда'} fields={fields} initial={{ name: editing.name || '', logo: editing.logo || '' }} onClose={closeEdit} onSubmit={save} submitLabel={editing._id ? 'Сохранить изменения' : 'Добавить команду'} />}
    {removing && <ConfirmDialog title="Удалить команду?" description={t('Команда «{name}» удалится, только если за ней не числятся игроки или матчи.', { name: removing.name })} onClose={closeRemove} onConfirm={remove} />}
  </>;
}
