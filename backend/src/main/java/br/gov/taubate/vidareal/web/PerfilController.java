package br.gov.taubate.vidareal.web;

import br.gov.taubate.vidareal.erro.ApiException;
import br.gov.taubate.vidareal.erro.ErroCampo;
import br.gov.taubate.vidareal.modelo.Perfil;
import br.gov.taubate.vidareal.modelo.Usuario;
import br.gov.taubate.vidareal.repositorio.Repositorio;
import br.gov.taubate.vidareal.seguranca.Autenticado;
import br.gov.taubate.vidareal.seguranca.AutenticacaoInterceptor;
import br.gov.taubate.vidareal.seguranca.SessaoService;
import br.gov.taubate.vidareal.seguranca.UsuarioLogado;
import br.gov.taubate.vidareal.util.PoliticaSenha;
import br.gov.taubate.vidareal.util.Validadores;
import br.gov.taubate.vidareal.web.dto.UsuarioResposta;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recurso /api/v1/perfil: o cidadao gerencia a propria conta.
 *
 * <pre>
 *   GET   /perfil        dados da conta
 *   PUT   /perfil        atualiza nome, e-mail (com a senha atual) e endereco
 *   PATCH /perfil/senha  troca a senha
 * </pre>
 *
 * <p>Todas as operacoes agem sobre o usuario da SESSAO. Nao existe rota
 * para editar a conta de outra pessoa: o alvo vem do token, nunca da URL
 * ou do corpo &mdash; assim nao ha como um usuario alterar dados alheios.</p>
 */
@RestController
@RequestMapping("/api/v1/perfil")
@Autenticado
public class PerfilController {

    private final Repositorio repositorio;
    private final SessaoService sessoes;
    private final BCryptPasswordEncoder encoder;

    public PerfilController(Repositorio repositorio, SessaoService sessoes,
                            BCryptPasswordEncoder encoder) {
        this.repositorio = repositorio;
        this.sessoes = sessoes;
        this.encoder = encoder;
    }

    /**
     * @param senhaAtual exigida apenas quando o e-mail muda
     */
    public record PerfilRequest(String nome, String email, String cep, String cidade,
                                String senhaAtual) {
    }

    public record SenhaRequest(String senhaAtual, String senhaNova) {
    }

    @GetMapping
    public Map<String, Object> detalhar(@UsuarioLogado Usuario usuario) {
        return montarResposta(usuario);
    }

    @PutMapping
    public Map<String, Object> atualizar(@UsuarioLogado Usuario usuario,
                                         @RequestBody PerfilRequest corpo) {
        String nome = Validadores.sanitizar(corpo.nome(), 120);
        String email = Validadores.normalizarEmail(corpo.email());
        boolean emailMudou = !email.equalsIgnoreCase(usuario.getEmail() == null ? "" : usuario.getEmail());

        List<ErroCampo> erros = new ArrayList<>();
        if (nome.length() < 3) {
            erros.add(new ErroCampo("nome", "Deve ter no mínimo 3 caracteres."));
        }
        if (email.isEmpty()) {
            erros.add(new ErroCampo("email", "Obrigatório. É por ele que você recupera a senha."));
        } else if (!Validadores.emailValido(email)) {
            erros.add(new ErroCampo("email", "Informe um e-mail válido."));
        } else if (emailMudou && repositorio.emailEmUso(email, usuario.getCpf())) {
            erros.add(new ErroCampo("email", "Este e-mail já está em uso por outra conta."));
        }

        // O e-mail e o canal de recuperacao de senha. Se pudesse ser trocado
        // sem a senha, quem achasse uma sessao aberta trocaria o e-mail e, em
        // seguida, redefiniria a senha: a mesma tomada de conta que a troca
        // de senha ja impede ao pedir a senha atual.
        if (emailMudou && erros.isEmpty()
                && (corpo.senhaAtual() == null
                        || !encoder.matches(corpo.senhaAtual(), usuario.getSenhaHash()))) {
            erros.add(new ErroCampo("senhaAtual",
                    "Para alterar o e-mail, confirme com a sua senha atual."));
        }

        if (!erros.isEmpty()) {
            throw ApiException.requisicaoInvalida("Dados inválidos na requisição.", erros);
        }

        usuario.setNome(nome);
        usuario.setEmail(email);

        // CEP em branco significa "apagar o endereco", nao "manter o antigo".
        String cep = Validadores.apenasDigitos(corpo.cep());
        usuario.setCep(cep.length() == 8 ? cep : null);
        usuario.setCidade(cep.length() == 8 ? Validadores.sanitizar(corpo.cidade(), 120) : null);

        repositorio.salvarUsuario(usuario);

        repositorio.registrarAuditoria("ATUALIZAR_PERFIL", "perfil", usuario.getCpf(),
                usuario.getCpf(), usuario.getPerfil().getValor(),
                emailMudou ? "e-mail alterado" : null);

        return montarResposta(usuario);
    }

    @PatchMapping("/senha")
    public ResponseEntity<Void> trocarSenha(@UsuarioLogado Usuario usuario,
                                            @RequestBody SenhaRequest corpo,
                                            HttpServletRequest requisicao) {
        // Exigir a senha atual impede que alguem com a sessao aberta numa
        // maquina emprestada assuma a conta trocando a senha.
        if (corpo.senhaAtual() == null || !encoder.matches(corpo.senhaAtual(), usuario.getSenhaHash())) {
            throw ApiException.requisicaoInvalida("Não foi possível alterar a senha.",
                    List.of(new ErroCampo("senhaAtual", "Senha atual incorreta.")));
        }

        List<ErroCampo> erros = PoliticaSenha.avaliar(corpo.senhaNova(), "senhaNova");
        if (!erros.isEmpty()) {
            throw ApiException.requisicaoInvalida("A nova senha não atende à política.", erros);
        }

        if (encoder.matches(corpo.senhaNova(), usuario.getSenhaHash())) {
            throw ApiException.requisicaoInvalida("A nova senha não atende à política.",
                    List.of(new ErroCampo("senhaNova", "A nova senha deve ser diferente da atual.")));
        }

        usuario.setSenhaHash(encoder.encode(corpo.senhaNova()));
        repositorio.salvarUsuario(usuario);

        repositorio.registrarAuditoria("TROCAR_SENHA", "perfil", usuario.getCpf(),
                usuario.getCpf(), usuario.getPerfil().getValor(), null);

        // Trocar a senha encerra a sessao: o cidadao entra de novo com a
        // credencial nova, e qualquer sessao roubada deixa de valer.
        String token = (String) requisicao.getAttribute(AutenticacaoInterceptor.ATRIBUTO_TOKEN);
        sessoes.encerrar(token);

        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> montarResposta(Usuario usuario) {
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("user", UsuarioResposta.de(usuario));
        resposta.put("email", usuario.getEmail());
        resposta.put("cep", usuario.getCep());
        resposta.put("cidade", usuario.getCidade());
        resposta.put("podeTramitar", usuario.getPerfil() == Perfil.ATENDENTE);
        return resposta;
    }
}
