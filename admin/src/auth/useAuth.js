import { useContext } from 'react';
import AuthContext from './AuthStore';

// RU: Получить состояние авторизации из общего контекста.
// EN: Read authentication state from the shared context.
// RU: Предоставить компонентам общий контекст текущего сеанса администратора.
// EN: Give components access to the shared administrator session context.
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth должен вызываться внутри AuthProvider.');
  return value;
}
