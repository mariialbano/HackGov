package br.gov.taubate.vidareal.servico;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Cache das respostas das APIs publicas, com validade e reaproveitamento
 * do ultimo valor conhecido.
 *
 * <p>Existe por tres motivos, todos praticos:</p>
 *
 * <ul>
 *   <li><b>Respeito ao orgao publico.</b> O IPCA muda uma vez por mes; nao
 *       faz sentido consultar o Banco Central a cada visita ao site.</li>
 *   <li><b>Velocidade.</b> A resposta sai da memoria em vez de esperar uma
 *       chamada externa a cada requisicao.</li>
 *   <li><b>Resiliencia.</b> Se o servidor do governo cair, devolvemos o
 *       ultimo valor bem-sucedido em vez de quebrar a tela. E exatamente a
 *       regra de excecao escrita na US-01 do backlog.</li>
 * </ul>
 */
public class CachePublico {

    private static final Logger log = LoggerFactory.getLogger(CachePublico.class);

    /** Valor guardado junto do instante em que foi buscado. */
    private record Entrada(Object valor, Instant buscadoEm) {
    }

    private final Map<String, Entrada> entradas = new ConcurrentHashMap<>();

    /**
     * Devolve o valor de {@code chave}, buscando na origem apenas se nao
     * houver copia valida.
     *
     * <p>Quando a busca falha e existe copia vencida, ela e devolvida: um
     * dado velho e melhor que uma tela quebrada. Se nao houver copia
     * nenhuma, a excecao sobe para quem chamou decidir o que fazer.</p>
     */
    @SuppressWarnings("unchecked")
    public <T> T obter(String chave, Duration validade, Supplier<T> daOrigem) {
        Entrada atual = entradas.get(chave);

        if (atual != null && Duration.between(atual.buscadoEm(), Instant.now()).compareTo(validade) < 0) {
            return (T) atual.valor();
        }

        try {
            T novo = daOrigem.get();
            entradas.put(chave, new Entrada(novo, Instant.now()));
            return novo;
        } catch (RuntimeException erro) {
            if (atual != null) {
                log.warn("Falha ao atualizar '{}': {}. Usando a copia de {}.",
                        chave, erro.getMessage(), atual.buscadoEm());
                return (T) atual.valor();
            }
            throw erro;
        }
    }

    /** Instante da ultima busca bem-sucedida, para informar a origem do dado. */
    public Instant buscadoEm(String chave) {
        Entrada entrada = entradas.get(chave);
        return entrada == null ? null : entrada.buscadoEm();
    }
}
