package br.gov.taubate.vidareal.triagem;

import br.gov.taubate.vidareal.modelo.Protocolo;
import br.gov.taubate.vidareal.repositorio.Repositorio;
import br.gov.taubate.vidareal.triagem.CalculadoraPrioridade.Prioridade;
import br.gov.taubate.vidareal.triagem.ClassificadorNaiveBayes.Exemplo;
import br.gov.taubate.vidareal.triagem.ClassificadorNaiveBayes.Pontuacao;
import br.gov.taubate.vidareal.triagem.ClassificadorNaiveBayes.Resultado;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

/**
 * Triagem inteligente de protocolos.
 *
 * <p>Reune duas tecnicas diferentes, que nao devem ser confundidas:</p>
 * <ul>
 *   <li><b>categoria sugerida</b>: IA &mdash; classificador Naive Bayes
 *       treinado na subida da API com o dataset em
 *       {@code resources/ia/dataset-protocolos.json};</li>
 *   <li><b>prioridade</b>: regras deterministicas
 *       ({@link CalculadoraPrioridade}), sem aprendizado de maquina.</li>
 * </ul>
 *
 * <p>Tudo roda dentro da propria API: nao ha chamada a servico externo,
 * chave de acesso nem dependencia de internet.</p>
 */
@Service
public class TriagemService {

    private static final Logger log = LoggerFactory.getLogger(TriagemService.class);

    private static final String ARQUIVO_DATASET = "ia/dataset-protocolos.json";

    /**
     * Abaixo disto o classificador prefere nao sugerir a arriscar.
     *
     * <p>Os limites foram calibrados na validacao leave-one-out do dataset
     * v1.0.0: com 0,45 a sugestao aparece em cerca de 79% dos casos e, quando
     * aparece, esta certa em cerca de 92%.</p>
     */
    static final double CONFIANCA_MINIMA = 0.45;
    static final double CONFIANCA_ALTA = 0.65;
    /** Com menos palavras conhecidas que isto nao ha evidencia para sugerir. */
    static final int PALAVRAS_MINIMAS = 3;

    public static final String AVISO_CONFIANCA =
            "Confiança relativa do classificador entre as cinco categorias. "
                    + "Não é uma probabilidade calibrada de acerto.";

    /** Categoria sugerida para uma descricao. */
    public record Sugestao(String tipo, double confianca, String nivel, List<String> termos) {
    }

    /**
     * Resposta da analise de uma descricao.
     *
     * @param sugestao     nula quando o classificador nao tem seguranca
     * @param motivo       por que nao houve sugestao; nulo quando houve
     * @param alternativas confianca relativa de cada categoria
     */
    public record Analise(Sugestao sugestao, String motivo, List<Pontuacao> alternativas) {
    }

    private final Repositorio repositorio;
    private final ObjectMapper json = new ObjectMapper();

    private ClassificadorNaiveBayes classificador;
    private List<Exemplo> exemplos;
    private String versaoDataset;
    private String origemDataset;
    private double acuraciaLeaveOneOut;

    public TriagemService(Repositorio repositorio) {
        this.repositorio = repositorio;
    }

    /**
     * Treina o modelo e faz a triagem dos protocolos que ainda nao a tem
     * (os de demonstracao e os gravados antes desta funcionalidade).
     */
    @PostConstruct
    void treinar() {
        carregarDataset();
        classificador = new ClassificadorNaiveBayes(Repositorio.TIPOS_PROTOCOLO, exemplos);
        acuraciaLeaveOneOut = ClassificadorNaiveBayes
                .acuraciaLeaveOneOut(Repositorio.TIPOS_PROTOCOLO, exemplos);

        log.info("Triagem: modelo treinado com {} exemplos (dataset v{}), {} termos no vocabulario, "
                        + "acuracia leave-one-out de {}%.",
                exemplos.size(), versaoDataset, classificador.tamanhoVocabulario(),
                Math.round(acuraciaLeaveOneOut * 100));

        for (Protocolo protocolo : repositorio.listarProtocolos()) {
            if (protocolo.getPrioridadePontos() == null) {
                triar(protocolo);
                repositorio.salvarProtocolo(protocolo);
            }
        }
    }

    private void carregarDataset() {
        try (InputStream arquivo = new ClassPathResource(ARQUIVO_DATASET).getInputStream()) {
            JsonNode raiz = json.readTree(arquivo);
            versaoDataset = raiz.path("versao").asText();
            origemDataset = raiz.path("origem").asText();

            List<Exemplo> lidos = new ArrayList<>();
            for (JsonNode item : raiz.path("exemplos")) {
                String tipo = item.path("tipo").asText();
                // Um rotulo fora das categorias do sistema e erro do dataset:
                // melhor a API nao subir do que treinar com dado errado.
                if (!Repositorio.TIPOS_PROTOCOLO.contains(tipo)) {
                    throw new IllegalStateException(
                            "Dataset de triagem com categoria desconhecida: " + tipo);
                }
                lidos.add(new Exemplo(tipo, item.path("texto").asText()));
            }
            if (lidos.isEmpty()) {
                throw new IllegalStateException("Dataset de triagem sem exemplos.");
            }
            exemplos = List.copyOf(lidos);
        } catch (IOException erro) {
            throw new UncheckedIOException("Nao foi possivel ler " + ARQUIVO_DATASET, erro);
        }
    }

    /** Sugere a categoria de uma descricao, ou explica por que nao sugere. */
    public Analise sugerir(String descricao) {
        Resultado resultado = classificador.classificar(descricao);
        Pontuacao melhor = resultado.melhor();

        if (resultado.palavrasConhecidas() < PALAVRAS_MINIMAS) {
            return new Analise(null,
                    "A descrição ainda tem poucas informações para sugerir uma categoria.",
                    resultado.ranking());
        }
        if (melhor.confianca() < CONFIANCA_MINIMA) {
            return new Analise(null,
                    "A descrição se encaixa em mais de uma categoria; escolha a que melhor representa o pedido.",
                    resultado.ranking());
        }

        String nivel = melhor.confianca() >= CONFIANCA_ALTA ? "alta" : "media";
        return new Analise(
                new Sugestao(melhor.classe(), arredondar(melhor.confianca()), nivel,
                        resultado.termosInfluentes()),
                null, resultado.ranking());
    }

    /**
     * Calcula e registra no protocolo a prioridade e a categoria sugerida.
     *
     * <p>A prioridade usa a categoria que o cidadao escolheu, nao a
     * sugerida: a decisao final e dele.</p>
     */
    public void triar(Protocolo protocolo) {
        Prioridade prioridade = CalculadoraPrioridade.calcular(
                protocolo.getTipo(), protocolo.getDescricao());
        Sugestao sugestao = sugerir(protocolo.getDescricao()).sugestao();

        // So os pontos sao gravados; o nivel e derivado deles na leitura.
        protocolo.registrarTriagem(
                prioridade.pontos(),
                String.join(" | ", prioridade.motivos()),
                sugestao == null ? null : sugestao.tipo(),
                sugestao == null ? null : sugestao.confianca());
    }

    /** Ficha do modelo: de onde vem, como foi treinado e com quais exemplos. */
    public Map<String, Object> descreverModelo() {
        Map<String, Long> porCategoria = new LinkedHashMap<>();
        for (String tipo : Repositorio.TIPOS_PROTOCOLO) {
            porCategoria.put(tipo, exemplos.stream().filter(e -> e.tipo().equals(tipo)).count());
        }

        Map<String, Object> dataset = new LinkedHashMap<>();
        dataset.put("arquivo", "backend/src/main/resources/" + ARQUIVO_DATASET);
        dataset.put("versao", versaoDataset);
        dataset.put("origem", origemDataset);
        dataset.put("totalExemplos", exemplos.size());
        dataset.put("exemplosPorCategoria", porCategoria);

        Map<String, Object> validacao = new LinkedHashMap<>();
        validacao.put("metodo", "leave-one-out sobre o próprio dataset");
        validacao.put("acuracia", arredondar(acuraciaLeaveOneOut));
        validacao.put("observacao", "Medida otimista: os exemplos foram escritos por uma única "
                + "pessoa e não representam toda a variedade de textos reais.");

        Map<String, Object> confianca = new LinkedHashMap<>();
        confianca.put("minimaParaSugerir", CONFIANCA_MINIMA);
        confianca.put("alta", CONFIANCA_ALTA);
        confianca.put("aviso", AVISO_CONFIANCA);

        Map<String, Object> ficha = new LinkedHashMap<>();
        ficha.put("algoritmo", "Naive Bayes Multinomial com suavização de Laplace");
        ficha.put("representacao", "bag-of-words com unigramas e bigramas");
        ficha.put("categorias", Repositorio.TIPOS_PROTOCOLO);
        ficha.put("tamanhoVocabulario", classificador.tamanhoVocabulario());
        ficha.put("dataset", dataset);
        ficha.put("validacao", validacao);
        ficha.put("confianca", confianca);
        ficha.put("prioridade", "Regras determinísticas (CalculadoraPrioridade). Não é aprendizado "
                + "de máquina: não há histórico rotulado de prioridade para treinar um modelo.");
        ficha.put("exemplos", exemplos);
        return ficha;
    }

    private static double arredondar(double valor) {
        return Math.round(valor * 10000) / 10000.0;
    }
}
