-- ---------------------------------------------------------------------------
-- VidaReal - esquema relacional (3a Forma Normal)
--
-- Executado pelo Spring na subida da API. Todo comando usa
-- "IF NOT EXISTS": o arquivo roda em cada inicializacao sobre o mesmo
-- banco em disco, entao precisa ser idempotente.
--
-- Os tipos seguem SQL padrao, os mesmos da modelagem Oracle do projeto:
-- trocar o H2 por um servidor Oracle exige apenas mudar a URL do datasource.
-- ---------------------------------------------------------------------------

-- Cidadaos e atendentes. O CPF e a chave natural: identifica a pessoa e
-- nunca muda, por isso tambem e a chave estrangeira usada pelas demais
-- tabelas. A senha existe somente como hash BCrypt (60 caracteres).
CREATE TABLE IF NOT EXISTS usuario (
    cpf        CHAR(11)     NOT NULL,
    senha_hash VARCHAR(100) NOT NULL,
    nome       VARCHAR(120) NOT NULL,
    email      VARCHAR(200),
    cep        CHAR(8),
    cidade     VARCHAR(120),
    perfil     VARCHAR(20)  NOT NULL,
    CONSTRAINT pk_usuario PRIMARY KEY (cpf),
    CONSTRAINT ck_usuario_perfil CHECK (perfil IN ('cidadao', 'atendente'))
);

-- O e-mail e o canal de recuperacao de senha: dois usuarios com o mesmo
-- endereco receberiam o link um do outro. A coluna continua aceitando nulo
-- por causa das contas criadas antes de o e-mail ser obrigatorio; a
-- obrigatoriedade e cobrada pela API no cadastro e na edicao do perfil.
-- (Um indice unico aceita varios nulos.)
CREATE UNIQUE INDEX IF NOT EXISTS uk_usuario_email ON usuario (email);

-- Pedidos de recuperacao de senha ("esqueci minha senha").
--
-- O token em si nunca e gravado: a tabela guarda apenas o SHA-256 dele.
-- Quem ler o banco nao consegue redefinir a senha de ninguem, pelo mesmo
-- motivo que a senha fica em hash. O token e de uso unico (usado_em) e
-- expira (expira_em).
CREATE TABLE IF NOT EXISTS recuperacao_senha (
    token_hash  CHAR(64) NOT NULL,
    cpf_usuario CHAR(11) NOT NULL,
    criado_em   TIMESTAMP WITH TIME ZONE NOT NULL,
    expira_em   TIMESTAMP WITH TIME ZONE NOT NULL,
    usado_em    TIMESTAMP WITH TIME ZONE,
    CONSTRAINT pk_recuperacao_senha PRIMARY KEY (token_hash),
    CONSTRAINT fk_recuperacao_usuario FOREIGN KEY (cpf_usuario) REFERENCES usuario (cpf)
);

CREATE INDEX IF NOT EXISTS ix_recuperacao_usuario ON recuperacao_senha (cpf_usuario);

-- Solicitacoes abertas pelo cidadao. A etapa guarda o nome da constante do
-- enum EtapaProtocolo (CRIADA, EM_ANALISE, CONCLUIDO); o progresso numerico
-- exibido na tela e derivado dela em tempo de execucao, nao armazenado.
CREATE TABLE IF NOT EXISTS protocolo (
    id              VARCHAR(20)   NOT NULL,
    cpf_solicitante CHAR(11)      NOT NULL,
    tipo            VARCHAR(120)  NOT NULL,
    descricao       VARCHAR(1000) NOT NULL,
    etapa           VARCHAR(20)   NOT NULL,
    aberto_em       TIMESTAMP WITH TIME ZONE NOT NULL,
    concluido_em    TIMESTAMP WITH TIME ZONE,
    CONSTRAINT pk_protocolo PRIMARY KEY (id),
    CONSTRAINT fk_protocolo_usuario FOREIGN KEY (cpf_solicitante) REFERENCES usuario (cpf)
);

CREATE INDEX IF NOT EXISTS ix_protocolo_solicitante ON protocolo (cpf_solicitante);

-- Triagem inteligente. As colunas entram por ALTER para que um banco ja
-- existente em disco seja atualizado sem perder os protocolos gravados.
--
-- prioridade_pontos sai de regras deterministicas. O nivel (Baixa, Média,
-- Alta) NAO e coluna: depende apenas dos pontos, e guarda-lo criaria uma
-- dependencia transitiva, contrariando a 3FN. Ele e derivado em codigo,
-- como o progresso da etapa.
--
-- prioridade_motivos e uma desnormalizacao deliberada: guarda, em um unico
-- texto, a lista de motivos separados por " | ". Uma tabela filha seria a
-- forma normalizada, mas os motivos nunca sao consultados nem filtrados
-- individualmente: servem para o atendente ler e para auditoria, como
-- registro do que justificou a pontuacao no momento da triagem.
--
-- tipo_sugerido e confianca_sugestao guardam o que o classificador Naive
-- Bayes sugeriu, o que permite medir quantas vezes o cidadao aceitou a
-- sugestao. A confianca e relativa entre as categorias, nao uma
-- probabilidade de acerto.
ALTER TABLE protocolo ADD COLUMN IF NOT EXISTS prioridade_pontos  INT;
ALTER TABLE protocolo ADD COLUMN IF NOT EXISTS prioridade_motivos VARCHAR(500);
ALTER TABLE protocolo ADD COLUMN IF NOT EXISTS tipo_sugerido      VARCHAR(120);
ALTER TABLE protocolo ADD COLUMN IF NOT EXISTS confianca_sugestao DECIMAL(5,4);

-- Metas financeiras pessoais. Valores em DECIMAL, nunca em ponto
-- flutuante: dinheiro precisa de aritmetica exata.
CREATE TABLE IF NOT EXISTS meta (
    id          BIGINT        NOT NULL,
    cpf_usuario CHAR(11)      NOT NULL,
    tipo        VARCHAR(60)   NOT NULL,
    atual       DECIMAL(38,2) NOT NULL,
    objetivo    DECIMAL(38,2) NOT NULL,
    prazo       VARCHAR(30)   NOT NULL,
    CONSTRAINT pk_meta PRIMARY KEY (id),
    CONSTRAINT fk_meta_usuario FOREIGN KEY (cpf_usuario) REFERENCES usuario (cpf)
);

CREATE INDEX IF NOT EXISTS ix_meta_usuario ON meta (cpf_usuario);

CREATE SEQUENCE IF NOT EXISTS seq_meta START WITH 1 INCREMENT BY 1;

-- Avaliacoes da experiencia. Nao ha vinculo com usuario de proposito: o
-- envio e anonimo e publico, porque avaliar servico publico nao deve
-- exigir login nem expor quem reclamou.
CREATE TABLE IF NOT EXISTS feedback (
    id            BIGINT NOT NULL,
    rating        INT    NOT NULL,
    comentario    VARCHAR(500),
    registrado_em TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_feedback PRIMARY KEY (id),
    CONSTRAINT ck_feedback_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE SEQUENCE IF NOT EXISTS seq_feedback START WITH 1 INCREMENT BY 1;

-- Trilha de auditoria: quem fez o que e quando.
--
-- Sem chave estrangeira para usuario de proposito: a trilha registra
-- tambem tentativas de login recusadas (autor desconhecido) e precisa
-- sobreviver a exclusao da conta que originou a acao.
--
-- "seq" existe apenas para ordenar: varios registros podem cair no mesmo
-- instante, e a leitura da trilha e do mais recente para o mais antigo.
CREATE TABLE IF NOT EXISTS auditoria (
    seq           BIGINT GENERATED BY DEFAULT AS IDENTITY,
    id            VARCHAR(36)  NOT NULL,
    acao          VARCHAR(40)  NOT NULL,
    recurso       VARCHAR(40)  NOT NULL,
    recurso_id    VARCHAR(40),
    cpf_autor     CHAR(11),
    perfil_autor  VARCHAR(20),
    detalhe       VARCHAR(500),
    registrado_em TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_auditoria PRIMARY KEY (seq),
    CONSTRAINT uk_auditoria_id UNIQUE (id)
);
