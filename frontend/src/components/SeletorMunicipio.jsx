import { useEffect, useState } from 'react';
import { obterEstados, obterMunicipios } from '../api/dadosPublicosService';

// Seleção de município em dois passos: primeiro o estado, depois a cidade.
//
// O Brasil tem mais de 5.500 municípios. Um seletor único com todos eles é
// impraticável de rolar e lento de carregar. Escolhendo a UF antes, a
// segunda lista cai para algumas centenas — e só essa é buscada na rede.

export default function SeletorMunicipio({
  uf,
  municipioId,
  aoTrocarUf,
  aoTrocarMunicipio,
  idBase = 'local',
  classeSelect,
}) {
  const [estados, setEstados] = useState([]);
  const [municipios, setMunicipios] = useState(null); // null = ainda carregando

  useEffect(() => {
    let ativo = true;
    obterEstados()
      .then((d) => ativo && setEstados(d.estados))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  // A lista guarda a UF a que pertence: assim o "carregando" é derivado e
  // não sobra a lista do estado anterior enquanto a nova não chega.
  useEffect(() => {
    let ativo = true;
    obterMunicipios(uf)
      .then((d) => {
        if (!ativo) return;
        setMunicipios({ paraUf: uf, itens: d.municipios });

        // Ao trocar de estado, o município escolhido quase sempre deixa de
        // existir na nova lista. Sem isso o seletor ficaria apontando para
        // uma cidade de outra UF, e a tela mostraria dados de lá.
        const aindaVale = d.municipios.some((m) => String(m.id) === String(municipioId));
        if (!aindaVale && d.municipios.length > 0) {
          aoTrocarMunicipio(String(d.municipios[0].id));
        }
      })
      .catch(() => ativo && setMunicipios({ paraUf: uf, itens: [] }));
    return () => {
      ativo = false;
    };
    // municipioId de propósito fora das dependências: ele muda como
    // consequência desta busca, e reexecutar aqui criaria um laço.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uf]);

  const carregando = municipios?.paraUf !== uf;
  const lista = carregando ? [] : municipios.itens;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`${idBase}-uf`} className="sr-only">
        Estado
      </label>
      <select
        id={`${idBase}-uf`}
        value={uf}
        onChange={(e) => aoTrocarUf(e.target.value)}
        className={`${classeSelect} w-[4.75rem] shrink-0`}
      >
        {estados.length === 0 && <option value={uf}>{uf}</option>}
        {estados.map((e) => (
          <option key={e.sigla} value={e.sigla} title={e.nome}>
            {e.sigla}
          </option>
        ))}
      </select>

      <label htmlFor={`${idBase}-municipio`} className="sr-only">
        Município
      </label>
      <select
        id={`${idBase}-municipio`}
        value={municipioId}
        onChange={(e) => aoTrocarMunicipio(e.target.value)}
        disabled={carregando}
        className={`${classeSelect} w-[13rem] shrink-0 disabled:opacity-60`}
      >
        {carregando && <option value={municipioId}>Carregando municípios...</option>}
        {lista.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
