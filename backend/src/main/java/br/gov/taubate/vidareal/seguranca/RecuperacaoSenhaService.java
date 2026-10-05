package br.gov.taubate.vidareal.seguranca;

import br.gov.taubate.vidareal.modelo.Usuario;
import br.gov.taubate.vidareal.repositorio.Repositorio;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Recuperacao de senha ("esqueci minha senha").
 *
 * <p>Segue o mesmo desenho do {@link SessaoService}: um token opaco de 256
 * bits gerado por {@link SecureRandom}. As diferencas vem do risco maior
 * &mdash; este token troca a senha de uma conta:</p>
 * <ul>
 *   <li>vale por poucos minutos e uma unica vez;</li>
 *   <li>o banco guarda so o SHA-256 dele, nunca o token;</li>
 *   <li>chega ao cidadao pelo e-mail cadastrado ({@link EmailRecuperacao}),
 *       nunca na resposta da API;</li>
 *   <li>pedir um novo invalida os anteriores.</li>
 * </ul>
 *
 * <p>O SHA-256 basta aqui, sem BCrypt: BCrypt existe para atrasar a
 * adivinhacao de senhas, que sao curtas e previsiveis. Um token aleatorio de
 * 256 bits nao e adivinhavel, entao um hash rapido ja impede que o conteudo
 * do banco seja usado como token.</p>
 */
@Service
public class RecuperacaoSenhaService {

    private static final Logger log = LoggerFactory.getLogger(RecuperacaoSenhaService.class);

    private final Repositorio repositorio;
    private final SessaoService sessoes;
    private final EmailRecuperacao email;
    private final BCryptPasswordEncoder encoder;
    private final SecureRandom aleatorio = new SecureRandom();

    private final Duration validade;
    private final String urlBase;
    private final long tempoMinimoMs;

    public RecuperacaoSenhaService(
            Repositorio repositorio, SessaoService sessoes, EmailRecuperacao email,
            BCryptPasswordEncoder encoder,
            @Value("${vidareal.recuperacao.validade-minutos:15}") int validadeMinutos,
            @Value("${vidareal.recuperacao.url-base:http://localhost:5173}") String urlBase,
            @Value("${vidareal.recuperacao.tempo-minimo-ms:400}") long tempoMinimoMs) {
        this.repositorio = repositorio;
        this.sessoes = sessoes;
        this.email = email;
        this.encoder = encoder;
        this.validade = Duration.ofMinutes(validadeMinutos);
        this.urlBase = urlBase;
        this.tempoMinimoMs = tempoMinimoMs;
    }

    public Duration getValidade() {
        return validade;
    }

    /** Sem servidor de e-mail configurado nao ha como entregar o link. */
    public boolean estaDisponivel() {
        return email.estaConfigurado();
    }

    /**
     * Inicia a recuperacao para o CPF informado.
     *
     * <p>Nao devolve nada e leva sempre o mesmo tempo, exista a conta ou
     * nao: nem a resposta nem a demora revelam se o CPF esta cadastrado.</p>
     */
    public void solicitar(String cpf) {
        long inicio = System.currentTimeMillis();
        try {
            Optional<Usuario> usuario = repositorio.buscarUsuarioPorCpf(cpf);
            // Contas antigas podem nao ter e-mail: sem endereco nao ha para
            // onde enviar, e a resposta continua a mesma.
            boolean temEmail = usuario.map(Usuario::getEmail)
                    .filter(endereco -> !endereco.isBlank()).isPresent();

            if (temEmail) {
                String token = gerarToken();
                Instant expiraEm = Instant.now().plus(validade);
                repositorio.criarTokenRecuperacao(hash(token), cpf, expiraEm);
                email.enviarRecuperacao(usuario.get().getEmail(), usuario.get().getNome(),
                        urlBase + "/redefinir-senha?token=" + token, expiraEm);
            }
            repositorio.registrarAuditoria("SOLICITAR_RECUPERACAO", "auth", null,
                    usuario.map(Usuario::getCpf).orElse(null),
                    usuario.map(u -> u.getPerfil().getValor()).orElse(null),
                    usuario.isEmpty() ? "CPF sem conta" : temEmail ? null : "Conta sem e-mail cadastrado");
        } catch (RuntimeException erro) {
            // Uma falha na entrega nao pode virar resposta diferente: isso
            // tambem revelaria que a conta existe. Fica so no log, sem o token.
            log.error("[recuperacao] falha ao processar o pedido: {}", erro.getMessage());
        } finally {
            igualarTempo(inicio);
        }
    }

    /**
     * Troca a senha de quem apresentar um token valido.
     *
     * @return false quando o token nao existe, ja foi usado ou venceu
     *         &mdash; os tres casos sao indistinguiveis de proposito
     */
    public boolean redefinir(String token, String senhaNova) {
        if (token == null || token.isBlank()) {
            return false;
        }

        Optional<Usuario> dono = repositorio.consumirTokenRecuperacao(hash(token.trim()))
                .flatMap(repositorio::buscarUsuarioPorCpf);
        if (dono.isEmpty()) {
            return false;
        }

        Usuario usuario = dono.get();
        usuario.setSenhaHash(encoder.encode(senhaNova));
        repositorio.salvarUsuario(usuario);

        // Quem estava logado com a senha antiga e desconectado.
        sessoes.encerrarTodasDe(usuario.getCpf());

        repositorio.registrarAuditoria("REDEFINIR_SENHA", "auth", usuario.getCpf(),
                usuario.getCpf(), usuario.getPerfil().getValor(), "por recuperação");
        return true;
    }

    private String gerarToken() {
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    /** SHA-256 em hexadecimal: e o que vai para o banco no lugar do token. */
    public static String hash(String token) {
        try {
            byte[] resumo = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(resumo);
        } catch (NoSuchAlgorithmException erro) {
            throw new IllegalStateException("SHA-256 indisponivel na JVM.", erro);
        }
    }

    /** Segura a resposta ate o tempo minimo, para toda chamada demorar o mesmo. */
    private void igualarTempo(long inicio) {
        long restante = tempoMinimoMs - (System.currentTimeMillis() - inicio);
        if (restante <= 0) {
            return;
        }
        try {
            Thread.sleep(restante);
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
        }
    }
}
