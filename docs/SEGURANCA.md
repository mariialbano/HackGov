# Parte 4 — Segurança da Informação (Neemias)

O HackGov VidaReal é um sistema GovTech que lida com dados de cidadãos
(CPF, metas financeiras, protocolos de atendimento). Por isso, aplicamos
três práticas reais de segurança no projeto, descritas e justificadas abaixo.
As práticas implementam diretamente as user stories **US06 (Autenticação e
segurança de usuários)** e **US07 (Validação e segurança de entradas)** do
Product Backlog atualizado nesta fase.

---

## Prática 1 — Autenticação de usuários (login com senha criptografada)

**O que foi implementado**

- Tela de login com CPF e senha ([frontend/src/pages/Login.jsx](../frontend/src/pages/Login.jsx)),
  substituindo o acesso direto sem credenciais que existia antes.
- O login é processado no **backend** (rota `POST /api/login` em
  [backend/server.js](../backend/server.js)): as senhas são armazenadas
  apenas como **hash bcrypt** (custo 10) — nunca em texto puro — e a
  verificação usa `bcrypt.compare`, atendendo ao critério da US06
  ("senhas armazenadas de forma criptografada").
- Quando o CPF não existe, o servidor compara contra um **hash falso**
  para que o tempo de resposta seja igual ao de um usuário real
  (evita enumeração de usuários por timing).
- A mensagem de erro de credenciais é genérica ("CPF ou senha incorretos"),
  sem revelar se o CPF existe no sistema.
- Sessão guardada em `sessionStorage` via contexto React
  ([frontend/src/context/AuthContext.jsx](../frontend/src/context/AuthContext.jsx)):
  - expira ao **fechar a aba** (risco de computador compartilhado, comum
    em telecentros e órgãos públicos);
  - expira após **15 minutos de inatividade** (critério da US06) — o
    sistema monitora interações e encerra a sessão automaticamente.

**Justificativa**

Sem autenticação, qualquer pessoa acessaria protocolos e metas financeiras
de terceiros. Em um sistema GovTech, identificar o cidadão é requisito legal
(LGPD, art. 6º — princípio da segurança) e funcional. Em produção, o login
seria integrado ao gov.br (OAuth 2.0), padrão oficial do governo federal —
o formulário CPF/senha simula localmente esse fluxo.

**Política de senha forte**

A senha deve atender a todos os requisitos abaixo, exibidos como uma
checklist em tempo real no formulário de login (cada item fica verde
conforme é atendido):

- pelo menos 1 letra maiúscula;
- pelo menos 1 letra minúscula;
- pelo menos 1 número;
- pelo menos 1 caractere especial;
- mínimo de 8 caracteres.

**Usuários de demonstração**

| Perfil    | CPF            | Senha         |
|-----------|----------------|---------------|
| Cidadão   | 529.982.247-25 | Cidadao@123   |
| Atendente | 153.509.460-56 | Atendente@123 |

---

## Prática 2 — Controle de acesso por perfis (RBAC)

**O que foi implementado**

- Dois perfis, alinhados aos atores do diagrama UML das fases anteriores:
  **cidadão** (funcionalidades públicas) e **atendente** (relatórios
  comparativos da gestão).
- Componente `ProtectedRoute`
  ([frontend/src/components/ProtectedRoute.jsx](../frontend/src/components/ProtectedRoute.jsx)):
  - usuário sem sessão é redirecionado ao login;
  - usuário autenticado sem o perfil exigido vê a tela "Acesso restrito".
- Todas as rotas internas exigem autenticação; a rota `/comparativos`
  exige o perfil `atendente` ([frontend/src/App.jsx](../frontend/src/App.jsx)).
- A Navbar esconde o menu "Comparativo" de quem não é atendente
  ([frontend/src/components/Navbar.jsx](../frontend/src/components/Navbar.jsx)) —
  mas a proteção real está na rota, não no menu (esconder botão não é
  controle de acesso, é só usabilidade).

**Justificativa**

Aplica o **princípio do menor privilégio**: cada usuário só acessa o que
sua função exige. Em GovTech isso também atende à **segregação de funções** —
o cidadão consulta seus dados; o atendente analisa dados agregados. Sem RBAC,
um único vazamento de credencial exporia todas as funcionalidades do sistema.

> Nota: o critério da Fase 2 que dispensava login para a simulação de
> inflação (US-01) foi revisado no backlog desta fase — a US06 passou a
> exigir autenticação válida para todas as áreas internas.

---

## Prática 3 — Validação e sanitização de entradas

**O que foi implementado**

- Módulo de validação reutilizável
  ([frontend/src/utils/validators.js](../frontend/src/utils/validators.js)):
  - **CPF**: validação completa com dígitos verificadores (rejeita
    sequências como 111.111.111-11);
  - **Senha**: política de senha forte (maiúscula, minúscula, número,
    caractere especial e mínimo de 8 caracteres), com checklist visual
    em tempo real no formulário;
  - **Sanitização**: remove tags HTML (mitiga XSS) e caracteres de
    controle, e limita o tamanho do texto.
- Validação em **duas camadas** (critério da US07: "o backend deve
  sanitizar todas as requisições recebidas"):
  1. **Frontend** — feedback imediato no formulário de login (erros por
     campo, estados de carregando/sucesso/falha);
  2. **Backend** ([backend/server.js](../backend/server.js)) —
     - `/api/login` revalida o CPF (dígitos verificadores) e o formato
       da senha no servidor;
     - `/api/chat` valida tipo, tamanho (máx. 1000 caracteres) e
       sanitiza a mensagem antes de repassar à IA, retornando HTTP 400
       com mensagem clara quando inválida.

**Justificativa**

A regra de ouro é **nunca confiar no cliente**: qualquer um pode chamar a
API diretamente (curl/Postman), ignorando o frontend. Validar no servidor
impede injeção de conteúdo malicioso (XSS, prompt injection no chatbot) e
abuso da API de IA (mensagens gigantes geram custo). A validação de CPF com
dígito verificador também melhora a qualidade do dado — requisito básico em
bases governamentais.

---

## Evolução do modelo de dados (Fase 3 → Fase 4)

A tabela `USUARIO` do modelo lógico da Fase 3 possui `id_usuario, nome,
email, renda_mensal`. Para suportar as práticas desta fase, a evolução
natural do modelo é:

```sql
ALTER TABLE USUARIO ADD senha_hash VARCHAR2(60) NOT NULL;  -- hash bcrypt
ALTER TABLE USUARIO ADD perfil VARCHAR2(20) DEFAULT 'cidadao' NOT NULL;
ALTER TABLE USUARIO ADD CONSTRAINT ck_usuario_perfil
  CHECK (perfil IN ('cidadao', 'atendente'));
```

A coluna armazena o **hash** (60 caracteres no formato bcrypt), nunca a
senha. Isso garante que, mesmo em caso de vazamento do banco, as senhas
não sejam expostas.

## Implementado nesta fase vs. evolução futura

| Item                                   | Status                         |
|----------------------------------------|--------------------------------|
| Login com CPF + senha                  | ✅ Implementado                |
| Senhas com hash bcrypt no backend      | ✅ Implementado                |
| Expiração de sessão por inatividade    | ✅ Implementado (15 min)       |
| Controle de acesso por perfis (RBAC)   | ✅ Implementado                |
| Validação de entradas (front + back)   | ✅ Implementado                |
| Cadastro de novos usuários (US06)      | ⏳ Evolução futura             |
| Integração real com gov.br (OAuth 2.0) | ⏳ Evolução futura             |
| JWT assinado no lugar do token simples | ⏳ Evolução futura             |

## Resumo

| Prática                  | Onde está no código                          | Risco mitigado                          |
|--------------------------|----------------------------------------------|------------------------------------------|
| Autenticação (bcrypt)    | `Login.jsx`, `authService.js`, `server.js`   | Acesso anônimo, vazamento de senhas      |
| Controle de acesso (RBAC)| `ProtectedRoute.jsx`, `App.jsx`, `Navbar`    | Escalada de privilégio, segregação       |
| Validação de entradas    | `validators.js`, `server.js`                 | XSS, injeção, abuso de API, dados ruins  |
