export const PROTOCOLO_TIPOS = [
  'Análise de viabilidade de Metas Financeiras',
  'Dúvida sobre inflação',
  'Solicitação de orientação financeira',
  'Problema técnico',
  'Sugestão de melhoria',
];

export const STATUS_OPCOES = [
  { value: 33, label: 'Solicitação Criada', status: 'Solicitação Criada', prazo: 'Prazo: 20 dias úteis', corPrazo: 'bg-blue-600' },
  { value: 66, label: 'Em análise', status: 'Em análise', prazo: 'Prazo: 15 dias úteis', corPrazo: 'bg-gov-orange' },
  { value: 100, label: 'Concluído', status: 'Concluído', prazo: 'Prazo: Concluído', corPrazo: 'bg-gov-green' },
];

export function getStatusOpcao(progresso) {
  return STATUS_OPCOES.find((op) => op.value === progresso) || STATUS_OPCOES[0];
}

export function gerarIdProtocolo() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const random = Math.floor(10000 + Math.random() * 90000);
  return `${ano}${mes}${dia}${random}`;
}

export function formatarDataHoje() {
  return formatarData(new Date());
}

// A API devolve datas em ISO 8601 (padrão REST); a formatação para
// dd/mm/aaaa é responsabilidade da camada de apresentação.
export function formatarData(valor) {
  if (!valor) return '—';
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${data.getFullYear()}`;
}
