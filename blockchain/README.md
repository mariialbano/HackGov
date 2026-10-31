# Blockchain: registro de integridade dos protocolos (protótipo acadêmico)

Contrato **Solidity** que guarda, em ordem, os **hashes** dos eventos do ciclo
de vida de um protocolo do HackGov (Criada → Em análise → Concluído), para que
qualquer pessoa possa verificar depois se o estado guardado no banco de dados
continua o mesmo.

> **Escopo:** protótipo testado e implantado em **rede local**. **Não há
> integração com a API Java** (sem web3j, sem rede permissionada, sem Merkle
> Tree). A integração aparece só como possibilidade futura, no fim deste arquivo.
> Não é uma funcionalidade pronta para produção.

## O que existe

| Arquivo | Função |
|---|---|
| [contracts/RegistroProtocolos.sol](contracts/RegistroProtocolos.sol) | O contrato |
| [test/RegistroProtocolos.test.js](test/RegistroProtocolos.test.js) | 22 testes (Mocha + Chai) |
| [scripts/deploy.js](scripts/deploy.js) | Implanta o contrato na rede escolhida |
| [scripts/demo.js](scripts/demo.js) | Demonstração: registra e verifica um protocolo **fictício** |
| [hardhat.config.js](hardhat.config.js) | Configuração (Solidity 0.8.28) |

## Como rodar

Requer Node.js 20 ou mais novo e internet na primeira compilação (o Hardhat
baixa o compilador `solc` 0.8.28).

```powershell
cd blockchain
npm ci            # instala as dependências do package-lock.json
npm test          # compila e roda os 22 testes (rede em memória)
```

Para a demonstração em uma rede local, em **dois terminais**:

```powershell
# Terminal 1: sobe a rede local (porta 8545) e fica rodando
npm run node

# Terminal 2:
npm run deploy    # implanta o contrato e grava o endereço em deployments/localhost.json
npm run demo      # registra os 3 eventos de um protocolo fictício e verifica
```

A saída do `demo` mostra o histórico lido da cadeia, a verificação (`CONFERE`),
uma adulteração detectada (`NÃO CONFERE`) e a recusa de uma conta não autorizada.
Encerre o terminal 1 com `Ctrl+C`.

## Dependências (só em `blockchain/`, nada muda no frontend nem no backend)

| Pacote | Versão | Para quê |
|---|---|---|
| `hardhat` | 2.29.1 | Compila, testa e roda a rede local |
| `@nomicfoundation/hardhat-ethers` | 3.1.3 | Liga o Hardhat à biblioteca ethers |
| `ethers` | 6.17.0 | Fala com o contrato (deploy, chamadas) |
| `@nomicfoundation/hardhat-chai-matchers` | 2.1.2 | `revertedWithCustomError`, `emit` etc. nos testes |
| `chai` | 4.5.0 | Asserções |

Escolhas: **Hardhat 2** (a mais documentada; existe a série 3, mais nova) e
**cinco pacotes em vez do `hardhat-toolbox`**, que traria cerca de quinze a mais
(TypeScript, typechain, relatório de gás, cobertura, verificação...) sem uso
aqui. As versões estão fixadas (`--save-exact`).

## O contrato

Dois papéis: o **dono** (quem implanta; só troca o registrador) e o
**registrador** (conta de serviço, no futuro a API; é o único que registra).
A leitura e a verificação são públicas.

| Função | Quem | O que faz |
|---|---|---|
| `registrar(idProtocoloHash, etapa, hashEstado)` | registrador | Acrescenta um evento ao histórico do protocolo. Devolve o índice |
| `transferirRegistrador(novo)` | dono | Troca a conta autorizada a registrar |
| `quantidadeEventos(id)`, `obterEvento(id, i)`, `ultimoEvento(id)` | qualquer um | Lê o histórico |
| `verificar(id, i, etapa, hashEstado)` | qualquer um | `true` só se o evento `i` tem exatamente essa etapa e esse hash. Nunca reverte |

**Evento:** `EventoRegistrado(idProtocoloHash, indice, etapa, hashEstado, registrador, registradoEm)`;
`RegistradorAlterado(anterior, novo)`.

**Validações** (erros personalizados): `NaoAutorizado`, `EtapaInvalida` (fora de 1 a 3),
`HashInvalido` (zero), `EnderecoInvalido`, `EventoDuplicado`, `EventoInexistente`.

**Regras de negócio:**
- Os eventos ficam em **sequência**, e o contrato **não proíbe retrocesso**: o HackGov
  permite reabrir um protocolo concluído, e a reabertura fica no histórico.
- O **mesmo evento duas vezes seguidas** (mesma etapa e mesmo hash) é recusado, como
  proteção contra reenvio acidental. Mesma etapa com estado diferente (edição) é aceita.
- Não existe função para **alterar ou apagar** um evento: o histórico é imutável.

## Só hashes na cadeia, nunca os dados

Entram na cadeia dois valores de 32 bytes, calculados pela API:

- **`idProtocoloHash`**: HMAC-SHA256 do número do protocolo, com uma chave que não sai
  da API. O número tem pouca aleatoriedade (data + 5 dígitos): um SHA-256 simples seria
  recalculável por força bruta, o HMAC com chave secreta não.
- **`hashEstado`**: SHA-256 de uma representação canônica do estado do protocolo
  (número, tipo, etapa, datas). **Sem CPF, sem nome e sem a descrição em texto.**

O banco relacional continua sendo a fonte da verdade. A cadeia só permite comprovar
que o estado **não foi alterado depois** e **quando** o registro foi feito
(`block.timestamp`). Dados pessoais em uma blockchain não podem ser apagados, o que
é incompatível com a LGPD; por isso nada pessoal vai para lá.

## Resultados dos testes

- `npm test`: **22 passando, 0 falhando** (controle de acesso, validações, histórico com
  retrocesso, duplicidade, verificação, troca de registrador e uma simulação de como a API
  calcularia os hashes e detectaria uma alteração).
- **Checagem de mutação manual:** quebrei o contrato de propósito de 5 formas (sem controle
  de acesso no `registrar`, sem checagem de duplicado, `verificar` ignorando o hash, aceitando
  etapa inválida, `transferirRegistrador` sem dono). Cada uma fez ao menos um teste falhar;
  o contrato original foi restaurado (22 passando). Não é automatizada.
- `npm run deploy` e `npm run demo` executados em rede local do Hardhat, com o resultado descrito acima.

## Limitações

- **Rede local, sem valor real.** As contas são as de teste do Hardhat, cujas chaves são
  públicas: **nunca use essas contas em uma rede de verdade**.
- **Confiança centralizada:** dono e registrador são contas únicas. A cadeia garante que o
  registro não muda, mas não que o registrador registrou tudo (ele pode simplesmente omitir
  um evento).
- **Só detecta alteração do que foi registrado.** Um protocolo alterado **antes** de ser
  registrado, ou nunca registrado, não é pego.
- A verificação depende de a API calcular o `hashEstado` **sempre da mesma forma** (mesma
  ordem de campos, mesmo formato de data). Isso não existe ainda.
- Sem teste de carga nem de custo de gás para uma rede real.

## Integração futura com a API (possibilidade, não implementada)

A ideia é que a API Java, ao gravar uma mudança de etapa de protocolo, calcule o
`idProtocoloHash` e o `hashEstado` e os envie ao contrato por uma conta de serviço, **de
forma assíncrona** (por exemplo, por uma fila/tabela de pendências), para que uma blockchain
fora do ar nunca impeça o atendimento. Um endpoint de verificação recalcularia o hash do
estado atual e chamaria `verificar`. O hash mais recente da cadeia de hashes da trilha de
auditoria (`/api/v1/auditoria/integridade`) também poderia ser ancorado aqui, o que fecha a
limitação conhecida de que apagar os registros mais recentes da auditoria não é detectado.
Para uso real, a rede deveria ser permissionada (por exemplo, entre prefeitura e órgão de
controle). Nada disso foi construído.
