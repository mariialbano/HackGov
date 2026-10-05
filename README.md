# VidaReal

Plataforma GovTech de educação financeira e transparência para o cidadão de
Taubaté/SP.

---

## Funcionalidades

- **Cadastro e login** com CPF, e-mail e senha, perfis de acesso e sessão com expiração
- **Recuperação de senha por e-mail** — "esqueci minha senha" com link temporário de uso único
- **Perfil do usuário** — edição dos dados de cadastro e troca de senha
- **Acompanhamento de Protocolos** — abertura e acompanhamento de solicitações com status e prazos
- **Simulação de Inflação** — projeção do valor futuro de um bem (juros compostos), com gráfico e exportação em PDF
- **Metas Financeiras** — planejamento de economia mensal com análise de viabilidade
- **Indicadores Municipais** — população, PIB, PIB por habitante, saneamento,
  IDEB, escolarização e salário médio de qualquer município do país (escolha
  por estado), com mapa em quatro camadas, o contorno real do território e
  oito camadas de equipamentos públicos
- **Comparativo entre municípios** — duas cidades quaisquer lado a lado, com
  atalho para a cidade do próprio cadastro (área restrita ao perfil atendente)
- **Dados abertos de governo** — IPCA e Selic do Banco Central, feriados nacionais,
  população e PIB do IBGE, endereço por CEP
- **Triagem inteligente de protocolos (IA)** — a plataforma sugere a categoria a partir da
  descrição (classificador Naive Bayes, local) e calcula a prioridade de atendimento
- **Chatbot com IA** — assistente virtual integrado à API do Google Gemini
- **Feedback** — avaliação da experiência com nota e comentário
- **Exportação em PDF** — relatório da simulação de inflação e comprovante de protocolo
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
        ├── triagem/       # IA: classificador Naive Bayes e regras de prioridade
        ├── erro/          # exceções e tratamento central
        ├── web/           # um controller por recurso da API
        └── config/        # CORS, interceptors e log técnico
```

## Como rodar

**Pré-requisitos:** [Java 21+](https://adoptium.net) para o backend e
[Node.js 18+](https://nodejs.org) para o front-end. O Maven não precisa ser
instalado: o projeto usa o Maven Wrapper (`backend/mvnw`), que baixa a
versão correta na primeira execução.

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

A API sobe em `http://localhost:3001`. Sem PowerShell, use `./mvnw spring-boot:run`
(ou `mvnw.cmd spring-boot:run` no Windows).

**Terminal 2 — front-end:**

```bash
cd frontend
npm install
npm run dev
```

Acesse o endereço exibido pelo Vite (geralmente `http://localhost:5173`).

### O que funciona logo após clonar

Clonar e rodar `.\start.ps1` já entrega o sistema inteiro, **exceto duas
funcionalidades** que dependem de credenciais pessoais — e credencial não
vai para o repositório:

| Funcionalidade | Variáveis | Sem a configuração |
|---|---|---|
| Recuperação de senha por e-mail | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | "Esqueci minha senha" avisa que está indisponível |
| Chatbot | `IA_API_KEY` (Google Gemini) | O chatbot responde com mensagem de erro |

Para ativá-las, crie o arquivo `backend/.env` a partir do modelo
`backend/.env.example`. Isso é feito **uma vez por máquina**: o `start.ps1`
e o `rodar.ps1` carregam o arquivo sozinhos em toda execução. O `.env` está
no `.gitignore`; cada pessoa do grupo precisa do seu.

### Configurando o envio de e-mail (Gmail)

O sistema precisa de uma conta de e-mail para ser o **remetente** das
mensagens de recuperação de senha. Os cidadãos podem ter e-mail em qualquer
provedor.

1. Escolha a conta Google remetente. Para um grupo, o ideal é uma conta
   criada só para o projeto, e não o e-mail pessoal de alguém: a senha de app
   permite enviar e-mails em nome da conta.
2. Em <https://myaccount.google.com/security>, ative a **verificação em duas
   etapas**.
3. Em <https://myaccount.google.com/apppasswords>, gere uma **senha de app**.
   São 16 letras, mostradas uma única vez. A senha normal da conta não
   funciona para SMTP.
4. Crie `backend/.env`:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=conta_remetente@gmail.com
   SMTP_PASSWORD=as16letrasdasenhadeapp
   ```

   Escreva a senha **sem os espaços** que o Google exibe e sem aspas.
5. Reinicie: `.\stop.ps1` e depois `.\start.ps1`. O `.env` só é lido na
   subida.

Para testar: crie uma conta pelo **Cadastre-se** com um e-mail seu, saia,
clique em **Esqueci minha senha** e informe o CPF. O e-mail chega em alguns
segundos; na primeira vez, confira também o spam.

Se algo não funcionar:

| Sintoma | Causa |
|---|---|
| "A recuperação de senha está indisponível..." | Não existe `backend/.env`, ou a API não foi reiniciada depois de criá-lo. Na subida, o `start.ps1` informa quantas variáveis carregou. |
| A página de senhas de app diz que o recurso não está disponível | A verificação em duas etapas está desligada, ou a conta é de escola/empresa e o administrador bloqueia. |
| "Confira seu e-mail" aparece, mas nada chega | Olhe o spam. Depois, procure `[recuperacao] falha ao enviar o e-mail` em `.run/api.log`: senha de app errada ou com espaços é o motivo mais comum. |
| Nada chega para uma conta específica | A conta não tem e-mail cadastrado (contas antigas) ou o endereço foi digitado errado no cadastro. |

Outros servidores SMTP com usuário e senha funcionam do mesmo jeito,
trocando host e porta. Contas pessoais do Outlook/Hotmail costumam recusar
esse tipo de acesso como remetente, porque a Microsoft passou a exigir OAuth.

### O que não vai para o repositório

Estes itens estão no `.gitignore` e ficam só na máquina de quem roda:

- **`backend/.env`** — as credenciais (senha de app, chave do Gemini).
- **`backend/data/`** — o banco de dados. Quem clona o projeto não recebe os
  dados de ninguém: na primeira execução a API cria um banco novo, apenas
  com as duas contas de demonstração.
- **`.run/`** — os logs de execução.

Dentro do banco, as senhas existem apenas como hash BCrypt e os tokens de
recuperação apenas como SHA-256. Os demais dados (nome, CPF, e-mail) ficam
em texto, protegidos pelo fato de o arquivo não sair da máquina; cifrar o
banco em disco seria o passo seguinte para um ambiente de produção.

### Usuários de demonstração

| Perfil    | CPF            | Senha         | Acesso                          |
|-----------|----------------|---------------|---------------------------------|
| Cidadão   | 529.982.247-25 | Cidadao@123   | Funcionalidades gerais          |
| Atendente | 153.509.460-56 | Atendente@123 | Geral + Comparativos (restrito) |

Essas duas contas nascem com e-mails do domínio `example.com`, que é
reservado e nunca entrega. Para demonstrar a recuperação de senha, crie uma
conta pelo **Cadastre-se** com um e-mail seu, ou defina `DEMO_EMAIL_CIDADAO`
no `backend/.env`.

## API RESTful

Todo o sistema é servido por uma API REST versionada em
`http://localhost:3001/api/v1`. Com o backend rodando, `GET /api/v1` lista
todos os endpoints disponíveis.

| Recurso | Endpoints |
|---|---|
| **Autenticação** | `POST /auth/cadastro` · `POST /auth/login` · `POST /auth/recuperacao` · `POST /auth/recuperacao/confirmar` · `GET /auth/me` · `POST /auth/logout` |
| **Perfil** | `GET`/`PUT` `/perfil` · `PATCH /perfil/senha` |
| **Protocolos** | `GET`/`POST` `/protocolos` · `GET`/`PUT`/`DELETE` `/protocolos/:id` · `PATCH /protocolos/:id/status` · `GET /protocolos/estatisticas` |
| **Triagem (IA)** | `POST /protocolos/sugestao` · `GET /protocolos/triagem/modelo` (atendente) · `GET /protocolos?ordem=prioridade` (atendente) |
| **Metas** | `GET`/`POST` `/metas` · `GET`/`PUT`/`DELETE` `/metas/:id` · `PATCH /metas/:id/aporte` |
| **Feedbacks** | `POST /feedbacks` · `GET /feedbacks` (atendente) |
| **Chat (IA)** | `POST /chat` |
| **Dados abertos** | `GET /dados/ipca` · `GET /dados/selic` · `GET /dados/feriados` · `GET /dados/prazo` · `GET /dados/municipios` · `GET /dados/municipios/:id` · `GET /dados/cep/:cep` |
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
- **O e-mail é obrigatório e único.** É o canal de recuperação de senha, então
  o cadastro exige um e-mail válido e recusa um endereço já usado por outra
  conta (dois usuários com o mesmo e-mail receberiam o link um do outro). A
  comparação ignora maiúsculas e minúsculas.
- **Trocar o e-mail no perfil exige a senha atual.** Sem isso, quem achasse
  uma sessão aberta trocaria o e-mail e, em seguida, redefiniria a senha — a
  mesma tomada de conta que a troca de senha já impede.
- **Esqueci minha senha**: na tela de login, o cidadão informa o CPF e recebe,
  **no e-mail cadastrado**, um link para escolher uma nova senha
  (`POST /api/v1/auth/recuperacao` e `POST /api/v1/auth/recuperacao/confirmar`).
  - O link traz um **token aleatório de 256 bits**, gerado como o da sessão,
    que **vale por 15 minutos e uma única vez**. Pedir um novo invalida o
    anterior.
  - O banco guarda só o **SHA-256 do token**, nunca o token: quem ler o
    banco não consegue redefinir a senha de ninguém.
  - A resposta é **idêntica para CPF cadastrado e não cadastrado**, e leva o
    mesmo tempo mínimo nos dois casos — a rota não serve para descobrir quem
    tem conta.
  - Token inexistente, vencido e já usado recebem a **mesma mensagem**.
  - A nova senha passa pela mesma política de senha forte e é gravada com o
    mesmo BCrypt. Depois da troca, **todas as sessões abertas da conta são
    encerradas**.
  - Nem a senha nem o token aparecem em log ou na trilha de auditoria.
  - O link chega **somente por e-mail**, enviado por SMTP com conexão
    criptografada (STARTTLS). A API nunca o devolve — devolvê-lo deixaria
    qualquer pessoa trocar a senha de qualquer CPF. A mensagem vai em texto
    puro e em HTML, e nem o link nem o destinatário aparecem em log.
  - O envio acontece **fora da requisição**, em uma fila própria. Falar com o
    servidor de e-mail leva de um a três segundos; feito dentro da
    requisição, esse tempo denunciaria quais CPFs têm conta.
  - Sem SMTP configurado, a rota responde `503` antes de olhar o CPF.
  - Limitações: o e-mail **não é verificado** no cadastro (não há link de
    confirmação), então um endereço digitado errado deixa a conta sem
    recuperação; contas criadas antes de o e-mail ser obrigatório não têm
    para onde receber o link até informarem um no perfil; e uma falha do
    servidor de e-mail só aparece no log, porque a resposta ao cidadão não
    pode mudar.
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

## Triagem inteligente de protocolos (IA)

Ao abrir um protocolo, o cidadão escreve a descrição e a plataforma **sugere a
categoria**; o atendente recebe cada protocolo com uma **prioridade** e pode
ordenar a fila por ela. São duas técnicas diferentes, e a diferença importa:

| O quê | Técnica | É aprendizado de máquina? |
|---|---|---|
| Categoria sugerida | Classificador **Naive Bayes Multinomial** | Sim |
| Prioridade | **Regras determinísticas** com pontuação | Não |

A prioridade não foi "prevista" por um modelo porque não existe histórico de
protocolos com prioridade rotulada para treinar um.

Tudo roda dentro da própria API, em Java puro: **sem Gemini, sem API externa,
sem chave, sem internet e sem dependência nova**. O mesmo texto recebe sempre
a mesma resposta.

### Fluxo

1. O cidadão digita a descrição em **Protocolos → Abrir protocolo**.
2. Após uma pausa na digitação, a tela chama `POST /api/v1/protocolos/sugestao`.
3. O servidor classifica e devolve a categoria, a confiança e os termos que pesaram.
4. A tela mostra o painel **Sugestão da IA** com o botão **Usar esta categoria**.
   O campo de categoria nunca muda sozinho: **a escolha final é do cidadão**.
5. No envio, o servidor refaz a triagem (não confia no que o navegador exibiu)
   e grava prioridade, motivos, categoria sugerida e confiança.
6. O **atendente** vê o selo de prioridade em cada protocolo, os motivos e a
   categoria sugerida nos detalhes, e o botão **Ordenar por prioridade**.

O cidadão não recebe a prioridade nem os motivos: a API só inclui o bloco
`triagem` na resposta quando quem pede é o atendente.

### Classificador de categoria

- **Representação:** *bag-of-words* com unigramas e bigramas, depois de passar
  para minúsculas, remover acentos e *stopwords*, reduzir plurais e trocar
  todo número por um termo único.
- **Treino:** contagem em passada única na subida da API, com suavização de
  Laplace. Não há sorteio nem iteração.
- **Explicação:** os termos exibidos são os de maior diferença entre o log da
  verossimilhança na categoria vencedora e a média nas demais.
- **Complexidade:** treino O(N·L); classificação O(C·n), linear no tamanho da
  descrição (N exemplos, L termos por exemplo, C = 5 categorias, n termos no
  texto).

**Sobre a confiança:** é uma medida **relativa entre as cinco categorias**
(softmax das pontuações, amortecido pela raiz do número de termos). **Não é
uma probabilidade calibrada de acerto.** Abaixo de 0,45, ou com menos de três
palavras conhecidas, o sistema prefere não sugerir; a partir de 0,65 a tela
rotula a confiança como "alta", e entre os dois limites, como "média".

### Dataset

O arquivo [`backend/src/main/resources/ia/dataset-protocolos.json`](backend/src/main/resources/ia/dataset-protocolos.json)
traz a versão, a origem e os 180 exemplos (36 por categoria):

> Dataset sintético curado para protótipo acadêmico, elaborado manualmente com
> exemplos representativos das cinco categorias do HackGov, sem utilização de
> dados pessoais ou protocolos reais de cidadãos.

As categorias são as cinco de `Repositorio.TIPOS_PROTOCOLO`: Análise de
viabilidade de Metas Financeiras, Dúvida sobre inflação, Solicitação de
orientação financeira, Problema técnico e Sugestão de melhoria. Há frases
formais, coloquiais e casos de fronteira entre categorias.

Com o backend rodando, `GET /api/v1/protocolos/triagem/modelo` (atendente)
devolve a ficha do modelo: algoritmo, versão do dataset, categorias, exemplos
por categoria, tamanho do vocabulário, acurácia e a lista dos exemplos.

### Validação

O modelo foi avaliado por *leave-one-out* sobre o próprio dataset (v1.0.0):
para cada um dos 180 exemplos, treina-se com os outros 179 e classifica-se o
que ficou de fora. Contagens, vocabulário e priors são recalculados a cada
rodada, então o exemplo avaliado nunca participa do treino que o avalia.

| Medida | Resultado |
|---|---|
| Categoria mais pontuada é a correta | 156 de 180 = **86,7%** |
| Sugestão exibida (confiança ≥ 0,45 e ao menos três palavras conhecidas) | 143 de 180 = 79,4% |
| Sugestão exibida e correta | 132 de 143 = 92,3% |

Esses números precisam ser lidos com três ressalvas:

- **Não existe conjunto de teste separado.** Toda a medição usa o mesmo
  dataset sintético de 180 exemplos; nenhum texto real de cidadão foi usado.
- **O dataset foi ampliado depois de ver os erros.** A primeira versão tinha
  120 exemplos e acertava 74%; os 60 exemplos acrescentados foram escritos
  conhecendo as falhas da primeira medição.
- **Os limites 0,45 e 0,65 foram calibrados neste mesmo dataset.** Os 92,3%
  são, por isso, uma medida otimista: descrevem o ajuste aos dados usados
  para escolher os limites, não o desempenho esperado em produção.

Uma avaliação honesta do desempenho real exigiria protocolos de cidadãos,
rotulados por atendentes e guardados à parte do treino.

### Regras de prioridade

| Fator | Exemplos | Pontos |
|---|---|---|
| Categoria "Problema técnico" | — | +2 |
| Categoria de orientação financeira ou análise de metas | — | +1 |
| Relato de impedimento de uso | "não consigo", "não carrega", "travou", "erro ao", "aparece erro" | +2 |
| Indício de vulnerabilidade financeira | "dívida", "negativado", "desempregado", "despejo" | +2 |
| Urgência declarada | "urgente", "para hoje", "até amanhã", "prazo vence" | +1 |

Cada fator conta uma única vez, por mais que o termo se repita. A categoria
considerada é a **escolhida pelo cidadão**, não a sugerida. Níveis: 0–1 Baixa,
2–3 Média, 4 ou mais Alta. Na fila ordenada vêm primeiro os pendentes, depois a
maior pontuação e, no empate, quem chegou antes.

As expressões são contextualizadas de propósito. "erro", "hoje" e "amanhã"
soltos não contam: "sugiro melhorar a mensagem de erro" não relata
impedimento, e "o site está lento hoje" não pede urgência.

No banco ficam apenas os pontos (`prioridade_pontos`) e os motivos. O nível
não é coluna: depende só dos pontos, e guardá-lo criaria uma dependência
transitiva, contrariando a 3FN. `prioridade_motivos` é uma desnormalização
deliberada — uma lista em um único texto —, mantida para leitura do atendente
e auditoria; os motivos nunca são consultados individualmente.

### Limitações

- O dataset é pequeno e foi escrito por uma única pessoa: a acurácia medida é
  otimista em relação a textos reais de cidadãos.
- O modelo não entende sinônimos nem contexto; palavras fora do vocabulário
  de treino são ignoradas.
- "Sugestão de melhoria" é a categoria mais difícil, porque uma sugestão pode
  tratar de qualquer assunto das outras quatro.
- A confiança não é calibrada.
- A prioridade depende de uma lista fixa de expressões: negação ("não é
  urgente"), ironia e erros de digitação escapam.
- A prioridade não considera o tempo de espera na fila.
- Os protocolos reais ainda não realimentam o treino; isso exigiria que o
  atendente validasse a categoria antes.

### Limitações éticas

- **As regras de prioridade podem ser manipuladas.** Elas são públicas (estão
  neste arquivo e no código), então quem as conhece pode escrever "urgente",
  "não consigo" e "dívida" só para subir na fila. Contar cada fator uma única
  vez limita o ganho, mas não impede. Por isso a prioridade é um auxílio à
  ordenação: a decisão de quem atender primeiro continua sendo do atendente.
- **O sistema infere vulnerabilidade financeira automaticamente.** Quando a
  descrição cita dívida, desemprego ou negativação, o protocolo — que é
  ligado ao CPF — passa a carregar o motivo "indício de vulnerabilidade
  financeira". É uma inferência feita por regra, sem confirmação humana, e
  pode estar errada. Ela é visível só ao atendente: o cidadão não vê a
  inferência nem tem como contestá-la. Em um sistema real, a LGPD (art. 20)
  dá ao titular o direito de pedir revisão de decisões automatizadas que
  afetem seus interesses; isso exigiria informar o cidadão de que a triagem
  existe e oferecer um canal de revisão, o que este protótipo não faz.
- **Um erro da triagem prejudica justamente quem ela pretende ajudar.** Quem
  descreve uma situação grave com palavras fora da lista fica com prioridade
  baixa. A fila por ordem de chegada continua disponível e é o padrão da tela.

## Dados abertos de governo

A plataforma consome cinco fontes públicas, todas gratuitas e sem chave de acesso:

| Fonte | O que traz | Onde aparece |
|---|---|---|
| **Banco Central (SGS 433)** | IPCA acumulado em 12 meses | Simulador de inflação |
| **Banco Central (SGS 432)** | Meta Selic | Metas financeiras |
| **BrasilAPI** | Feriados nacionais | Prazo real dos protocolos |
| **IBGE Localidades** | Estados e municípios | Seletor de estado e cidade |
| **IBGE SIDRA** | População e PIB municipais | Indicadores e Comparativo |
| **IBGE painel Cidades** | Saneamento, IDEB, escolarização e salário médio | Indicadores sociais |
| **ViaCEP** | Endereço pelo CEP | Cadastro, perfil e cidade dos Indicadores |
| **Nominatim (OSM)** | Coordenadas do município | Mapa dos Indicadores |
| **IBGE Malhas** | Contorno do município (GeoJSON) | Desenho do limite no mapa |
| **Esri / OpenTopoMap / CARTO** | Camadas de satélite, relevo e base limpa | Tipos de mapa |
| **OpenStreetMap (Overpass)** | Saúde, educação, farmácias, bancos, órgãos públicos, assistência social, parques e segurança | Camadas de pontos no mapa |

**Quem consulta é o backend, nunca o navegador.** O front-end pede a
`/api/v1/dados/...` e a API busca na origem. Isso evita bloqueio por CORS,
faz uma única consulta servir todos os visitantes (há cache com validade
por tipo de dado) e mantém o site de pé quando o servidor público cai — nesse
caso a resposta é o último valor conhecido.

Dois cuidados com a honestidade do dado: cada indicador do IBGE traz o **ano
de referência**, porque as pesquisas não são publicadas no mesmo ritmo; e o PIB
por habitante usa a população do ano mais próximo ao do PIB, dizendo qual foi
(o IBGE não estima população em ano de Censo).

Nenhuma base pública divulga indicadores **por bairro** — por isso a comparação
é entre municípios. Saneamento, IDEB, escolarização e salário médio vêm do
painel Cidades do IBGE, que consolida Censo 2022, INEP e Cadastro Central de
Empresas.

## Exportação em PDF

Dois documentos são gerados **no próprio navegador**, com a biblioteca jsPDF:

| Documento | Onde | Conteúdo |
|---|---|---|
| Simulação de inflação | Inflação → *Exportar PDF* | Parâmetros, resultado, projeção ano a ano e a fonte da taxa |
| Comprovante de protocolo | Protocolos → *Ver detalhes* → *Exportar PDF* | Número, tipo, situação, datas, prazo em dias úteis e descrição |

O relatório é desenhado com **texto de verdade**, não como captura de tela: o
arquivo fica selecionável, pesquisável, leve (poucos KB) e imprime bem em
qualquer papel. Como a geração é local, o download funciona mesmo que a API
esteja fora do ar, desde que a página já esteja carregada.

## A cidade do cidadão

As telas de dados não giram em torno de um município fixo: elas abrem na
**cidade do CEP que a pessoa cadastrou** (Perfil → CEP). O ViaCEP devolve o
código do IBGE junto com o endereço, então uma consulta resolve qual é a
cidade e como pedir os indicadores dela.

Quem mora em Salvador vê Salvador em Indicadores e no Comparativo; quem não
informou o CEP vê Taubaté, a cidade da prefeitura que opera a plataforma — que
é o padrão, não o centro do sistema.

Em qualquer caso o cidadão continua livre para navegar por qualquer um dos mais
de 5.500 municípios do país. No Comparativo os **dois lados são escolhidos
livremente**, e um botão "usar minha cidade" traz de volta a do cadastro.

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

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router 7, Leaflet, Recharts, jsPDF, Lucide
- **Backend:** Java 21, Spring Boot 3.5, Spring Web, Spring Mail (SMTP), Bean Validation, BCrypt
- **Modelagem de dados:** Oracle SQL (3ª Forma Normal)
