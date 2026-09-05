import { api } from './apiClient';

// Dados abertos de governo (IPCA, Selic, feriados, IBGE, ViaCEP).
//
// O navegador nunca fala com o Banco Central ou com o IBGE diretamente:
// pede à nossa API, que consulta a origem, guarda em cache e devolve o
// último valor conhecido se o servidor público estiver fora do ar.
//
// Por isso todas as chamadas aqui usam `auth: false` — são leituras de
// dados públicos, disponíveis inclusive antes do login (o cadastro usa o
// CEP, por exemplo).

/** IPCA acumulado em 12 meses, com a série mês a mês. */
export const obterIpca = () => api.get('/dados/ipca', { auth: false });

/** Meta Selic ao ano, definida pelo Copom. */
export const obterSelic = () => api.get('/dados/selic', { auth: false });

/** Feriados nacionais do ano. */
export const obterFeriados = (ano) =>
  api.get(`/dados/feriados${ano ? `?ano=${ano}` : ''}`, { auth: false });

/** Data em que vence um prazo contado em dias úteis. */
export const obterPrazo = (dias, inicio) => {
  const params = new URLSearchParams({ dias: String(dias) });
  if (inicio) params.set('inicio', inicio);
  return api.get(`/dados/prazo?${params}`, { auth: false });
};

/** As 27 unidades da federação, para o seletor de estado. */
export const obterEstados = () => api.get('/dados/estados', { auth: false });

/** Indicadores sociais reais do município (saneamento, IDEB, escolarização). */
export const obterIndicadoresSociais = (idIbge) =>
  api.get(`/dados/municipios/${encodeURIComponent(idIbge)}/sociais`, { auth: false });

/** Equipamentos públicos do município (escolas, saúde, parques) para o mapa. */
export const obterPontosMunicipio = (idIbge) =>
  api.get(`/dados/municipios/${encodeURIComponent(idIbge)}/pontos`, { auth: false });

/** Contorno geográfico do município, em GeoJSON, para desenhar no mapa. */
export const obterMalhaMunicipio = (idIbge) =>
  api.get(`/dados/municipios/${encodeURIComponent(idIbge)}/malha`, { auth: false });

/** Municípios de uma UF, para o seletor de comparação. */
export const obterMunicipios = (uf = 'SP') =>
  api.get(`/dados/municipios?uf=${encodeURIComponent(uf)}`, { auth: false });

/** População e PIB de um município, pelo código do IBGE. */
export const obterIndicadoresMunicipio = (idIbge) =>
  api.get(`/dados/municipios/${encodeURIComponent(idIbge)}`, { auth: false });

/** Endereço a partir do CEP. */
export const obterEnderecoPorCep = (cep) =>
  api.get(`/dados/cep/${encodeURIComponent(String(cep).replace(/\D/g, ''))}`, { auth: false });
