package br.gov.taubate.vidareal.triagem;

import br.gov.taubate.vidareal.triagem.PreProcessadorTexto.Termo;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Classificador de texto Naive Bayes Multinomial com suavizacao de Laplace.
 *
 * <p>O treino e uma contagem em passada unica sobre os exemplos rotulados,
 * sem sorteio nem iteracao: os mesmos exemplos produzem sempre o mesmo
 * modelo, e o mesmo texto recebe sempre a mesma resposta.</p>
 *
 * <p>Complexidade, com N exemplos, L termos por exemplo, V termos no
 * vocabulario, C classes e n termos no texto classificado:</p>
 * <ul>
 *   <li>treino: O(N·L) de tempo e O(C·V) de memoria;</li>
 *   <li>classificacao: O(C·n) &mdash; linear no tamanho do texto, ja que C
 *       e fixo. Cada termo e buscado em tabela de dispersao, O(1) em media.</li>
 * </ul>
 */
public class ClassificadorNaiveBayes {

    /** Exemplo rotulado do conjunto de treino. */
    public record Exemplo(String tipo, String texto) {
    }

    /** Classe e sua confianca relativa. */
    public record Pontuacao(String classe, double confianca) {
    }

    /**
     * Resposta da classificacao.
     *
     * @param ranking             as classes, da mais para a menos provavel
     * @param termosInfluentes    palavras do texto que mais pesaram a favor
     *                            da primeira classe
     * @param palavrasConhecidas  quantas palavras do texto existem no
     *                            vocabulario de treino
     */
    public record Resultado(List<Pontuacao> ranking, List<String> termosInfluentes,
                            int palavrasConhecidas) {

        public Pontuacao melhor() {
            return ranking.get(0);
        }
    }

    private static final int TERMOS_NA_EXPLICACAO = 3;

    private final List<String> classes;
    /** termo -> ocorrencias em cada classe (mesma ordem de {@link #classes}). */
    private final Map<String, int[]> contagens = new HashMap<>();
    private final int[] termosPorClasse;
    private final int[] exemplosPorClasse;
    private final int totalExemplos;

    public ClassificadorNaiveBayes(List<String> classes, List<Exemplo> exemplos) {
        this.classes = List.copyOf(classes);
        this.termosPorClasse = new int[classes.size()];
        this.exemplosPorClasse = new int[classes.size()];
        this.totalExemplos = exemplos.size();

        for (Exemplo exemplo : exemplos) {
            int classe = this.classes.indexOf(exemplo.tipo());
            if (classe < 0) {
                throw new IllegalArgumentException(
                        "Exemplo de treino com categoria desconhecida: " + exemplo.tipo());
            }
            exemplosPorClasse[classe]++;
            for (Termo termo : PreProcessadorTexto.extrair(exemplo.texto())) {
                contagens.computeIfAbsent(termo.chave(), k -> new int[this.classes.size()])[classe]++;
                termosPorClasse[classe]++;
            }
        }
    }

    public int tamanhoVocabulario() {
        return contagens.size();
    }

    public Resultado classificar(String texto) {
        // Termo fora do vocabulario nao distingue classe nenhuma: e ignorado.
        List<Termo> conhecidos = PreProcessadorTexto.extrair(texto).stream()
                .filter(termo -> contagens.containsKey(termo.chave()))
                .toList();
        int palavrasConhecidas = (int) conhecidos.stream().filter(t -> !t.bigrama()).count();

        double[] pontos = new double[classes.size()];
        for (int c = 0; c < classes.size(); c++) {
            pontos[c] = Math.log((exemplosPorClasse[c] + 1.0) / (totalExemplos + classes.size()));
            for (Termo termo : conhecidos) {
                pontos[c] += logVerossimilhanca(termo.chave(), c);
            }
        }

        double[] confiancas = confiancaRelativa(pontos, conhecidos.size());

        List<Pontuacao> ranking = new ArrayList<>();
        for (int c = 0; c < classes.size(); c++) {
            ranking.add(new Pontuacao(classes.get(c), confiancas[c]));
        }
        // A ordenacao e estavel: no empate vale a ordem fixa das categorias.
        ranking.sort(Comparator.comparingDouble(Pontuacao::confianca).reversed());

        int vencedora = classes.indexOf(ranking.get(0).classe());
        return new Resultado(List.copyOf(ranking), explicar(conhecidos, vencedora), palavrasConhecidas);
    }

    /** log P(termo | classe), com suavizacao de Laplace (soma 1). */
    private double logVerossimilhanca(String termo, int classe) {
        int[] porClasse = contagens.get(termo);
        int ocorrencias = porClasse == null ? 0 : porClasse[classe];
        return Math.log((ocorrencias + 1.0) / (termosPorClasse[classe] + contagens.size()));
    }

    /**
     * Converte as pontuacoes em confianca relativa entre as classes (softmax).
     *
     * <p>NAO e uma probabilidade calibrada de acerto. O Naive Bayes soma a
     * evidencia de cada termo como se fossem independentes, o que leva a
     * posterior para perto de 100% em textos longos. Dividir as pontuacoes
     * pela raiz do numero de termos amortece esse efeito: mais evidencia
     * ainda aumenta a confianca, mas sem saturar.</p>
     */
    private static double[] confiancaRelativa(double[] pontos, int termos) {
        double temperatura = Math.sqrt(Math.max(1, termos));

        double maior = Double.NEGATIVE_INFINITY;
        for (double ponto : pontos) {
            maior = Math.max(maior, ponto / temperatura);
        }

        // Subtrair o maior antes de exponenciar evita underflow (log-sum-exp).
        double soma = 0;
        double[] confiancas = new double[pontos.length];
        for (int c = 0; c < pontos.length; c++) {
            confiancas[c] = Math.exp(pontos[c] / temperatura - maior);
            soma += confiancas[c];
        }
        for (int c = 0; c < pontos.length; c++) {
            confiancas[c] /= soma;
        }
        return confiancas;
    }

    /**
     * Palavras que mais pesaram a favor da classe vencedora: as de maior
     * diferenca entre o log da verossimilhanca na vencedora e a media nas
     * demais classes.
     */
    private List<String> explicar(List<Termo> conhecidos, int vencedora) {
        record Peso(String original, double valor) {
        }

        List<Peso> pesos = new ArrayList<>();
        for (Termo termo : conhecidos) {
            // Numeros e um "não" solto pesam na conta, mas nao dizem nada a
            // quem le a explicacao ("não consigo", como bigrama, continua valendo).
            if (termo.chave().contains(PreProcessadorTexto.NUMERO) || termo.chave().equals("nao")) {
                continue;
            }
            double demais = 0;
            for (int c = 0; c < classes.size(); c++) {
                if (c != vencedora) {
                    demais += logVerossimilhanca(termo.chave(), c);
                }
            }
            double valor = logVerossimilhanca(termo.chave(), vencedora) - demais / (classes.size() - 1);
            if (valor > 0) {
                pesos.add(new Peso(termo.original(), valor));
            }
        }
        pesos.sort(Comparator.comparingDouble(Peso::valor).reversed());

        List<String> escolhidos = new ArrayList<>();
        for (Peso peso : pesos) {
            // "consigo" depois de "não consigo" seria a mesma pista repetida
            boolean repetido = escolhidos.stream()
                    .anyMatch(e -> e.contains(peso.original()) || peso.original().contains(e));
            if (!repetido) {
                escolhidos.add(peso.original());
            }
            if (escolhidos.size() == TERMOS_NA_EXPLICACAO) {
                break;
            }
        }
        return escolhidos;
    }

    /**
     * Validacao leave-one-out: para cada exemplo, treina com todos os outros
     * e verifica se o exemplo deixado de fora e classificado corretamente.
     * Custa O(N²·L); roda uma vez, na subida da API e nos testes.
     *
     * @return fracao de acertos, entre 0 e 1
     */
    public static double acuraciaLeaveOneOut(List<String> classes, List<Exemplo> exemplos) {
        int acertos = 0;
        for (int i = 0; i < exemplos.size(); i++) {
            List<Exemplo> treino = new ArrayList<>(exemplos);
            Exemplo fora = treino.remove(i);
            String previsto = new ClassificadorNaiveBayes(classes, treino)
                    .classificar(fora.texto()).melhor().classe();
            if (previsto.equals(fora.tipo())) {
                acertos++;
            }
        }
        return exemplos.isEmpty() ? 0 : (double) acertos / exemplos.size();
    }
}
