package br.gov.taubate.vidareal.analise;

import br.gov.taubate.vidareal.modelo.Protocolo;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Duas analises sobre os protocolos, montadas para o endpoint
 * {@code GET /api/v1/protocolos/analises}:
 *
 * <ol>
 *   <li><b>Spearman</b> entre a prioridade (pontos da triagem) e o tempo de
 *       resolucao, em dias, dos protocolos concluidos: a prioridade alta
 *       esta sendo atendida mais rapido?</li>
 *   <li><b>Regressao linear simples</b> do numero de protocolos abertos por
 *       semana: o volume esta subindo ou caindo?</li>
 * </ol>
 *
 * <p>Funcao pura (lista de protocolos entra, mapa sai): nao consulta o banco
 * nem le o relogio, o que a torna testavel com dados conhecidos.</p>
 *
 * <p>Sem p-valor nem intervalo de confianca; os textos de interpretacao
 * deixam isso explicito.</p>
 */
public final class AnaliseProtocolos {

    /** Protocolos de exemplo (dados-exemplo.sql) tem id iniciado por este prefixo. */
    public static final String PREFIXO_FICTICIO = "EX-";

    /** Abaixo disto o rho oscila demais para ser mostrado. */
    static final int MINIMO_PARES_SPEARMAN = 10;

    /** Semanas completas necessarias para tracar uma tendencia. */
    static final int MINIMO_SEMANAS = 4;

    static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private AnaliseProtocolos() {
    }

    public static Map<String, Object> montar(List<Protocolo> protocolos) {
        long ficticios = protocolos.stream()
                .filter(p -> p.getId().startsWith(PREFIXO_FICTICIO)).count();

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("dadosFicticios", avisoFicticios(ficticios, protocolos.size()));
        resposta.put("prioridadeXTempo", prioridadeXTempo(protocolos));
        resposta.put("tendenciaVolume", tendenciaVolume(protocolos));
        return resposta;
    }

    // ---------- dados ficticios ----------

    private static Map<String, Object> avisoFicticios(long ficticios, int total) {
        Map<String, Object> aviso = new LinkedHashMap<>();
        aviso.put("quantidade", ficticios);
        aviso.put("total", total);
        aviso.put("aviso", ficticios == 0 ? null
                : ficticios + " de " + total + " protocolos analisados são FICTÍCIOS "
                        + "(dados de demonstração, ids iniciados por \"" + PREFIXO_FICTICIO + "\"). "
                        + "Os resultados abaixo não representam cidadãos reais.");
        return aviso;
    }

    // ---------- a) Spearman: prioridade x tempo de resolucao ----------

    static Map<String, Object> prioridadeXTempo(List<Protocolo> protocolos) {
        List<Protocolo> amostra = protocolos.stream()
                .filter(p -> p.getConcluidoEm() != null && p.getPrioridadePontos() != null)
                .toList();

        double[] pontos = new double[amostra.size()];
        double[] dias = new double[amostra.size()];
        for (int i = 0; i < amostra.size(); i++) {
            Protocolo p = amostra.get(i);
            pontos[i] = p.getPrioridadePontos();
            dias[i] = Duration.between(p.getAbertoEm(), p.getConcluidoEm()).toMillis()
                    / (1000.0 * 60 * 60 * 24);
        }

        Map<String, Object> saida = new LinkedHashMap<>();
        saida.put("variaveis", "Pontos de prioridade da triagem x dias entre abertura e conclusão");
        saida.put("metodo", "Correlação de Spearman (sobre postos; empates pela média)");
        saida.put("amostra", amostra.size());

        if (amostra.size() < MINIMO_PARES_SPEARMAN) {
            return indisponivel(saida, "Amostra insuficiente: há " + amostra.size()
                    + " protocolo(s) concluído(s) com triagem; são necessários ao menos "
                    + MINIMO_PARES_SPEARMAN + ".");
        }

        try {
            AnaliseEstatistica.Correlacao c = AnaliseEstatistica.spearman(pontos, dias);
            saida.put("disponivel", true);
            saida.put("rho", arredondar(c.rho(), 3));
            saida.put("forca", forca(c.rho()));
            saida.put("interpretacao", interpretarSpearman(c.rho(), c.n()));
            return saida;
        } catch (IllegalArgumentException erro) {
            return indisponivel(saida, erro.getMessage());
        }
    }

    static String forca(double rho) {
        double a = Math.abs(rho);
        String grau = a < 0.1 ? "desprezível" : a < 0.3 ? "fraca" : a < 0.5 ? "moderada"
                : a < 0.7 ? "forte" : "muito forte";
        if (a < 0.1) {
            return "Correlação " + grau;
        }
        return "Correlação " + (rho < 0 ? "negativa " : "positiva ") + grau;
    }

    private static String interpretarSpearman(double rho, int n) {
        String sentido;
        if (Math.abs(rho) < 0.1) {
            sentido = "Não há relação perceptível entre a prioridade e o tempo de resolução.";
        } else if (rho < 0) {
            sentido = "Protocolos de prioridade mais alta tendem a ser concluídos em menos tempo "
                    + "(o que é compatível com a fila priorizada estar sendo seguida, mas não prova isso).";
        } else {
            sentido = "Protocolos de prioridade mais alta tendem a demorar mais para ser concluídos "
                    + "(a prioridade pode não estar orientando o atendimento, ou os casos graves "
                    + "são mais difíceis de resolver).";
        }
        return sentido + " Base: " + n + " protocolos concluídos. É uma associação, não prova de "
                + "causa, e esta versão não calcula p-valor: com amostra pequena o resultado pode "
                + "ser acaso.";
    }

    // ---------- b) Regressao: volume semanal ----------

    static Map<String, Object> tendenciaVolume(List<Protocolo> protocolos) {
        Map<String, Object> saida = new LinkedHashMap<>();
        saida.put("variaveis", "Número da semana x protocolos abertos na semana");
        saida.put("metodo", "Regressão linear simples (mínimos quadrados)");

        if (protocolos.isEmpty()) {
            saida.put("semanas", 0);
            return indisponivel(saida, "Não há protocolos.");
        }

        // Semana = segunda a domingo, no fuso da prefeitura.
        LocalDate primeira = null;
        LocalDate ultima = null;
        List<LocalDate> inicios = new ArrayList<>();
        for (Protocolo p : protocolos) {
            LocalDate inicio = p.getAbertoEm().atZone(FUSO).toLocalDate()
                    .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            inicios.add(inicio);
            if (primeira == null || inicio.isBefore(primeira)) {
                primeira = inicio;
            }
            if (ultima == null || inicio.isAfter(ultima)) {
                ultima = inicio;
            }
        }

        // Primeira e ultima semanas podem estar incompletas (a serie comeca e
        // termina no meio delas) e puxariam a reta para baixo: ficam de fora.
        LocalDate de = primeira.plusWeeks(1);
        LocalDate ate = ultima.minusWeeks(1);
        int semanas = de.isAfter(ate) ? 0 : (int) ChronoUnit.WEEKS.between(de, ate) + 1;
        saida.put("semanas", semanas);
        saida.put("semanasDescartadas", "primeira e última (podem estar incompletas)");

        if (semanas < MINIMO_SEMANAS) {
            return indisponivel(saida, "Série curta: há " + semanas + " semana(s) completa(s); "
                    + "são necessárias ao menos " + MINIMO_SEMANAS + ".");
        }

        // Semanas sem nenhum protocolo contam como zero: sao parte da serie.
        double[] indice = new double[semanas];
        double[] contagem = new double[semanas];
        for (int i = 0; i < semanas; i++) {
            indice[i] = i;
        }
        for (LocalDate inicio : inicios) {
            if (!inicio.isBefore(de) && !inicio.isAfter(ate)) {
                contagem[(int) ChronoUnit.WEEKS.between(de, inicio)]++;
            }
        }

        AnaliseEstatistica.Regressao r;
        try {
            r = AnaliseEstatistica.regressaoLinear(indice, contagem);
        } catch (IllegalArgumentException erro) {
            return indisponivel(saida, erro.getMessage());
        }

        List<Map<String, Object>> serie = new ArrayList<>();
        for (int i = 0; i < semanas; i++) {
            Map<String, Object> ponto = new LinkedHashMap<>();
            ponto.put("semana", de.plusWeeks(i).toString());
            ponto.put("protocolos", (int) contagem[i]);
            ponto.put("tendencia", arredondar(r.intercepto() + r.inclinacao() * i, 2));
            serie.add(ponto);
        }

        saida.put("disponivel", true);
        saida.put("inclinacao", arredondar(r.inclinacao(), 3));
        saida.put("intercepto", arredondar(r.intercepto(), 3));
        saida.put("r2", r.r2() == null ? null : arredondar(r.r2(), 3));
        saida.put("serie", serie);
        saida.put("interpretacao", interpretarTendencia(r));
        return saida;
    }

    private static String interpretarTendencia(AnaliseEstatistica.Regressao r) {
        String direcao;
        if (Math.abs(r.inclinacao()) < 0.05) {
            direcao = "O volume semanal está praticamente estável.";
        } else {
            direcao = "O volume semanal " + (r.inclinacao() > 0 ? "sobe" : "cai") + " cerca de "
                    + String.format("%.2f", Math.abs(r.inclinacao())).replace('.', ',')
                    + " protocolo(s) por semana, em média.";
        }
        String ajuste = r.r2() == null
                ? "Como o volume não varia, o R² não está definido."
                : "R² = " + String.format("%.2f", r.r2()).replace('.', ',') + ": a reta explica "
                        + Math.round(r.r2() * 100) + "% da variação semanal"
                        + (r.r2() < 0.3 ? " (pouco: use a tendência com cautela)." : ".");
        return direcao + " " + ajuste + " Projetar além da série é extrapolação, sem intervalo de "
                + "confiança nesta versão.";
    }

    // ---------- apoio ----------

    private static Map<String, Object> indisponivel(Map<String, Object> saida, String motivo) {
        saida.put("disponivel", false);
        saida.put("motivo", motivo);
        return saida;
    }

    private static double arredondar(double valor, int casas) {
        double fator = Math.pow(10, casas);
        return Math.round(valor * fator) / fator;
    }
}
