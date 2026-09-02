import { useCallback, useEffect, useState } from 'react';

// Tradutor de Libras (VLibras, do governo federal).
//
// A partir da versão 7 o plugin monta sozinho o próprio elemento no body
// (#vlibras-access-wrapper, com shadow DOM) assim que a página carrega —
// não há como impedir a criação. O que controlamos é a visibilidade, por
// uma classe no <html> (a regra está em index.css).
//
// Fica DESATIVADO por padrão: o avatar 3D, que é o download pesado, só é
// buscado nos servidores do gov.br quando o cidadão abre o widget.

const CHAVE = 'vidareal.vlibras';
const CLASSE_ATIVO = 'vlibras-ativo';

function lerPreferencia() {
  try {
    return localStorage.getItem(CHAVE) === 'ativo';
  } catch {
    // Navegador com armazenamento bloqueado: segue o padrão (desativado).
    return false;
  }
}

export function useVLibras() {
  const [ativo, setAtivo] = useState(lerPreferencia);

  // Mantém o DOM em sincronia com a preferência, inclusive na montagem.
  useEffect(() => {
    document.documentElement.classList.toggle(CLASSE_ATIVO, ativo);
  }, [ativo]);

  const alternar = useCallback(() => {
    setAtivo((atual) => {
      const proximo = !atual;
      try {
        localStorage.setItem(CHAVE, proximo ? 'ativo' : 'inativo');
      } catch {
        // Sem persistência: a escolha vale só para esta visita.
      }
      return proximo;
    });
  }, []);

  return { ativo, alternar };
}
