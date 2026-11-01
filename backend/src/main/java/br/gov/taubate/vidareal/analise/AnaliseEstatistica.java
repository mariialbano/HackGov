package br.gov.taubate.vidareal.analise;

import java.util.Arrays;

/**
 * Estatistica basica, em Java puro: correlacao de Spearman e regressao linear
 * simples (minimos quadrados).
 *
 * <p>Nao calcula p-valor nem intervalo de confianca: o resultado e a
 * <b>estimativa</b> (rho, inclinacao, R&sup2;), sem teste de significancia.
 * Quem usa precisa dizer isso junto do numero.</p>
 */
public final class AnaliseEstatistica {

    private AnaliseEstatistica() {
    }

    /** Correlacao de Spearman: rho entre -1 e 1, calculado sobre n pares. */
    public record Correlacao(double rho, int n) {
    }

    /** Reta y = intercepto + inclinacao * x. {@code r2} e nulo quando y nao varia. */
    public record Regressao(double inclinacao, double intercepto, Double r2, int n) {
    }

    /**
     * Correlacao de Spearman: Pearson calculado sobre os <i>postos</i> (ranks)
     * dos valores. Mede se as duas variaveis crescem juntas (rho &gt; 0), em
     * sentidos opostos (rho &lt; 0) ou sem relacao (rho perto de 0), sem
     * supor que a relacao seja uma reta &mdash; o que serve para uma
     * prioridade de poucos niveis. Empates recebem a media dos postos.
     *
     * @throws IllegalArgumentException com menos de 3 pares, tamanhos
     *         diferentes ou uma variavel sem variacao (rho nao existe)
     */
    public static Correlacao spearman(double[] x, double[] y) {
        validar(x, y, 3);
        double[] postosX = postos(x);
        double[] postosY = postos(y);

        double mediaX = media(postosX);
        double mediaY = media(postosY);
        double sxy = 0;
        double sxx = 0;
        double syy = 0;
        for (int i = 0; i < x.length; i++) {
            double dx = postosX[i] - mediaX;
            double dy = postosY[i] - mediaY;
            sxy += dx * dy;
            sxx += dx * dx;
            syy += dy * dy;
        }
        if (sxx == 0 || syy == 0) {
            throw new IllegalArgumentException("Uma das variáveis não varia: a correlação não existe.");
        }
        return new Correlacao(sxy / Math.sqrt(sxx * syy), x.length);
    }

    /**
     * Regressao linear simples por minimos quadrados.
     * inclinacao = Sxy / Sxx; intercepto = media(y) - inclinacao * media(x);
     * R&sup2; = parcela da variacao de y explicada pela reta.
     *
     * @throws IllegalArgumentException com menos de 2 pontos, tamanhos
     *         diferentes ou x constante (nao ha reta unica)
     */
    public static Regressao regressaoLinear(double[] x, double[] y) {
        validar(x, y, 2);
        double mediaX = media(x);
        double mediaY = media(y);

        double sxy = 0;
        double sxx = 0;
        double syy = 0;
        for (int i = 0; i < x.length; i++) {
            double dx = x[i] - mediaX;
            double dy = y[i] - mediaY;
            sxy += dx * dy;
            sxx += dx * dx;
            syy += dy * dy;
        }
        if (sxx == 0) {
            throw new IllegalArgumentException("x não varia: não existe uma reta única.");
        }

        double inclinacao = sxy / sxx;
        double intercepto = mediaY - inclinacao * mediaX;
        // Parcela explicada pela reta = inclinacao^2 * Sxx / Syy. Se y e
        // constante (Syy = 0) o R2 nao esta definido.
        Double r2 = syy == 0 ? null : inclinacao * inclinacao * sxx / syy;
        return new Regressao(inclinacao, intercepto, r2, x.length);
    }

    /** Posto (1 = menor valor) de cada elemento; empates recebem a media dos postos. */
    static double[] postos(double[] valores) {
        int n = valores.length;
        Integer[] ordem = new Integer[n];
        for (int i = 0; i < n; i++) {
            ordem[i] = i;
        }
        Arrays.sort(ordem, (a, b) -> Double.compare(valores[a], valores[b]));

        double[] postos = new double[n];
        int i = 0;
        while (i < n) {
            int j = i;
            while (j + 1 < n && valores[ordem[j + 1]] == valores[ordem[i]]) {
                j++;
            }
            double postoMedio = (i + j) / 2.0 + 1; // posicoes i..j, contadas a partir de 1
            for (int k = i; k <= j; k++) {
                postos[ordem[k]] = postoMedio;
            }
            i = j + 1;
        }
        return postos;
    }

    private static double media(double[] valores) {
        double soma = 0;
        for (double v : valores) {
            soma += v;
        }
        return soma / valores.length;
    }

    private static void validar(double[] x, double[] y, int minimo) {
        if (x == null || y == null || x.length != y.length) {
            throw new IllegalArgumentException("As duas séries precisam ter o mesmo tamanho.");
        }
        if (x.length < minimo) {
            throw new IllegalArgumentException("São necessários ao menos " + minimo + " pontos.");
        }
    }
}
