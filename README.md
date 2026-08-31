# HackGov VidaReal

Plataforma GovTech de educação financeira e transparência para o cidadão de
Taubaté/SP.

---

## Funcionalidades

- **Login seguro** com CPF e senha, perfis de acesso e sessão com expiração
- **Acompanhamento de Protocolos** — abertura e acompanhamento de solicitações com status e prazos
- **Simulação de Inflação** — projeção do valor futuro de um bem (juros compostos), com gráfico e exportação em PDF
- **Metas Financeiras** — planejamento de economia mensal com análise de viabilidade
- **Indicadores Locais** — dados socioeconômicos da cidade (custo de vida, saneamento, educação)
- **Comparativo Regional e Nacional** — área restrita ao perfil atendente
- **Chatbot com IA** — assistente virtual integrado à API do Google Gemini
- **Feedback** — avaliação da experiência com nota e comentário

## Estrutura do projeto

```
HackGov/
├── frontend/        # Aplicação React (Vite + Tailwind)
│   └── src/
│       ├── api/         # Cliente de API em módulo próprio (real + simulada)
│       ├── components/  # Componentes reutilizáveis
│       ├── context/     # Contexto de autenticação (sessão)
│       ├── pages/       # Páginas (Login, Dashboard, Protocolos...)
│       └── utils/       # Validadores e utilitários
└── backend/         # API RESTful (Node.js + Express)
    └── src/
        ├── app.js         # middlewares e montagem das rotas
        ├── store.js       # camada de dados
        ├── middlewares/   # autenticação, RBAC, tratamento de erros
        └── routes/        # um arquivo por recurso da API
```

## Como rodar

**Pré-requisito:** [Node.js](https://nodejs.org) 18 ou superior.

### 1. Backend (terminal 1)

```bash
cd backend
npm install
npm start
```

O backend roda em `http://localhost:3001` e atende o **login** e o
**chatbot de IA**.

> **Chatbot (opcional):** para o chatbot funcionar, crie um arquivo `.env`
> dentro de `backend/` seguindo o modelo do `.env.example`, com sua chave
> da API do Google Gemini. **Sem a chave, todo o resto do sistema funciona
> normalmente** — apenas o chatbot responde com mensagem de erro.

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Acesse o endereço exibido pelo Vite (geralmente `http://localhost:5173`).

### 3. Usuários de demonstração

| Perfil    | CPF            | Senha         | Acesso                          |
|-----------|----------------|---------------|---------------------------------|
| Cidadão   | 529.982.247-25 | Cidadao@123   | Funcionalidades gerais          |
| Atendente | 153.509.460-56 | Atendente@123 | Geral + Comparativos (restrito) |

## API RESTful

Todo o sistema é servido por uma API REST versionada em
`http://localhost:3001/api/v1`. Com o backend rodando, `GET /api/v1` lista
todos os endpoints disponíveis.

| Recurso | Endpoints |
|---|---|
| **Autenticação** | `POST /auth/login` · `GET /auth/me` · `POST /auth/logout` |
| **Protocolos** | `GET`/`POST` `/protocolos` · `GET`/`PUT`/`DELETE` `/protocolos/:id` · `PATCH /protocolos/:id/status` · `GET /protocolos/estatisticas` |
| **Metas** | `GET`/`POST` `/metas` · `GET`/`PUT`/`DELETE` `/metas/:id` · `PATCH /metas/:id/aporte` |
| **Feedbacks** | `POST /feedbacks` · `GET /feedbacks` (atendente) |
| **Chat (IA)** | `POST /chat` |
| **Auditoria** | `GET /auditoria` (atendente) |

Boas práticas aplicadas: versionamento no caminho, métodos HTTP semânticos,
códigos de status corretos (`200`, `201` + `Location`, `204`, `400`, `401`,
`403`, `404`, `409`, `429`), envelope de erro único com detalhamento por
campo, paginação, filtros e *rate limiting*.

O React consome a API por uma camada de serviços isolada
(`frontend/src/api/`): `apiClient.js` concentra URL base, envio do token e
normalização de erros; cada recurso tem seu próprio serviço. As telas tratam
explicitamente os três estados de integração — **carregando, sucesso e
falha** — e devolvem os erros de validação do servidor para os campos do
formulário que os originaram.

## Segurança da informação

O sistema aplica três práticas de segurança, essenciais em um sistema
GovTech que lida com dados de cidadãos (CPF, metas financeiras,
protocolos):

### 1. Autenticação de usuários

- Login com CPF e senha, processado no **backend** (`POST /api/login`).
- As senhas existem apenas como **hash bcrypt** — nunca em texto puro.
  Mesmo em caso de vazamento do banco, as senhas não são expostas.
- **Política de senha forte**, exibida como checklist em tempo real no
  formulário (cada item fica verde conforme é atendido):
  - pelo menos 1 letra maiúscula;
  - pelo menos 1 letra minúscula;
  - pelo menos 1 número;
  - pelo menos 1 caractere especial;
  - mínimo de 8 caracteres.
- A mensagem de erro de credenciais é genérica ("CPF ou senha incorretos"),
  sem revelar se o CPF existe — evita enumeração de usuários. Quando o CPF
  não existe, o servidor compara contra um hash falso para que o tempo de
  resposta seja igual ao de um usuário real (evita enumeração por timing).
- A sessão fica em `sessionStorage` e expira **ao fechar a aba** ou após
  **15 minutos de inatividade** — proteção para computadores
  compartilhados, comuns em telecentros e órgãos públicos.
- Em produção, o login seria integrado ao **gov.br (OAuth 2.0)**, padrão
  oficial do governo federal; o formulário CPF/senha simula esse fluxo.

### 2. Controle de acesso por perfis (RBAC)

- Dois perfis, alinhados aos atores do UML do projeto: **cidadão**
  (funcionalidades gerais) e **atendente** (relatórios comparativos).
- Todas as rotas internas exigem autenticação; a rota `/comparativos`
  exige o perfil `atendente`. Quem não tem o perfil vê a tela
  "Acesso restrito".
- A Navbar esconde o menu "Comparativo" de quem não é atendente — mas a
  proteção real está na rota, não no menu.
- Aplica o **princípio do menor privilégio**: cada usuário só acessa o que
  sua função exige (segregação de funções).

### 3. Validação e sanitização de entradas

- **CPF** validado com dígitos verificadores (rejeita sequências como
  111.111.111-11).
- Validação em **duas camadas** — a regra é nunca confiar no cliente:
  1. **Frontend**: feedback imediato por campo, com estados de
     carregando/sucesso/falha;
  2. **Backend**: revalida CPF e senha no `/api/login`; no `/api/chat`,
     valida tipo e tamanho (máx. 1000 caracteres) e sanitiza a mensagem
     (remove tags HTML e caracteres de controle) antes de repassar à IA,
     retornando HTTP `400` para entradas inválidas.
- Mitiga XSS, injeção de conteúdo malicioso e abuso da API de IA.

## Tecnologias

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router 7, Recharts, Lucide
- **Backend:** Node.js, Express 5, bcryptjs, dotenv
