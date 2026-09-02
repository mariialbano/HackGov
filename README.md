# VidaReal

Plataforma GovTech de educação financeira e transparência para o cidadão de
Taubaté/SP.

---

## Funcionalidades

- **Cadastro e login** com CPF e senha, perfis de acesso e sessão com expiração
- **Perfil do usuário** — edição dos dados de cadastro e troca de senha
- **Acompanhamento de Protocolos** — abertura e acompanhamento de solicitações com status e prazos
- **Simulação de Inflação** — projeção do valor futuro de um bem (juros compostos), com gráfico e exportação em PDF
- **Metas Financeiras** — planejamento de economia mensal com análise de viabilidade
- **Indicadores Locais** — dados socioeconômicos da cidade (custo de vida, saneamento, educação)
- **Comparativo Regional e Nacional** — área restrita ao perfil atendente
- **Chatbot com IA** — assistente virtual integrado à API do Google Gemini
- **Feedback** — avaliação da experiência com nota e comentário
- **Acessibilidade** — tema claro/escuro e tradutor de Libras (VLibras) com
  botão para ligar e desligar

## Estrutura do projeto

```
VidaReal/
├── frontend/        # Aplicação React (Vite + Tailwind)
│   └── src/
│       ├── api/         # Cliente de API em módulo próprio (real + simulada)
│       ├── components/  # Componentes reutilizáveis
│       ├── context/     # Contexto de autenticação (sessão)
│       ├── hooks/       # Hooks próprios (sessão, tema, VLibras, avisos)
│       ├── pages/       # Páginas (Login, Cadastro, Perfil, Dashboard...)
│       └── utils/       # Validadores e utilitários
└── backend/         # API RESTful (Java 21 + Spring Boot)
    ├── pom.xml
    └── src/main/java/br/gov/taubate/vidareal/
        ├── modelo/        # entidades de domínio e enums
        ├── repositorio/   # camada de dados
        ├── seguranca/     # sessão, RBAC e limite de requisições
        ├── erro/          # exceções e tratamento central
        ├── web/           # um controller por recurso da API
        └── config/        # CORS, interceptors e log técnico
```

## Como rodar

**Pré-requisitos:** [Java 21+](https://adoptium.net) e
[Maven](https://maven.apache.org) para o backend;
[Node.js 18+](https://nodejs.org) para o front-end.

### Modo rápido (recomendado)

Na raiz do projeto:

```powershell
.\start.ps1
```

O script confere os pré-requisitos, instala as dependências do front-end na
primeira execução, carrega o `backend/.env`, sobe a API e a interface **na
mesma janela** — com os logs dos dois serviços intercalados e identificados
por `[API]` e `[WEB]` — espera cada um responder e abre o navegador.

**`Ctrl+C` encerra os dois serviços** e devolve o terminal.

Se preferir liberar o terminal e deixar tudo rodando em segundo plano:

```powershell
.\start.ps1 -Desanexado
```

Nesse caso, encerre depois com:

```powershell
.\stop.ps1
```

### Modo manual

**Terminal 1 — backend:**

```powershell
cd backend
.\rodar.ps1
```

A API sobe em `http://localhost:3001`. Sem PowerShell, use `mvn spring-boot:run`.

**Terminal 2 — front-end:**

```bash
cd frontend
npm install
npm run dev
```

Acesse o endereço exibido pelo Vite (geralmente `http://localhost:5173`).

> **Chatbot (opcional):** para o assistente funcionar, crie um arquivo
> `.env` dentro de `backend/` seguindo o modelo do `.env.example`, com sua
> chave da API do Google Gemini. **Sem a chave, todo o resto do sistema
> funciona normalmente** — apenas o chatbot responde com mensagem de erro.

### Usuários de demonstração

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
| **Autenticação** | `POST /auth/cadastro` · `POST /auth/login` · `GET /auth/me` · `POST /auth/logout` |
| **Perfil** | `GET`/`PUT` `/perfil` · `PATCH /perfil/senha` |
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

- Cadastro aberto ao cidadão (`POST /api/v1/auth/cadastro`) e login com CPF e
  senha, ambos processados no **backend Java**. O cadastro cria sempre o perfil
  `cidadao`: o perfil de atendente é atribuído pela gestão, nunca escolhido por
  quem se cadastra (escalonamento de privilégio).
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
- Na tela de perfil o cidadão troca a própria senha
  (`PATCH /api/v1/perfil/senha`): é exigida a senha atual, a nova senha passa
  pela mesma política de senha forte, e **a sessão é encerrada no servidor após
  a troca** — se a senha foi trocada por suspeita de vazamento, nenhum token
  antigo continua valendo.
- CPF e perfil **não são editáveis**: identificam a conta e o papel do usuário.
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
  2. **Backend**: revalida CPF e senha no `/api/v1/auth/login`; no
     `/api/v1/chat`, valida tipo e tamanho (máx. 1000 caracteres) e
     sanitiza a mensagem (remove tags HTML e caracteres de controle) antes
     de repassar à IA, retornando HTTP `400` para entradas inválidas.
     O controle de acesso é declarativo: a anotação `@Autenticado(perfis =
     Perfil.ATENDENTE)` marca o endpoint e um interceptor a aplica antes
     do controller executar.
- Mitiga XSS, injeção de conteúdo malicioso e abuso da API de IA.

## Acessibilidade e aparência

- **Tema claro e escuro**, com uma terceira opção que segue a preferência do
  sistema operacional. A escolha fica no `localStorage` (aparência é
  preferência do aparelho, não dado de sessão).
- **Contraste verificado por medição**, não a olho: todo texto das telas
  atinge o mínimo de **4,5:1** exigido pela WCAG AA (3:1 para texto grande),
  nos dois temas.
- **Tradutor de Libras (VLibras)** do gov.br, com botão para ligar e desligar
  na barra superior. Vem **desligado por padrão** — o avatar 3D é um download
  pesado e só é buscado quando o cidadão abre o tradutor. A escolha é
  lembrada entre visitas.
- Navegação por teclado com foco sempre visível, rótulos em leitores de tela
  (`aria-label`, `aria-pressed`, `sr-only`) e respeito a
  `prefers-reduced-motion`.

## Tecnologias

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router 7, Leaflet, Recharts, Lucide
- **Backend:** Java 21, Spring Boot 3.5, Spring Web, Bean Validation, BCrypt
- **Modelagem de dados:** Oracle SQL (3ª Forma Normal)
