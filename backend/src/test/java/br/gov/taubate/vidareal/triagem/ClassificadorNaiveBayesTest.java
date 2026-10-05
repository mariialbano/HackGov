package br.gov.taubate.vidareal.triagem;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.gov.taubate.vidareal.repositorio.Repositorio;
import br.gov.taubate.vidareal.triagem.ClassificadorNaiveBayes.Exemplo;
import br.gov.taubate.vidareal.triagem.ClassificadorNaiveBayes.Resultado;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Testes do classificador sobre o dataset real de triagem.
 *
 * <p>As frases usadas aqui nao estao no dataset: o que se verifica e a
 * generalizacao, nao a memorizacao.</p>
 */
class ClassificadorNaiveBayesTest {

    private static final List<String> CLASSES = Repositorio.TIPOS_PROTOCOLO;

    private static List<Exemplo> exemplos;
    private static ClassificadorNaiveBayes classificador;

    @BeforeAll
    static void treinar() throws Exception {
        exemplos = new ArrayList<>();
        try (InputStream arquivo = ClassificadorNaiveBayesTest.class
                .getResourceAsStream("/ia/dataset-protocolos.json")) {
            JsonNode raiz = new ObjectMapper().readTree(arquivo);
            for (JsonNode item : raiz.path("exemplos")) {
                exemplos.add(new Exemplo(item.path("tipo").asText(), item.path("texto").asText()));
            }
        }
        classificador = new ClassificadorNaiveBayes(CLASSES, exemplos);
    }

    @Test
    @DisplayName("dataset cobre as cinco categorias de forma equilibrada e sem repetição")
    void datasetEquilibrado() {
        for (String classe : CLASSES) {
            long quantidade = exemplos.stream().filter(e -> e.tipo().equals(classe)).count();
            assertTrue(quantidade >= 20, classe + " tem apenas " + quantidade + " exemplos");
        }
        long distintos = exemplos.stream().map(Exemplo::texto).distinct().count();
        assertEquals(exemplos.size(), distintos, "há textos repetidos no dataset");
    }

    @Test
    @DisplayName("acurácia leave-one-out fica acima do mínimo aceito")
    void acuraciaMinima() {
        double acuracia = ClassificadorNaiveBayes.acuraciaLeaveOneOut(CLASSES, exemplos);
        System.out.printf("Acuracia leave-one-out: %.1f%% (%d exemplos)%n",
                acuracia * 100, exemplos.size());
        assertTrue(acuracia >= 0.80, "acurácia leave-one-out caiu para " + acuracia);
    }

    @Test
    @DisplayName("classifica uma frase inédita de cada categoria")
    void classificaCadaCategoria() {
        assertClasse("Análise de viabilidade de Metas Financeiras",
                "Quero saber se minha meta de juntar R$ 9.000 em 15 meses é viável guardando 600 por mês.");
        assertClasse("Dúvida sobre inflação",
                "Tenho dúvida sobre como o IPCA é usado no simulador para projetar a inflação dos preços.");
        assertClasse("Solicitação de orientação financeira",
                "Estou endividado no cartão de crédito e preciso de orientação para renegociar as dívidas.");
        assertClasse("Problema técnico",
                "Não consigo abrir a tela de protocolos, aparece erro e a página trava no celular.");
        assertClasse("Sugestão de melhoria",
                "Sugiro incluir uma opção para receber lembretes das metas por e-mail.");
    }

    @Test
    @DisplayName("explica a sugestão com palavras do próprio texto")
    void explicaComTermosDoTexto() {
        String texto = "Não consigo abrir a tela de protocolos, aparece erro e a página trava no celular.";
        Resultado resultado = classificador.classificar(texto);

        assertFalse(resultado.termosInfluentes().isEmpty());
        for (String termo : resultado.termosInfluentes()) {
            for (String palavra : termo.split(" ")) {
                assertTrue(texto.toLowerCase().contains(palavra),
                        "\"" + palavra + "\" não está no texto classificado");
            }
        }
    }

    @Test
    @DisplayName("a explicação não repete a mesma palavra nem usa palavras genéricas")
    void explicacaoSemRepeticaoNemGenericas() {
        // "meses" e "mês" são a mesma palavra; "quero" e "como" são genéricas.
        Resultado metas = classificador.classificar(
                "Quero juntar R$ 12.000 em 18 meses, guardando R$ 650 por mês. É viável?");
        Resultado duvida = classificador.classificar(
                "Quero saber como o IPCA do simulador é calculado sobre a inflação.");

        for (Resultado resultado : List.of(metas, duvida)) {
            List<String> chaves = resultado.termosInfluentes().stream()
                    .flatMap(termo -> PreProcessadorTexto.extrair(termo).stream())
                    .filter(termo -> !termo.bigrama())
                    .map(termo -> termo.chave())
                    .toList();
            assertEquals(chaves.size(), chaves.stream().distinct().count(),
                    "palavra repetida em " + resultado.termosInfluentes());
            for (String generica : List.of("quero", "como", "sobre", "bom")) {
                assertFalse(resultado.termosInfluentes().contains(generica),
                        "\"" + generica + "\" em " + resultado.termosInfluentes());
            }
        }
        assertFalse(metas.termosInfluentes().isEmpty());
    }

    @Test
    @DisplayName("filtrar a explicação não muda a classificação nem a confiança")
    void explicacaoNaoAfetaClassificacao() {
        // "Quero como sobre bom" só tem palavras genéricas: nenhuma explicação,
        // mas a pontuação continua sendo calculada com elas.
        Resultado resultado = classificador.classificar("Quero como sobre bom");
        assertTrue(resultado.termosInfluentes().isEmpty());
        assertEquals(4, resultado.palavrasConhecidas());
        assertTrue(resultado.melhor().confianca() > 0.20, "as palavras deveriam pesar na pontuação");
    }

    @Test
    @DisplayName("as confianças somam 1 e a mesma entrada dá sempre a mesma saída")
    void deterministico() {
        String texto = "O gráfico não aparece quando faço a simulação.";
        Resultado primeiro = classificador.classificar(texto);
        Resultado segundo = new ClassificadorNaiveBayes(CLASSES, exemplos).classificar(texto);

        assertEquals(primeiro, segundo);
        double soma = primeiro.ranking().stream().mapToDouble(p -> p.confianca()).sum();
        assertEquals(1.0, soma, 1e-9);
    }

    @Test
    @DisplayName("texto sem palavras conhecidas não gera evidência")
    void textoDesconhecido() {
        Resultado resultado = classificador.classificar("xyzzy qwerty lorem");
        assertEquals(0, resultado.palavrasConhecidas());
        assertTrue(resultado.termosInfluentes().isEmpty());
    }

    @Test
    @DisplayName("exemplo com categoria fora da lista é rejeitado no treino")
    void categoriaDesconhecida() {
        assertThrows(IllegalArgumentException.class, () -> new ClassificadorNaiveBayes(
                CLASSES, List.of(new Exemplo("Categoria inventada", "texto qualquer"))));
    }

    @Test
    @DisplayName("pré-processamento iguala acento, caixa e plural, e descarta stopwords")
    void preProcessamento() {
        List<String> chaves = PreProcessadorTexto.extrair("As METAS de R$ 8.000").stream()
                .filter(t -> !t.bigrama())
                .map(t -> t.chave())
                .toList();
        assertEquals(List.of("meta", PreProcessadorTexto.NUMERO), chaves);
        assertEquals("mes", PreProcessadorTexto.singular("meses"));
        assertEquals("nao", PreProcessadorTexto.normalizar("Não"));
    }

    private void assertClasse(String esperada, String texto) {
        assertEquals(esperada, classificador.classificar(texto).melhor().classe(), texto);
    }
}
