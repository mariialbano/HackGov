const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const crypto = require("crypto");

// Etapas, como no enum EtapaProtocolo da API.
const CRIADA = 1;
const EM_ANALISE = 2;
const CONCLUIDO = 3;

// Hashes de exemplo (32 bytes). Os valores reais viriam da API.
const hashDe = (texto) => ethers.sha256(ethers.toUtf8Bytes(texto));
const PROTOCOLO_A = hashDe("protocolo-A");
const PROTOCOLO_B = hashDe("protocolo-B");
const ZERO = ethers.ZeroHash;

describe("RegistroProtocolos", function () {
  let contrato, dono, registrador, outro, novoRegistrador;

  beforeEach(async function () {
    [dono, registrador, outro, novoRegistrador] = await ethers.getSigners();
    const Fabrica = await ethers.getContractFactory("RegistroProtocolos");
    contrato = await Fabrica.deploy(registrador.address); // dono = quem implanta
    await contrato.waitForDeployment();
  });

  const registrar = (id, etapa, hash, quem = registrador) =>
    contrato.connect(quem).registrar(id, etapa, hash);

  // ---------------------------------------------------------------------
  describe("implantação", function () {
    it("o implantador vira o dono e o registrador inicial é o informado", async function () {
      expect(await contrato.dono()).to.equal(dono.address);
      expect(await contrato.registrador()).to.equal(registrador.address);
      expect(await contrato.totalEventos()).to.equal(0n);
    });

    it("recusa registrador inicial com endereço zero", async function () {
      const Fabrica = await ethers.getContractFactory("RegistroProtocolos");
      await expect(Fabrica.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        Fabrica,
        "EnderecoInvalido"
      );
    });
  });

  // ---------------------------------------------------------------------
  describe("registrar", function () {
    it("grava o evento, emite EventoRegistrado e devolve o índice", async function () {
      const hash = hashDe("estado-1");

      await expect(registrar(PROTOCOLO_A, CRIADA, hash))
        .to.emit(contrato, "EventoRegistrado")
        .withArgs(PROTOCOLO_A, 0, CRIADA, hash, registrador.address, anyValue);

      expect(await contrato.quantidadeEventos(PROTOCOLO_A)).to.equal(1n);
      expect(await contrato.totalEventos()).to.equal(1n);
    });

    it("guarda etapa, hash, registrador e a data do bloco", async function () {
      const hash = hashDe("estado-1");
      await registrar(PROTOCOLO_A, CRIADA, hash);
      const bloco = await ethers.provider.getBlock("latest");

      const evento = await contrato.obterEvento(PROTOCOLO_A, 0);

      expect(evento.etapa).to.equal(BigInt(CRIADA));
      expect(evento.hashEstado).to.equal(hash);
      expect(evento.registrador).to.equal(registrador.address);
      expect(evento.registradoEm).to.equal(BigInt(bloco.timestamp));
    });

    it("só o registrador registra: o dono e qualquer outra conta são recusados", async function () {
      const hash = hashDe("estado-1");

      await expect(registrar(PROTOCOLO_A, CRIADA, hash, outro)).to.be.revertedWithCustomError(
        contrato,
        "NaoAutorizado"
      );
      await expect(registrar(PROTOCOLO_A, CRIADA, hash, dono)).to.be.revertedWithCustomError(
        contrato,
        "NaoAutorizado"
      );
      expect(await contrato.totalEventos()).to.equal(0n); // nada foi gravado
    });

    it("recusa etapa fora de 1 a 3", async function () {
      const hash = hashDe("estado-1");

      await expect(registrar(PROTOCOLO_A, 0, hash))
        .to.be.revertedWithCustomError(contrato, "EtapaInvalida")
        .withArgs(0);
      await expect(registrar(PROTOCOLO_A, 4, hash))
        .to.be.revertedWithCustomError(contrato, "EtapaInvalida")
        .withArgs(4);
    });

    it("recusa hash de protocolo ou de estado zerado", async function () {
      await expect(registrar(ZERO, CRIADA, hashDe("x"))).to.be.revertedWithCustomError(
        contrato,
        "HashInvalido"
      );
      await expect(registrar(PROTOCOLO_A, CRIADA, ZERO)).to.be.revertedWithCustomError(
        contrato,
        "HashInvalido"
      );
    });

    it("recusa o mesmo evento duas vezes seguidas (reenvio acidental)", async function () {
      const hash = hashDe("estado-1");
      await registrar(PROTOCOLO_A, CRIADA, hash);

      await expect(registrar(PROTOCOLO_A, CRIADA, hash)).to.be.revertedWithCustomError(
        contrato,
        "EventoDuplicado"
      );
      expect(await contrato.quantidadeEventos(PROTOCOLO_A)).to.equal(1n);
    });

    it("aceita a mesma etapa com outro estado (edição) e outra etapa com o mesmo hash", async function () {
      await registrar(PROTOCOLO_A, CRIADA, hashDe("estado-1"));
      await registrar(PROTOCOLO_A, CRIADA, hashDe("estado-1-editado")); // mesma etapa, estado diferente
      await registrar(PROTOCOLO_A, EM_ANALISE, hashDe("estado-1-editado")); // outra etapa, mesmo hash

      expect(await contrato.quantidadeEventos(PROTOCOLO_A)).to.equal(3n);
    });
  });

  // ---------------------------------------------------------------------
  describe("histórico", function () {
    it("guarda os eventos em ordem, inclusive o retrocesso (reabertura)", async function () {
      const h = [hashDe("e0"), hashDe("e1"), hashDe("e2"), hashDe("e3")];
      await registrar(PROTOCOLO_A, CRIADA, h[0]);
      await registrar(PROTOCOLO_A, EM_ANALISE, h[1]);
      await registrar(PROTOCOLO_A, CONCLUIDO, h[2]);
      await registrar(PROTOCOLO_A, CRIADA, h[3]); // reabertura: volta de Concluído para Criada

      expect(await contrato.quantidadeEventos(PROTOCOLO_A)).to.equal(4n);
      const etapas = [];
      for (let i = 0; i < 4; i++) {
        const e = await contrato.obterEvento(PROTOCOLO_A, i);
        etapas.push(Number(e.etapa));
        expect(e.hashEstado).to.equal(h[i]);
      }
      expect(etapas).to.deep.equal([CRIADA, EM_ANALISE, CONCLUIDO, CRIADA]);
    });

    it("ultimoEvento devolve o mais recente", async function () {
      await registrar(PROTOCOLO_A, CRIADA, hashDe("e0"));
      await registrar(PROTOCOLO_A, EM_ANALISE, hashDe("e1"));

      const ultimo = await contrato.ultimoEvento(PROTOCOLO_A);

      expect(ultimo.etapa).to.equal(BigInt(EM_ANALISE));
      expect(ultimo.hashEstado).to.equal(hashDe("e1"));
    });

    it("protocolos diferentes têm históricos independentes; o total soma todos", async function () {
      await registrar(PROTOCOLO_A, CRIADA, hashDe("a0"));
      await registrar(PROTOCOLO_A, EM_ANALISE, hashDe("a1"));
      await registrar(PROTOCOLO_B, CRIADA, hashDe("b0"));

      expect(await contrato.quantidadeEventos(PROTOCOLO_A)).to.equal(2n);
      expect(await contrato.quantidadeEventos(PROTOCOLO_B)).to.equal(1n);
      expect(await contrato.totalEventos()).to.equal(3n);
    });

    it("consultar evento que não existe reverte com EventoInexistente", async function () {
      await expect(contrato.obterEvento(PROTOCOLO_A, 0)).to.be.revertedWithCustomError(
        contrato,
        "EventoInexistente"
      );
      await expect(contrato.ultimoEvento(PROTOCOLO_A)).to.be.revertedWithCustomError(
        contrato,
        "EventoInexistente"
      );
      await registrar(PROTOCOLO_A, CRIADA, hashDe("a0"));
      await expect(contrato.obterEvento(PROTOCOLO_A, 1)).to.be.revertedWithCustomError(
        contrato,
        "EventoInexistente"
      );
    });

    it("é imutável: o contrato não oferece função para alterar ou apagar eventos", async function () {
      const nomes = contrato.interface.fragments
        .filter((f) => f.type === "function")
        .map((f) => f.name);

      expect(nomes).to.have.members([
        "ETAPA_CRIADA", "ETAPA_EM_ANALISE", "ETAPA_CONCLUIDO",
        "dono", "registrador", "totalEventos",
        "registrar", "transferirRegistrador",
        "quantidadeEventos", "obterEvento", "ultimoEvento", "verificar",
      ]);
    });
  });

  // ---------------------------------------------------------------------
  describe("verificar", function () {
    beforeEach(async function () {
      await registrar(PROTOCOLO_A, CRIADA, hashDe("e0"));
      await registrar(PROTOCOLO_A, EM_ANALISE, hashDe("e1"));
    });

    it("confirma o evento exato", async function () {
      expect(await contrato.verificar(PROTOCOLO_A, 0, CRIADA, hashDe("e0"))).to.equal(true);
      expect(await contrato.verificar(PROTOCOLO_A, 1, EM_ANALISE, hashDe("e1"))).to.equal(true);
    });

    it("devolve false (sem reverter) para hash alterado, etapa errada, índice inexistente ou protocolo desconhecido", async function () {
      expect(await contrato.verificar(PROTOCOLO_A, 0, CRIADA, hashDe("adulterado"))).to.equal(false);
      expect(await contrato.verificar(PROTOCOLO_A, 0, EM_ANALISE, hashDe("e0"))).to.equal(false);
      expect(await contrato.verificar(PROTOCOLO_A, 5, CRIADA, hashDe("e0"))).to.equal(false);
      expect(await contrato.verificar(PROTOCOLO_B, 0, CRIADA, hashDe("e0"))).to.equal(false);
    });

    it("qualquer conta pode verificar, sem ser registrador", async function () {
      expect(
        await contrato.connect(outro).verificar(PROTOCOLO_A, 0, CRIADA, hashDe("e0"))
      ).to.equal(true);
    });
  });

  // ---------------------------------------------------------------------
  describe("transferirRegistrador", function () {
    it("só o dono troca; o novo registra e o antigo perde o acesso", async function () {
      await expect(contrato.connect(outro).transferirRegistrador(novoRegistrador.address))
        .to.be.revertedWithCustomError(contrato, "NaoAutorizado");
      await expect(contrato.connect(registrador).transferirRegistrador(novoRegistrador.address))
        .to.be.revertedWithCustomError(contrato, "NaoAutorizado");

      await expect(contrato.connect(dono).transferirRegistrador(novoRegistrador.address))
        .to.emit(contrato, "RegistradorAlterado")
        .withArgs(registrador.address, novoRegistrador.address);

      await expect(registrar(PROTOCOLO_A, CRIADA, hashDe("e0"), registrador))
        .to.be.revertedWithCustomError(contrato, "NaoAutorizado");
      await registrar(PROTOCOLO_A, CRIADA, hashDe("e0"), novoRegistrador);
      expect(await contrato.quantidadeEventos(PROTOCOLO_A)).to.equal(1n);
    });

    it("recusa o endereço zero", async function () {
      await expect(contrato.connect(dono).transferirRegistrador(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(contrato, "EnderecoInvalido");
    });

    it("os eventos já registrados continuam ali depois da troca", async function () {
      await registrar(PROTOCOLO_A, CRIADA, hashDe("e0"));
      await contrato.connect(dono).transferirRegistrador(novoRegistrador.address);

      expect(await contrato.verificar(PROTOCOLO_A, 0, CRIADA, hashDe("e0"))).to.equal(true);
    });
  });

  // ---------------------------------------------------------------------
  describe("como a API usaria o contrato (simulação, sem integração real)", function () {
    // A API calcularia estes dois hashes. Aqui, o mesmo cálculo com o `crypto` do Node.
    const CHAVE_DO_SERVIDOR = "chave-ficticia-de-teste"; // em produção, um segredo da API
    const idComoHash = (numero) =>
      "0x" + crypto.createHmac("sha256", CHAVE_DO_SERVIDOR).update(numero).digest("hex");
    const estadoComoHash = (estado) =>
      "0x" + crypto.createHash("sha256").update(JSON.stringify(estado)).digest("hex");

    // Estado FICTÍCIO, sem CPF nem descrição em texto.
    const estado = {
      id: "20260707-FICTICIO",
      tipo: "Problema técnico",
      etapa: "CRIADA",
      abertoEm: "2026-07-07T12:00:00Z",
      concluidoEm: null,
    };

    it("registra o hash do estado e detecta uma alteração posterior no banco", async function () {
      const id = idComoHash(estado.id);
      await registrar(id, CRIADA, estadoComoHash(estado));

      // O estado que está no banco ainda é o mesmo: confere.
      expect(await contrato.verificar(id, 0, CRIADA, estadoComoHash(estado))).to.equal(true);

      // Alguém altera o registro direto no banco (ex.: muda o tipo do protocolo):
      const adulterado = { ...estado, tipo: "Sugestão de melhoria" };
      expect(await contrato.verificar(id, 0, CRIADA, estadoComoHash(adulterado))).to.equal(false);
    });

    it("o identificador on-chain não revela o número do protocolo", async function () {
      const id = idComoHash(estado.id);

      expect(id).to.have.lengthOf(66); // 0x + 64 hex
      expect(id).to.not.include("FICTICIO");
      // Sem a chave do servidor não se recalcula o id a partir do número:
      const semChave = "0x" + crypto.createHash("sha256").update(estado.id).digest("hex");
      expect(semChave).to.not.equal(id);
    });
  });
});
