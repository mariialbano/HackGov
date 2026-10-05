package br.gov.taubate.vidareal.triagem;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Prioridade de atendimento de um protocolo, por regras deterministicas.
 *
 * <p>NAO e aprendizado de maquina: nao existe historico de protocolos com
 * prioridade rotulada que permitisse treinar um modelo. Cada fator abaixo
 * soma pontos e entra na lista de motivos, de modo que o atendente sempre
 * enxerga por que um protocolo subiu na fila.</p>
 *
 * <table>
 *   <caption>Fatores</caption>
 *   <tr><td>Categoria "Problema técnico"</td><td>+2</td></tr>
 *   <tr><td>Categoria de orientacao financeira ou analise de metas</td><td>+1</td></tr>
 *   <tr><td>Relato de impedimento de uso ("não consigo", "erro ao")</td><td>+2</td></tr>
 *   <tr><td>Indicio de vulnerabilidade financeira ("dívida", "negativado")</td><td>+2</td></tr>
 *   <tr><td>Urgencia declarada ("urgente", "para hoje", "até amanhã")</td><td>+1</td></tr>
 * </table>
 *
 * <p>As expressoes sao contextualizadas de proposito: "erro", "hoje" e
 * "amanhã" soltos aparecem em textos que nao relatam impedimento nem pedem
 * urgencia, e contariam como falso positivo.</p>
 *
 * <p>Niveis: 0-1 Baixa, 2-3 Média, 4 ou mais Alta.</p>
 */
public final class CalculadoraPrioridade {

    private CalculadoraPrioridade() {
    }

    /** Resultado do calculo, com os motivos que o justificam. */
    public record Prioridade(String nivel, int pontos, List<String> motivos) {
    }

    public static final String ALTA = "Alta";
    public static final String MEDIA = "Média";
    public static final String BAIXA = "Baixa";

    private static final int MINIMO_ALTA = 4;
    private static final int MINIMO_MEDIA = 2;

    /** Peso de cada categoria: quem esta impedido de usar o servico vem antes. */
    private static final Map<String, Integer> PESO_CATEGORIA = Map.of(
            "Problema técnico", 2,
            "Solicitação de orientação financeira", 1,
            "Análise de viabilidade de Metas Financeiras", 1,
            "Dúvida sobre inflação", 0,
            "Sugestão de melhoria", 0);

    /** Grupo de expressoes que, presentes na descricao, somam pontos uma unica vez. */
    private record Fator(String rotulo, int pontos, List<String> expressoes, List<Pattern> padroes) {

        static Fator de(String rotulo, int pontos, String... expressoes) {
            List<Pattern> padroes = new ArrayList<>();
            for (String expressao : expressoes) {
                // A descricao e comparada sem acentos; a expressao guarda a
                // grafia correta para aparecer nos motivos.
                padroes.add(Pattern.compile(
                        "\\b" + Pattern.quote(PreProcessadorTexto.normalizar(expressao)) + "\\b"));
            }
            return new Fator(rotulo, pontos, List.of(expressoes), padroes);
        }
    }

    private static final List<Fator> FATORES = List.of(
            Fator.de("Relato de impedimento de uso", 2,
                    // "erro" sozinho fica de fora: "melhorar a mensagem de erro"
                    // e uma sugestao, nao alguem impedido de usar o servico.
                    "não consigo", "não consegui", "não carrega", "não abre", "não funciona",
                    "não entra", "não aparece", "não salva", "travou", "travando", "trava",
                    "erro ao", "aparece erro", "dá erro", "deu erro", "dando erro",
                    "retornou erro", "erro inesperado", "fora do ar", "bloqueado", "bloqueada",
                    "perdi o acesso", "perdi acesso", "tela branca"),
            Fator.de("Indício de vulnerabilidade financeira", 2,
                    "dívida", "dívidas", "endividado", "endividada", "superendividamento",
                    "negativado", "negativada", "nome sujo", "desempregado", "desempregada",
                    "desemprego", "despejo", "cobrança", "cobranças", "inadimplente",
                    "atrasado", "atrasada", "atrasados", "atrasadas", "sem renda"),
            // "emergência" fica de fora: "reserva de emergência" e o nome de
            // uma meta comum, nao um pedido urgente.
            // "hoje" e "amanhã" so contam com contexto de prazo: "o site esta
            // lento hoje" descreve o momento, nao pede urgencia.
            Fator.de("Urgência declarada", 1,
                    "urgente", "urgência", "para hoje", "pra hoje", "ainda hoje", "até hoje",
                    "vence hoje", "para amanhã", "pra amanhã", "até amanhã", "vence amanhã",
                    "o quanto antes", "imediato", "imediatamente", "prazo vence"));

    /**
     * @param tipo      categoria escolhida pelo cidadao (nao a sugerida)
     * @param descricao texto do protocolo
     */
    public static Prioridade calcular(String tipo, String descricao) {
        int pontos = 0;
        List<String> motivos = new ArrayList<>();

        int pesoCategoria = PESO_CATEGORIA.getOrDefault(tipo, 0);
        if (pesoCategoria > 0) {
            pontos += pesoCategoria;
            motivos.add("Categoria \"" + tipo + "\" (+" + pesoCategoria + ")");
        }

        String texto = PreProcessadorTexto.normalizar(descricao);
        for (Fator fator : FATORES) {
            // Cada fator conta uma vez: repetir "urgente" nao infla a prioridade.
            for (int i = 0; i < fator.padroes().size(); i++) {
                if (fator.padroes().get(i).matcher(texto).find()) {
                    pontos += fator.pontos();
                    motivos.add(fator.rotulo() + ": \"" + fator.expressoes().get(i)
                            + "\" (+" + fator.pontos() + ")");
                    break;
                }
            }
        }

        if (motivos.isEmpty()) {
            motivos.add("Nenhum fator de prioridade identificado");
        }

        return new Prioridade(nivel(pontos), pontos, List.copyOf(motivos));
    }

    /**
     * Nivel correspondente a uma pontuacao. O banco guarda apenas os pontos:
     * o nivel e derivado aqui, sempre pela mesma regra.
     */
    public static String nivel(int pontos) {
        return pontos >= MINIMO_ALTA ? ALTA : pontos >= MINIMO_MEDIA ? MEDIA : BAIXA;
    }
}
