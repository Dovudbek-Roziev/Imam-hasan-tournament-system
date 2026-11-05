import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
const TournamentContext = createContext(null);
export function TournamentProvider({ children }) {
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(() => { try { return localStorage.getItem('imam.tournament') || 'legacy'; } catch { return 'legacy'; } });
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { const response = await api.get('/tournaments'); setTournaments(response.data.data); setError(''); }
    catch (failure) { setError(failure.response?.data?.message || 'Не удалось загрузить турниры.'); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  function select(id) { setSelected(id); try { localStorage.setItem('imam.tournament', id); } catch { /* Keep the selection in memory. */ } }
  return <TournamentContext.Provider value={{ tournaments, selected, select, refresh, error }}>{children}</TournamentContext.Provider>;
}
// oxlint-disable-next-line react/only-export-components
export function useTournament() { return useContext(TournamentContext); }
