// Demonstracao: o ciclo de vida de UM protocolo FICTICIO registrado e verificado.
// Rode depois de `npm run node` e `npm run deploy` (ver README.md).
//
// Simula o que a API Java faria no futuro: calcular dois hashes (do identificador
// e do estado do protocolo) e registra-los. Nenhum dado pessoal vai para a cadeia.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const ETAPAS = { 1: "Criada", 2: "Em análise", 3: "Concluído" };

// Chave que, em producao, seria um segredo da API. Aqui e ficticia.
const CHAVE_DEMO = "chave-demo-ficticia";

const idComoHash = (numero) =>
  "0x" + crypto.createHmac("sha256", CHAVE_DEMO).update(numero).digest("hex");

const estadoComoHash = (estado) =>
  "0x" + crypto.createHash("sha256").update(JSON.stringify(estado)).digest("hex");

const curto = (hash) => `${hash.slice(0, 10)}…${hash.slice(-6)}`;

async function main() {
  const { ethers, network } = hre;

  const arquivo = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(arquivo)) {
    throw new Error(`Contrato não implantado em "${network.name}". Rode: npm run deploy`);
  }
  const { contrato: endereco } = JSON.parse(fs.readFileSync(arquivo, "utf8"));

  const [, registrador, intruso] = await ethers.getSigners();
  const contrato = await ethers.getContractAt("RegistroProtocolos", endereco, registrador);

  // Protocolo FICTICIO. Note: sem CPF, sem nome e sem a descricao em texto.
  const numero = `DEMO-${Date.now()}`;
  const id = idComoHash(numero);
  const estadoBase = { id: numero, tipo: "Problema técnico", abertoEm: "2026-07-07T12:00:00Z" };

  console.log(`Contrato: ${endereco}  (rede ${network.name})`);
  console.log(`Protocolo fictício ${numero}`);
  console.log(`  identificador na cadeia: ${curto(id)}  (HMAC do número; o número não aparece)\n`);

  // 1) Registra o ciclo de vida: Criada -> Em analise -> Concluido
  const estados = [
    { etapa: 1, estado: { ...estadoBase, etapa: "CRIADA", concluidoEm: null } },
    { etapa: 2, estado: { ...estadoBase, etapa: "EM_ANALISE", concluidoEm: null } },
    { etapa: 3, estado: { ...estadoBase, etapa: "CONCLUIDO", concluidoEm: "2026-07-15T16:30:00Z" } },
  ];
  console.log("1) Registrando os eventos (cada um vira uma transação):");
  for (const { etapa, estado } of estados) {
    const tx = await contrato.registrar(id, etapa, estadoComoHash(estado));
    const recibo = await tx.wait();
    console.log(`   ${ETAPAS[etapa].padEnd(11)} hash do estado ${curto(estadoComoHash(estado))}  bloco ${recibo.blockNumber}`);
  }

  // 2) Le o historico direto da cadeia
  const total = await contrato.quantidadeEventos(id);
  console.log(`\n2) Histórico lido da cadeia (${total} eventos):`);
  for (let i = 0; i < total; i++) {
    const e = await contrato.obterEvento(id, i);
    const quando = new Date(Number(e.registradoEm) * 1000).toISOString();
    console.log(`   [${i}] ${ETAPAS[Number(e.etapa)].padEnd(11)} ${curto(e.hashEstado)}  registrado em ${quando}`);
  }

  // 3) Verificacao de integridade
  console.log("\n3) Verificação de integridade (o hash do banco confere com o registrado?):");
  for (let i = 0; i < estados.length; i++) {
    const confere = await contrato.verificar(id, i, estados[i].etapa, estadoComoHash(estados[i].estado));
    console.log(`   evento [${i}] com o estado original ........ ${confere ? "CONFERE" : "NÃO CONFERE"}`);
  }
  const adulterado = { ...estados[2].estado, concluidoEm: "2026-07-01T09:00:00Z" }; // alguem muda a data no banco
  const confereAdulterado = await contrato.verificar(id, 2, 3, estadoComoHash(adulterado));
  console.log(`   evento [2] com a data de conclusão alterada ... ${confereAdulterado ? "CONFERE" : "NÃO CONFERE (alteração detectada)"}`);

  // 4) Controle de acesso: uma conta qualquer nao registra
  console.log("\n4) Controle de acesso: uma conta que não é o registrador tenta registrar:");
  try {
    await contrato.connect(intruso).registrar(id, 1, estadoComoHash({ qualquer: "coisa" }));
    console.log("   ERRO: o contrato aceitou (não deveria)");
  } catch (erro) {
    // Decodifica o erro personalizado devolvido pelo contrato (nada de texto fixo).
    // Pela rede local o `data` vem como objeto {data, message, txHash}; em outras, como texto.
    const bytes = typeof erro.data === "string" ? erro.data : erro.data && erro.data.data;
    const motivo = bytes ? contrato.interface.parseError(bytes) : null;
    console.log(`   recusado pelo contrato: ${motivo ? motivo.name : "motivo não decodificado: " + erro.message}`);
  }

  // 5) Eventos emitidos (e o que um observador externo enxergaria)
  const logs = await contrato.queryFilter(contrato.filters.EventoRegistrado(id));
  console.log(`\n5) Eventos EventoRegistrado emitidos para este protocolo: ${logs.length}`);
}

main().catch((erro) => {
  console.error(erro.message || erro);
  process.exitCode = 1;
});
