import { createContext } from 'react';

// RU: Единое состояние авторизации панели администратора.
// EN: Shared authentication state for the administrator panel.
const AuthContext = createContext(null);
export default AuthContext;
