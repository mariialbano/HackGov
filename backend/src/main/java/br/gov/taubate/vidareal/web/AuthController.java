package br.gov.taubate.vidareal.web;

import br.gov.taubate.vidareal.erro.ApiException;
import br.gov.taubate.vidareal.erro.ErroCampo;
import br.gov.taubate.vidareal.modelo.Perfil;
import br.gov.taubate.vidareal.modelo.Usuario;
import br.gov.taubate.vidareal.repositorio.Repositorio;
import br.gov.taubate.vidareal.seguranca.Autenticado;
import br.gov.taubate.vidareal.seguranca.AutenticacaoInterceptor;
import br.gov.taubate.vidareal.seguranca.LimitadorRequisicoes;
import br.gov.taubate.vidareal.seguranca.SessaoService;
import br.gov.taubate.vidareal.seguranca.UsuarioLogado;
import br.gov.taubate.vidareal.util.PoliticaSenha;
import br.gov.taubate.vidareal.util.Validadores;
import br.gov.taubate.vidareal.web.dto.LoginRequest;
import br.gov.taubate.vidareal.web.dto.LoginResposta;
import br.gov.taubate.vidareal.web.dto.UsuarioResposta;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recurso /api/v1/auth.
 *
 * <pre>
 *   POST /login   autentica e devolve o token de sessao
 *   GET  /me      dados do usuario autenticado
 *   POST /logout  invalida o token
 * </pre>
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final Repositorio repositorio;
    private final SessaoService sessoes;
    private final BCryptPasswordEncoder encoder;

    /**
     * Limita tentativas de login por IP, mitigando forca bruta.
     * Os valores sao configuraveis: o padrao de producao (5 tentativas a
     * cada 15 minutos) e restritivo demais para a suite de testes.
     */
    private final LimitadorRequisicoes limitador;

    public AuthController(Repositorio repositorio, SessaoService sessoes,
                          BCryptPasswordEncoder encoder,
                          @Value("${vidareal.seguranca.login.limite:5}") int limite,
                          @Value("${vidareal.seguranca.login.janela-minutos:15}") int janelaMinutos) {
        this.repositorio = repositorio;
        this.sessoes = sessoes;
        this.encoder = encoder;
        this.limitador = new LimitadorRequisicoes(limite, Duration.ofMinutes(janelaMinutos));
    }

    @PostMapping("/login")
    public LoginResposta login(@Valid @RequestBody LoginRequest corpo,
                               HttpServletRequest requisicao,
                               HttpServletResponse resposta) {
        String ip = requisicao.getRemoteAddr();
        if (!limitador.permitir(ip)) {
            resposta.setHeader("Retry-After", String.valueOf(limitador.segundosParaLiberar(ip)));
            throw ApiException.muitasRequisicoes(
                    "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.");
        }

        String cpf = Validadores.apenasDigitos(corpo.cpf());

        // Mensagem generica de proposito: nao revelar se o CPF existe no
        // sistema (evita enumeracao de usuarios).
        ApiException credenciaisInvalidas = ApiException.naoAutenticado("CPF ou senha incorretos.");

        if (!Validadores.cpfValido(cpf) || corpo.senha().length() < 8 || corpo.senha().length() > 64) {
            throw credenciaisInvalidas;
        }

        Optional<Usuario> encontrado = repositorio.buscarUsuarioPorCpf(cpf);

        // Compara sempre, mesmo sem usuario: o tempo de resposta fica igual
        // ao de um CPF valido, fechando a enumeracao por timing.
        String hashAlvo = encontrado.map(Usuario::getSenhaHash).orElse(repositorio.getHashFalso());
        boolean senhaConfere = encoder.matches(corpo.senha(), hashAlvo);

        if (encontrado.isEmpty() || !senhaConfere) {
            repositorio.registrarAuditoria("LOGIN_FALHOU", "auth", null, null, null,
                    "Tentativa de autenticação recusada");
            throw credenciaisInvalidas;
        }

        Usuario usuario = encontrado.get();
        String token = sessoes.abrir(usuario);

        repositorio.registrarAuditoria("LOGIN", "auth", null, usuario.getCpf(),
                usuario.getPerfil().getValor(), null);

        return new LoginResposta(true, token, UsuarioResposta.de(usuario));
    }

    /** Corpo do cadastro de um novo cidadao. */
    public record CadastroRequest(String nome, String cpf, String email, String senha,
                                  String cep, String cidade) {
    }

    /**
     * Cadastro publico de cidadao.
     *
     * <p>O perfil e sempre CIDADAO: o de atendente e concedido pela gestao,
     * nunca escolhido por quem se cadastra &mdash; caso contrario qualquer
     * pessoa viraria atendente e leria os protocolos de todos.</p>
     */
    @PostMapping("/cadastro")
    public ResponseEntity<Map<String, Object>> cadastrar(@RequestBody CadastroRequest corpo) {
        String nome = Validadores.sanitizar(corpo.nome(), 120);
        String cpf = Validadores.apenasDigitos(corpo.cpf());
        String email = Validadores.sanitizar(corpo.email(), 200);

        List<ErroCampo> erros = new ArrayList<>();

        if (nome.length() < 3) {
            erros.add(new ErroCampo("nome", "Deve ter no mínimo 3 caracteres."));
        }
        if (!Validadores.cpfValido(cpf)) {
            erros.add(new ErroCampo("cpf", "CPF inválido. Confira os dígitos informados."));
        }
        if (!email.isEmpty() && !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$")) {
            erros.add(new ErroCampo("email", "Informe um e-mail válido."));
        }
        erros.addAll(PoliticaSenha.avaliar(corpo.senha(), "senha"));

        if (!erros.isEmpty()) {
            throw ApiException.requisicaoInvalida("Dados inválidos na requisição.", erros);
        }

        if (repositorio.cpfJaCadastrado(cpf)) {
            throw ApiException.conflito("Já existe uma conta com este CPF.");
        }

        Usuario novo = new Usuario(cpf, encoder.encode(corpo.senha()), nome,
                email.isEmpty() ? null : email, Perfil.CIDADAO);

        // Endereco vem do ViaCEP e e opcional: quem nao preencher se cadastra igual.
        String cep = Validadores.apenasDigitos(corpo.cep());
        if (cep.length() == 8) {
            novo.setCep(cep);
            novo.setCidade(Validadores.sanitizar(corpo.cidade(), 120));
        }

        repositorio.adicionarUsuario(novo);

        repositorio.registrarAuditoria("CRIAR_CONTA", "auth", cpf, cpf,
                Perfil.CIDADAO.getValor(), null);

        // Ja devolve a sessao aberta: o cidadao entra direto apos cadastrar.
        String token = sessoes.abrir(novo);

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("success", true);
        resposta.put("token", token);
        resposta.put("user", UsuarioResposta.de(novo));

        return ResponseEntity.created(URI.create("/api/v1/perfil")).body(resposta);
    }

    @GetMapping("/me")
    @Autenticado
    public Map<String, UsuarioResposta> eu(@UsuarioLogado Usuario usuario) {
        return Map.of("user", UsuarioResposta.de(usuario));
    }

    @PostMapping("/logout")
    @Autenticado
    public ResponseEntity<Void> logout(@UsuarioLogado Usuario usuario, HttpServletRequest requisicao) {
        String token = (String) requisicao.getAttribute(AutenticacaoInterceptor.ATRIBUTO_TOKEN);
        sessoes.encerrar(token);

        repositorio.registrarAuditoria("LOGOUT", "auth", null, usuario.getCpf(),
                usuario.getPerfil().getValor(), null);

        return ResponseEntity.noContent().build();
    }
}
