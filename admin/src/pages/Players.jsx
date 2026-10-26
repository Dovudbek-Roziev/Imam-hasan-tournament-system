import { useCallback, useState } from 'react';
import { Hash, Pencil, Plus, Shield, Target, Trash2, UserRound } from 'lucide-react';
import api from '../api/axios';
import CollectionPage from '../components/CollectionPage';
import EntityDialog from '../components/EntityDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import Feedback from '../components/Feedback';
import ImagePickerField from '../components/ImagePickerField';
import { useCollection } from '../hooks/useCollection';
import { deleteImage, imageUrl, uploadImage } from '../api/media';
import { useLanguage } from '../i18n';

// RU: Управлять составами игроков и их принадлежностью к командам.
// EN: Manage player rosters and their team assignments.
export default function Players() {
  const { t } = useLanguage();
  const list = useCollection('players', { sort: 'name' });
  const roster = useCollection('teams', { limit: 100, sort: 'name' });
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [notice, setNotice] = useState('');
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeRemove = useCallback(() => setRemoving(null), []);

  // RU: Создать игрока или сохранить изменения его профиля.
  // EN: Create a player or save profile changes.
  async function save(values) {
    if (!roster.data.length) throw new Error(t('Сначала добавьте хотя бы одну команду.'));
    const uploadedPhoto = typeof File !== 'undefined' && values.photo instanceof File;
    const photo = uploadedPhoto ? await uploadImage(values.photo) : values.photo;
    const body = { name: values.name.trim(), team: values.team, number: values.number === '' ? null : Number(values.number), photo: photo || '' };
    try {
      if (editing?._id) await api.put(`/players/${editing._id}`, body); else await api.post('/players', body);
    } catch (error) {
      if (uploadedPhoto) await deleteImage(photo).catch(() => {});
      throw error;
    }
    if (editing?.photo && editing.photo !== photo) await deleteImage(editing.photo).catch(() => {});
    setNotice(editing?._id ? t('Данные игрока обновлены.') : t('Игрок добавлен в состав.'));
    list.refresh();
  }
  // RU: Удалить выбранного игрока и обновить список.
  // EN: Delete the selected player and refresh the list.
  async function remove() { await api.delete(`/players/${removing._id}`); if (removing.photo) await deleteImage(removing.photo).catch(() => {}); setNotice(t('Игрок удалён.')); list.refresh(); }
  const fields = [{ name: 'name', label: 'Имя игрока', required: true, maxLength: 100, placeholder: 'Имя и фамилия' },
    { name: 'team', label: 'Команда', type: 'select', required: true, placeholder: 'Выберите команду', options: roster.data.map((team) => ({ value: team._id, label: team.name })) },
    { name: 'number', label: 'Игровой номер', type: 'number', min: 1, max: 99, placeholder: '1–99' },
    { name: 'photo', type: 'custom', render: ({ values, update }) => <label className="field"><span>{t('Фотография игрока')}</span><ImagePickerField value={values.photo || ''} onChange={update} variant="avatar" /></label> }];

  return <>
    <Feedback message={notice} onDismiss={() => setNotice('')} />
    {!roster.loading && !roster.data.length && <div className="notice notice-info">{t('Чтобы добавить игроков, сначала создайте команды.')}</div>}
    {roster.error && <div className="notice notice-error" role="alert">{roster.error}<button className="text-button" onClick={roster.refresh}>{t('Повторить')}</button></div>}
    <CollectionPage title="Игроки" description="Составы, игровые номера и личная статистика." {...list} action={<button className="button button-primary" onClick={() => setEditing({})} disabled={!roster.data.length}><Plus size={18} />{t('Добавить игрока')}</button>}>
      <div className="player-table-wrap"><table className="data-table"><thead><tr><th>{t('ИГРОК')}</th><th>{t('КОМАНДА')}</th><th>{t('НОМЕР')}</th><th>{t('ГОЛЫ')}</th><th>{t('АССИСТЫ')}</th><th><span className="sr-only">{t('Действия')}</span></th></tr></thead><tbody>{list.data.map((player) => <tr key={player._id}>
        <td><span className="player-name"><span className="player-avatar">{player.photo ? <img src={imageUrl(player.photo)} alt="" loading="lazy" /> : <UserRound size={17} />}</span><b>{player.name}</b></span></td><td><span className="team-cell">{player.team?.logo ? <img src={imageUrl(player.team.logo)} alt="" /> : <Shield size={14} />}{player.team?.name || '—'}</span></td><td><span className="number-chip">{player.number ?? '—'}</span></td><td><span className="stat-value"><Target size={14} />{player.goals}</span></td><td><span className="stat-value"><Hash size={14} />{player.assists}</span></td><td><div className="row-actions"><button className="icon-button" aria-label={`${t('Изменить')} ${player.name}`} onClick={() => setEditing({ ...player, team: player.team?._id || '' })}><Pencil size={16} /></button><button className="icon-button danger-hover" aria-label={`${t('Удалить')} ${player.name}`} onClick={() => setRemoving(player)}><Trash2 size={16} /></button></div></td>
      </tr>)}</tbody></table></div>
    </CollectionPage>
    {editing && <EntityDialog title={editing._id ? 'Изменить игрока' : 'Новый игрок'} fields={fields} initial={{ name: editing.name || '', team: editing.team || '', number: editing.number ?? '', photo: editing.photo || '' }} onClose={closeEdit} onSubmit={save} submitLabel={editing._id ? 'Сохранить изменения' : 'Добавить игрока'} />}
    {removing && <ConfirmDialog title="Удалить игрока?" description={t('Удалить игрока «{name}»? Если игрок указан в протоколе матча, сервер сохранит историю и отклонит удаление.', { name: removing.name })} onClose={closeRemove} onConfirm={remove} />}
  </>;
}
