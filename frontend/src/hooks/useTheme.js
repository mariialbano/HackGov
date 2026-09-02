import { useCallback, useEffect, useState } from 'react';

// Preferência de tema do usuário.
//
// Três estados: 'sistema' (padrão), 'claro' e 'escuro'. O valor escolhido
// vira o atributo data-theme no <html>, que o CSS usa para trocar os tokens.
// Fica em localStorage porque é preferência de aparência do dispositivo —
// não é dado de sessão nem informação pessoal.

const CHAVE = 'vidareal.tema';
const TEMAS = ['sistema', 'claro', 'escuro'];

function lerPreferencia() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return TEMAS.includes(salvo) ? salvo : 'sistema';
  } catch {
    // Navegador com armazenamento bloqueado: segue o sistema.
    return 'sistema';
  }
}

function aplicar(tema) {
  const raiz = document.documentElement;
  if (tema === 'sistema') {
    raiz.removeAttribute('data-theme');
  } else {
    raiz.setAttribute('data-theme', tema === 'escuro' ? 'dark' : 'light');
  }
}

export function useTheme() {
  const [tema, setTema] = useState(lerPreferencia);

  useEffect(() => {
    aplicar(tema);
    try {
      localStorage.setItem(CHAVE, tema);
    } catch {
      // Sem persistência: a escolha vale só para esta visita.
    }
  }, [tema]);

  // Alterna entre claro e escuro partindo do que está sendo exibido agora.
  const alternar = useCallback(() => {
    setTema((atual) => {
      if (atual === 'sistema') {
        const sistemaEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return sistemaEscuro ? 'claro' : 'escuro';
      }
      return atual === 'escuro' ? 'claro' : 'escuro';
    });
  }, []);

  const escuroAtivo =
    tema === 'escuro' ||
    (tema === 'sistema' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return { tema, setTema, alternar, escuroAtivo };
}
