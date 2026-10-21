import { Search, ChevronLeft, ChevronRight, RefreshCw, Inbox } from 'lucide-react';
import { useLanguage } from '../i18n';

// RU: Переиспользуемо отображать поиск, фильтры, состояние загрузки и страницы списка.
// EN: Reuse the search, filters, loading state, and pagination for collection pages.
export default function CollectionPage({ title, description, search, setSearch, page, setPage, pagination, loading, error, onRefresh, action, filter, setFilter, filterOptions, children }) {
  const { t } = useLanguage();
  const hasRecords = (pagination?.total ?? 0) > 0;
  return <section className="page-stack">
    <div className="page-heading"><div><span className="eyebrow">{t('ТУРНИР • УПРАВЛЕНИЕ')}</span><h1>{t(title)}</h1><p>{t(description)}</p></div>{action}</div>
    <div className="surface collection-surface">
      <div className="toolbar"><label className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Поиск…')} aria-label={`${t('Поиск…')}: ${t(title).toLowerCase()}`} />{search && <button className="text-button" onClick={() => setSearch('')}>{t('Очистить')}</button>}</label><div className="toolbar-actions">{filterOptions && <select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label={t('Фильтр списка')}>{filterOptions.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}</select>}<button className="button button-quiet" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} />{t('Обновить')}</button></div></div>
      {error && <div className="notice notice-error" role="alert"><span>{error}</span><button className="text-button" onClick={onRefresh}>{t('Повторить')}</button></div>}
      <div className="collection-body" aria-busy={loading} aria-live="polite">
        {loading && !hasRecords ? <div className="loading-box"><span className="spinner" />{t('Загрузка данных…')}</div>
          : hasRecords ? children
            : !error && <div className="empty-state"><span className="empty-icon"><Inbox size={22} /></span><strong>{search ? t('По запросу ничего не найдено') : t('Здесь пока пусто')}</strong><span>{search ? t('Измените поисковый запрос.') : t('Добавьте первую запись, чтобы данные появились в турнире.')}</span></div>}
      </div>
      {pagination && <div className="pagination"><span>{t('Записей:')} <b>{pagination.total}</b> · {t('Страница')} {pagination.page} {t('из')} {Math.max(1, pagination.pages)}</span><div><button className="icon-button" aria-label={t('Предыдущая страница')} disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}><ChevronLeft size={19} /></button><button className="icon-button" aria-label={t('Следующая страница')} disabled={!pagination.hasNext || loading} onClick={() => setPage(page + 1)}><ChevronRight size={19} /></button></div></div>}
    </div>
  </section>;
}
