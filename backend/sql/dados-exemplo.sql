-- ---------------------------------------------------------------------------
-- VidaReal - dados de EXEMPLO para a analise com SQL
--
-- Tudo aqui e ficticio: nomes inventados, CPFs da faixa 900.000.0xx-xx
-- (digitos verificadores validos, so para respeitar o formato), e-mails no
-- dominio @exemplo.com e uma senha aleatoria descartada (ninguem consegue
-- entrar com estas contas).
--
-- Como identificar os registros de exemplo:
--   protocolo: id comeca com 'EX-'
--   meta e feedback: id entre 900000 e 999999
--   usuario: os 13 CPFs listados na limpeza abaixo
--
-- Pode rodar quantas vezes quiser: o script apaga os exemplos antigos
-- antes de inserir de novo (o resultado e sempre o mesmo).
-- Para remover sem inserir: remover-dados-exemplo.sql
--
-- Gerado em 2026-10-06; datas em UTC, como a API grava.
-- ---------------------------------------------------------------------------

-- 1) Limpeza dos exemplos de uma execucao anterior
DELETE FROM protocolo WHERE id LIKE 'EX-%';
DELETE FROM meta WHERE id BETWEEN 900000 AND 999999;
DELETE FROM feedback WHERE id BETWEEN 900000 AND 999999;
DELETE FROM recuperacao_senha WHERE cpf_usuario IN ('90000000175', '90000000256', '90000000337', '90000000418', '90000000507', '90000000680', '90000000760', '90000000841', '90000000922', '90000001066', '90000001147', '90000001228', '90000001309');
-- So depois de remover protocolos e metas: as chaves estrangeiras apontam para usuario
DELETE FROM protocolo WHERE cpf_solicitante IN ('90000000175', '90000000256', '90000000337', '90000000418', '90000000507', '90000000680', '90000000760', '90000000841', '90000000922', '90000001066', '90000001147', '90000001228', '90000001309');
DELETE FROM meta WHERE cpf_usuario IN ('90000000175', '90000000256', '90000000337', '90000000418', '90000000507', '90000000680', '90000000760', '90000000841', '90000000922', '90000001066', '90000001147', '90000001228', '90000001309');
DELETE FROM usuario WHERE cpf IN ('90000000175', '90000000256', '90000000337', '90000000418', '90000000507', '90000000680', '90000000760', '90000000841', '90000000922', '90000001066', '90000001147', '90000001228', '90000001309');
COMMIT;

-- 2) Cidadaos de exemplo (13, em 7 cidades do Vale do Paraiba)
INSERT INTO usuario (cpf, senha_hash, nome, email, cep, cidade, perfil) VALUES
('90000000175', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Ana Paula Ribeiro', 'ana.paula.ribeiro@exemplo.com', '12010000', 'Taubaté', 'cidadao'),
('90000000256', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Bruno Carvalho', 'bruno.carvalho@exemplo.com', '12020100', 'Taubaté', 'cidadao'),
('90000000337', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Carla Mendes', 'carla.mendes@exemplo.com', '12030200', 'Taubaté', 'cidadao'),
('90000000418', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Diego Fernandes', 'diego.fernandes@exemplo.com', '12040300', 'Taubaté', 'cidadao'),
('90000000507', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Elisa Moura', 'elisa.moura@exemplo.com', '12210000', 'São José dos Campos', 'cidadao'),
('90000000680', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Fábio Nascimento', 'fabio.nascimento@exemplo.com', '12220100', 'São José dos Campos', 'cidadao'),
('90000000760', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Gabriela Rocha', 'gabriela.rocha@exemplo.com', '12230200', 'São José dos Campos', 'cidadao'),
('90000000841', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Henrique Alves', 'henrique.alves@exemplo.com', '12400000', 'Pindamonhangaba', 'cidadao'),
('90000000922', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Isabela Duarte', 'isabela.duarte@exemplo.com', '12410100', 'Pindamonhangaba', 'cidadao'),
('90000001066', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'João Pedro Lima', 'joao.pedro.lima@exemplo.com', '12300000', 'Jacareí', 'cidadao'),
('90000001147', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Karina Souza', 'karina.souza@exemplo.com', '12310100', 'Jacareí', 'cidadao'),
('90000001228', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Lucas Teixeira', 'lucas.teixeira@exemplo.com', '12280000', 'Caçapava', 'cidadao'),
('90000001309', '$2a$10$UKBSQZxGNB.oyH1RAkULC.45suorcBsrXn3iM6knf24hVRvrJLIfa', 'Marina Costa', 'marina.costa@exemplo.com', '12120000', 'Tremembé', 'cidadao');

-- 3) Protocolos de exemplo (abril a outubro de 2026). Os 3 mais antigos ficam
--    sem triagem, como protocolos abertos antes de a triagem existir.
--    prioridade_pontos e prioridade_motivos seguem CalculadoraPrioridade.java.
INSERT INTO protocolo (id, cpf_solicitante, tipo, descricao, etapa, aberto_em, concluido_em,
                       prioridade_pontos, prioridade_motivos, tipo_sugerido, confianca_sugestao) VALUES
('EX-20260408001', '90000000507', 'Solicitação de orientação financeira', 'Gostaria de ajuda para montar um orçamento mensal da família.', 'CONCLUIDO', TIMESTAMP '2026-04-08 09:53:00+00', TIMESTAMP '2026-04-19 20:09:00+00', NULL, NULL, NULL, NULL),
('EX-20260416002', '90000000507', 'Análise de viabilidade de Metas Financeiras', 'Minha meta de investimentos vence em breve, consigo atingir no prazo?', 'CONCLUIDO', TIMESTAMP '2026-04-16 09:26:00+00', TIMESTAMP '2026-04-29 15:47:00+00', NULL, NULL, NULL, NULL),
('EX-20260416003', '90000001228', 'Solicitação de orientação financeira', 'Tenho contas de luz e água atrasadas e não sei por onde começar.', 'CONCLUIDO', TIMESTAMP '2026-04-16 17:55:00+00', TIMESTAMP '2026-04-25 09:50:00+00', NULL, NULL, NULL, NULL),
('EX-20260420004', '90000000418', 'Solicitação de orientação financeira', 'Gostaria de ajuda para montar um orçamento mensal da família.', 'CONCLUIDO', TIMESTAMP '2026-04-20 16:33:00+00', TIMESTAMP '2026-04-28 03:19:00+00', 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Solicitação de orientação financeira', 0.827),
('EX-20260420005', '90000000507', 'Análise de viabilidade de Metas Financeiras', 'Estou endividada, mas quero começar uma meta pequena. É viável?', 'EM_ANALISE', TIMESTAMP '2026-04-20 19:49:00+00', NULL, 3, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1) | Indício de vulnerabilidade financeira: "endividada" (+2)', 'Análise de viabilidade de Metas Financeiras', 0.975),
('EX-20260427006', '90000000841', 'Dúvida sobre inflação', 'Por que o preço do supermercado subiu mais que a inflação oficial?', 'CONCLUIDO', TIMESTAMP '2026-04-27 09:19:00+00', TIMESTAMP '2026-05-01 08:26:00+00', 0, 'Nenhum fator de prioridade identificado', 'Solicitação de orientação financeira', 0.4996),
('EX-20260503007', '90000000175', 'Problema técnico', 'O gráfico de inflação aparece cortado na tela pequena.', 'CONCLUIDO', TIMESTAMP '2026-05-03 10:33:00+00', TIMESTAMP '2026-05-05 14:36:00+00', 2, 'Categoria "Problema técnico" (+2)', 'Problema técnico', 0.8112),
('EX-20260504008', '90000000337', 'Solicitação de orientação financeira', 'Como separar as despesas fixas das variáveis no meu planejamento?', 'CONCLUIDO', TIMESTAMP '2026-05-04 11:45:00+00', TIMESTAMP '2026-05-11 21:41:00+00', 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.49),
('EX-20260505009', '90000000760', 'Problema técnico', 'O mapa da cidade demora para abrir, mas funciona depois de um tempo.', 'CONCLUIDO', TIMESTAMP '2026-05-05 12:37:00+00', TIMESTAMP '2026-05-08 07:46:00+00', 2, 'Categoria "Problema técnico" (+2)', 'Problema técnico', 0.6481),
('EX-20260505010', '90000000680', 'Problema técnico', 'A página de metas não carrega no celular.', 'CONCLUIDO', TIMESTAMP '2026-05-05 14:48:00+00', TIMESTAMP '2026-05-08 20:20:00+00', 4, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "não carrega" (+2)', 'Problema técnico', 0.8426),
('EX-20260507011', '90000001066', 'Análise de viabilidade de Metas Financeiras', 'Quero comprar uma moto em 18 meses; preciso de uma análise da meta.', 'CONCLUIDO', TIMESTAMP '2026-05-07 17:23:00+00', TIMESTAMP '2026-05-18 02:01:00+00', 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.6979),
('EX-20260515012', '90000000337', 'Solicitação de orientação financeira', 'Gostaria de ajuda para montar um orçamento mensal da família.', 'CONCLUIDO', TIMESTAMP '2026-05-15 18:19:00+00', TIMESTAMP '2026-05-23 12:54:00+00', 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Solicitação de orientação financeira', 0.9293),
('EX-20260517013', '90000000760', 'Problema técnico', 'A página de metas não carrega no celular.', 'CONCLUIDO', TIMESTAMP '2026-05-17 16:47:00+00', TIMESTAMP '2026-05-21 08:25:00+00', 4, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "não carrega" (+2)', 'Problema técnico', 0.6451),
('EX-20260519014', '90000000507', 'Análise de viabilidade de Metas Financeiras', 'Quero comprar uma moto em 18 meses; preciso de uma análise da meta.', 'CONCLUIDO', TIMESTAMP '2026-05-19 17:08:00+00', TIMESTAMP '2026-05-30 12:09:00+00', 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.9076),
('EX-20260522015', '90000000256', 'Sugestão de melhoria', 'Poderiam mostrar o horário de funcionamento dos postos de saúde no mapa.', 'CONCLUIDO', TIMESTAMP '2026-05-22 19:52:00+00', TIMESTAMP '2026-06-15 07:46:00+00', 0, 'Nenhum fator de prioridade identificado', 'Sugestão de melhoria', 0.768),
('EX-20260525016', '90000000256', 'Solicitação de orientação financeira', 'Estou com dívidas no cartão de crédito e preciso de orientação para renegociar.', 'CRIADA', TIMESTAMP '2026-05-25 11:56:00+00', NULL, 3, 'Categoria "Solicitação de orientação financeira" (+1) | Indício de vulnerabilidade financeira: "dívidas" (+2)', 'Solicitação de orientação financeira', 0.8667),
('EX-20260526017', '90000000337', 'Problema técnico', 'O gráfico de inflação aparece cortado na tela pequena.', 'CONCLUIDO', TIMESTAMP '2026-05-26 10:30:00+00', TIMESTAMP '2026-05-28 03:42:00+00', 2, 'Categoria "Problema técnico" (+2)', 'Problema técnico', 0.9515),
('EX-20260527018', '90000000507', 'Solicitação de orientação financeira', 'Quero entender a diferença entre poupança e Tesouro Direto para guardar dinheiro.', 'CONCLUIDO', TIMESTAMP '2026-05-27 16:48:00+00', TIMESTAMP '2026-06-07 19:54:00+00', 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Solicitação de orientação financeira', 0.7845),
('EX-20260527019', '90000000256', 'Problema técnico', 'O mapa da cidade demora para abrir, mas funciona depois de um tempo.', 'CONCLUIDO', TIMESTAMP '2026-05-27 17:46:00+00', TIMESTAMP '2026-05-31 13:24:00+00', 2, 'Categoria "Problema técnico" (+2)', 'Sugestão de melhoria', 0.5534),
('EX-20260529020', '90000000507', 'Análise de viabilidade de Metas Financeiras', 'Quero comprar uma moto em 18 meses; preciso de uma análise da meta.', 'CONCLUIDO', TIMESTAMP '2026-05-29 09:47:00+00', TIMESTAMP '2026-06-10 03:13:00+00', 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.8054),
('EX-20260529021', '90000001147', 'Sugestão de melhoria', 'Poderiam mostrar o horário de funcionamento dos postos de saúde no mapa.', 'CRIADA', TIMESTAMP '2026-05-29 16:41:00+00', NULL, 0, 'Nenhum fator de prioridade identificado', 'Solicitação de orientação financeira', 0.4646),
('EX-20260601022', '90000000175', 'Solicitação de orientação financeira', 'Queria orientação para começar a guardar dinheiro todo mês.', 'CONCLUIDO', TIMESTAMP '2026-06-01 16:50:00+00', TIMESTAMP '2026-06-09 05:03:00+00', 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Solicitação de orientação financeira', 0.8771),
('EX-20260601023', '90000000680', 'Solicitação de orientação financeira', 'Fiquei desempregado e quero saber como organizar as contas até conseguir outro trabalho.', 'CONCLUIDO', TIMESTAMP '2026-06-01 16:55:00+00', TIMESTAMP '2026-06-12 20:29:00+00', 3, 'Categoria "Solicitação de orientação financeira" (+1) | Indício de vulnerabilidade financeira: "desempregado" (+2)', 'Solicitação de orientação financeira', 0.6325),
('EX-20260602024', '90000000760', 'Problema técnico', 'Não consigo entrar na minha conta depois de trocar a senha.', 'CONCLUIDO', TIMESTAMP '2026-06-02 19:33:00+00', TIMESTAMP '2026-06-03 13:05:00+00', 4, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "não consigo" (+2)', 'Problema técnico', 0.7713),
('EX-20260605025', '90000000256', 'Problema técnico', 'Tela branca ao abrir a página de protocolos pelo navegador do celular.', 'CONCLUIDO', TIMESTAMP '2026-06-05 14:16:00+00', TIMESTAMP '2026-06-08 01:04:00+00', 4, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "tela branca" (+2)', 'Problema técnico', 0.6562),
('EX-20260608026', '90000000760', 'Análise de viabilidade de Metas Financeiras', 'Quero comprar uma moto em 18 meses; preciso de uma análise da meta.', 'EM_ANALISE', TIMESTAMP '2026-06-08 10:34:00+00', NULL, 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.8655),
('EX-20260608027', '90000000680', 'Problema técnico', 'O mapa da cidade demora para abrir, mas funciona depois de um tempo.', 'CONCLUIDO', TIMESTAMP '2026-06-08 11:11:00+00', TIMESTAMP '2026-06-09 10:33:00+00', 2, 'Categoria "Problema técnico" (+2)', 'Problema técnico', 0.6438),
('EX-20260611028', '90000000175', 'Problema técnico', 'Deu erro ao salvar uma nova meta, preciso resolver urgente.', 'CONCLUIDO', TIMESTAMP '2026-06-11 13:57:00+00', TIMESTAMP '2026-06-13 12:28:00+00', 5, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "erro ao" (+2) | Urgência declarada: "urgente" (+1)', 'Problema técnico', 0.7312),
('EX-20260613029', '90000000507', 'Dúvida sobre inflação', 'Por que o preço do supermercado subiu mais que a inflação oficial?', 'CONCLUIDO', TIMESTAMP '2026-06-13 11:21:00+00', TIMESTAMP '2026-06-17 10:27:00+00', 0, 'Nenhum fator de prioridade identificado', 'Solicitação de orientação financeira', 0.5432),
('EX-20260613030', '90000000680', 'Solicitação de orientação financeira', 'Fiquei desempregado e quero saber como organizar as contas até conseguir outro trabalho.', 'CONCLUIDO', TIMESTAMP '2026-06-13 18:32:00+00', TIMESTAMP '2026-06-19 13:37:00+00', 3, 'Categoria "Solicitação de orientação financeira" (+1) | Indício de vulnerabilidade financeira: "desempregado" (+2)', 'Análise de viabilidade de Metas Financeiras', 0.5236),
('EX-20260614031', '90000000175', 'Problema técnico', 'Deu erro ao salvar uma nova meta, preciso resolver urgente.', 'CONCLUIDO', TIMESTAMP '2026-06-14 11:04:00+00', TIMESTAMP '2026-06-17 13:07:00+00', 5, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "erro ao" (+2) | Urgência declarada: "urgente" (+1)', 'Problema técnico', 0.7781),
('EX-20260620032', '90000001309', 'Solicitação de orientação financeira', 'Quero entender a diferença entre poupança e Tesouro Direto para guardar dinheiro.', 'EM_ANALISE', TIMESTAMP '2026-06-20 12:50:00+00', NULL, 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Solicitação de orientação financeira', 0.6814),
('EX-20260621033', '90000000337', 'Solicitação de orientação financeira', 'Gostaria de ajuda para montar um orçamento mensal da família.', 'CONCLUIDO', TIMESTAMP '2026-06-21 17:48:00+00', TIMESTAMP '2026-06-30 09:48:00+00', 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Solicitação de orientação financeira', 0.7443),
('EX-20260623034', '90000000418', 'Dúvida sobre inflação', 'Como a inflação afeta o dinheiro guardado na poupança?', 'CONCLUIDO', TIMESTAMP '2026-06-23 08:26:00+00', TIMESTAMP '2026-06-27 01:08:00+00', 0, 'Nenhum fator de prioridade identificado', 'Dúvida sobre inflação', 0.9519),
('EX-20260623035', '90000000418', 'Sugestão de melhoria', 'Sugiro incluir lembretes por e-mail para as metas.', 'CONCLUIDO', TIMESTAMP '2026-06-23 18:04:00+00', TIMESTAMP '2026-07-19 09:53:00+00', 0, 'Nenhum fator de prioridade identificado', 'Sugestão de melhoria', 0.6692),
('EX-20260623036', '90000000175', 'Dúvida sobre inflação', 'Por que o preço do supermercado subiu mais que a inflação oficial?', 'CONCLUIDO', TIMESTAMP '2026-06-23 18:50:00+00', TIMESTAMP '2026-06-25 09:02:00+00', 0, 'Nenhum fator de prioridade identificado', 'Solicitação de orientação financeira', 0.5759),
('EX-20260624037', '90000000507', 'Análise de viabilidade de Metas Financeiras', 'Quero saber se consigo juntar R$ 10.000 em 12 meses guardando R$ 700 por mês.', 'CONCLUIDO', TIMESTAMP '2026-06-24 17:59:00+00', TIMESTAMP '2026-07-05 19:15:00+00', 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.9623),
('EX-20260628038', '90000000337', 'Solicitação de orientação financeira', 'Tenho contas de luz e água atrasadas e não sei por onde começar.', 'CONCLUIDO', TIMESTAMP '2026-06-28 13:32:00+00', TIMESTAMP '2026-07-10 10:28:00+00', 3, 'Categoria "Solicitação de orientação financeira" (+1) | Indício de vulnerabilidade financeira: "atrasadas" (+2)', 'Dúvida sobre inflação', 0.4377),
('EX-20260701039', '90000000175', 'Análise de viabilidade de Metas Financeiras', 'Quero saber se consigo juntar R$ 10.000 em 12 meses guardando R$ 700 por mês.', 'CONCLUIDO', TIMESTAMP '2026-07-01 09:19:00+00', TIMESTAMP '2026-07-10 08:27:00+00', 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.7564),
('EX-20260704040', '90000000760', 'Sugestão de melhoria', 'Seria bom ter um modo escuro mais forte para usar à noite.', 'CONCLUIDO', TIMESTAMP '2026-07-04 18:30:00+00', TIMESTAMP '2026-07-23 23:02:00+00', 0, 'Nenhum fator de prioridade identificado', 'Solicitação de orientação financeira', 0.5388),
('EX-20260705041', '90000000680', 'Solicitação de orientação financeira', 'Gostaria de ajuda para montar um orçamento mensal da família.', 'CONCLUIDO', TIMESTAMP '2026-07-05 11:20:00+00', TIMESTAMP '2026-07-13 16:46:00+00', 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Solicitação de orientação financeira', 0.808),
('EX-20260713042', '90000000337', 'Sugestão de melhoria', 'Gostaria de exportar meus protocolos em planilha.', 'CRIADA', TIMESTAMP '2026-07-13 15:09:00+00', NULL, 0, 'Nenhum fator de prioridade identificado', 'Problema técnico', 0.5585),
('EX-20260714043', '90000000256', 'Análise de viabilidade de Metas Financeiras', 'Quero saber se consigo juntar R$ 10.000 em 12 meses guardando R$ 700 por mês.', 'CONCLUIDO', TIMESTAMP '2026-07-14 09:51:00+00', TIMESTAMP '2026-07-27 01:21:00+00', 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Solicitação de orientação financeira', 0.3923),
('EX-20260716044', '90000000418', 'Problema técnico', 'A página de metas não carrega no celular.', 'EM_ANALISE', TIMESTAMP '2026-07-16 11:37:00+00', NULL, 4, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "não carrega" (+2)', 'Problema técnico', 0.6399),
('EX-20260716045', '90000000256', 'Dúvida sobre inflação', 'Por que o preço do supermercado subiu mais que a inflação oficial?', 'CONCLUIDO', TIMESTAMP '2026-07-16 17:13:00+00', TIMESTAMP '2026-07-21 00:50:00+00', 0, 'Nenhum fator de prioridade identificado', 'Dúvida sobre inflação', 0.8211),
('EX-20260719046', '90000000418', 'Análise de viabilidade de Metas Financeiras', 'Minha meta de investimentos vence em breve, consigo atingir no prazo?', 'CONCLUIDO', TIMESTAMP '2026-07-19 17:52:00+00', TIMESTAMP '2026-08-07 02:45:00+00', 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.6699),
('EX-20260720047', '90000000337', 'Problema técnico', 'O gráfico de inflação aparece cortado na tela pequena.', 'CONCLUIDO', TIMESTAMP '2026-07-20 14:52:00+00', TIMESTAMP '2026-07-21 01:31:00+00', 2, 'Categoria "Problema técnico" (+2)', 'Problema técnico', 0.8077),
('EX-20260720048', '90000000337', 'Problema técnico', 'O gráfico de inflação aparece cortado na tela pequena.', 'CONCLUIDO', TIMESTAMP '2026-07-20 16:38:00+00', TIMESTAMP '2026-07-21 15:24:00+00', 2, 'Categoria "Problema técnico" (+2)', 'Problema técnico', 0.8142),
('EX-20260723049', '90000001066', 'Problema técnico', 'Tela branca ao abrir a página de protocolos pelo navegador do celular.', 'CONCLUIDO', TIMESTAMP '2026-07-23 10:03:00+00', TIMESTAMP '2026-07-26 05:12:00+00', 4, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "tela branca" (+2)', 'Problema técnico', 0.8596),
('EX-20260724050', '90000000680', 'Problema técnico', 'O gráfico de inflação aparece cortado na tela pequena.', 'CONCLUIDO', TIMESTAMP '2026-07-24 09:02:00+00', TIMESTAMP '2026-07-25 02:39:00+00', 2, 'Categoria "Problema técnico" (+2)', 'Problema técnico', 0.9145),
('EX-20260801051', '90000001066', 'Solicitação de orientação financeira', 'Estou com dívidas no cartão de crédito e preciso de orientação para renegociar.', 'CONCLUIDO', TIMESTAMP '2026-08-01 08:04:00+00', TIMESTAMP '2026-08-06 20:12:00+00', 3, 'Categoria "Solicitação de orientação financeira" (+1) | Indício de vulnerabilidade financeira: "dívidas" (+2)', 'Solicitação de orientação financeira', 0.6669),
('EX-20260801052', '90000000418', 'Problema técnico', 'Deu erro ao salvar uma nova meta, preciso resolver urgente.', 'CONCLUIDO', TIMESTAMP '2026-08-01 10:55:00+00', TIMESTAMP '2026-08-01 18:44:00+00', 5, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "erro ao" (+2) | Urgência declarada: "urgente" (+1)', 'Sugestão de melhoria', 0.5808),
('EX-20260807053', '90000001228', 'Análise de viabilidade de Metas Financeiras', 'Quero comprar uma moto em 18 meses; preciso de uma análise da meta.', 'CONCLUIDO', TIMESTAMP '2026-08-07 09:13:00+00', TIMESTAMP '2026-08-25 14:01:00+00', 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.972),
('EX-20260812054', '90000000175', 'Dúvida sobre inflação', 'Por que o preço do supermercado subiu mais que a inflação oficial?', 'CONCLUIDO', TIMESTAMP '2026-08-12 18:29:00+00', TIMESTAMP '2026-08-14 08:32:00+00', 0, 'Nenhum fator de prioridade identificado', 'Dúvida sobre inflação', 0.634),
('EX-20260813055', '90000000418', 'Problema técnico', 'Deu erro ao salvar uma nova meta, preciso resolver urgente.', 'CONCLUIDO', TIMESTAMP '2026-08-13 10:08:00+00', TIMESTAMP '2026-08-15 22:30:00+00', 5, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "erro ao" (+2) | Urgência declarada: "urgente" (+1)', 'Problema técnico', 0.8027),
('EX-20260814056', '90000000922', 'Solicitação de orientação financeira', 'Fiquei desempregado e quero saber como organizar as contas até conseguir outro trabalho.', 'CONCLUIDO', TIMESTAMP '2026-08-14 19:46:00+00', TIMESTAMP '2026-08-26 05:04:00+00', 3, 'Categoria "Solicitação de orientação financeira" (+1) | Indício de vulnerabilidade financeira: "desempregado" (+2)', 'Solicitação de orientação financeira', 0.8025),
('EX-20260815057', '90000000922', 'Problema técnico', 'Deu erro ao salvar uma nova meta, preciso resolver urgente.', 'CONCLUIDO', TIMESTAMP '2026-08-15 19:58:00+00', TIMESTAMP '2026-08-18 05:52:00+00', 5, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "erro ao" (+2) | Urgência declarada: "urgente" (+1)', 'Problema técnico', 0.9702),
('EX-20260820058', '90000000337', 'Análise de viabilidade de Metas Financeiras', 'Estou endividada, mas quero começar uma meta pequena. É viável?', 'CRIADA', TIMESTAMP '2026-08-20 11:03:00+00', NULL, 3, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1) | Indício de vulnerabilidade financeira: "endividada" (+2)', 'Análise de viabilidade de Metas Financeiras', 0.9158),
('EX-20260823059', '90000000175', 'Solicitação de orientação financeira', 'Tenho contas de luz e água atrasadas e não sei por onde começar.', 'CONCLUIDO', TIMESTAMP '2026-08-23 17:26:00+00', TIMESTAMP '2026-09-03 13:24:00+00', 3, 'Categoria "Solicitação de orientação financeira" (+1) | Indício de vulnerabilidade financeira: "atrasadas" (+2)', 'Solicitação de orientação financeira', 0.9428),
('EX-20260824060', '90000000175', 'Dúvida sobre inflação', 'Por que o preço do supermercado subiu mais que a inflação oficial?', 'CRIADA', TIMESTAMP '2026-08-24 08:30:00+00', NULL, 0, 'Nenhum fator de prioridade identificado', 'Solicitação de orientação financeira', 0.4187),
('EX-20260824061', '90000000507', 'Análise de viabilidade de Metas Financeiras', 'Quero comprar uma moto em 18 meses; preciso de uma análise da meta.', 'EM_ANALISE', TIMESTAMP '2026-08-24 10:30:00+00', NULL, 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Solicitação de orientação financeira', 0.5245),
('EX-20260826062', '90000000175', 'Dúvida sobre inflação', 'Como a inflação afeta o dinheiro guardado na poupança?', 'CONCLUIDO', TIMESTAMP '2026-08-26 10:46:00+00', TIMESTAMP '2026-08-27 13:51:00+00', 0, 'Nenhum fator de prioridade identificado', 'Solicitação de orientação financeira', 0.679),
('EX-20260826063', '90000000337', 'Problema técnico', 'Perdi o acesso à conta e preciso enviar um documento até amanhã.', 'CONCLUIDO', TIMESTAMP '2026-08-26 15:27:00+00', TIMESTAMP '2026-08-26 21:12:00+00', 5, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "perdi o acesso" (+2) | Urgência declarada: "até amanhã" (+1)', 'Problema técnico', 0.7129),
('EX-20260828064', '90000000337', 'Análise de viabilidade de Metas Financeiras', 'Quero saber se consigo juntar R$ 10.000 em 12 meses guardando R$ 700 por mês.', 'CONCLUIDO', TIMESTAMP '2026-08-28 16:15:00+00', TIMESTAMP '2026-09-05 16:22:00+00', 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.6482),
('EX-20260829065', '90000000256', 'Dúvida sobre inflação', 'O que significa o IPCA acumulado que aparece no painel?', 'CONCLUIDO', TIMESTAMP '2026-08-29 15:43:00+00', TIMESTAMP '2026-09-03 00:24:00+00', 0, 'Nenhum fator de prioridade identificado', 'Dúvida sobre inflação', 0.6706),
('EX-20260830066', '90000000175', 'Sugestão de melhoria', 'Seria bom ter um modo escuro mais forte para usar à noite.', 'CONCLUIDO', TIMESTAMP '2026-08-30 15:52:00+00', TIMESTAMP '2026-09-24 23:13:00+00', 0, 'Nenhum fator de prioridade identificado', 'Sugestão de melhoria', 0.6257),
('EX-20260831067', '90000000175', 'Problema técnico', 'A página de metas não carrega no celular.', 'CONCLUIDO', TIMESTAMP '2026-08-31 08:10:00+00', TIMESTAMP '2026-09-02 06:46:00+00', 4, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "não carrega" (+2)', 'Problema técnico', 0.644),
('EX-20260902068', '90000000418', 'Problema técnico', 'Deu erro ao salvar uma nova meta, preciso resolver urgente.', 'CONCLUIDO', TIMESTAMP '2026-09-02 09:11:00+00', TIMESTAMP '2026-09-05 10:29:00+00', 5, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "erro ao" (+2) | Urgência declarada: "urgente" (+1)', 'Problema técnico', 0.6508),
('EX-20260902069', '90000000841', 'Sugestão de melhoria', 'Seria bom ter um modo escuro mais forte para usar à noite.', 'CONCLUIDO', TIMESTAMP '2026-09-02 13:29:00+00', TIMESTAMP '2026-09-29 05:07:00+00', 0, 'Nenhum fator de prioridade identificado', 'Solicitação de orientação financeira', 0.6131),
('EX-20260903070', '90000000507', 'Solicitação de orientação financeira', 'Como separar as despesas fixas das variáveis no meu planejamento?', 'CONCLUIDO', TIMESTAMP '2026-09-03 08:14:00+00', TIMESTAMP '2026-09-11 15:33:00+00', 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Solicitação de orientação financeira', 0.9385),
('EX-20260903071', '90000000256', 'Problema técnico', 'Tela branca ao abrir a página de protocolos pelo navegador do celular.', 'CONCLUIDO', TIMESTAMP '2026-09-03 18:07:00+00', TIMESTAMP '2026-09-05 07:45:00+00', 4, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "tela branca" (+2)', 'Problema técnico', 0.6276),
('EX-20260904072', '90000000256', 'Solicitação de orientação financeira', 'Quero entender a diferença entre poupança e Tesouro Direto para guardar dinheiro.', 'CONCLUIDO', TIMESTAMP '2026-09-04 19:16:00+00', TIMESTAMP '2026-09-10 13:53:00+00', 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Solicitação de orientação financeira', 0.6651),
('EX-20260907073', '90000000337', 'Solicitação de orientação financeira', 'Estou com dívidas no cartão de crédito e preciso de orientação para renegociar.', 'CONCLUIDO', TIMESTAMP '2026-09-07 12:36:00+00', TIMESTAMP '2026-09-18 10:23:00+00', 3, 'Categoria "Solicitação de orientação financeira" (+1) | Indício de vulnerabilidade financeira: "dívidas" (+2)', 'Solicitação de orientação financeira', 0.8113),
('EX-20260907074', '90000000256', 'Solicitação de orientação financeira', 'Estou com dívidas no cartão de crédito e preciso de orientação para renegociar.', 'CONCLUIDO', TIMESTAMP '2026-09-07 13:34:00+00', TIMESTAMP '2026-09-19 06:49:00+00', 3, 'Categoria "Solicitação de orientação financeira" (+1) | Indício de vulnerabilidade financeira: "dívidas" (+2)', 'Solicitação de orientação financeira', 0.8111),
('EX-20260909075', '90000000418', 'Problema técnico', 'Não consigo entrar na minha conta depois de trocar a senha.', 'EM_ANALISE', TIMESTAMP '2026-09-09 11:14:00+00', NULL, 4, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "não consigo" (+2)', 'Problema técnico', 0.9193),
('EX-20260909076', '90000000680', 'Solicitação de orientação financeira', 'Quero entender a diferença entre poupança e Tesouro Direto para guardar dinheiro.', 'CONCLUIDO', TIMESTAMP '2026-09-09 14:54:00+00', TIMESTAMP '2026-09-14 14:22:00+00', 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Solicitação de orientação financeira', 0.9371),
('EX-20260911077', '90000001147', 'Solicitação de orientação financeira', 'Gostaria de ajuda para montar um orçamento mensal da família.', 'CONCLUIDO', TIMESTAMP '2026-09-11 15:01:00+00', TIMESTAMP '2026-09-17 19:23:00+00', 1, 'Categoria "Solicitação de orientação financeira" (+1)', 'Solicitação de orientação financeira', 0.9622),
('EX-20260913078', '90000001066', 'Análise de viabilidade de Metas Financeiras', 'Minha meta de reserva de emergência é realista com a renda atual?', 'CONCLUIDO', TIMESTAMP '2026-09-13 09:41:00+00', TIMESTAMP '2026-09-30 06:05:00+00', 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.8031),
('EX-20260916079', '90000000680', 'Sugestão de melhoria', 'Gostaria de exportar meus protocolos em planilha.', 'EM_ANALISE', TIMESTAMP '2026-09-16 16:10:00+00', NULL, 0, 'Nenhum fator de prioridade identificado', 'Problema técnico', 0.4324),
('EX-20260919080', '90000000337', 'Problema técnico', 'A página de metas não carrega no celular.', 'EM_ANALISE', TIMESTAMP '2026-09-19 17:05:00+00', NULL, 4, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "não carrega" (+2)', 'Problema técnico', 0.6593),
('EX-20260924081', '90000001147', 'Sugestão de melhoria', 'Seria bom ter um modo escuro mais forte para usar à noite.', 'CRIADA', TIMESTAMP '2026-09-24 16:30:00+00', NULL, 0, 'Nenhum fator de prioridade identificado', 'Sugestão de melhoria', 0.8798),
('EX-20260927082', '90000000175', 'Análise de viabilidade de Metas Financeiras', 'Quero comprar uma moto em 18 meses; preciso de uma análise da meta.', 'CONCLUIDO', TIMESTAMP '2026-09-27 08:50:00+00', TIMESTAMP '2026-10-06 06:41:00+00', 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.6995),
('EX-20261002083', '90000000337', 'Análise de viabilidade de Metas Financeiras', 'Minha meta de reserva de emergência é realista com a renda atual?', 'EM_ANALISE', TIMESTAMP '2026-10-02 11:00:00+00', NULL, 1, 'Categoria "Análise de viabilidade de Metas Financeiras" (+1)', 'Análise de viabilidade de Metas Financeiras', 0.8057),
('EX-20261003084', '90000000760', 'Problema técnico', 'Perdi o acesso à conta e preciso enviar um documento até amanhã.', 'CRIADA', TIMESTAMP '2026-10-03 12:51:00+00', NULL, 5, 'Categoria "Problema técnico" (+2) | Relato de impedimento de uso: "perdi o acesso" (+2) | Urgência declarada: "até amanhã" (+1)', 'Problema técnico', 0.7535);

-- 4) Avaliacoes de exemplo (anonimas, abril a outubro de 2026)
INSERT INTO feedback (id, rating, comentario, registrado_em) VALUES
(900001, 2, 'Não entendi o mapa.', TIMESTAMP '2026-04-16 12:45:00+00'),
(900002, 3, NULL, TIMESTAMP '2026-04-07 17:42:00+00'),
(900003, 3, NULL, TIMESTAMP '2026-04-18 14:54:00+00'),
(900004, 4, NULL, TIMESTAMP '2026-04-07 21:39:00+00'),
(900005, 2, 'Não entendi o mapa.', TIMESTAMP '2026-04-24 19:08:00+00'),
(900006, 3, 'Razoável, demorou para responder.', TIMESTAMP '2026-04-10 09:15:00+00'),
(900007, 3, NULL, TIMESTAMP '2026-05-11 11:49:00+00'),
(900008, 3, NULL, TIMESTAMP '2026-05-15 15:41:00+00'),
(900009, 4, NULL, TIMESTAMP '2026-05-19 21:47:00+00'),
(900010, 2, 'Demorou muito para analisar meu pedido.', TIMESTAMP '2026-05-15 14:37:00+00'),
(900011, 4, 'Fácil de usar.', TIMESTAMP '2026-05-09 10:03:00+00'),
(900012, 3, NULL, TIMESTAMP '2026-05-06 19:30:00+00'),
(900013, 5, 'Gostei muito do painel de metas.', TIMESTAMP '2026-05-18 12:03:00+00'),
(900014, 4, NULL, TIMESTAMP '2026-06-21 17:08:00+00'),
(900015, 3, NULL, TIMESTAMP '2026-06-23 13:26:00+00'),
(900016, 4, 'Bom, mas poderia ser mais rápido.', TIMESTAMP '2026-06-23 16:57:00+00'),
(900017, 5, 'Gostei muito do painel de metas.', TIMESTAMP '2026-06-05 14:06:00+00'),
(900018, 3, 'Razoável, demorou para responder.', TIMESTAMP '2026-06-23 10:05:00+00'),
(900019, 4, NULL, TIMESTAMP '2026-06-20 11:05:00+00'),
(900020, 2, 'Não entendi o mapa.', TIMESTAMP '2026-06-14 11:14:00+00'),
(900021, 4, NULL, TIMESTAMP '2026-07-16 20:16:00+00'),
(900022, 5, 'Atendimento claro e educado.', TIMESTAMP '2026-07-12 09:41:00+00'),
(900023, 4, 'Bom, mas poderia ser mais rápido.', TIMESTAMP '2026-07-08 13:01:00+00'),
(900024, 3, 'Razoável, demorou para responder.', TIMESTAMP '2026-07-06 11:49:00+00'),
(900025, 5, 'Resolveram meu problema rápido.', TIMESTAMP '2026-07-08 11:54:00+00'),
(900026, 4, NULL, TIMESTAMP '2026-07-08 18:04:00+00'),
(900027, 4, 'Bom, mas poderia ser mais rápido.', TIMESTAMP '2026-07-13 16:29:00+00'),
(900028, 5, 'Atendimento claro e educado.', TIMESTAMP '2026-08-17 15:01:00+00'),
(900029, 4, 'Fácil de usar.', TIMESTAMP '2026-08-05 13:00:00+00'),
(900030, 4, 'Fácil de usar.', TIMESTAMP '2026-08-11 17:19:00+00'),
(900031, 5, NULL, TIMESTAMP '2026-08-12 12:07:00+00'),
(900032, 3, NULL, TIMESTAMP '2026-08-12 16:39:00+00'),
(900033, 5, NULL, TIMESTAMP '2026-08-07 12:14:00+00'),
(900034, 5, 'Atendimento claro e educado.', TIMESTAMP '2026-09-21 12:25:00+00'),
(900035, 5, NULL, TIMESTAMP '2026-09-09 15:57:00+00'),
(900036, 4, NULL, TIMESTAMP '2026-09-16 14:05:00+00'),
(900037, 5, 'Resolveram meu problema rápido.', TIMESTAMP '2026-09-13 13:24:00+00'),
(900038, 4, 'Bom, mas poderia ser mais rápido.', TIMESTAMP '2026-09-03 09:28:00+00'),
(900039, 5, NULL, TIMESTAMP '2026-09-03 19:35:00+00'),
(900040, 5, 'Atendimento claro e educado.', TIMESTAMP '2026-10-04 14:26:00+00'),
(900041, 1, 'O site travou várias vezes.', TIMESTAMP '2026-10-03 13:55:00+00');

-- 5) Metas financeiras de exemplo
INSERT INTO meta (id, cpf_usuario, tipo, atual, objetivo, prazo) VALUES
(900001, '90000000175', 'Reserva de Emergência', 3200.00, 10000.00, '12 meses'),
(900002, '90000000256', 'Reserva de Emergência', 6000.00, 6000.00, '8 meses'),
(900003, '90000000337', 'Reserva de Emergência', 1500.00, 9000.00, '18 meses'),
(900004, '90000000418', 'Reserva de Emergência', 4800.00, 12000.00, '12 meses'),
(900005, '90000000507', 'Viagem', 2500.00, 5000.00, '6 meses'),
(900006, '90000000680', 'Viagem', 900.00, 8000.00, '10 meses'),
(900007, '90000000760', 'Viagem', 4200.00, 4000.00, '5 meses'),
(900008, '90000000841', 'Férias', 1200.00, 3000.00, '4 meses'),
(900009, '90000000922', 'Férias', 300.00, 2500.00, '6 meses'),
(900010, '90000001066', 'Investimentos', 7000.00, 20000.00, '24 meses'),
(900011, '90000001147', 'Investimentos', 2100.00, 15000.00, '36 meses'),
(900012, '90000001228', 'Investimentos', 12500.00, 25000.00, '24 meses'),
(900013, '90000001309', 'Casa própria', 18000.00, 60000.00, '48 meses'),
(900014, '90000000175', 'Troca de moto', 3500.00, 9000.00, '18 meses'),
(900015, '90000000256', 'Curso técnico', 1800.00, 2400.00, '6 meses');

COMMIT;
