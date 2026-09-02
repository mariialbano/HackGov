import { createContext } from 'react';

// Objeto de contexto isolado: o arquivo do provedor passa a exportar
// apenas componentes, e o hook fica em hooks/useAuth.
export const AuthContext = createContext(null);
