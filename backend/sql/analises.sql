-- ---------------------------------------------------------------------------
-- VidaReal - Análise com SQL
--
-- Oito consultas sobre o banco do VidaReal (protocolos, avaliações e metas).
-- Cada uma começa com a pergunta que ela responde e a técnica usada.
--
-- SQL padrão sempre que possível (o projeto é compatível com Oracle).
-- A única função específica do H2 é DATEDIFF, usada para medir o tempo
-- entre duas datas; o equivalente em Oracle está anotado na consulta 2.
--
-- Os números de prioridade seguem a mesma regra do sistema
-- (CalculadoraPrioridade.java): 0 a 1 ponto = Baixa, 2 a 3 = Média,
-- 4 ou mais = Alta.
-- ---------------------------------------------------------------------------


-- ===========================================================================
-- Consulta 1 - Volume de protocolos por tipo e etapa
-- Pergunta: quais assuntos geram mais pedidos e quantos de cada um ainda estão parados?
-- Técnica: GROUP BY com COUNT, SUM(CASE) para separar as etapas e SUM() OVER () para o % do total
-- ===========================================================================
SELECT
    p.tipo                                                     AS tipo,
    COUNT(*)                                                   AS total,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)         AS pct_do_total,
    SUM(CASE WHEN p.etapa = 'CRIADA'     THEN 1 ELSE 0 END)    AS criadas,
    SUM(CASE WHEN p.etapa = 'EM_ANALISE' THEN 1 ELSE 0 END)    AS em_analise,
    SUM(CASE WHEN p.etapa = 'CONCLUIDO'  THEN 1 ELSE 0 END)    AS concluidos,
    ROUND(100.0 * SUM(CASE WHEN p.etapa = 'CONCLUIDO' THEN 1 ELSE 0 END) / COUNT(*), 1)
                                                               AS pct_concluido
FROM protocolo p
GROUP BY p.tipo
ORDER BY total DESC, p.tipo;


-- ===========================================================================
-- Consulta 2 - Tempo de resolução por tipo
-- Pergunta: quanto tempo, em dias, a equipe leva para concluir cada tipo de pedido?
-- Técnica: função de data (DATEDIFF) com AVG, MIN e MAX
-- ===========================================================================
-- DATEDIFF(HOUR, ...) conta as horas entre abertura e conclusão; dividir
-- por 24.0 dá os dias com casas decimais. Em Oracle a conta equivalente é
-- (CAST(concluido_em AS DATE) - CAST(aberto_em AS DATE)).
SELECT
    p.tipo                                                         AS tipo,
    COUNT(*)                                                       AS concluidos,
    ROUND(AVG(DATEDIFF(HOUR, p.aberto_em, p.concluido_em) / 24.0), 1) AS media_dias,
    ROUND(MIN(DATEDIFF(HOUR, p.aberto_em, p.concluido_em) / 24.0), 1) AS min_dias,
    ROUND(MAX(DATEDIFF(HOUR, p.aberto_em, p.concluido_em) / 24.0), 1) AS max_dias
FROM protocolo p
WHERE p.etapa = 'CONCLUIDO'
  AND p.concluido_em IS NOT NULL
GROUP BY p.tipo
ORDER BY media_dias DESC;


-- ===========================================================================
-- Consulta 3 - Tipos mais lentos que a média geral
-- Pergunta: quais tipos de pedido demoram mais do que a média de todos os pedidos concluídos?
-- Técnica: subconsulta (no SELECT e no HAVING)
-- ===========================================================================
-- A subconsulta calcula uma vez a média geral; o HAVING compara a média de
-- cada tipo com ela e mantém só os que ficam acima.
SELECT
    p.tipo                                                             AS tipo,
    ROUND(AVG(DATEDIFF(HOUR, p.aberto_em, p.concluido_em) / 24.0), 1)  AS media_tipo_dias,
    (SELECT ROUND(AVG(DATEDIFF(HOUR, g.aberto_em, g.concluido_em) / 24.0), 1)
       FROM protocolo g
      WHERE g.etapa = 'CONCLUIDO' AND g.concluido_em IS NOT NULL)      AS media_geral_dias,
    ROUND(AVG(DATEDIFF(HOUR, p.aberto_em, p.concluido_em) / 24.0)
        - (SELECT AVG(DATEDIFF(HOUR, g.aberto_em, g.concluido_em) / 24.0)
             FROM protocolo g
            WHERE g.etapa = 'CONCLUIDO' AND g.concluido_em IS NOT NULL), 1) AS dias_acima_da_media
FROM protocolo p
WHERE p.etapa = 'CONCLUIDO'
  AND p.concluido_em IS NOT NULL
GROUP BY p.tipo
HAVING AVG(DATEDIFF(HOUR, p.aberto_em, p.concluido_em) / 24.0) >
       (SELECT AVG(DATEDIFF(HOUR, g.aberto_em, g.concluido_em) / 24.0)
          FROM protocolo g
         WHERE g.etapa = 'CONCLUIDO' AND g.concluido_em IS NOT NULL)
ORDER BY media_tipo_dias DESC;


-- ===========================================================================
-- Consulta 4 - Ranking das cidades e principal demanda de cada uma
-- Pergunta: quais cidades mais abrem protocolos e qual é o assunto mais pedido em cada uma?
-- Técnica: JOIN usuario x protocolo, funções de janela RANK e DENSE_RANK, WITH (subconsultas nomeadas) e LISTAGG
-- ===========================================================================
-- WITH separa a conta em três partes nomeadas:
--   base:       cada protocolo com a cidade de quem abriu (JOIN com usuario);
--   por_cidade: total de protocolos e de cidadãos distintos por cidade;
--   por_tipo:   quantidade por cidade + tipo, com DENSE_RANK colocando o
--               tipo mais pedido de cada cidade na posição 1.
-- No fim, RANK ordena as cidades pelo total. Se dois ou mais tipos empatarem
-- em primeiro lugar, LISTAGG junta os nomes na mesma linha.
WITH base AS (
    SELECT COALESCE(u.cidade, 'Não informada') AS cidade,
           p.tipo,
           p.cpf_solicitante
    FROM protocolo p
    JOIN usuario u ON u.cpf = p.cpf_solicitante
),
por_cidade AS (
    SELECT cidade,
           COUNT(*)                        AS total_cidade,
           COUNT(DISTINCT cpf_solicitante) AS cidadaos
    FROM base
    GROUP BY cidade
),
por_tipo AS (
    SELECT cidade,
           tipo,
           COUNT(*)                                                   AS qtd_tipo,
           DENSE_RANK() OVER (PARTITION BY cidade ORDER BY COUNT(*) DESC) AS posicao_tipo
    FROM base
    GROUP BY cidade, tipo
)
SELECT
    RANK() OVER (ORDER BY c.total_cidade DESC)                  AS posicao,
    c.cidade                                                    AS cidade,
    c.total_cidade                                              AS protocolos,
    c.cidadaos                                                  AS cidadaos,
    ROUND(100.0 * c.total_cidade / SUM(c.total_cidade) OVER (), 1) AS pct_do_total,
    LISTAGG(t.tipo, ' / ') WITHIN GROUP (ORDER BY t.tipo)       AS principal_demanda,
    MAX(t.qtd_tipo)                                             AS qtd_principal
FROM por_cidade c
JOIN por_tipo t ON t.cidade = c.cidade AND t.posicao_tipo = 1
GROUP BY c.cidade, c.total_cidade, c.cidadaos
ORDER BY posicao, c.cidade;


-- ===========================================================================
-- Consulta 5 - Distribuição por nível de prioridade
-- Pergunta: quantos pedidos são de prioridade alta, quantos ainda estão abertos e eles são atendidos mais rápido?
-- Técnica: CASE para derivar o nível, tabela derivada, % com SUM() OVER ()
-- ===========================================================================
-- O nível não é gravado no banco (só os pontos), por isso é derivado aqui
-- com os mesmos limites do sistema. Protocolos anteriores à triagem
-- (pontos nulos) aparecem como "Sem triagem".
SELECT
    t.nivel                                                      AS nivel,
    COUNT(*)                                                     AS protocolos,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)           AS pct_do_total,
    SUM(CASE WHEN t.etapa <> 'CONCLUIDO' THEN 1 ELSE 0 END)      AS em_aberto,
    ROUND(AVG(CASE WHEN t.etapa = 'CONCLUIDO'
                   THEN DATEDIFF(HOUR, t.aberto_em, t.concluido_em) / 24.0 END), 1)
                                                                 AS media_dias_resolucao
FROM (
    SELECT
        p.etapa, p.aberto_em, p.concluido_em,
        CASE
            WHEN p.prioridade_pontos IS NULL THEN 'Sem triagem'
            WHEN p.prioridade_pontos >= 4    THEN 'Alta'
            WHEN p.prioridade_pontos >= 2    THEN 'Média'
            ELSE 'Baixa'
        END AS nivel,
        CASE
            WHEN p.prioridade_pontos IS NULL THEN 4
            WHEN p.prioridade_pontos >= 4    THEN 1
            WHEN p.prioridade_pontos >= 2    THEN 2
            ELSE 3
        END AS ordem
    FROM protocolo p
) t
GROUP BY t.nivel, t.ordem
ORDER BY t.ordem;


-- ===========================================================================
-- Consulta 6 - Aceitação da sugestão da IA por tipo
-- Pergunta: com que frequência o cidadão fica com o tipo que a IA sugeriu, e a confiança da IA indica quando ela acerta?
-- Técnica: GROUP BY com SUM(CASE), AVG condicional e % geral com SUM() OVER ()
-- ===========================================================================
-- "Aceita" = o tipo escolhido pelo cidadão é igual ao sugerido.
-- Protocolos sem sugestão (anteriores à triagem) ficam de fora da conta.
SELECT
    p.tipo                                                               AS tipo_escolhido,
    COUNT(*)                                                             AS com_sugestao,
    SUM(CASE WHEN p.tipo_sugerido = p.tipo THEN 1 ELSE 0 END)            AS aceitas,
    ROUND(100.0 * SUM(CASE WHEN p.tipo_sugerido = p.tipo THEN 1 ELSE 0 END) / COUNT(*), 1)
                                                                         AS pct_aceitacao,
    ROUND(100.0 * SUM(SUM(CASE WHEN p.tipo_sugerido = p.tipo THEN 1 ELSE 0 END)) OVER ()
                / SUM(COUNT(*)) OVER (), 1)                              AS pct_geral,
    ROUND(AVG(CASE WHEN p.tipo_sugerido =  p.tipo THEN p.confianca_sugestao END), 2)
                                                                         AS confianca_quando_aceita,
    ROUND(AVG(CASE WHEN p.tipo_sugerido <> p.tipo THEN p.confianca_sugestao END), 2)
                                                                         AS confianca_quando_trocada
FROM protocolo p
WHERE p.tipo_sugerido IS NOT NULL
GROUP BY p.tipo
ORDER BY pct_aceitacao DESC, p.tipo;


-- ===========================================================================
-- Consulta 7 - Satisfação mês a mês
-- Pergunta: a nota média das avaliações está melhorando ao longo dos meses?
-- Técnica: EXTRACT de ano e mês, AVG, HAVING (mínimo de 3 avaliações), tabela derivada e função de janela LAG
-- ===========================================================================
-- A tabela derivada agrupa as avaliações por mês. O HAVING descarta meses
-- com menos de 3 avaliações: com tão poucas notas a média oscila demais
-- para ser comparada. Por fora, LAG traz a média do mês anterior (entre os
-- meses que passaram no filtro) para calcular a variação.
SELECT
    m.ano,
    m.mes,
    m.avaliacoes,
    m.nota_media,
    m.pct_notas_4_ou_5,
    m.nota_media - LAG(m.nota_media) OVER (ORDER BY m.ano, m.mes)  AS variacao_mes_anterior
FROM (
    SELECT
        EXTRACT(YEAR  FROM f.registrado_em)                        AS ano,
        EXTRACT(MONTH FROM f.registrado_em)                        AS mes,
        COUNT(*)                                                   AS avaliacoes,
        ROUND(AVG(f.rating * 1.0), 2)                              AS nota_media,
        ROUND(100.0 * SUM(CASE WHEN f.rating >= 4 THEN 1 ELSE 0 END) / COUNT(*), 1)
                                                                   AS pct_notas_4_ou_5
    FROM feedback f
    GROUP BY EXTRACT(YEAR FROM f.registrado_em), EXTRACT(MONTH FROM f.registrado_em)
    HAVING COUNT(*) >= 3
) m
ORDER BY m.ano, m.mes;


-- ===========================================================================
-- Consulta 8 - Progresso das metas financeiras
-- Pergunta: quanto das metas os cidadãos já juntaram, por tipo de meta?
-- Técnica: GROUP BY, SUM, AVG de razão (atual / objetivo), CASE e NULLIF
-- ===========================================================================
-- Metas com nome próprio (fora das quatro opções da tela) entram em "Outros".
-- O progresso de cada meta é limitado a 100%: quem passou do objetivo
-- conta como meta cumprida, sem inflar a média. NULLIF evita divisão por
-- zero se algum objetivo for 0.
SELECT
    m.grupo                                                        AS tipo_meta,
    COUNT(*)                                                       AS metas,
    SUM(m.atual)                                                   AS total_guardado,
    SUM(m.objetivo)                                                AS total_objetivo,
    ROUND(100.0 * AVG(m.progresso), 1)                             AS progresso_medio_pct,
    SUM(CASE WHEN m.atual >= m.objetivo THEN 1 ELSE 0 END)         AS metas_cumpridas
FROM (
    SELECT
        CASE WHEN tipo IN ('Reserva de Emergência', 'Férias', 'Viagem', 'Investimentos')
             THEN tipo ELSE 'Outros' END                           AS grupo,
        atual,
        objetivo,
        CASE WHEN atual >= objetivo THEN 1.0
             ELSE atual / NULLIF(objetivo, 0) END                  AS progresso
    FROM meta
) m
GROUP BY m.grupo
ORDER BY progresso_medio_pct DESC;
