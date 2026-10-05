import { useLocation } from 'react-router-dom';

// Rodapé enxuto: crédito de autoria e das fontes, sem competir com o
// conteúdo da página.
//
// Os nomes ficam em ordem alfabética de propósito: num trabalho de grupo,
// qualquer outra ordem sugere hierarquia onde não há.
const INTEGRANTES = [
  'Ana Julia',
  'Danilo Senna',
  'Jéssica Brito',
  'Mariana Albano',
  'Neemias Silva',
];

// Login e cadastro têm composição própria, de tela cheia: um rodapé ali
// competiria com o painel institucional.
const SEM_RODAPE = ['/', '/cadastro', '/recuperar-senha', '/redefinir-senha'];

export default function Rodape() {
  const { pathname } = useLocation();
  if (SEM_RODAPE.includes(pathname)) return null;

  return (
    <footer className="border-t border-ink-200 bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 py-4 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-semibold text-ink-700">VidaReal</span>
          {' · '}
          {INTEGRANTES.join(' · ')}
        </p>
        <p>Dados abertos: IBGE, Banco Central, BrasilAPI, ViaCEP e OpenStreetMap</p>
      </div>
    </footer>
  );
}
