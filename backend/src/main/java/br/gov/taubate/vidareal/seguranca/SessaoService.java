package br.gov.taubate.vidareal.seguranca;

import br.gov.taubate.vidareal.modelo.Usuario;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Sessoes ativas da API.
 *
 * <p>Mapa (hash) token &rarr; usuario: a validacao do token acontece em
 * tempo constante, independente da quantidade de sessoes abertas.</p>
 *
 * <p>Em producao seria um JWT assinado, sem estado no servidor; aqui um
 * token opaco aleatorio cumpre o mesmo papel de forma auditavel.</p>
 */
@Service
public class SessaoService {

    private final SecureRandom aleatorio = new SecureRandom();
    private final Map<String, Sessao> sessoes = new ConcurrentHashMap<>();

    /** Dados da sessao: quem esta autenticado e desde quando. */
    public record Sessao(Usuario usuario, Instant criadaEm) {
    }

    /** Cria uma sessao e devolve o token de 256 bits. */
    public String abrir(Usuario usuario) {
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);
        sessoes.put(token, new Sessao(usuario, Instant.now()));
        return token;
    }

    public Optional<Usuario> resolver(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        Sessao sessao = sessoes.get(token);
        return sessao == null ? Optional.empty() : Optional.of(sessao.usuario());
    }

    public void encerrar(String token) {
        if (token != null) {
            sessoes.remove(token);
        }
    }
}
