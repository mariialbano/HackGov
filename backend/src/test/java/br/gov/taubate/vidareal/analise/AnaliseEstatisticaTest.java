package br.gov.taubate.vidareal.analise;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Os valores esperados foram calculados a mao, nao com o proprio codigo:
 * a conta aparece no comentario de cada teste.
 */
class AnaliseEstatisticaTest {

    private static final double PRECISAO = 1e-9;

    // ---------- postos (ranks) ----------

    @Test
    @DisplayName("postos: valores distintos recebem 1..n; empates recebem a média dos postos")
    void postos() {
        assertArrayEquals(new double[] {3, 1, 2}, AnaliseEstatistica.postos(new double[] {30, 10, 20}), PRECISAO);
        // 10 e 10 ocupam as posicoes 1 e 2: (1+2)/2 = 1,5 para ambos
        assertArrayEquals(new double[] {1.5, 1.5, 3}, AnaliseEstatistica.postos(new double[] {10, 10, 20}), PRECISAO);
        // tres empatados nas posicoes 2,3,4: (2+3+4)/3 = 3
        assertArrayEquals(new double[] {1, 3, 3, 3, 5},
                AnaliseEstatistica.postos(new double[] {1, 7, 7, 7, 9}), PRECISAO);
    }

    // ---------- Spearman ----------

    @Test
    @DisplayName("Spearman: relação crescente perfeita dá +1, decrescente perfeita dá -1")
    void spearmanExtremos() {
        double[] x = {1, 2, 3, 4, 5};
        assertEquals(1.0, AnaliseEstatistica.spearman(x, new double[] {10, 20, 30, 40, 50}).rho(), PRECISAO);
        assertEquals(-1.0, AnaliseEstatistica.spearman(x, new double[] {50, 40, 30, 20, 10}).rho(), PRECISAO);
    }

    @Test
    @DisplayName("Spearman: relação monotônica não linear também dá +1 (ao contrário de Pearson)")
    void spearmanMonotonicaNaoLinear() {
        assertEquals(1.0,
                AnaliseEstatistica.spearman(new double[] {1, 2, 3, 4}, new double[] {1, 8, 27, 1000}).rho(),
                PRECISAO);
    }

    @Test
    @DisplayName("Spearman: exemplo clássico de livro-texto, rho = -29/165")
    void spearmanExemploClassico() {
        // Postos de y na ordem de x: 1,6,8,7,10,9,3,5,2,4 -> soma de d^2 = 194
        // rho = 1 - 6*194 / (10*(100-1)) = 1 - 1164/990 = -174/990 = -29/165
        double[] x = {86, 97, 99, 100, 101, 103, 106, 110, 112, 113};
        double[] y = {2, 20, 28, 27, 50, 29, 7, 17, 6, 12};

        AnaliseEstatistica.Correlacao c = AnaliseEstatistica.spearman(x, y);

        assertEquals(-29.0 / 165.0, c.rho(), PRECISAO);
        assertEquals(10, c.n());
    }

    @Test
    @DisplayName("Spearman com empates: rho = 3/raiz(10) ≈ 0,9487")
    void spearmanComEmpates() {
        // x = 1,2,2,3 -> postos 1; 2,5; 2,5; 4        y = 1,3,2,4 -> postos 1; 3; 2; 4  (médias: 2,5 e 2,5)
        // desvios x: -1,5; 0; 0; 1,5   desvios y: -1,5; 0,5; -0,5; 1,5
        // Sxy = 2,25+0+0+2,25 = 4,5   Sxx = 4,5   Syy = 2,25+0,25+0,25+2,25 = 5
        // rho = 4,5 / raiz(4,5*5) = 4,5 / raiz(22,5) = 3/raiz(10)
        double rho = AnaliseEstatistica.spearman(new double[] {1, 2, 2, 3}, new double[] {1, 3, 2, 4}).rho();

        assertEquals(3.0 / Math.sqrt(10), rho, PRECISAO);
    }

    @Test
    @DisplayName("Spearman: sem relação (postos que se cancelam) dá 0")
    void spearmanZero() {
        // x = 1..5 (postos 1..5, desvios -2,-1,0,1,2)   y = 3,1,5,1,3
        // postos de y: 1 e 1 -> 1,5;  3 e 3 -> 3,5;  5 -> 5  =>  3,5; 1,5; 5; 1,5; 3,5 (media 3)
        // desvios de y: 0,5; -1,5; 2; -1,5; 0,5
        // Sxy = (-2)(0,5) + (-1)(-1,5) + 0*2 + (1)(-1,5) + (2)(0,5) = -1 + 1,5 - 1,5 + 1 = 0
        assertEquals(0.0,
                AnaliseEstatistica.spearman(new double[] {1, 2, 3, 4, 5}, new double[] {3, 1, 5, 1, 3}).rho(),
                PRECISAO);
    }

    @Test
    @DisplayName("Spearman: entradas inválidas são recusadas com mensagem")
    void spearmanInvalido() {
        assertThrows(IllegalArgumentException.class,
                () -> AnaliseEstatistica.spearman(new double[] {1, 2, 3}, new double[] {1, 2}));
        assertThrows(IllegalArgumentException.class,
                () -> AnaliseEstatistica.spearman(new double[] {1, 2}, new double[] {1, 2}));
        assertThrows(IllegalArgumentException.class,
                () -> AnaliseEstatistica.spearman(null, new double[] {1, 2, 3}));
        // x constante: o rho nao existe (divisao por zero)
        assertThrows(IllegalArgumentException.class,
                () -> AnaliseEstatistica.spearman(new double[] {2, 2, 2, 2}, new double[] {1, 2, 3, 4}));
        assertThrows(IllegalArgumentException.class,
                () -> AnaliseEstatistica.spearman(new double[] {1, 2, 3, 4}, new double[] {5, 5, 5, 5}));
    }

    // ---------- regressao linear ----------

    @Test
    @DisplayName("Regressão: reta exata y = 2x + 1 dá inclinação 2, intercepto 1 e R² = 1")
    void regressaoRetaExata() {
        AnaliseEstatistica.Regressao r = AnaliseEstatistica.regressaoLinear(
                new double[] {0, 1, 2, 3, 4}, new double[] {1, 3, 5, 7, 9});

        assertEquals(2.0, r.inclinacao(), PRECISAO);
        assertEquals(1.0, r.intercepto(), PRECISAO);
        assertEquals(1.0, r.r2(), PRECISAO);
        assertEquals(5, r.n());
    }

    @Test
    @DisplayName("Regressão com ruído: x=1..5, y=2,4,5,4,5 dá inclinação 0,6, intercepto 2,2 e R² = 0,6")
    void regressaoComRuido() {
        // media x = 3, media y = 4;  Sxy = 4+0+0+0+2 = 6;  Sxx = 10;  Syy = 4+0+1+0+1 = 6
        // inclinacao = 6/10 = 0,6;  intercepto = 4 - 0,6*3 = 2,2;  R2 = 0,6^2*10/6 = 0,6
        AnaliseEstatistica.Regressao r = AnaliseEstatistica.regressaoLinear(
                new double[] {1, 2, 3, 4, 5}, new double[] {2, 4, 5, 4, 5});

        assertEquals(0.6, r.inclinacao(), PRECISAO);
        assertEquals(2.2, r.intercepto(), PRECISAO);
        assertEquals(0.6, r.r2(), PRECISAO);
    }

    @Test
    @DisplayName("Regressão: reta decrescente tem inclinação negativa")
    void regressaoDecrescente() {
        AnaliseEstatistica.Regressao r = AnaliseEstatistica.regressaoLinear(
                new double[] {0, 1, 2, 3}, new double[] {10, 8, 6, 4});

        assertEquals(-2.0, r.inclinacao(), PRECISAO);
        assertEquals(10.0, r.intercepto(), PRECISAO);
    }

    @Test
    @DisplayName("Regressão: y constante dá inclinação 0 e R² indefinido (nulo)")
    void regressaoYConstante() {
        AnaliseEstatistica.Regressao r = AnaliseEstatistica.regressaoLinear(
                new double[] {1, 2, 3, 4}, new double[] {7, 7, 7, 7});

        assertEquals(0.0, r.inclinacao(), PRECISAO);
        assertEquals(7.0, r.intercepto(), PRECISAO);
        assertNull(r.r2());
    }

    @Test
    @DisplayName("Regressão: entradas inválidas são recusadas")
    void regressaoInvalida() {
        assertThrows(IllegalArgumentException.class,
                () -> AnaliseEstatistica.regressaoLinear(new double[] {1}, new double[] {1}));
        assertThrows(IllegalArgumentException.class,
                () -> AnaliseEstatistica.regressaoLinear(new double[] {1, 2}, new double[] {1}));
        // x constante: nao existe reta unica
        assertThrows(IllegalArgumentException.class,
                () -> AnaliseEstatistica.regressaoLinear(new double[] {3, 3, 3}, new double[] {1, 2, 3}));
    }
}
