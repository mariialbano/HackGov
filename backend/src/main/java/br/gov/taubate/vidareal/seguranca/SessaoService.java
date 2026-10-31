package br.gov.taubate.vidareal.seguranca;

import br.gov.taubate.vidareal.modelo.Usuario;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Sessoes ativas da API.
 *
 * <p>Mapa (hash) token &rarr; usuario: a validacao do token acontece em
 * tempo constante, independente da quantidade de sessoes abertas.</p>
 *
 * <p>A sessao expira por <b>inatividade</b>: cada uso valido renova o prazo, e
 * uma sessao parada alem do limite (15 minutos por padrao, o mesmo do
 * navegador) deixa de valer. Antes disso so o navegador contava o tempo; um
 * token copiado continuava valendo ate o logout.</p>
 *
 * <p>Em producao seria um JWT assinado, sem estado no servidor; aqui um
 * token opaco aleatorio cumpre o mesmo papel de forma auditavel.</p>
 */
@Service
public class SessaoService {

    private final SecureRandom aleatorio = new SecureRandom();
    private final Map<String, Sessao> sessoes = new ConcurrentHashMap<>();
    private final Duration inatividadeMaxima;
    private final Clock relogio;

    /** Dados da sessao: quem esta autenticado, desde quando e o ultimo uso. */
    public record Sessao(Usuario usuario, Instant criadaEm, Instant ultimoAcessoEm) {
    }

    @Autowired
    public SessaoService(
            @Value("${vidareal.sessao.inatividade-minutos:15}") long inatividadeMinutos) {
        this(Duration.ofMinutes(inatividadeMinutos), Clock.systemUTC());
    }

    /** Usado nos testes, que controlam o relogio em vez de esperar minutos. */
    public SessaoService(Duration inatividadeMaxima, Clock relogio) {
        this.inatividadeMaxima = inatividadeMaxima;
        this.relogio = relogio;
    }

    /** Cria uma sessao e devolve o token de 256 bits. */
    public String abrir(Usuario usuario) {
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);
        Instant agora = relogio.instant();
        sessoes.put(token, new Sessao(usuario, agora, agora));
        return token;
    }

    /**
     * Devolve o usuario do token, se a sessao ainda valer, e renova o prazo.
     * Sessao parada alem do limite e removida e tratada como inexistente.
     */
    public Optional<Usuario> resolver(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        Sessao sessao = sessoes.get(token);
        if (sessao == null) {
            return Optional.empty();
        }

        Instant agora = relogio.instant();
        if (Duration.between(sessao.ultimoAcessoEm(), agora).compareTo(inatividadeMaxima) > 0) {
            sessoes.remove(token, sessao);
            return Optional.empty();
        }

        sessoes.replace(token, sessao,
                new Sessao(sessao.usuario(), sessao.criadaEm(), agora));
        return Optional.of(sessao.usuario());
    }

    public void encerrar(String token) {
        if (token != null) {
            sessoes.remove(token);
        }
    }

    /**
     * Encerra todas as sessoes de um usuario. Usado quando a senha e
     * redefinida por recuperacao: quem pediu nao esta logado, e qualquer
     * sessao aberta com a senha antiga deixa de valer.
     */
    public void encerrarTodasDe(String cpf) {
        sessoes.values().removeIf(sessao -> sessao.usuario().getCpf().equals(cpf));
    }
}
