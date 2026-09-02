package br.gov.taubate.vidareal.seguranca;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limitador de requisicoes por IP (janela fixa).
 *
 * <p>Mitiga forca bruta no login e abuso da cota da API de IA. Em producao
 * o contador ficaria no Redis, compartilhado entre instancias.</p>
 */
public class LimitadorRequisicoes {

    private record Janela(int contador, Instant expiraEm) {
    }

    private final int limite;
    private final Duration duracao;
    private final Map<String, Janela> janelas = new ConcurrentHashMap<>();

    public LimitadorRequisicoes(int limite, Duration duracao) {
        this.limite = limite;
        this.duracao = duracao;
    }

    /** @return true quando a requisicao pode prosseguir. */
    public boolean permitir(String chave) {
        Instant agora = Instant.now();

        Janela atualizada = janelas.compute(chave, (k, janela) -> {
            if (janela == null || agora.isAfter(janela.expiraEm())) {
                return new Janela(1, agora.plus(duracao));
            }
            return new Janela(janela.contador() + 1, janela.expiraEm());
        });

        return atualizada.contador() <= limite;
    }

    /** Segundos restantes ate a janela reabrir, para o cabecalho Retry-After. */
    public long segundosParaLiberar(String chave) {
        Janela janela = janelas.get(chave);
        if (janela == null) {
            return 0;
        }
        long segundos = Duration.between(Instant.now(), janela.expiraEm()).getSeconds();
        return Math.max(segundos, 0);
    }
}
