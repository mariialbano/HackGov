// -----------------------------------------------------------------
// Camada de dados (repositório em memória)
//
// Simula o banco Oracle modelado na Fase 3. Toda a API conversa apenas
// com este módulo, então a troca por um banco real (driver oracledb)
// exige alterar somente este arquivo — as rotas permanecem iguais.
// -----------------------------------------------------------------

const crypto = require('crypto');

// ---------- USUARIO ----------
// Senhas NUNCA em texto puro: apenas o hash bcrypt é armazenado.
const usuarios = [
  {
    cpf: '52998224725',
    senhaHash: '$2b$10$JmfP2k87GCY5vigEAgAjIOlqFmrx0sDgxsQ3t70CNOqpetX96I0hW', // Cidadao@123
    nome: 'Maria da Silva',
    perfil: 'cidadao',
  },
  {
    cpf: '15350946056',
    senhaHash: '$2b$10$buuLHd..XZ15GMW1H90YCelfqyEszYfZhzs7muHgKZyedAOLvLwo6', // Atendente@123
    nome: 'João Santos',
    perfil: 'atendente',
  },
];

// Hash comparado quando o CPF não existe: mantém o tempo de resposta
// igual ao de um usuário real, evitando enumeração por timing.
const HASH_FALSO = '$2b$10$fuAhxm9OixnUD5I76RlDtOLL3Cfb54xcUHiSDLz3QqRXd0OhNZ5Om';

// ---------- Domínio: fluxo de status do protocolo ----------
const STATUS_FLUXO = [
  { progresso: 33, status: 'Solicitação Criada', prazo: 'Prazo: 20 dias úteis', corPrazo: 'bg-blue-600' },
  { progresso: 66, status: 'Em análise', prazo: 'Prazo: 15 dias úteis', corPrazo: 'bg-gov-orange' },
  { progresso: 100, status: 'Concluído', prazo: 'Prazo: Concluído', corPrazo: 'bg-gov-green' },
];

const TIPOS_PROTOCOLO = [
  'Análise de viabilidade de Metas Financeiras',
  'Dúvida sobre inflação',
  'Solicitação de orientação financeira',
  'Problema técnico',
  'Sugestão de melhoria',
];

function resolverStatus(progresso) {
  return STATUS_FLUXO.find((s) => s.progresso === Number(progresso)) || STATUS_FLUXO[0];
}

// ---------- SOLICITACAO (protocolo) ----------
// A fila de atendimento é mantida em ordem de chegada (FIFO).
const protocolos = [
  {
    id: '2026050712345',
    cpfSolicitante: '52998224725',
    tipo: 'Análise de viabilidade de Metas Financeiras',
    descricao: 'Solicitação de análise para meta de reserva de emergência de R$ 10.000 em 12 meses.',
    progresso: 66,
    abertoEm: '2026-05-07T09:12:00.000Z',
    concluidoEm: null,
  },
  {
    id: '2026042098765',
    cpfSolicitante: '52998224725',
    tipo: 'Solicitação de orientação financeira',
    descricao: 'Inscrição no curso de educação financeira oferecido pela prefeitura de Taubaté.',
    progresso: 100,
    abertoEm: '2026-04-20T14:30:00.000Z',
    concluidoEm: '2026-04-28T16:05:00.000Z',
  },
  {
    id: '2026031554321',
    cpfSolicitante: '52998224725',
    tipo: 'Análise de viabilidade de Metas Financeiras',
    descricao: 'Consulta sobre viabilidade de meta para viagem internacional no prazo de 18 meses.',
    progresso: 33,
    abertoEm: '2026-03-15T08:45:00.000Z',
    concluidoEm: null,
  },
  {
    id: '2026022611223',
    cpfSolicitante: '15350946056',
    tipo: 'Dúvida sobre inflação',
    descricao: 'Pedido de esclarecimento sobre o índice utilizado nas projeções do simulador.',
    progresso: 100,
    abertoEm: '2026-02-26T10:00:00.000Z',
    concluidoEm: '2026-03-10T11:20:00.000Z',
  },
];

// ---------- META_FINANCEIRA ----------
const metas = [
  { id: 1, cpfUsuario: '52998224725', tipo: 'Reserva de Emergência', atual: 3000, objetivo: 10000, prazo: '12 meses' },
  { id: 2, cpfUsuario: '52998224725', tipo: 'Viagem', atual: 1500, objetivo: 5000, prazo: '6 meses' },
];
let proximoIdMeta = 3;

// ---------- FEEDBACK ----------
const feedbacks = [];
let proximoIdFeedback = 1;

// ---------- Sessões ativas (token -> usuário) ----------
// Em produção seria um JWT assinado, sem estado no servidor.
const sessoes = new Map();

// ---------- Trilha de auditoria ----------
// Pilha (LIFO): as ações mais recentes ficam no topo, que é o que
// interessa em uma investigação.
const auditoria = [];

function registrarAuditoria({ acao, recurso, recursoId, cpfAutor, perfilAutor, detalhe }) {
  auditoria.push({
    id: crypto.randomUUID(),
    acao,
    recurso,
    recursoId: recursoId ?? null,
    cpfAutor: cpfAutor ?? null,
    perfilAutor: perfilAutor ?? null,
    detalhe: detalhe ?? null,
    registradoEm: new Date().toISOString(),
  });
}

function gerarIdProtocolo() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const aleatorio = Math.floor(10000 + Math.random() * 90000);
  return `${ano}${mes}${dia}${aleatorio}`;
}

module.exports = {
  usuarios,
  HASH_FALSO,
  protocolos,
  metas,
  feedbacks,
  sessoes,
  auditoria,
  STATUS_FLUXO,
  TIPOS_PROTOCOLO,
  resolverStatus,
  registrarAuditoria,
  gerarIdProtocolo,
  proximoIdMeta: () => proximoIdMeta++,
  proximoIdFeedback: () => proximoIdFeedback++,
};
